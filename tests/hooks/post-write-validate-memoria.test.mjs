import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { writeYaml } from "../../scripts/lib/yaml-io.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const hookPath = resolveFromRoot("hooks", "post-write-validate-memoria.mjs");

function crearRepoTemporal() {
  return mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-hook-test-"));
}

function correrHook(filePath) {
  return spawnSync("node", [hookPath], {
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: "utf8",
  });
}

test("reporta problemas cuando docs/context/index.yaml recién escrito es inconsistente", () => {
  const repo = crearRepoTemporal();
  try {
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      architecture: { resumen: "Apunta a nada.", path: "docs/architecture/no-existe.md" },
    });

    const r = correrHook(path.join(repo, "docs", "context", "index.yaml"));
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("inconsistente"));
    assert.ok(r.stderr.includes("no existe"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("no reporta nada cuando docs/context/index.yaml recién escrito es válido", () => {
  const repo = crearRepoTemporal();
  try {
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    mkdirSync(path.join(repo, "docs", "architecture"), { recursive: true });
    writeFileSync(path.join(repo, "docs", "architecture", "overview.md"), "# Overview\n");
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      architecture: { resumen: "Arquitectura del componente.", path: "docs/architecture/overview.md" },
    });

    const r = correrHook(path.join(repo, "docs", "context", "index.yaml"));
    assert.equal(r.status, 0, r.stderr);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("no interviene cuando el archivo escrito no es docs/context/index.yaml", () => {
  const repo = crearRepoTemporal();
  try {
    writeFileSync(path.join(repo, "otro-archivo.md"), "# nada relevante\n");
    const r = correrHook(path.join(repo, "otro-archivo.md"));
    assert.equal(r.status, 0);
    assert.equal(r.stderr, "");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
