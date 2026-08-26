import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

/**
 * Raíz del plugin. En producción Claude Code exporta CLAUDE_PLUGIN_ROOT al invocar
 * hooks/scripts; en desarrollo local y en tests se resuelve desde la ubicación del
 * propio módulo, dos niveles arriba de scripts/lib/.
 */
export function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) return process.env.CLAUDE_PLUGIN_ROOT;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

export function resolveFromRoot(...segments) {
  return path.join(pluginRoot(), ...segments);
}

/**
 * True cuando el módulo que llama fue invocado directamente como CLI (`node archivo.mjs`),
 * no importado. `import.meta.url === \`file://${process.argv[1]}\`` falla en Windows porque
 * process.argv[1] es una ruta con backslashes sin porcentaje-codificar, no una file URL —
 * por eso se compara vía pathToFileURL en ambos lados.
 */
export function esPuntoDeEntrada(metaUrl) {
  if (!process.argv[1]) return false;
  return metaUrl === pathToFileURL(process.argv[1]).href;
}
