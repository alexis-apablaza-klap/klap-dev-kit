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
 * Sin --changed-files, hace `git add -- memory/` (store.py sólo escribe bajo memory/) y aborta
 * si eso arrastra archivos de otro producto. Con --changed-files aborta si la lista está
 * incompleta y deja fuera un archivo del propio producto. Las dos salidas son la misma: pasá
 * tal cual el `changed_files` que devolvió aplicar_patch_memoria, sin editarlo a mano.
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

  // `memory/` como default stagea TODO lo pendiente, no lo de este producto: si se aplicaron
  // dos patches y recién después se invoca el script, el primer producto se lleva ambos y la
  // segunda invocación reporta "nada que commitear". No se puede acotar por `product_id` a
  // secas — los componentes viven en
  // `memory/components/<id>.yaml` y su nombre no deriva del producto — así que el script no
  // adivina: detecta la mezcla y exige los `changed_files` que `aplicar_patch_memoria` ya
  // devolvió. Fallar acá es barato; un PR con dos productos mezclados se descubre en revisión.
  const ajenos = ejecutar("git", ["diff", "--cached", "--name-only"], opcionesGit)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => {
      const m = /^memory\/products\/([^/]+)\//.exec(f);
      return m && m[1] !== producto;
    });
  if (ajenos.length > 0) {
    const otros = [...new Set(ajenos.map((f) => /^memory\/products\/([^/]+)\//.exec(f)[1]))];
    ejecutar("git", ["reset", "--quiet"], opcionesGit);
    throw new Error(
      `Hay cambios de otro(s) producto(s) sin commitear (${otros.join(", ")}), así que un ` +
        `commit de "${producto}" se los llevaría. Invocá el script con --changed-files usando ` +
        `el arreglo "changed_files" que devolvió aplicar_patch_memoria para cada producto, o ` +
        `corré el script después de cada patch en vez de al final.`
    );
  }

  // El guard de arriba cubre el error de más (arrastrar otro producto). Este cubre el de
  // menos: un `--changed-files` incompleto deja fuera del commit un archivo de este mismo
  // producto, y el modo de fallo es peor, porque no hay nada que lo delate — el PR sale bien
  // formado y le falta una pieza. Pasó copiando a mano el `changed_files` que devolvió
  // `aplicar_patch_memoria` y salteando una línea.
  //
  // Sólo se puede afirmar la pertenencia de lo que vive bajo `products/<producto>/`; un
  // componente sin stagear puede ser de este patch o del de otro producto todavía pendiente,
  // y abortar por eso rompería el flujo que el propio error de arriba recomienda (un script
  // por producto). Por eso el componente se reporta y no bloquea: la regla dura llega hasta
  // donde llega la evidencia.
  // Se listan por separado modificados y no rastreados en vez de parsear las columnas de
  // `status --porcelain`: `ejecutar` recorta la salida completa, y ese trim se come el espacio
  // inicial de la primera linea, que es justo la columna que distingue staged de sin stagear.
  const lineas = (salida) =>
    salida
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  const sinStagear = [
    ...lineas(ejecutar("git", ["diff", "--name-only", "--", "memory/"], opcionesGit)),
    ...lineas(ejecutar("git", ["ls-files", "--others", "--exclude-standard", "--", "memory/"], opcionesGit)),
  ];

  const propiosFuera = sinStagear.filter((f) => f.startsWith(`memory/products/${producto}/`));
  if (propiosFuera.length > 0) {
    ejecutar("git", ["reset", "--quiet"], opcionesGit);
    throw new Error(
      `Estos archivos de "${producto}" quedaron fuera del commit: ${propiosFuera.join(", ")}. ` +
        `El --changed-files que pasaste está incompleto — usá tal cual el arreglo "changed_files" ` +
        `que devolvió aplicar_patch_memoria, sin editarlo.`
    );
  }
  const componentesFuera = sinStagear.filter((f) => f.startsWith("memory/components/"));

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

  return componentesFuera.length > 0
    ? {
        rama,
        commit,
        pr_url: prUrl,
        nota:
          `Quedaron componentes sin commitear (${componentesFuera.join(", ")}). Si son de este ` +
          `patch, faltaban en --changed-files; si son de otro producto, commiteálos con el suyo.`,
      }
    : { rama, commit, pr_url: prUrl };
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
