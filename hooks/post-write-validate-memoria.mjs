#!/usr/bin/env node
/**
 * PostToolUse(Write|Edit) — cuando se escribe component.yaml o docs/context/index.yaml,
 * valida la memoria del repo y reporta problemas a stderr (exit != 0) para que Claude
 * los vea y corrija. No puede impedir la escritura (ya ocurrió) — es feedback, no bloqueo.
 */
import path from "node:path";
import { leerEventoHook } from "../scripts/lib/hook-io.mjs";
import { validarComponente } from "../scripts/validar-component.mjs";

const evento = await leerEventoHook();
const filePath = evento?.tool_input?.file_path ?? "";
const base = path.basename(filePath);
const esIndiceContexto = filePath.replaceAll("\\", "/").endsWith("docs/context/index.yaml");

if (base !== "component.yaml" && !esIndiceContexto) process.exit(0);

const repoPath = esIndiceContexto ? path.resolve(path.dirname(filePath), "..", "..") : path.dirname(filePath);

const { valido, problemas } = validarComponente(repoPath);
if (valido) process.exit(0);

console.error(`Memoria del componente inconsistente en ${repoPath}:`);
for (const p of problemas) console.error(`  - ${p}`);
process.exit(1);
