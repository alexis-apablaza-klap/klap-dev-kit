import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validarContexto } from "../../scripts/validar-contexto.mjs";
import { writeYaml } from "../../scripts/lib/yaml-io.mjs";

function crearRepoTemporal() {
  return mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-test-"));
}

test("repo con índice de contexto consistente es válido", () => {
  const repo = crearRepoTemporal();
  try {
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    mkdirSync(path.join(repo, "docs", "architecture"), { recursive: true });
    writeFileSync(path.join(repo, "docs", "architecture", "overview.md"), "# Overview\n");
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      architecture: { resumen: "Arquitectura del componente.", path: "docs/architecture/overview.md" },
    });

    const { valido, problemas } = validarContexto(repo);
    assert.equal(valido, true, JSON.stringify(problemas));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("índice de contexto que apunta a un path inexistente es inválido", () => {
  const repo = crearRepoTemporal();
  try {
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      architecture: { resumen: "Apunta a nada.", path: "docs/architecture/no-existe.md" },
    });

    const { valido, problemas } = validarContexto(repo);
    assert.equal(valido, false);
    assert.ok(problemas.some((p) => p.includes("no existe")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("entrada marcada obsoleto: true no se reporta aunque su path no exista", () => {
  const repo = crearRepoTemporal();
  try {
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      "diseno-legacy": {
        resumen: "Diseño reemplazado, doc ya borrado.",
        path: "docs/history/diseno-legacy.md",
        obsoleto: true,
      },
    });

    const { valido, problemas } = validarContexto(repo);
    assert.equal(valido, true, JSON.stringify(problemas));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("repo sin docs/context/index.yaml es inválido", () => {
  const repo = crearRepoTemporal();
  try {
    const { valido, problemas } = validarContexto(repo);
    assert.equal(valido, false);
    assert.ok(problemas.some((p) => p.includes("index.yaml")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
