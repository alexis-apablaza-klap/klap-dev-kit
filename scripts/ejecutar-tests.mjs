#!/usr/bin/env node
/**
 * Detecta el stack de un repositorio y ejecuta su suite de tests con el wrapper del
 * proyecto cuando existe (gradlew/mvnw), sin asumir herramientas instaladas globalmente.
 *
 * Uso: node scripts/ejecutar-tests.mjs [ruta-del-repo]
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { esPuntoDeEntrada } from "./lib/paths.mjs";

const WIN = process.platform === "win32";

export function detectarComando(repoPath) {
  if (existsSync(path.join(repoPath, "build.gradle")) || existsSync(path.join(repoPath, "build.gradle.kts"))) {
    const wrapper = WIN ? "gradlew.bat" : "gradlew";
    const usaWrapper = existsSync(path.join(repoPath, wrapper));
    return { stack: "gradle", cmd: usaWrapper ? (WIN ? wrapper : `./${wrapper}`) : "gradle", args: ["test"] };
  }
  if (existsSync(path.join(repoPath, "pom.xml"))) {
    const wrapper = WIN ? "mvnw.cmd" : "mvnw";
    const usaWrapper = existsSync(path.join(repoPath, wrapper));
    return { stack: "maven", cmd: usaWrapper ? (WIN ? wrapper : `./${wrapper}`) : "mvn", args: ["test"] };
  }
  if (existsSync(path.join(repoPath, "package.json"))) {
    return { stack: "npm", cmd: WIN ? "npm.cmd" : "npm", args: ["test"] };
  }
  return null;
}

export function ejecutarTests(repoPath) {
  const comando = detectarComando(repoPath);
  if (!comando) return { stack: null, exito: false, mensaje: "No se detectó un stack soportado (gradle/maven/npm)." };
  const resultado = spawnSync(comando.cmd, comando.args, { cwd: repoPath, stdio: "inherit", shell: WIN });
  return { stack: comando.stack, exito: resultado.status === 0, codigo: resultado.status };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const repoPath = path.resolve(process.argv[2] ?? process.cwd());
  const resultado = ejecutarTests(repoPath);
  if (!resultado.stack) {
    console.error(resultado.mensaje);
    process.exit(1);
  }
  process.exit(resultado.exito ? 0 : resultado.codigo ?? 1);
}
