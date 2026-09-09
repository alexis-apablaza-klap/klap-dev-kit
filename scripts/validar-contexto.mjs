#!/usr/bin/env node
/**
 * Valida la memoria técnica de un repositorio: docs/context/index.yaml
 * contra su JSON Schema, y que cada `path` del índice exista realmente.
 *
 * Uso: node scripts/validar-contexto.mjs [ruta-del-repo]   (default: cwd)
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { readYaml } from "./lib/yaml-io.mjs";
import { validar } from "./lib/schema-validate.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

export function validarContexto(repoPath) {
  const problemas = [];

  const indexPath = path.join(repoPath, "docs", "context", "index.yaml");
  const indexData = readYaml(indexPath);
  if (!indexData) {
    problemas.push(`No existe ${indexPath}`);
  } else {
    const { valido, errores } = validar(resolveFromRoot("schemas", "context-index.schema.json"), indexData);
    if (!valido) problemas.push(...errores.map((e) => `docs/context/index.yaml: ${e}`));
    for (const [clave, entrada] of Object.entries(indexData)) {
      if (!entrada?.path || entrada.obsoleto) continue;
      const docPath = path.join(repoPath, entrada.path);
      if (!existsSync(docPath)) {
        problemas.push(`docs/context/index.yaml: la entrada "${clave}" apunta a ${entrada.path}, que no existe`);
      }
    }
  }

  return { valido: problemas.length === 0, problemas };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const repoPath = path.resolve(process.argv[2] ?? process.cwd());
  const { valido, problemas } = validarContexto(repoPath);
  if (valido) {
    console.log(`OK: memoria de contexto válida en ${repoPath}`);
    process.exit(0);
  } else {
    console.error(`Memoria de contexto inválida en ${repoPath}:`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
}
