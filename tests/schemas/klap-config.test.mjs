import test from "node:test";
import assert from "node:assert/strict";
import { validar } from "../../scripts/lib/schema-validate.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";
import { readYaml } from "../../scripts/lib/yaml-io.mjs";

const schemaPath = resolveFromRoot("schemas", "klap-config.schema.json");

const configMinima = {
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
  contratos: {
    knowledge_mcp: "1.0.0",
  },
};

test("config mínima válida pasa el schema", () => {
  const { valido, errores } = validar(schemaPath, configMinima);
  assert.equal(valido, true, JSON.stringify(errores));
});

test("modo fuera del enum (mock|produccion) falla", () => {
  const invalido = { ...configMinima, mcp: { ...configMinima.mcp, knowledge: { server: "x", modo: "staging" } } };
  const { valido } = validar(schemaPath, invalido);
  assert.equal(valido, false);
});

test("falta mcp.atlassian (requerido) falla", () => {
  const { atlassian, ...sinAtlassian } = configMinima.mcp;
  const invalido = { ...configMinima, mcp: sinAtlassian };
  const { valido } = validar(schemaPath, invalido);
  assert.equal(valido, false);
});

test("falta contratos (requerido) falla", () => {
  const { contratos, ...sinContratos } = configMinima;
  const { valido } = validar(schemaPath, sinContratos);
  assert.equal(valido, false);
});

test("contratos.knowledge_mcp fuera de formato semver falla", () => {
  const invalido = { ...configMinima, contratos: { knowledge_mcp: "v1" } };
  const { valido } = validar(schemaPath, invalido);
  assert.equal(valido, false);
});

test("memoria.repo_path es opcional pero valida como string si está presente", () => {
  const conMemoria = { ...configMinima, memoria: { repo_path: "../klap-dev-kit-knowledge" } };
  const { valido, errores } = validar(schemaPath, conMemoria);
  assert.equal(valido, true, JSON.stringify(errores));
});

test("memoria.repo_path no-string falla", () => {
  const invalido = { ...configMinima, memoria: { repo_path: 123 } };
  const { valido } = validar(schemaPath, invalido);
  assert.equal(valido, false);
});

test("config/klap.yaml real del repo es válida contra su propio schema", () => {
  const real = readYaml(resolveFromRoot("config", "klap.yaml"));
  const { valido, errores } = validar(schemaPath, real);
  assert.equal(valido, true, JSON.stringify(errores));
});
