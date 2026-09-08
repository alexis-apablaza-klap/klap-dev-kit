import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";
import { readYaml } from "../../scripts/lib/yaml-io.mjs";

const contrato = JSON.parse(readFileSync(resolveFromRoot("schemas", "knowledge-mcp", "tools.json"), "utf8"));

const TOOLS_ESPERADAS = [
  "buscar_producto",
  "resumen_producto",
  "resumen_componente",
  "buscar",
  "documentos_relevantes",
  "obtener_producto",
  "historial_producto",
  "estado_fuentes",
  "aplicar_patch_memoria",
  "targeted_sync",
];

test("el contrato declara exactamente las 10 tools esperadas", () => {
  const nombres = contrato.tools.map((t) => t.name).sort();
  assert.deepEqual(nombres, [...TOOLS_ESPERADAS].sort());
});

test("cada tool tiene name, description, inputSchema y outputSchema", () => {
  for (const tool of contrato.tools) {
    assert.ok(typeof tool.name === "string" && tool.name.length > 0, `tool sin name: ${JSON.stringify(tool)}`);
    assert.ok(typeof tool.description === "string" && tool.description.length > 0, `${tool.name}: sin description`);
    assert.ok(tool.inputSchema && typeof tool.inputSchema === "object", `${tool.name}: sin inputSchema`);
    assert.ok(tool.outputSchema && typeof tool.outputSchema === "object", `${tool.name}: sin outputSchema`);
  }
});

test("aplicar_patch_memoria y targeted_sync son las operaciones declaradas como no-lectura", () => {
  assert.deepEqual([...contrato.no_lectura].sort(), ["aplicar_patch_memoria", "targeted_sync"]);
});

test("targeted_sync está marcada deprecated y sigue declarando su contrato completo", () => {
  const tool = contrato.tools.find((t) => t.name === "targeted_sync");
  assert.equal(tool.deprecated, true);
  assert.ok(tool.inputSchema && tool.outputSchema);
});

test("contractVersion está presente y es semver", () => {
  assert.match(contrato.contractVersion, /^\d+\.\d+\.\d+$/);
});

test("contractVersion coincide con config/klap.yaml → contratos.knowledge_mcp", () => {
  const config = readYaml(resolveFromRoot("config", "klap.yaml"));
  assert.equal(contrato.contractVersion, config.contratos.knowledge_mcp);
});
