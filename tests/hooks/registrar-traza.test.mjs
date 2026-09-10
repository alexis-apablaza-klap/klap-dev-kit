import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const hookPath = resolveFromRoot("hooks", "registrar-traza.mjs");
const ISSUE = "SVA-1925";

function crearCwdTemporal() {
  // Fuera del repo a propósito: `resolverIssue` cae a la rama de git como respaldo, y un temp dir
  // sin git obliga a que la resolución venga de la ruta en `tool_input` — que es lo que se prueba.
  return mkdtempSync(path.join(os.tmpdir(), "klap-traza-test-"));
}

function correrHook(evento, cwd) {
  return spawnSync("node", [hookPath], { input: JSON.stringify({ cwd, ...evento }), encoding: "utf8" });
}

function leerTraza(cwd) {
  const p = path.join(cwd, ".klap", "hu", ISSUE, "traza.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** Ruta de artefacto de fase: es de donde el hook deduce el ISSUE-KEY sin depender de git. */
function rutaArtefacto(cwd, archivo) {
  return path.join(cwd, ".klap", "hu", ISSUE, archivo);
}

test("un script de gate exitoso deja una línea bien formada, con fase y duración del runtime", () => {
  const cwd = crearCwdTemporal();
  try {
    const r = correrHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s-1",
        agent_type: "klap:certificador",
        tool_name: "Bash",
        tool_input: { command: `node scripts/quality-gate.mjs ${rutaArtefacto(cwd, "validacion.json")}` },
        tool_response: { stdout: "OK" },
        tool_use_id: "toolu_01",
        duration_ms: 1234,
      },
      cwd
    );
    assert.equal(r.status, 0, r.stderr);

    const lineas = leerTraza(cwd);
    assert.equal(lineas.length, 1);
    const l = lineas[0];
    assert.equal(l.issue, ISSUE);
    assert.equal(l.evento, "herramienta");
    assert.equal(l.script, "quality-gate.mjs");
    assert.equal(l.fase, 6);
    assert.equal(l.agente, "certificador", "el prefijo de plugin se normaliza");
    assert.equal(l.duracion_ms, 1234, "la duración la entrega el runtime, no se mide acá");
    assert.equal(l.tool_use_id, "toolu_01");
    assert.equal(l.session_id, "s-1");
    assert.ok(!Number.isNaN(Date.parse(l.ts)));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("el intento fallido de un gate queda registrado: es la fricción que certificacion.json ya no muestra", () => {
  const cwd = crearCwdTemporal();
  try {
    // Mismo script, dos eventos: primero falla, después pasa. El artefacto final sólo conservaría
    // el segundo — sin PostToolUseFailure el reintento sería invisible.
    const comando = `node scripts/ejecutar-tests.mjs ${rutaArtefacto(cwd, "validacion.json")}`;
    correrHook(
      {
        hook_event_name: "PostToolUseFailure",
        tool_name: "Bash",
        tool_input: { command: comando },
        tool_use_id: "toolu_02",
        error: "3 tests failed",
        is_interrupt: false,
        duration_ms: 900,
      },
      cwd
    );
    correrHook(
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: comando },
        tool_use_id: "toolu_03",
        duration_ms: 950,
      },
      cwd
    );

    const lineas = leerTraza(cwd);
    assert.equal(lineas.length, 2);
    assert.equal(lineas[0].evento, "herramienta_fallo");
    assert.equal(lineas[0].error, "3 tests failed");
    assert.equal(lineas[0].fase, 5);
    assert.equal(lineas[0].interrumpido, undefined, "is_interrupt: false no se declara como true");
    assert.equal(lineas[1].evento, "herramienta");
    assert.equal(lineas[1].error, undefined);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("un éxito que no es hito no se registra: la traza no es el log de todas las herramientas", () => {
  const cwd = crearCwdTemporal();
  try {
    const r = correrHook(
      {
        hook_event_name: "PostToolUse",
        tool_name: "Read",
        tool_input: { file_path: rutaArtefacto(cwd, "analisis.md") },
        tool_use_id: "toolu_04",
        duration_ms: 12,
      },
      cwd
    );
    assert.equal(r.status, 0);
    assert.deepEqual(leerTraza(cwd), []);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("la escritura de un artefacto de fase sí es hito, aunque no invoque ningún script", () => {
  const cwd = crearCwdTemporal();
  try {
    correrHook(
      {
        hook_event_name: "PostToolUse",
        agent_type: "arquitecto",
        tool_name: "Write",
        tool_input: { file_path: rutaArtefacto(cwd, "diseno.md"), content: "# Diseño" },
        tool_use_id: "toolu_05",
        duration_ms: 30,
      },
      cwd
    );
    const [l] = leerTraza(cwd);
    assert.equal(l.evento, "herramienta");
    assert.equal(l.archivo, "diseno.md");
    assert.equal(l.fase, 3, "arquitecto cubre exactamente una fase");
    assert.equal(l.comando, undefined, "no era un Bash");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("SubagentStop se atribuye por el nombre de la rama, que es su única señal de HU", () => {
  // A diferencia de PostToolUse, SubagentStop no trae `tool_input`: no hay ninguna ruta de
  // artefacto de la que deducir el ISSUE-KEY. El único respaldo es el nombre de la rama, misma
  // convención que ya usa pre-push-quality-gate.mjs. Este test existe para que esa dependencia
  // quede fijada: si se rompe, los cierres de fase dejan de atribuirse en silencio.
  const cwd = crearCwdTemporal();
  try {
    const git = (...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
    git("init", "-q");
    // Con un HEAD no nacido, `git rev-parse --abbrev-ref HEAD` falla: hace falta un commit para
    // que la rama exista de verdad, igual que en cualquier repo de trabajo real.
    writeFileSync(path.join(cwd, "README.md"), "# temporal\n");
    git("add", "-A");
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "inicial");
    git("checkout", "-q", "-b", `feature/${ISSUE}-anticipo`);

    const r = correrHook(
      {
        hook_event_name: "SubagentStop",
        agent_id: "ag-1",
        agent_type: "klap:analista",
        agent_transcript_path: "/tmp/transcript.jsonl",
        last_assistant_message: "Análisis listo.",
        stop_hook_active: false,
      },
      cwd
    );
    assert.equal(r.status, 0, r.stderr);

    const [l] = leerTraza(cwd);
    assert.equal(l.evento, "fase_fin");
    assert.equal(l.agente, "analista", "el prefijo de plugin se normaliza");
    // `analista` cubre las fases 1 y 2: `fase` queda ausente, no en 0 ni en 1.
    assert.equal(l.fase, undefined, "fase ausente significa no determinable, no fase 0");
    assert.equal(l.mensaje_final, "Análisis listo.");
    assert.equal(l.transcripcion, "/tmp/transcript.jsonl");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("sin ISSUE-KEY resoluble no escribe nada, en vez de dejar un archivo global", () => {
  const cwd = crearCwdTemporal();
  try {
    const r = correrHook(
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: "node scripts/quality-gate.mjs metricas.json" },
        tool_use_id: "toolu_06",
        duration_ms: 40,
      },
      cwd
    );
    assert.equal(r.status, 0);
    assert.ok(!existsSync(path.join(cwd, ".klap")), "no crea el árbol .klap sin HU a la que atribuir");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("nunca rompe el flujo: stdin basura, evento vacío o destino no escribible salen 0 y en silencio", () => {
  const rBasura = spawnSync("node", [hookPath], { input: "esto no es JSON", encoding: "utf8" });
  assert.equal(rBasura.status, 0);
  assert.equal(rBasura.stdout, "", "un hook de observación no emite decisión de permiso");

  const rVacio = spawnSync("node", [hookPath], { input: "", encoding: "utf8" });
  assert.equal(rVacio.status, 0);

  const cwd = crearCwdTemporal();
  try {
    // `.klap` como archivo: mkdirSync del directorio de la HU falla. El hook debe tragárselo.
    writeFileSync(path.join(cwd, ".klap"), "no soy un directorio");
    const r = correrHook(
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: `node scripts/quality-gate.mjs ${path.join(cwd, ".klap", "hu", ISSUE, "x.json")}` },
        tool_use_id: "toolu_07",
        duration_ms: 10,
      },
      cwd
    );
    assert.equal(r.status, 0, "un hook que rompe la HU que observa es peor que no tener traza");
    assert.equal(r.stdout, "");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("los campos de texto se recortan: la línea queda corta para que el append no se entrelace", () => {
  const cwd = crearCwdTemporal();
  try {
    correrHook(
      {
        hook_event_name: "PostToolUseFailure",
        tool_name: "Bash",
        tool_input: { command: `node scripts/deps-scan.mjs ${rutaArtefacto(cwd, "v.json")} ${"x".repeat(500)}` },
        tool_use_id: "toolu_08",
        error: "E".repeat(1000),
        duration_ms: 10,
      },
      cwd
    );
    const [l] = leerTraza(cwd);
    assert.ok(l.error.length < 340, `error recortado, largo=${l.error.length}`);
    assert.ok(l.error.includes("[+"), "el recorte declara cuánto se omitió");
    assert.ok(l.comando.length < 240, `comando recortado, largo=${l.comando.length}`);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
