#!/usr/bin/env node
/**
 * Levanta el servidor MCP de Klap Knowledge derivando el intérprete desde una sola variable:
 * KLAP_KNOWLEDGE_HOME.
 *
 * Por qué existe este archivo en vez de invocar python directo desde .mcp.json: el paquete usa
 * layout `src/`, así que fijar `cwd` en el checkout NO alcanza para que `python -m
 * klap_knowledge.server` resuelva el módulo — hace falta el intérprete del venv, cuya ruta
 * difiere por plataforma (`.venv/Scripts/python.exe` en Windows, `.venv/bin/python` en
 * POSIX). Un .mcp.json es estático y no puede ramificar; hardcodear una de las dos rutas
 * reintroduce el bug Windows-only que el kit ya había corregido, y una ruta absoluta la rechaza
 * `scripts/validar-plugin.mjs` por no portable. Antes esto se resolvía pidiéndole al dev una
 * segunda variable (KLAP_KNOWLEDGE_PYTHON) que duplicaba información ya contenida en HOME.
 *
 * Uso: node scripts/klap-knowledge-launch.mjs   (lo invoca .mcp.json; no se corre a mano)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { esPuntoDeEntrada } from "./lib/paths.mjs";

/** Candidatos de intérprete dentro del checkout, en orden de preferencia por plataforma. */
export function candidatosPython(home) {
  const venv = path.join(home, ".venv");
  return process.platform === "win32"
    ? [path.join(venv, "Scripts", "python.exe"), path.join(venv, "bin", "python")]
    : [path.join(venv, "bin", "python"), path.join(venv, "Scripts", "python.exe")];
}

/**
 * Resuelve el intérprete a usar. Devuelve el primer candidato que exista; si no hay venv en el
 * checkout, cae a `python` del PATH — válido cuando el dev instaló el paquete global o en un
 * venv ya activado, y es el mismo comportamiento que tenía el default anterior.
 */
export function resolverPython(home, existe = existsSync) {
  return candidatosPython(home).find((candidato) => existe(candidato)) ?? "python";
}

function main() {
  const home = process.env.KLAP_KNOWLEDGE_HOME;
  if (!home) {
    // stderr, no stdout: stdout es el canal JSON-RPC del MCP y cualquier texto ahí lo rompe.
    process.stderr.write(
      "klap-knowledge: falta KLAP_KNOWLEDGE_HOME (ruta al checkout de klap-dev-kit-knowledge).\n" +
        "  Windows    setx KLAP_KNOWLEDGE_HOME \"C:\\ruta\\a\\klap-dev-kit-knowledge\"\n" +
        "  Linux/Mac  export KLAP_KNOWLEDGE_HOME=\"/ruta/a/klap-dev-kit-knowledge\"\n" +
        "Detalle: docs/installation.md\n"
    );
    process.exit(1);
  }
  if (!existsSync(home)) {
    process.stderr.write(`klap-knowledge: KLAP_KNOWLEDGE_HOME apunta a una ruta inexistente: ${home}\n`);
    process.exit(1);
  }

  const hijo = spawn(resolverPython(home), ["-m", "klap_knowledge.server"], {
    cwd: home,
    stdio: "inherit", // el transporte del MCP es stdio: se pasa tal cual, sin intermediar.
  });
  hijo.on("error", (error) => {
    process.stderr.write(`klap-knowledge: no se pudo lanzar el intérprete — ${error.message}\n`);
    process.exit(1);
  });
  hijo.on("exit", (codigo, senal) => process.exit(senal ? 1 : (codigo ?? 0)));
}

if (esPuntoDeEntrada(import.meta.url)) main();
