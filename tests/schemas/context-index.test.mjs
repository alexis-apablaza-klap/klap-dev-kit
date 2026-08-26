import test from "node:test";
import assert from "node:assert/strict";
import { validar } from "../../scripts/lib/schema-validate.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const schemaPath = resolveFromRoot("schemas", "context-index.schema.json");

test("índice de contexto mínimo válido pasa el schema", () => {
  const data = {
    architecture: {
      resumen: "Arquitectura general del componente.",
      path: "docs/architecture/overview.md",
      tags: ["architecture"],
    },
  };
  const { valido, errores } = validar(schemaPath, data);
  assert.equal(valido, true, JSON.stringify(errores));
});

test("índice vacío falla (minProperties: 1)", () => {
  const { valido } = validar(schemaPath, {});
  assert.equal(valido, false);
});

test("entrada sin path falla (path es requerido)", () => {
  const data = { architecture: { resumen: "Falta el path." } };
  const { valido } = validar(schemaPath, data);
  assert.equal(valido, false);
});

test("entrada con propiedad no declarada falla (additionalProperties: false)", () => {
  const data = {
    architecture: {
      resumen: "Arquitectura general del componente.",
      path: "docs/architecture/overview.md",
      autor: "alguien",
    },
  };
  const { valido } = validar(schemaPath, data);
  assert.equal(valido, false);
});
