#!/usr/bin/env node
/**
 * Escaneo determinista de secretos/credenciales. Usado por el hook pre-commit y por CI.
 * No reemplaza una herramienta dedicada (gitleaks/trufflehog) si Klap decide adoptar una;
 * cubre los patrones más comunes con cero dependencias mientras tanto.
 *
 * También incluye una heurística de PAN sin enmascarar dentro de una llamada de logging
 * (ver standards/seguridad/owasp-y-secretos.md) — no cubre PII en general, sólo el caso de
 * mayor riesgo regulatorio (PCI-DSS).
 *
 * Uso: node scripts/escanear-secretos.mjs [archivo]   (default: git diff --cached, stdin si no hay git)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { esPuntoDeEntrada } from "./lib/paths.mjs";

const PATRONES = [
  { tipo: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/g },
  { tipo: "AWS Secret Access Key (heurística)", regex: /aws(.{0,20})?(secret|access)[^\n]{0,20}['"][0-9a-zA-Z/+]{40}['"]/gi },
  { tipo: "Llave privada", regex: /-----BEGIN ((RSA|EC|DSA|OPENSSH) )?PRIVATE KEY-----/g },
  { tipo: "Token JWT", regex: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { tipo: "Slack token", regex: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
  { tipo: "API key genérica", regex: /(api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/gi },
  { tipo: "Secreto/token genérico", regex: /(secret|token)\s*[:=]\s*['"][a-zA-Z0-9_/+=]{16,}['"]/gi },
  { tipo: "Password en texto plano", regex: /(password|pwd)\s*[:=]\s*['"][^'"${}\s]{6,}['"]/gi },
  {
    tipo: "Posible PAN sin enmascarar en logging (heurística)",
    regex: /(?:log(?:ger)?\.(?:info|warn|error|debug|trace)|console\.log|system\.out\.print(?:ln)?)[^\n]{0,200}?\b\d{13,19}\b/gi,
  },
];

// No se incluye \$\{ aquí: los regex de PATRONES ya excluyen $/{/} de sus clases de
// caracteres, así que "${VAR:fallback}" nunca matchea por sí solo. Eximir la línea completa
// por contener "${" en cualquier parte (p.ej. un comentario) ocultaría un secreto real
// hardcodeado en la misma línea — verificado con "AKIA... // fallback for ${VAR}".
const IGNORAR_LINEA = /CHANGEME|changeme|example|placeholder|dummy|xxxx|\bAKIAEXAMPLE\b/i;

export function detectarSecretos(texto) {
  const hallazgos = [];
  const lineas = texto.split("\n");
  lineas.forEach((linea, idx) => {
    if (IGNORAR_LINEA.test(linea)) return;
    for (const { tipo, regex } of PATRONES) {
      regex.lastIndex = 0;
      const match = regex.exec(linea);
      if (match) {
        hallazgos.push({ tipo, linea: idx + 1, fragmento: linea.trim().slice(0, 120) });
      }
    }
  });
  return hallazgos;
}

function leerEntrada(argv) {
  if (argv[2]) return readFileSync(argv[2], "utf8");
  try {
    return execSync("git diff --cached", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

if (esPuntoDeEntrada(import.meta.url)) {
  const texto = leerEntrada(process.argv);
  const hallazgos = detectarSecretos(texto);
  if (hallazgos.length === 0) {
    console.log("OK: no se detectaron secretos.");
    process.exit(0);
  }
  console.error(`Se detectaron ${hallazgos.length} posible(s) secreto(s):`);
  for (const h of hallazgos) console.error(`  - [línea ${h.linea}] ${h.tipo}: ${h.fragmento}`);
  process.exit(1);
}
