#!/usr/bin/env node
/**
 * PostToolUse / PostToolUseFailure / SubagentStop — escribe la traza determinista de una HU en
 * `.klap/hu/<ISSUE-KEY>/traza.jsonl`, una línea JSON por evento.
 *
 * Por qué existe: un agente no puede leer retroactivamente la ejecución de otro — el contexto de
 * cada fase se pierde al terminar. Sin traza, `retroalimentador` sólo vería los artefactos
 * finales: ciego a reintentos, a gates que fallaron y se corrigieron, y a pasos que tomaron tres
 * vueltas. Lo determinista vive acá; el juicio vive en el agente (regla del CLAUDE.md del kit).
 *
 * Contrato de eventos verificado contra el runtime instalado (Claude Code 2.1.267), no contra el
 * doc — el doc publica la lista de eventos pero no el payload de estos tres:
 *   - PostToolUse:        tool_name, tool_input, tool_response, tool_use_id, duration_ms
 *   - PostToolUseFailure: tool_name, tool_input, tool_use_id, error, is_interrupt, duration_ms
 *   - SubagentStop:       agent_id, agent_type, agent_transcript_path, last_assistant_message
 *   - comunes:            session_id, cwd, hook_event_name, y agent_id/agent_type cuando el hook
 *                         se dispara *dentro* de un subagente
 * Dos consecuencias de diseño: `duration_ms` lo entrega el runtime (no hay que medirlo), y
 * `agent_type` en los campos comunes es lo que permite atribuir una llamada de herramienta a la
 * fase que la hizo. `SubagentStop` en cambio no trae duración: la de la fase se deriva de los
 * timestamps, no se inventa.
 *
 * `PostToolUseFailure` no estaba en el plan y es el evento que más importa: un gate que reprobó y
 * se corrigió termina con un `PostToolUse` exitoso, así que sin este evento el intento fallido —
 * justo la fricción que el retroalimentador existe para ver — no deja rastro.
 *
 * Reglas duras:
 *   - Nunca bloquea ni falla el flujo: cualquier error se traga y sale 0. Un hook de observación
 *     que rompe la HU que observa es peor que no tener traza.
 *   - Sólo registra hitos (scripts del kit, artefactos de fase, llamadas MCP) y *todos* los
 *     fallos. Registrar cada Read/Grep ahogaría la señal en volumen.
 *   - Una línea por append y acotada en tamaño: la fase 6 corre `certificador` y `seguridad` en
 *     paralelo, así que hay dos escritores concurrentes sobre el mismo archivo. Un append único y
 *     corto es la única forma de que no se entrelacen.
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { leerEventoHook } from "../scripts/lib/hook-io.mjs";

/** Techo por campo de texto: mantiene la línea corta para que el append sea atómico en la práctica. */
const MAX_TEXTO = 300;

/**
 * Scripts del kit cuya sola invocación identifica la fase sin ambigüedad. La fase NO se deriva del
 * agente cuando un agente cubre dos fases (`analista` cubre 1 y 2): en ese caso se omite el campo
 * en vez de elegir una. Un `fase` inventado es peor que un `fase` ausente, porque el
 * retroalimentador lo usaría como evidencia.
 */
const FASE_POR_SCRIPT = {
  "ejecutar-tests.mjs": 5,
  "validar-contexto.mjs": 5,
  "quality-gate.mjs": 6,
  "deps-scan.mjs": 6,
  "auditar-kafka.mjs": 6,
  "memoria-git.mjs": 8,
};

/** Agentes que cubren exactamente una fase. Los que cubren dos quedan fuera a propósito. */
const FASE_POR_AGENTE = {
  arquitecto: 3,
  desarrollador: 4,
  seguridad: 6,
  documentador: 7,
  retroalimentador: 9,
};

function recortar(valor, max = MAX_TEXTO) {
  if (valor === undefined || valor === null) return undefined;
  const s = typeof valor === "string" ? valor : JSON.stringify(valor);
  if (typeof s !== "string") return undefined;
  return s.length > max ? `${s.slice(0, max)}...[+${s.length - max}]` : s;
}

/** Nombre del agente sin el prefijo de plugin (`klap:certificador` -> `certificador`). */
function normalizarAgente(agentType) {
  if (!agentType) return undefined;
  const s = String(agentType);
  return s.includes(":") ? s.slice(s.lastIndexOf(":") + 1) : s;
}

function scriptDelComando(comando) {
  const m = /([a-z0-9-]+\.mjs)/.exec(String(comando ?? ""));
  return m ? m[1] : undefined;
}

