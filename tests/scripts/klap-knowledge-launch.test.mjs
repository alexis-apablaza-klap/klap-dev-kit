import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { candidatosPython, resolverPython } from "../../scripts/klap-knowledge-launch.mjs";

const HOME = path.join("C:", "checkout");
const winScripts = path.join(HOME, ".venv", "Scripts", "python.exe");
const posixBin = path.join(HOME, ".venv", "bin", "python");

test("los candidatos cubren ambas plataformas y priorizan la del sistema actual", () => {
  const candidatos = candidatosPython(HOME);
  assert.deepEqual(new Set(candidatos), new Set([winScripts, posixBin]));
  const esperado = process.platform === "win32" ? winScripts : posixBin;
  assert.equal(candidatos[0], esperado);
});

test("resuelve el intérprete del venv cuando existe", () => {
  const esperado = process.platform === "win32" ? winScripts : posixBin;
  assert.equal(
    resolverPython(HOME, (ruta) => ruta === esperado),
    esperado
  );
});

test("resuelve el venv de la otra plataforma si es el único presente", () => {
  const otro = process.platform === "win32" ? posixBin : winScripts;
  assert.equal(
    resolverPython(HOME, (ruta) => ruta === otro),
    otro
  );
});

test("cae al python del PATH cuando el checkout no tiene venv", () => {
  assert.equal(
    resolverPython(HOME, () => false),
    "python"
  );
});
