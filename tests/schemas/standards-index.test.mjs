import test from "node:test";
import assert from "node:assert/strict";
import { validar } from "../../scripts/lib/schema-validate.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const schemaPath = resolveFromRoot("schemas", "standards-index.schema.json");

test("entrada de standards/index.yaml mínima válida pasa el schema", () => {
  const data = {
    "kafka-config": {
      resumen: "Convenciones de configuración de Kafka.",
      path: "standards/mensajeria/kafka-config.md",
      obligatoriedad: "MANDATORY",
      estado: "vigente",
      tags: ["kafka"],
    },
  };
  const { valido, errores } = validar(schemaPath, data);
  assert.equal(valido, true, JSON.stringify(errores));
});

test("obligatoriedad fuera del enum falla", () => {
  const data = {
    "kafka-config": {
      resumen: "x",
      path: "standards/mensajeria/kafka-config.md",
      obligatoriedad: "OBLIGATORIO",
      estado: "vigente",
    },
  };
  const { valido } = validar(schemaPath, data);
  assert.equal(valido, false);
});

test("falta estado (requerido) falla", () => {
  const data = {
    "kafka-config": {
      resumen: "x",
      path: "standards/mensajeria/kafka-config.md",
      obligatoriedad: "MANDATORY",
    },
  };
  const { valido } = validar(schemaPath, data);
  assert.equal(valido, false);
});
