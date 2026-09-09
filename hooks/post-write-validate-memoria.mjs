#!/usr/bin/env node
/**
 * PostToolUse(Write|Edit) — cuando se escribe docs/context/index.yaml,
 * valida la memoria del repo y reporta problemas a stderr (exit != 0) para que Claude
 * los vea y corrija. No puede impedir la escritura (ya ocurrió) — es feedback, no bloqueo.
 */
import path from "node:path";
import { leerEventoHook } from "../scripts/lib/hook-io.mjs";
import { validarContexto } from "../scripts/validar-contexto.mjs";

const evento = await leerEventoHook();
const filePath = evento?.tool_input?.file_path ?? "";
const esIndiceContexto = filePath.replaceAll("\\", "/").endsWith("docs/context/index.yaml");

if (!esIndiceContexto) process.exit(0);

const repoPath = path.resolve(path.dirname(filePath), "..", "..");

const { valido, problemas } = validarContexto(repoPath);
if (valido) process.exit(0);

console.error(`Memoria de contexto inconsistente en ${repoPath}:`);
for (const p of problemas) console.error(`  - ${p}`);
process.exit(1);
