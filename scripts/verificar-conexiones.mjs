#!/usr/bin/env node
/**
 * Avisa qué conexiones del kit están incompletas por falta de una variable de entorno.
 *
 * Las variables NO están hardcodeadas aquí: salen de `config/klap.yaml` → `mcp.*.requiere_env`,
 * la misma fuente de verdad que usan los agentes. Agregar una conexión nueva con su
 * `requiere_env` basta para que este script la cubra, sin tocar este archivo.
 *
 * Es un aviso, no un gate: siempre sale con código 0 y no imprime nada cuando está todo
 * configurado. Lo invoca el hook SessionStart (hooks/hooks.json) y bootstrap/install.*.
 *
 * Uso: node scripts/verificar-conexiones.mjs [--json]
 */
import { cargarConfig } from "./lib/klap-config.mjs";
import { esPuntoDeEntrada } from "./lib/paths.mjs";

/**
 * Qué se pierde cuando falta cada conexión. Es lo único específico por servidor que vive aquí:
 * el impacto funcional no está en config/klap.yaml y sin él el aviso sería "falta una variable"
 * a secas, que no le dice al dev si puede seguir trabajando o no.
 */
const IMPACTO = {
  knowledge: "la memoria organizacional de producto — las fases 1 y 8 degradan y /klap:memoria-inicializar se detiene",
  sonarqube: "las métricas de calidad — /klap:certificar aprueba sin poder verificar el Quality Gate",
  atlassian: "Jira, Confluence y Bitbucket — la fase 1 no puede resolver la HU",
  context7: "la documentación en vivo de librerías — la fase 3 usa documentación oficial como respaldo",
};

/** Revisa `mcp.*.requiere_env` de la config contra el entorno dado. */
export function revisarConexiones(config, env = process.env) {
  const faltantes = [];
  for (const [clave, conexion] of Object.entries(config?.mcp ?? {})) {
    for (const variable of conexion?.requiere_env ?? []) {
      if (env[variable]) continue;
      faltantes.push({
        conexion: clave,
        variable,
        servidor: conexion.server,
        impacto: IMPACTO[clave] ?? "esta conexión no estará disponible",
        obtener: conexion.obtener_credencial ?? null,
      });
    }
  }
  return faltantes;
}

/** Texto que ve el dev. Vacío cuando no falta nada — el silencio es el caso bueno. */
export function formatear(faltantes) {
  if (faltantes.length === 0) return "";
  const lineas = [
    `⚠ Klap Dev-Kit: ${faltantes.length} conexión(es) sin configurar.`,
    "",
  ];
  for (const f of faltantes) {
    lineas.push(`  ${f.conexion} — falta ${f.variable}`);
    lineas.push(`    Sin ella pierdes ${f.impacto}.`);
    if (f.obtener) lineas.push(`    Credencial: ${f.obtener}`);
    lineas.push("");
  }
  lineas.push("  Defínelas como variables de USUARIO (persisten entre sesiones):");
  lineas.push('    Windows    setx KLAP_EJEMPLO "valor"        (abre una terminal nueva después)');
  lineas.push('    Linux/Mac  export KLAP_EJEMPLO="valor"      en ~/.bashrc o ~/.zshrc');
  lineas.push("");
  lineas.push("  También sirve el bloque `env` de tu settings.json de Claude Code.");
  lineas.push("  Detalle de cada conexión: docs/conexiones.md");
  return lineas.join("\n");
}

if (esPuntoDeEntrada(import.meta.url)) {
  const faltantes = revisarConexiones(cargarConfig());
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ faltantes }, null, 2));
  } else {
    // stdout, no stderr: es un aviso informativo, no un fallo. Además, redirigir stderr de un
    // ejecutable nativo en PowerShell 5.1 lo envuelve en un NativeCommandError y hace que
    // bootstrap/install.ps1 termine en error aunque todo haya ido bien.
    const salida = formatear(faltantes);
    if (salida) console.log(salida);
  }
  // Nunca falla: una credencial ausente degrada el kit, no impide usarlo.
  process.exit(0);
}
