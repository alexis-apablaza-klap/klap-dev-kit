import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

/**
 * Guard de la migración a aplicar_patch_memoria (contrato v2.0.0): targeted_sync queda
 * deprecated en schemas/knowledge-mcp/tools.json (sigue existiendo, ver ese test de
 * contrato), pero el workflow activo — documentador y trabajar-hu — no debe volver a
 * invocarla ni a describirla como su mecanismo de actualización de memoria.
 */
const ARCHIVOS_SIN_TARGETED_SYNC = [
  ["agents", "documentador.md"],
  ["skills", "trabajar-hu", "references", "fases.md"],
  ["skills", "documentar", "SKILL.md"],
];

for (const partes of ARCHIVOS_SIN_TARGETED_SYNC) {
  const ruta = partes.join("/");
  test(`${ruta} ya no referencia targeted_sync como mecanismo activo`, () => {
    const contenido = readFileSync(resolveFromRoot(...partes), "utf8");
    assert.ok(
      !contenido.includes("targeted_sync") && !contenido.includes("targeted-sync"),
      `${ruta} todavía menciona targeted_sync/targeted-sync`
    );
  });
}

test("agents/documentador.md entrega el contexto a documentador-klap en vez de escribir a Knowledge", () => {
  const contenido = readFileSync(resolveFromRoot("agents", "documentador.md"), "utf8");
  assert.ok(contenido.includes("documentador-klap"), "documentador.md debe referenciar a documentador-klap");
});
