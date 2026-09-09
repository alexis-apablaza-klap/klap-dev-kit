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

function escribirConfigYContrato(root, { versionContrato, versionRegistrada }) {
  mkdirSync(path.join(root, "schemas", "knowledge-mcp"), { recursive: true });
  writeFileSync(
    path.join(root, "schemas", "knowledge-mcp", "tools.json"),
    JSON.stringify({ contractVersion: versionContrato, no_lectura: [], tools: [] })
  );
  writeYaml(path.join(root, "config", "klap.yaml"), {
    version: 1,
    mcp: {
      knowledge: { server: "klap-knowledge-local-mock", modo: "mock" },
      atlassian: { server: "claude_ai_Atlassian" },
    },
    stack_soportado: {},
    rutas: {
      standards_index: "standards/index.yaml",
      quality_gates: "config/quality-gates.yaml",
      context_index_schema: "schemas/context-index.schema.json",
      knowledge_mcp_contract: "schemas/knowledge-mcp/tools.json",
    },
    contratos: { knowledge_mcp: versionRegistrada },
  });
}

test("detecta contractVersion desalineado entre tools.json y config/klap.yaml", () => {
  const root = crearRootTemporal();
  try {
    mkdirSync(path.join(root, "config"), { recursive: true });
    copyFileSync(resolveFromRoot("schemas", "klap-config.schema.json"), path.join(root, "schemas", "klap-config.schema.json"));
    escribirConfigYContrato(root, { versionContrato: "1.0.0", versionRegistrada: "2.0.0" });

    const { problemas } = validarPlugin(root);
    assert.ok(problemas.some((p) => p.includes("contractVersion desalineado")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("no reporta problema de contractVersion cuando tools.json y config/klap.yaml coinciden", () => {
  const root = crearRootTemporal();
  try {
    mkdirSync(path.join(root, "config"), { recursive: true });
    copyFileSync(resolveFromRoot("schemas", "klap-config.schema.json"), path.join(root, "schemas", "klap-config.schema.json"));
    escribirConfigYContrato(root, { versionContrato: "1.0.0", versionRegistrada: "1.0.0" });

    const { problemas } = validarPlugin(root);
    assert.ok(!problemas.some((p) => p.includes("contractVersion")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function escribirAgente(root, nombreArchivo, frontmatterExtra = "") {
  mkdirSync(path.join(root, "agents"), { recursive: true });
  writeFileSync(
    path.join(root, "agents", nombreArchivo),
    `---\nname: agente-test\ndescription: Agente de prueba.\n${frontmatterExtra}---\n\nCuerpo del agente.\n`
  );
}

test("agente sin tools ni disallowedTools reporta que hereda todas las tools por omisión", () => {
  const root = crearRootTemporal();
  try {
    escribirAgente(root, "sin-restriccion.md");
    const { problemas } = validarPlugin(root);
    assert.ok(problemas.some((p) => p.includes("sin-restriccion.md") && p.includes("hereda todas las tools")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("agente con disallowedTools declarado no reporta problema de least privilege", () => {
  const root = crearRootTemporal();
  try {
    escribirAgente(root, "con-restriccion.md", "disallowedTools: Write, Edit, Bash\n");
    const { problemas } = validarPlugin(root);
    assert.ok(!problemas.some((p) => p.includes("con-restriccion.md")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("agente que declara mcpServers/hooks/permissionMode reporta que se ignoran en agentes de plugin", () => {
  const root = crearRootTemporal();
  try {
    escribirAgente(root, "con-campos-ignorados.md", "disallowedTools: Bash\nmcpServers: [algo]\nhooks: {}\npermissionMode: default\n");
    const { problemas } = validarPlugin(root);
    assert.ok(problemas.some((p) => p.includes("mcpServers")));
    assert.ok(problemas.some((p) => p.includes("hooks")));
    assert.ok(problemas.some((p) => p.includes("permissionMode")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

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
