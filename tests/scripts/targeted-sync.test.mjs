import test from "node:test";
import assert from "node:assert/strict";
import { parsearFuentes } from "../../scripts/targeted-sync.mjs";

test("parsea una sola fuente tipo:referencia", () => {
  const { fuentes, motivo } = parsearFuentes(["--fuente", "confluence:PAGE-123"]);
  assert.deepEqual(fuentes, [{ tipo: "confluence", referencia: "PAGE-123" }]);
  assert.equal(motivo, undefined);
});

test("parsea varias fuentes repetidas y el motivo", () => {
  const { fuentes, motivo } = parsearFuentes([
    "--fuente",
    "confluence:PAGE-123",
    "--fuente",
    "git-repo:ms-central-sva-anticipo-calculos",
    "--motivo",
    "cambio en el diseño de la HU",
  ]);
  assert.deepEqual(fuentes, [
    { tipo: "confluence", referencia: "PAGE-123" },
    { tipo: "git-repo", referencia: "ms-central-sva-anticipo-calculos" },
  ]);
  assert.equal(motivo, "cambio en el diseño de la HU");
});

test("reconstruye referencias con colons adicionales (ruta Windows con letra de unidad)", () => {
  const { fuentes } = parsearFuentes(["--fuente", "component-yaml:C:\\repo\\component.yaml"]);
  assert.deepEqual(fuentes, [{ tipo: "component-yaml", referencia: "C:\\repo\\component.yaml" }]);
});

test("sin --fuente devuelve lista vacía", () => {
  const { fuentes, motivo } = parsearFuentes(["--motivo", "sólo motivo, sin fuentes"]);
  assert.deepEqual(fuentes, []);
  assert.equal(motivo, "sólo motivo, sin fuentes");
});
