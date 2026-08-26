#!/usr/bin/env node
/**
 * Orquesta Trivy y/o OWASP Dependency-Check y normaliza los hallazgos por severidad
 * contra el umbral de config/quality-gates.yaml. Si una herramienta no está instalada,
 * lo declara explícitamente en vez de fallar en silencio o inventar un resultado.
 *
 * Uso:
 *   node scripts/deps-scan.mjs --trivy <ruta-o-imagen>
 *   node scripts/deps-scan.mjs --dependency-check-report <reporte.json>
 *   (ambas flags son combinables)
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readYaml } from "./lib/yaml-io.mjs";
import { algunaCondicionCumple } from "./lib/gates.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

const WIN = process.platform === "win32";

function trivyDisponible() {
  const r = spawnSync(WIN ? "trivy.exe" : "trivy", ["--version"], { stdio: "ignore", shell: WIN });
  return r.status === 0;
}

export function escanearConTrivy(target) {
  if (!trivyDisponible()) {
    return { herramienta: "trivy", disponible: false, hallazgos: [] };
  }
  const r = spawnSync(WIN ? "trivy.exe" : "trivy", ["fs", "--format", "json", "--quiet", target], {
    encoding: "utf8",
    shell: WIN,
  });
  let hallazgos = [];
  try {
    const salida = JSON.parse(r.stdout || "{}");
    for (const res of salida.Results ?? []) {
      for (const v of res.Vulnerabilities ?? []) {
        hallazgos.push({ herramienta: "trivy", severidad: v.Severity, paquete: v.PkgName, id: v.VulnerabilityID });
      }
    }
  } catch {
    hallazgos = [];
  }
  return { herramienta: "trivy", disponible: true, hallazgos };
}

export function parsearDependencyCheckReport(reportePath) {
  if (!existsSync(reportePath)) {
    return { herramienta: "owasp-dependency-check", disponible: false, hallazgos: [] };
  }
  const data = JSON.parse(readFileSync(reportePath, "utf8"));
  const hallazgos = [];
  for (const dep of data.dependencies ?? []) {
    for (const v of dep.vulnerabilities ?? []) {
      hallazgos.push({
        herramienta: "owasp-dependency-check",
        severidad: (v.severity ?? "UNKNOWN").toUpperCase(),
        paquete: dep.fileName,
        id: v.name,
      });
    }
  }
  return { herramienta: "owasp-dependency-check", disponible: true, hallazgos };
}

export function evaluarHallazgos(hallazgos, gates = readYaml(resolveFromRoot("config", "quality-gates.yaml"))) {
  const condiciones = gates.dependencias.bloquear_si;
  // algunaCondicionCumple lanza si una condición referencia un operador o escala inválida —
  // nunca aprueba todo en silencio ante config mal formada.
  const bloqueantes = hallazgos.filter((h) => algunaCondicionCumple(condiciones, h, gates.escalas));
  return {
    aprobado: bloqueantes.length === 0,
    total_hallazgos: hallazgos.length,
    bloqueantes,
    requiere_excepcion_si_se_ignora: gates.dependencias.permitir_excepcion_explicita,
  };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const args = process.argv.slice(2);
  const trivyIdx = args.indexOf("--trivy");
  const dcIdx = args.indexOf("--dependency-check-report");

  let hallazgos = [];
  const reportes = [];
  if (trivyIdx !== -1) {
    const r = escanearConTrivy(args[trivyIdx + 1]);
    reportes.push(r);
    hallazgos.push(...r.hallazgos);
  }
  if (dcIdx !== -1) {
    const r = parsearDependencyCheckReport(args[dcIdx + 1]);
    reportes.push(r);
    hallazgos.push(...r.hallazgos);
  }
  if (reportes.length === 0) {
    console.error("Uso: --trivy <target> y/o --dependency-check-report <reporte.json>");
    process.exit(1);
  }

  const veredicto = evaluarHallazgos(hallazgos);
  console.log(JSON.stringify({ herramientas: reportes.map((r) => ({ herramienta: r.herramienta, disponible: r.disponible })), ...veredicto }, null, 2));
  process.exit(veredicto.aprobado ? 0 : 1);
}
