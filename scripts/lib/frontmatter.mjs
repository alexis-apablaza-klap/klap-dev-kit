import { parse } from "yaml";

/** Extrae y parsea el frontmatter YAML (--- ... ---) de un archivo Markdown. */
export function leerFrontmatter(contenido) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(contenido);
  if (!match) return null;
  return parse(match[1]);
}
