#!/usr/bin/env node
/**
 * Descubre candidatos a componente de un producto escaneando los repos ya clonados
 * localmente bajo `<memoria.workspace_root>/<producto>/*` — determinista, sin LLM, sin red.
 *
 * `agents/documentador-klap.md` no puede ejecutar esto (`disallowedTools: Bash`) — lo corre
 * la skill orquestadora (`memoria-inicializar`/`memoria-actualizar`) antes de invocar al
 * agente, mismo patrón que `scripts/memoria-git.mjs`.
 *
 * Este script NO consulta Klap Knowledge: en producción no hay MCP disponible fuera de la
 * sesión de Claude Code (ver la nota de `scripts/targeted-sync.mjs` sobre `mock_launch`).
 * El cruce con lo ya registrado (delta, componentes retirados, etc.) lo hace el agente, que
 * sí tiene la tool `obtener_producto` disponible en sesión — este script sólo aporta la
 * evidencia local, cruda y sin interpretar más allá de heurísticas deterministas de stack.
 *
 * Uso: node scripts/descubrir-componentes.mjs --producto <product_id>
 *   Escribe .klap/knowledge/<product_id>/componentes.json (gitignored, artefacto de sesión).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { cargarConfig } from "./lib/klap-config.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

export function parsearArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--producto") args.producto = argv[++i];
  }
  return args;
}

function remotoGit(repoPath) {
  try {
    return execFileSync("git", ["-C", repoPath, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

const NOMBRES_README = ["README.md", "readme.md", "Readme.md"];

export function primerParrafoReadme(repoPath) {
  for (const nombre of NOMBRES_README) {
    const ruta = path.join(repoPath, nombre);
    if (!existsSync(ruta)) continue;
    const lineas = readFileSync(ruta, "utf8").split(/\r?\n/);
    const parrafo = [];
    let empezo = false;
    for (const linea of lineas) {
      const limpia = linea.trim();
      if (!empezo) {
        // Salta título(s), badges e imágenes iniciales — busca el primer bloque de prosa real.
        if (!limpia || limpia.startsWith("#") || limpia.startsWith("!") || limpia.startsWith("[![")) continue;
        empezo = true;
      }
      if (empezo && !limpia) break;
      if (empezo) parrafo.push(limpia);
    }
    const texto = parrafo.join(" ").trim();
    if (texto) return texto;
  }
  return null;
}

// p.ej. java-21, spring-boot-4 (config/klap.yaml → stack_soportado) — aquí sólo detección de
// presencia de archivo, la versión exacta la confirma un humano, nunca se infiere del nombre.
const MARCADORES_STACK = [
  { archivo: "build.gradle", tecnologias: ["java", "gradle"] },
  { archivo: "build.gradle.kts", tecnologias: ["java", "gradle"] },
  { archivo: "pom.xml", tecnologias: ["java", "maven"] },
  { archivo: "serverless.yml", tecnologias: ["aws-lambda"] },
  { archivo: "package.json", tecnologias: ["node"] },
  { archivo: "requirements.txt", tecnologias: ["python"] },
  { archivo: "angular.json", tecnologias: ["angular", "typescript"] },
];

export function inferirStack(repoPath) {
  const tecnologias = new Set();
  for (const { archivo, tecnologias: tecs } of MARCADORES_STACK) {
    if (existsSync(path.join(repoPath, archivo))) tecs.forEach((t) => tecnologias.add(t));
  }
  return [...tecnologias].sort();
}

/**
 * `component_id` es un slug interno de Klap Knowledge (`^[a-z0-9][a-z0-9-]*$`, contrato
 * v2.3.0) — nunca se relaja el patrón para nombres de repo reales, se normaliza. El nombre
 * real (con `_`, mayúsculas, etc.) se preserva sin tocar en `repository`.
 */
export function normalizarComponentId(nombreRepo) {
  return nombreRepo
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function evaluarConfianza({ remoto, readme, stack }) {
  if (!remoto) return "baja";
  if (!readme || readme.length < 40) return "baja";
  if (stack.length === 0) return "media";
  return "alta";
}

/**
 * Escanea `<workspaceRoot>/<producto>/*` y devuelve un candidato por carpeta que sea un
 * checkout git real (tiene `.git`) — ignora placeholders sin working tree y no-directorios.
 */
export function descubrirComponentes(producto, { workspaceRoot }) {
  const carpetaProducto = path.join(workspaceRoot, producto);
  if (!existsSync(carpetaProducto)) {
    return {
      producto,
      candidatos: [],
      nota: `No existe ${carpetaProducto} — sin repos locales que escanear (revisar memoria.workspace_root en config/klap.yaml, o que el producto no tenga checkout local todavía).`,
    };
  }

  const candidatos = [];
  for (const entrada of readdirSync(carpetaProducto)) {
    const repoPath = path.join(carpetaProducto, entrada);
    if (!statSync(repoPath).isDirectory()) continue;
    if (!existsSync(path.join(repoPath, ".git"))) continue; // placeholder sin working tree

    const remoto = remotoGit(repoPath);
    const readme = primerParrafoReadme(repoPath);
    const stack = inferirStack(repoPath);

    candidatos.push({
      component_id: normalizarComponentId(entrada),
      repository: entrada,
      remote: remoto,
      name: entrada,
      summary_hint: readme,
      tecnologias: stack,
      evidencia: [
        remoto ? { type: "repo", ref: remoto } : null,
        readme ? { type: "repo", ref: `${entrada}/README.md` } : null,
      ].filter(Boolean),
      confianza: evaluarConfianza({ remoto, readme, stack }),
    });
  }

  candidatos.sort((a, b) => a.component_id.localeCompare(b.component_id));
  return { producto, candidatos };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const { producto } = parsearArgs(process.argv.slice(2));
  if (!producto) {
    console.error("Uso: node scripts/descubrir-componentes.mjs --producto <product_id>");
    process.exit(1);
  }

  const config = cargarConfig();
  const workspaceRootRelativo = config.memoria?.workspace_root;
  if (!workspaceRootRelativo) {
    console.error(
      "config/klap.yaml no define memoria.workspace_root — indica la raíz del workspace " +
        "(carpeta que contiene las carpetas de cada producto, p.ej. C:\\klap-workspace)."
    );
    process.exit(2);
  }
  const workspaceRoot = path.resolve(resolveFromRoot(), workspaceRootRelativo);

  const resultado = descubrirComponentes(producto, { workspaceRoot });

  const salida = resolveFromRoot(".klap", "knowledge", producto, "componentes.json");
  mkdirSync(path.dirname(salida), { recursive: true });
  writeFileSync(salida, JSON.stringify(resultado, null, 2) + "\n", "utf8");

  console.log(`Escrito ${salida} (${resultado.candidatos.length} candidato(s))`);
  if (resultado.nota) console.log(resultado.nota);
}