/**
 * El payload del hook no trae el ISSUE-KEY. Se resuelve en dos pasos, del más preciso al más
 * general: (1) una ruta `.klap/hu/<KEY>/` en los argumentos de la herramienta — el propio flujo ya
 * escribe ahí; (2) el nombre de la rama, misma convención que `pre-push-quality-gate.mjs`. Si
 * ninguno resuelve, no se escribe nada: una traza sin HU no le sirve a nadie, y un archivo global
 * se convertiría en el bloat que la fase 8 del plan viene a limpiar.
 *
 * Ojo con `SubagentStop`: ese evento **no trae `tool_input`**, así que el paso (1) no aplica y su
 * atribución depende enteramente del nombre de la rama. En una rama sin ISSUE-KEY los cierres de
 * fase no se registran — la traza queda con los eventos de herramienta y sin los `fase_fin`, que
 * es degradación parcial, no corrupción. `agents/retroalimentador.md` ya asume que la traza no es
 * exhaustiva.
 */
function resolverIssue(evento, cwd) {
  const args = JSON.stringify(evento?.tool_input ?? {});
  const enRuta = /klap[\\/]+hu[\\/]+([A-Z][A-Z0-9]+-\d+)/.exec(args);
  if (enRuta) return enRuta[1];

  try {
    const rama = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const enRama = /([A-Z][A-Z0-9]+-\d+)/.exec(rama);
    if (enRama) return enRama[1];
  } catch {
    /* sin git o sin rama: no es un error, simplemente no hay HU a la que atribuir el evento */
  }
  return undefined;
}

/**
 * Filtro de hitos. Devuelve la entrada a registrar, o `undefined` si el evento no es señal.
 * Todo fallo es señal; de los éxitos, sólo lo que dice algo del avance del flujo.
 */
function construirEntrada(evento) {
  const tipo = evento?.hook_event_name;
  const agente = normalizarAgente(evento?.agent_type);

  if (tipo === "SubagentStop") {
    return {
      evento: "fase_fin",
      agente,
      fase: agente ? FASE_POR_AGENTE[agente] : undefined,
      // `agent_transcript_path` se registra pero el retroalimentador no lo lee: la transcripción
      // de un subagente no es un artefacto estable del kit. Sirve para depurar el hook.
      transcripcion: evento?.agent_transcript_path,
      mensaje_final: recortar(evento?.last_assistant_message),
    };
  }

  const herramienta = evento?.tool_name;
  if (!herramienta) return undefined;

  const fallo = tipo === "PostToolUseFailure";
  const script = herramienta === "Bash" ? scriptDelComando(evento?.tool_input?.command) : undefined;
  const rutaEscrita = ["Write", "Edit", "NotebookEdit"].includes(herramienta) ? evento?.tool_input?.file_path : undefined;
  const esArtefactoDeFase = /klap[\\/]+hu[\\/]+/.test(String(rutaEscrita ?? ""));
  const esMcp = String(herramienta).startsWith("mcp__");

  // Un éxito que no es hito no se registra. Un fallo siempre.
  if (!fallo && !script && !esArtefactoDeFase && !esMcp) return undefined;

  return {
    evento: fallo ? "herramienta_fallo" : "herramienta",
    agente,
    fase: (script ? FASE_POR_SCRIPT[script] : undefined) ?? (agente ? FASE_POR_AGENTE[agente] : undefined),
    herramienta,
    script,
    archivo: rutaEscrita ? path.basename(String(rutaEscrita)) : undefined,
    comando: herramienta === "Bash" ? recortar(evento?.tool_input?.command, 200) : undefined,
    duracion_ms: evento?.duration_ms,
    // Ojo: el mismo `tool_use_id` reaparece si el runtime reintenta la llamada. Es lo que permite
    // al retroalimentador distinguir un reintento de dos pasos distintos que hacen lo mismo.
    tool_use_id: evento?.tool_use_id,
    error: fallo ? recortar(evento?.error) : undefined,
    interrumpido: fallo && evento?.is_interrupt === true ? true : undefined,
  };
}

try {
  const evento = await leerEventoHook();
  const entrada = construirEntrada(evento);
  if (entrada) {
    const cwd = evento?.cwd ?? process.cwd();
    const issue = resolverIssue(evento, cwd);
    if (issue) {
      const dir = path.join(cwd, ".klap", "hu", issue);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const linea = JSON.stringify({
        ts: new Date().toISOString(),
        issue,
        session_id: evento?.session_id,
        ...entrada,
      });
      appendFileSync(path.join(dir, "traza.jsonl"), `${linea}\n`, "utf8");
    }
  }
} catch {
  /* La traza es observación, no control: si no se puede escribir, el flujo sigue de largo. */
}

process.exit(0);
