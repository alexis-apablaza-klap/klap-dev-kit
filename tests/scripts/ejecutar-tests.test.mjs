import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectarComando } from "../../scripts/ejecutar-tests.mjs";

function crearRepoTemporal() {
  return mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-ejecutar-tests-"));
}

test("detecta stack gradle por build.gradle", () => {
  const repo = crearRepoTemporal();
  try {
    writeFileSync(path.join(repo, "build.gradle"), "");
    const comando = detectarComando(repo);
    assert.equal(comando.stack, "gradle");
    assert.deepEqual(comando.args, ["test"]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("detecta stack maven por pom.xml", () => {
  const repo = crearRepoTemporal();
  try {
    writeFileSync(path.join(repo, "pom.xml"), "");
    const comando = detectarComando(repo);
    assert.equal(comando.stack, "maven");
    assert.deepEqual(comando.args, ["test"]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("detecta stack npm por package.json", () => {
  const repo = crearRepoTemporal();
  try {
    writeFileSync(path.join(repo, "package.json"), "{}");
    const comando = detectarComando(repo);
    assert.equal(comando.stack, "npm");
    assert.deepEqual(comando.args, ["test"]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("prioriza gradle sobre maven/npm cuando coexisten", () => {
  const repo = crearRepoTemporal();
  try {
    writeFileSync(path.join(repo, "build.gradle"), "");
    writeFileSync(path.join(repo, "pom.xml"), "");
    writeFileSync(path.join(repo, "package.json"), "{}");
    const comando = detectarComando(repo);
    assert.equal(comando.stack, "gradle");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("sin ningún archivo de build reconocido, devuelve null", () => {
  const repo = crearRepoTemporal();
  try {
    assert.equal(detectarComando(repo), null);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
