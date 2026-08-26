import { resolveFromRoot } from "./paths.mjs";
import { readYaml } from "./yaml-io.mjs";
import { validar } from "./schema-validate.mjs";

let cache = null;

/** Carga y valida config/klap.yaml. Lanza si es inválido — es la única fuente de verdad. */
export function cargarConfig() {
  if (cache) return cache;
  const configPath = resolveFromRoot("config", "klap.yaml");
  const schemaPath = resolveFromRoot("schemas", "klap-config.schema.json");
  const data = readYaml(configPath);
  if (!data) throw new Error(`No se encontró ${configPath}`);
  const { valido, errores } = validar(schemaPath, data);
  if (!valido) {
    throw new Error(`config/klap.yaml inválido:\n${errores.join("\n")}`);
  }
  cache = data;
  return data;
}
