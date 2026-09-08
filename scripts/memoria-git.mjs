#!/usr/bin/env node
/**
 * Deja un cambio ya aplicado en la memoria de un producto (klap-dev-kit-knowledge, vía
 * aplicar_patch_memoria) en una rama `producto/<product_id>` con PR hacia `main`.
 *
 * El servicio de memoria nunca hace git por su cuenta (store.py sólo escribe archivos en
 * memory/ — ver klap-dev-kit-knowledge/guia-usuario.md). Este script es quien cierra ese
 * ciclo desde el lado del Dev-Kit: agents/documentador-klap.md no puede ejecutarlo (tiene
 * `disallowedTools: Bash`), así que lo invoca el orquestador de /klap:trabajar-hu (fase 8) o
 * las skills memoria-inicializar/memoria-actualizar, después de un aplicar_patch_memoria con
 * `applied: true`.
 *
 * El merge del PR hacia main NUNCA se automatiza aquí — queda para revisión humana (además,
 * GitHub rechaza aprobar el propio PR).
 *
 * Uso:
 *   node scripts/memoria-git.mjs --producto <product_id> [--issue <ISSUE-KEY>]
 *     [--motivo "texto"] [--changed-files "products/x/product.yaml,products/x/sources.yaml"]
 *     [--base main] [--repo <ruta-absoluta-al-checkout>]
 *
 * Sin --changed-files, hace `git add -A -- memory/` (store.py sólo escribe bajo memory/).
 * Requiere `gh` autenticado para crear el PR; si no está disponible, deja la rama pusheada y
 * lo declara explícitamente en la salida en vez de fallar en silencio.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { cargarConfig } from "./lib/klap-config.mjs";
import { resolveFromRoot, esPuntoDeEntrada } from "./lib/paths.mjs";

const WIN = process.platform === "win32";

export function parsearArgs(argv) {
  const args = { base: "main" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--producto") args.producto = argv[++i];
    else if (flag === "--issue") args.issue = argv[++i];
    else if (flag === "--motivo") args.motivo = argv[++i];
    else if (flag === "--base") args.base = argv[++i];
    else if (flag === "--repo") args.repo = argv[++i];
    else if (flag === "--changed-files") {
      args.changedFiles = argv[++i]
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }
  return args;
}

export function nombreRama(producto) {
  return `producto/${producto}`;
}

export function mensajeCommit({ producto, issue, motivo }) {
  const encabezado = issue
    ? `memoria(${producto}): actualiza memoria de producto (${issue})`
    : `memoria(${producto}): actualiza memoria de producto`;
  return motivo ? `${encabezado}\n\n${motivo}` : encabezado;
}

export function tituloPr({ producto, issue }) {
  return issue ? `memoria(${producto}): ${issue}` : `memoria(${producto}): actualización de memoria`;
}

export function cuerpoPr({ producto, issue, motivo }) {
  const lineas = [
    `Actualización de memoria de producto para \`${producto}\`, aplicada vía \`aplicar_patch_memoria\`.`,
  ];
  if (issue) lineas.push(`Origen: ${issue}`);
  if (motivo) lineas.push("", motivo);
  lineas.push("", "Generado por `scripts/memoria-git.mjs` (klap-dev-kit). Revisión humana antes del merge.");
  return lineas.join("\n");
}

// git y gh son ejecutables reales (git.exe/gh.exe en PATH) — a diferencia de un script npm,
// no necesitan pasar por el shell para resolverse en Windows. Es deliberado NO usar
// `shell: true` aquí: un mensaje de commit o cuerpo de PR con saltos de línea (habitual, ver
// mensajeCommit/cuerpoPr) se rompe si cmd.exe tiene que reparsear la línea de comando — cada
// argumento debe llegar intacto al proceso, no re-tokenizado por un shell intermedio.
function ejecutar(cmd, args, opciones = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opciones });
  if (r.status !== 0) {
    const detalle = (r.stderr || r.stdout || "").trim();
    throw new Error(`"${cmd} ${args.join(" ")}" falló (exit ${r.status}): ${detalle}`);
  }
  return (r.stdout || "").trim();
}

function ghDisponible() {
  const r = spawnSync(WIN ? "gh.exe" : "gh", ["--version"], { stdio: "ignore", shell: WIN });
  return r.status === 0;
}

export function resolverRepoPath({ repoOverride, config, root }) {
  if (repoOverride) return path.resolve(repoOverride);
  const repoRelativo = config?.memoria?.repo_path;
  if (!repoRelativo) {
    throw new Error(
      "config/klap.yaml no define memoria.repo_path — indica dónde está el checkout de " +
        "klap-dev-kit-knowledge, o pasa --repo explícito."
    );
  }
  return path.resolve(root, repoRelativo);
}

export async function correr({ producto, issue, motivo, changedFiles, base, repoOverride }) {
  if (!producto) throw new Error("Falta --producto");

  const config = cargarConfig();
  const root = resolveFromRoot();
  const repoPath = resolverRepoPath({ repoOverride, config, root });

  if (!existsSync(repoPath)) {
    throw new Error(`No existe el checkout de memoria en ${repoPath} (config/klap.yaml → memoria.repo_path).`);
  }
  const opcionesGit = { cwd: repoPath };
  ejecutar("git", ["rev-parse", "--is-inside-work-tree"], opcionesGit);

  const rama = nombreRama(producto);
  ejecutar("git", ["checkout", "-B", rama], opcionesGit);

  const rutasAAgregar = changedFiles?.length ? changedFiles : ["memory/"];
  ejecutar("git", ["add", "--", ...rutasAAgregar], opcionesGit);

  const estado = ejecutar("git", ["status", "--porcelain"], opcionesGit);
  if (!estado) {
    return {
      rama,
      commit: null,
      pr_url: null,
      nota: "No hay cambios staged — nada que commitear (¿ya se había aplicado y commiteado antes?).",
    };
  }

  const mensaje = mensajeCommit({ producto, issue, motivo });
  ejecutar("git", ["commit", "-m", mensaje], opcionesGit);
  const commit = ejecutar("git", ["rev-parse", "HEAD"], opcionesGit);

  ejecutar("git", ["push", "-u", "origin", rama], opcionesGit);

  if (!ghDisponible()) {
    return {
      rama,
      commit,
      pr_url: null,
      nota: "Rama pusheada, pero `gh` no está disponible — crea el PR hacia main manualmente.",
    };
  }

  let prUrl;
  try {
    prUrl = ejecutar(
      "gh",
      ["pr", "create", "--base", base, "--head", rama, "--title", tituloPr({ producto, issue }), "--body", cuerpoPr({ producto, issue, motivo })],
      opcionesGit
    );
  } catch (err) {
    return {
      rama,
      commit,
      pr_url: null,
      nota: `Rama pusheada, pero \`gh pr create\` falló — crea el PR manualmente. Detalle: ${err.message}`,
    };
  }

  return { rama, commit, pr_url: prUrl };
}

if (esPuntoDeEntrada(import.meta.url)) {
  const args = parsearArgs(process.argv.slice(2));
  correr({
    producto: args.producto,
    issue: args.issue,
    motivo: args.motivo,
    changedFiles: args.changedFiles,
    base: args.base,
    repoOverride: args.repo,
  })
    .then((resultado) => {
      console.log(JSON.stringify(resultado, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
