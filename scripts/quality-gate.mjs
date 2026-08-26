#!/usr/bin/env node
/**
 * Juzga un reporte de métricas (coverage + Sonar + tests) contra config/quality-gates.yaml.
 * No recolecta las métricas — eso lo hace el agente `certificador` a partir de JaCoCo/Sonar/
 * el runner de tests — este script sólo aplica el umbral de forma determinista.
 *
 * Uso: node scripts/quality-gate.mjs <reporte.json>
 * reporte.json: {
 *   coverage_porcentaje: number,
 *   sonar: { bugs_nuevos, vulnerabilities_nuevas, security_hotspots_sin_revisar, rating_mantenibilidad, quality_gate_status },
 *   tests: { total, fallidos }
 * }
 */
import { readFileSync } from "node:fs";
import { readYaml } from "./lib/yaml-io.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

const RATING_ORDEN = ["A", "B", "C", "D", "E"];

export function evaluarGate(reporte, gates = readYaml(resolveFromRoot("config", "quality-gates.yaml"))) {
  const motivos = [];

  if (gates.tests.bloquear_si_falla_alguno && reporte.tests?.fallidos > 0) {
    motivos.push(`${reporte.tests.fallidos} test(s) fallando de ${reporte.tests.total}.`);
  }

  if (typeof reporte.coverage_porcentaje === "number" && reporte.coverage_porcentaje < gates.coverage.minimo_porcentaje) {
    motivos.push(`Coverage ${reporte.coverage_porcentaje}% bajo el mínimo ${gates.coverage.minimo_porcentaje}%.`);
  }

  const s = reporte.sonar ?? {};
  if (gates.sonarqube.quality_gate_debe_pasar && s.quality_gate_status && s.quality_gate_status !== "OK") {
    motivos.push(`Sonar Quality Gate: ${s.quality_gate_status}.`);
  }
  // Los 3 chequeos ">0" de gates.sonarqube.bloquear_si no tienen umbral configurable (siempre
  // ">0" en el YAML) — no hay nada que leer dinámicamente ahí. Sólo rating_mantenibilidad_peor_que
  // tiene un valor real que puede cambiar, por eso es el único que se lee de `gates` abajo.
  if ((s.bugs_nuevos ?? 0) > 0) motivos.push(`${s.bugs_nuevos} bug(s) nuevo(s) en Sonar.`);
  if ((s.vulnerabilities_nuevas ?? 0) > 0) motivos.push(`${s.vulnerabilities_nuevas} vulnerabilidad(es) nueva(s) en Sonar.`);
  if ((s.security_hotspots_sin_revisar ?? 0) > 0) motivos.push(`${s.security_hotspots_sin_revisar} security hotspot(s) sin revisar.`);
  const entradaRating = (gates.sonarqube.bloquear_si ?? []).find(
    (e) => typeof e === "object" && e !== null && "rating_mantenibilidad_peor_que" in e
  );
  const ratingMinimo = entradaRating?.rating_mantenibilidad_peor_que ?? "A";
  if (s.rating_mantenibilidad && RATING_ORDEN.indexOf(s.rating_mantenibilidad) > RATING_ORDEN.indexOf(ratingMinimo)) {
    motivos.push(`Rating de mantenibilidad ${s.rating_mantenibilidad}, peor que ${ratingMinimo}.`);
  }

  return { aprobado: motivos.length === 0, motivos, evaluado_en: new Date().toISOString() };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const reportePath = process.argv[2];
  if (!reportePath) {
    console.error("Uso: node scripts/quality-gate.mjs <reporte.json>");
    process.exit(1);
  }
  const reporte = JSON.parse(readFileSync(reportePath, "utf8"));
  const veredicto = evaluarGate(reporte);
  console.log(JSON.stringify(veredicto, null, 2));
  process.exit(veredicto.aprobado ? 0 : 1);
}
