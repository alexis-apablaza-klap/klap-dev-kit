#!/usr/bin/env node
/**
 * Juzga un reporte de métricas (coverage + Sonar + tests) contra config/quality-gates.yaml.
 * No recolecta las métricas — eso lo hace el agente `certificador` a partir de JaCoCo/Sonar/
 * el runner de tests — este script sólo aplica el umbral de forma determinista.
 *
 * Uso: node scripts/quality-gate.mjs <reporte.json>
 * reporte.json: {
 *   coverage_porcentaje: number, // sólo unit tests — ver gates.coverage.alcance
 *   mutation_score?: number, // opcional — sólo se evalúa si el repo corre PIT/Stryker
 *   sonar: { bugs_nuevos, vulnerabilities_nuevas, security_hotspots_sin_revisar, rating_mantenibilidad, quality_gate_status },
 *   tests: { total, fallidos }
 * }
 */
import { readFileSync } from "node:fs";
import { readYaml } from "./lib/yaml-io.mjs";
import { evaluarCondiciones } from "./lib/gates.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

export function evaluarGate(reporte, gates = readYaml(resolveFromRoot("config", "quality-gates.yaml"))) {
  const motivos = [];
  const advertencias = [];

  if (gates.tests.bloquear_si_falla_alguno && reporte.tests?.fallidos > 0) {
    motivos.push(`${reporte.tests.fallidos} test(s) fallando de ${reporte.tests.total}.`);
  }

  if (typeof reporte.coverage_porcentaje === "number" && reporte.coverage_porcentaje < gates.coverage.minimo_porcentaje) {
    motivos.push(`Coverage de unit tests ${reporte.coverage_porcentaje}% bajo el mínimo ${gates.coverage.minimo_porcentaje}%.`);
  }

  // Sólo bloquea si el repo reportó mutation_score (no todos corren PIT/Stryker todavía) —
  // dato no reportado no es lo mismo que violación del umbral, igual criterio que gates.mjs.
  if (typeof reporte.mutation_score === "number" && reporte.mutation_score < gates.mutacion.minimo_score) {
    motivos.push(`Mutation score ${reporte.mutation_score}% bajo el mínimo ${gates.mutacion.minimo_score}%.`);
  }

  const s = reporte.sonar ?? {};
  // `quality_gate_debe_pasar: true` declara Sonar como obligatorio, pero un reporte sin métricas
  // pasaba de largo sin evaluarse: la dimensión aprobaba sin verificarse. No bloquea (un repo
  // puede no estar todavía en SonarCloud), pero deja de ser silencioso.
  if (gates.sonarqube.quality_gate_debe_pasar && !s.quality_gate_status) {
    advertencias.push(
      "Sin métricas de Sonar: el Quality Gate no se verificó. Causas típicas: falta KLAP_SONARQUBE_TOKEN " +
        "(ver docs/conexiones.md), o el proyecto aún no tiene análisis publicado en SonarCloud — el análisis " +
        "lo produce el pipeline de Jenkins del repo (desa o qa), no se corre en local."
    );
  }
  if (gates.sonarqube.quality_gate_debe_pasar && s.quality_gate_status && s.quality_gate_status !== "OK") {
    motivos.push(`Sonar Quality Gate: ${s.quality_gate_status}.`);
  }
  // Cada condición de gates.sonarqube.bloquear_si (bugs_nuevos, vulnerabilities_nuevas,
  // security_hotspots_sin_revisar, rating_mantenibilidad) se evalúa genéricamente contra `s` —
  // agregar o cambiar un umbral es editar sólo config/quality-gates.yaml.
  motivos.push(...evaluarCondiciones(gates.sonarqube.bloquear_si, s, gates.escalas));

  // `advertencias` no participa del veredicto: son cosas que el certificador debe reportar tal
  // cual, no razones para reprobar.
  return { aprobado: motivos.length === 0, motivos, advertencias, evaluado_en: new Date().toISOString() };
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
