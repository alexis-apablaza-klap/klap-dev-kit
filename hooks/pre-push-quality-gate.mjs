#!/usr/bin/env node
/**
 * PreToolUse(Bash) — bloquea `git push` si la rama corresponde a una HU
 * (convención <PREFIJO>-<número> en el nombre de rama) y no existe una
 * certificación aprobada para ese issue en .klap/hu/<ISSUE>/certificacion.json.
 *
 * Ramas sin issue detectable no son responsabilidad de este hook: se permiten
 * (el respaldo real para esos casos es el gate de CI, no este hook local).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { leerEventoHook, denegar, permitir } from "../scripts/lib/hook-io.mjs";

const evento = await leerEventoHook();
const comando = evento?.tool_input?.command ?? "";
if (!/\bgit\s+push\b/.test(comando)) permitir();

const cwd = evento.cwd ?? process.cwd();
let rama = "";
try {
  rama = execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf8" }).trim();
} catch {
  permitir();
}

const match = /([A-Z][A-Z0-9]+-\d+)/.exec(rama);
if (!match) permitir();

const issue = match[1];
const certPath = path.join(cwd, ".klap", "hu", issue, "certificacion.json");
if (!existsSync(certPath)) {
  denegar("PreToolUse", `Push bloqueado: no existe certificación para ${issue} (${certPath}). Ejecuta /klap:certificar antes de hacer push.`);
}

let cert;
try {
  cert = JSON.parse(readFileSync(certPath, "utf8"));
} catch {
  denegar("PreToolUse", `Push bloqueado: ${certPath} existe pero no es JSON válido. Vuelve a ejecutar /klap:certificar.`);
}
if (!cert.aprobado) {
  denegar("PreToolUse", `Push bloqueado: la certificación de ${issue} no está aprobada. Motivos: ${(cert.motivos ?? []).join("; ") || "ver certificacion.json"}.`);
}

permitir();
