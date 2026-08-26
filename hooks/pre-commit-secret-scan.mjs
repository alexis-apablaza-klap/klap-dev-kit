#!/usr/bin/env node
/**
 * PreToolUse(Bash) — bloquea `git commit` si el diff staged contiene un posible secreto.
 * Cualquier otro comando Bash pasa sin decisión (exit 0).
 */
import { execSync } from "node:child_process";
import { leerEventoHook, denegar, permitir } from "../scripts/lib/hook-io.mjs";
import { detectarSecretos } from "../scripts/escanear-secretos.mjs";

const evento = await leerEventoHook();
const comando = evento?.tool_input?.command ?? "";

if (!/\bgit\s+commit\b/.test(comando)) permitir();

let diff = "";
try {
  diff = execSync("git diff --cached", { cwd: evento.cwd ?? process.cwd(), encoding: "utf8" });
} catch {
  permitir(); // no es un repo git o no hay diff — no es responsabilidad de este hook
}

const hallazgos = detectarSecretos(diff);
if (hallazgos.length === 0) permitir();

const resumen = hallazgos.map((h) => `[línea ${h.linea}] ${h.tipo}`).join("; ");
denegar("PreToolUse", `Commit bloqueado: se detectaron posibles secretos — ${resumen}. Elimínalos o usa un gestor de secretos.`);
