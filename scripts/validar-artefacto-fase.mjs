#!/usr/bin/env node
/**
 * Chequeo estructural mínimo de los artefactos de fase de /klap:trabajar-hu (contexto.md,
 * analisis.md, diseno.md): siguen siendo prosa libre, pero deben contener los encabezados
 * `## ...` que sus agentes (agents/analista.md, agents/arquitecto.md) prometen — antes de
 * este script, esa promesa dependía por completo de que el LLM no se saltara una sección y de
 * que el humano lo notara leyendo con atención en la pausa de fase. El índice de contexto ya
 * tiene este tipo de chequeo determinista (validar-contexto.mjs); esto le da el mismo trato a
 * la prosa de fase.
 *
 * No valida contenido — sólo que cada sección requerida exista como encabezado `## Título`.
 *
 * Uso: node scripts/validar-artefacto-fase.mjs <contexto|analisis|diseno> <ruta-al-artefacto>
 */
import { existsSync, readFileSync } from "node:fs";
import { esPuntoDeEntrada } from "./lib/paths.mjs";

export const SECCIONES_REQUERIDAS = {
  contexto: ["## Fuentes consultadas", "## Contexto", "## No disponible"],
  analisis: ["## Hechos", "## Supuestos", "## Decisiones", "## Preguntas pendientes"],
  diseno: [
    "## Propuesta",
    "## Archivos y componentes afectados",
    "## Impacto en contratos",
    "## Riesgos y mitigación",
    "## Compatibilidad hacia atrás",
  ],
};

/** @returns {{ valido: boolean, faltantes: string[] }} */
export function validarArtefacto(tipo, contenido) {
  const requeridas = SECCIONES_REQUERIDAS[tipo];
  if (!requeridas) {
    throw new Error(`Tipo de artefacto desconocido: "${tipo}" (esperado: ${Object.keys(SECCIONES_REQUERIDAS).join("/")}).`);
  }
  const lineas = contenido.split(/\r?\n/).map((l) => l.trim());
  const faltantes = requeridas.filter((seccion) => !lineas.includes(seccion));
  return { valido: faltantes.length === 0, faltantes };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const [tipo, rutaArtefacto] = process.argv.slice(2);
  if (!tipo || !rutaArtefacto) {
    console.error("Uso: node scripts/validar-artefacto-fase.mjs <contexto|analisis|diseno> <ruta-al-artefacto>");
    process.exit(1);
  }
  if (!existsSync(rutaArtefacto)) {
    console.error(JSON.stringify({ valido: false, error: `No existe: ${rutaArtefacto}` }, null, 2));
    process.exit(1);
  }
  let resultado;
  try {
    resultado = validarArtefacto(tipo, readFileSync(rutaArtefacto, "utf8"));
  } catch (err) {
    console.error(JSON.stringify({ valido: false, error: err.message }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(resultado, null, 2));
  process.exit(resultado.valido ? 0 : 1);
}
