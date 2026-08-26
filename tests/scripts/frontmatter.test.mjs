import test from "node:test";
import assert from "node:assert/strict";
import { leerFrontmatter } from "../../scripts/lib/frontmatter.mjs";

test("extrae y parsea el frontmatter YAML de un Markdown", () => {
  const contenido = "---\nname: analista\ndescription: Recopila contexto.\n---\n\n# Cuerpo\n";
  const fm = leerFrontmatter(contenido);
  assert.deepEqual(fm, { name: "analista", description: "Recopila contexto." });
});

test("devuelve null si no hay frontmatter", () => {
  const fm = leerFrontmatter("# Sólo un título\n\nSin frontmatter.");
  assert.equal(fm, null);
});

test("ignora contenido después del segundo delimitador", () => {
  const contenido = "---\nname: x\n---\nresto del documento\ncon ---\nlíneas\n";
  const fm = leerFrontmatter(contenido);
  assert.deepEqual(fm, { name: "x" });
});
