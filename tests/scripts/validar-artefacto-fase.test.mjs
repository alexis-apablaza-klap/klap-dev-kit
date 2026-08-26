import test from "node:test";
import assert from "node:assert/strict";
import { validarArtefacto, SECCIONES_REQUERIDAS } from "../../scripts/validar-artefacto-fase.mjs";

test("analisis.md completo (las 4 secciones) es válido", () => {
  const contenido = `# Análisis\n\n## Hechos\n- algo\n\n## Supuestos\n- algo\n\n## Decisiones\n- algo\n\n## Preguntas pendientes\nNinguna.\n`;
  const { valido, faltantes } = validarArtefacto("analisis", contenido);
  assert.equal(valido, true, JSON.stringify(faltantes));
});

test("analisis.md sin ## Supuestos reporta esa sección como faltante", () => {
  const contenido = `## Hechos\n- algo\n\n## Decisiones\n- algo\n\n## Preguntas pendientes\nNinguna.\n`;
  const { valido, faltantes } = validarArtefacto("analisis", contenido);
  assert.equal(valido, false);
  assert.deepEqual(faltantes, ["## Supuestos"]);
});

test("contexto.md completo (Fuentes consultadas/Contexto/No disponible) es válido", () => {
  const contenido = `## Fuentes consultadas\n- Jira\n\n## Contexto\nAlgo.\n\n## No disponible\nNada.\n`;
  const { valido } = validarArtefacto("contexto", contenido);
  assert.equal(valido, true);
});

test("diseno.md completo (las 5 secciones) es válido", () => {
  const contenido = SECCIONES_REQUERIDAS.diseno.map((s) => `${s}\nContenido.\n`).join("\n");
  const { valido, faltantes } = validarArtefacto("diseno", contenido);
  assert.equal(valido, true, JSON.stringify(faltantes));
});

test("diseno.md sin Compatibilidad hacia atrás reporta esa sección como faltante", () => {
  const contenido = SECCIONES_REQUERIDAS.diseno
    .filter((s) => s !== "## Compatibilidad hacia atrás")
    .map((s) => `${s}\nContenido.\n`)
    .join("\n");
  const { valido, faltantes } = validarArtefacto("diseno", contenido);
  assert.equal(valido, false);
  assert.deepEqual(faltantes, ["## Compatibilidad hacia atrás"]);
});

test("tipo de artefacto desconocido lanza en vez de aprobar en silencio", () => {
  assert.throws(() => validarArtefacto("resumen", "## algo\n"), /Tipo de artefacto desconocido/);
});

test("un encabezado dentro de una línea de prosa no cuenta como sección (evita falsos positivos)", () => {
  const contenido = `Este texto menciona ## Hechos dentro de una oración, no como encabezado.\n`;
  const { valido, faltantes } = validarArtefacto("analisis", contenido);
  assert.equal(valido, false);
  assert.ok(faltantes.includes("## Hechos"));
});
