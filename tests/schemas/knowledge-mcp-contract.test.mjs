import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const contrato = JSON.parse(readFileSync(resolveFromRoot("schemas", "knowledge-mcp", "tools.json"), "utf8"));

const TOOLS_ESPERADAS = ["buscar_producto", "resumen_producto", "resumen_componente", "buscar", "documentos_relevantes", "targeted_sync"];

test("el contrato declara exactamente las 6 tools esperadas", () => {
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

test("targeted_sync es la única operación declarada como no-lectura", () => {
  assert.deepEqual(contrato.no_lectura, ["targeted_sync"]);
});
