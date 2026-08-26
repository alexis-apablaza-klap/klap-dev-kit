import test from "node:test";
import assert from "node:assert/strict";
import { validar } from "../../scripts/lib/schema-validate.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const schemaPath = resolveFromRoot("schemas", "component.schema.json");

const componenteValido = {
  componente: "ms-central-sva-anticipo-calculos",
  repositorio: { url: "https://github.com/klap-cl/ms-central-sva-anticipo-calculos" },
  productos: [{ nombre: "abono-ya", fase: "fase-1" }],
  capabilities: ["calculo-anticipo"],
  tecnologias: ["java-21", "spring-boot-4"],
  klap_knowledge: { component_id: "ms-central-sva-anticipo-calculos" },
};

test("component.yaml mínimo válido pasa el schema", () => {
  const { valido, errores } = validar(schemaPath, componenteValido);
  assert.equal(valido, true, JSON.stringify(errores));
});

test("component.yaml sin campo requerido (componente) falla", () => {
  const { componente, ...sinComponente } = componenteValido;
  const { valido } = validar(schemaPath, sinComponente);
  assert.equal(valido, false);
});

test("component.yaml con tecnologias vacío falla (minItems: 1)", () => {
  const invalido = { ...componenteValido, tecnologias: [] };
  const { valido } = validar(schemaPath, invalido);
  assert.equal(valido, false);
});

test("component.yaml con fase de producto fuera del enum falla", () => {
  const invalido = { ...componenteValido, productos: [{ nombre: "abono-ya", fase: "produccion-total" }] };
  const { valido } = validar(schemaPath, invalido);
  assert.equal(valido, false);
});
