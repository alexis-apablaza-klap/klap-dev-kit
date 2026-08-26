import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validarComponente } from "../../scripts/validar-component.mjs";
import { writeYaml } from "../../scripts/lib/yaml-io.mjs";

function crearRepoTemporal() {
  return mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-test-"));
}

const componenteValido = {
  componente: "repo-de-prueba",
  repositorio: { url: "https://github.com/klap-cl/repo-de-prueba" },
  productos: [{ nombre: "abono-ya", fase: "fase-1" }],
  capabilities: ["algo"],
  tecnologias: ["java-21"],
  klap_knowledge: { component_id: "repo-de-prueba" },
};

test("repo con component.yaml e índice de contexto consistentes es válido", () => {
  const repo = crearRepoTemporal();
  try {
    writeYaml(path.join(repo, "component.yaml"), componenteValido);
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    mkdirSync(path.join(repo, "docs", "architecture"), { recursive: true });
    writeFileSync(path.join(repo, "docs", "architecture", "overview.md"), "# Overview\n");
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      architecture: { resumen: "Arquitectura del componente.", path: "docs/architecture/overview.md" },
    });

    const { valido, problemas } = validarComponente(repo);
    assert.equal(valido, true, JSON.stringify(problemas));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("índice de contexto que apunta a un path inexistente es inválido", () => {
  const repo = crearRepoTemporal();
  try {
    writeYaml(path.join(repo, "component.yaml"), componenteValido);
    mkdirSync(path.join(repo, "docs", "context"), { recursive: true });
    writeYaml(path.join(repo, "docs", "context", "index.yaml"), {
      architecture: { resumen: "Apunta a nada.", path: "docs/architecture/no-existe.md" },
    });

    const { valido, problemas } = validarComponente(repo);
    assert.equal(valido, false);
    assert.ok(problemas.some((p) => p.includes("no existe")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("repo sin component.yaml es inválido", () => {
  const repo = crearRepoTemporal();
  try {
    const { valido, problemas } = validarComponente(repo);
    assert.equal(valido, false);
    assert.ok(problemas.some((p) => p.includes("component.yaml")));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
