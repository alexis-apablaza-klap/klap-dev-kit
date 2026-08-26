import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/**
 * Valida `data` contra un JSON Schema ya cargado en memoria (objeto, no path).
 * Todos los schemas de klap-dev-kit declaran $schema draft/2020-12 — se usa la build
 * Ajv2020 (el `Ajv` por defecto sólo trae el meta-schema draft-07).
 * Se instancia un Ajv nuevo por llamada para evitar colisiones de $id
 * cuando el mismo schema se valida repetidamente en un mismo proceso (tests).
 * @returns {{ valido: boolean, errores: string[] }}
 */
export function validarObjeto(schema, data) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valido = validate(data);
  const errores = valido
    ? []
    : (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`);
  return { valido, errores };
}

/** Igual que `validarObjeto`, leyendo el schema desde un archivo `schemaPath`. */
export function validar(schemaPath, data) {
  return validarObjeto(JSON.parse(readFileSync(schemaPath, "utf8")), data);
}
