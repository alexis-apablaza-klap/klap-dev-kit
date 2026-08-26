import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validarPlugin } from "../../scripts/validar-plugin.mjs";
import { writeYaml } from "../../scripts/lib/yaml-io.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

function crearRootTemporal() {
  const root = mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-plugin-test-"));
  mkdirSync(path.join(root, "schemas"), { recursive: true });
  copyFileSync(
    resolveFromRoot("schemas", "standards-index.schema.json"),
    path.join(root, "schemas", "standards-index.schema.json")
  );
  return root;
}

function escribirStandard(root, { clave, obligatoriedadIndex, estadoIndex, obligatoriedadDoc, estadoDoc }) {
  mkdirSync(path.join(root, "standards"), { recursive: true });
  writeYaml(path.join(root, "standards", "index.yaml"), {
    [clave]: {
      resumen: "Standard de prueba.",
      path: "standards/algo.md",
      obligatoriedad: obligatoriedadIndex,
      estado: estadoIndex,
    },
  });
  writeFileSync(
    path.join(root, "standards", "algo.md"),
    `---\ntitulo: "Standard de prueba"\nobligatoriedad: ${obligatoriedadDoc}\nestado: ${estadoDoc}\n---\n\n# Standard de prueba\n`
  );
}

test("detecta obligatoriedad/estado que no coinciden entre standards/index.yaml y el frontmatter del doc", () => {
  const root = crearRootTemporal();
  try {
    escribirStandard(root, {
      clave: "algo",
      obligatoriedadIndex: "MANDATORY",
      estadoIndex: "vigente",
      obligatoriedadDoc: "RECOMMENDED",
      estadoDoc: "requiere-revision",
    });

    const { problemas } = validarPlugin(root);
    assert.ok(problemas.some((p) => p.includes("obligatoriedad no coincide")));
    assert.ok(problemas.some((p) => p.includes("estado no coincide")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("no reporta problema de obligatoriedad/estado cuando índice y doc coinciden", () => {
  const root = crearRootTemporal();
  try {
    escribirStandard(root, {
      clave: "algo",
      obligatoriedadIndex: "MANDATORY",
      estadoIndex: "vigente",
      obligatoriedadDoc: "MANDATORY",
      estadoDoc: "vigente",
    });

    const { problemas } = validarPlugin(root);
    assert.ok(!problemas.some((p) => p.includes("no coincide")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("detecta YAML inválido en templates/context-index.yaml", () => {
  const root = crearRootTemporal();
  try {
    copyFileSync(
      resolveFromRoot("schemas", "context-index.schema.json"),
      path.join(root, "schemas", "context-index.schema.json")
    );
    mkdirSync(path.join(root, "templates"), { recursive: true });
    writeFileSync(
      path.join(root, "templates", "context-index.yaml"),
      "architecture:\n  resumen: algo: con un colon sin comillas\n  path: docs/architecture/overview.md\n"
    );

    const { problemas } = validarPlugin(root);
    assert.ok(problemas.some((p) => p.includes("templates/context-index.yaml") && p.includes("YAML inválido")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("templates/context-index.yaml válido no genera problemas de esa sección", () => {
  const root = crearRootTemporal();
  try {
    copyFileSync(
      resolveFromRoot("schemas", "context-index.schema.json"),
      path.join(root, "schemas", "context-index.schema.json")
    );
    mkdirSync(path.join(root, "templates"), { recursive: true });
    writeYaml(path.join(root, "templates", "context-index.yaml"), {
      architecture: { resumen: "Arquitectura general.", path: "docs/architecture/overview.md" },
    });

    const { problemas } = validarPlugin(root);
    assert.ok(!problemas.some((p) => p.includes("templates/context-index.yaml")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
