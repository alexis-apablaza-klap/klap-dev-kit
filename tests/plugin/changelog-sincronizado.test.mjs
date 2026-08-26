import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readYaml } from "../../scripts/lib/yaml-io.mjs";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

/**
 * Guard contra la clase de bug encontrada en el propio análisis de propuestas-mejora.md:
 * CHANGELOG.md → "Pendiente para 1.0.0" describía un estado que Etapa 2 ya había resuelto.
 * Este test no verifica el texto del CHANGELOG (es prosa libre) — sólo que cada estándar
 * todavía en `estado: requiere-revision` esté nombrado ahí. Cuando el equipo complete uno,
 * este test falla hasta que el CHANGELOG se actualice en el mismo commit.
 */
test("cada standard en estado: requiere-revision está citado en CHANGELOG.md → Pendiente para 1.0.0", () => {
  const indice = readYaml(resolveFromRoot("standards", "index.yaml"));
  const pendientes = Object.entries(indice)
    .filter(([, entrada]) => entrada.estado === "requiere-revision")
    .map(([clave, entrada]) => ({ clave, path: entrada.path }));

  const changelog = readFileSync(resolveFromRoot("CHANGELOG.md"), "utf8");
  const seccionPendiente = changelog.split(/^### Pendiente para 1\.0\.0$/m)[1] ?? "";

  const faltantes = pendientes.filter(({ path }) => !seccionPendiente.includes(path));
  assert.deepEqual(
    faltantes,
    [],
    `standards en requiere-revision no citados en CHANGELOG.md → Pendiente para 1.0.0: ${JSON.stringify(faltantes)}`
  );
});
