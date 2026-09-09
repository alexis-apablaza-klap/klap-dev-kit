import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  descubrirComponentes,
  primerParrafoReadme,
  inferirStack,
  normalizarComponentId,
  evaluarConfianza,
  parsearArgs,
} from "../../scripts/descubrir-componentes.mjs";

function crearWorkspaceTemporal() {
  return mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-workspace-test-"));
}

function crearRepoGit(repoPath, { remote, readme, archivos = [] } = {}) {
  mkdirSync(repoPath, { recursive: true });
  execFileSync("git", ["init", "-q", repoPath]);
  if (remote) execFileSync("git", ["-C", repoPath, "remote", "add", "origin", remote]);
  if (readme !== undefined) writeFileSync(path.join(repoPath, "README.md"), readme);
  for (const nombre of archivos) writeFileSync(path.join(repoPath, nombre), "");
}

test("parsearArgs extrae --producto", () => {
  assert.deepEqual(parsearArgs(["--producto", "abono-ya"]), { producto: "abono-ya" });
  assert.deepEqual(parsearArgs([]), {});
});

test("normalizarComponentId convierte nombres reales a slug válido", () => {
  assert.equal(normalizarComponentId("mc_tlog"), "mc-tlog");
  assert.equal(normalizarComponentId("ContratoDigital"), "contrato-digital");
  assert.equal(normalizarComponentId("ms-central-sva-anticipo-calculos"), "ms-central-sva-anticipo-calculos");
});

test("primerParrafoReadme salta título/badges y toma el primer bloque de prosa", () => {
  const dir = crearWorkspaceTemporal();
  try {
    writeFileSync(
      path.join(dir, "README.md"),
      "# Mi Servicio\n\n[![build](x)](y)\n\nEste servicio hace algo concreto y útil.\n\nMás texto después.\n"
    );
    assert.equal(primerParrafoReadme(dir), "Este servicio hace algo concreto y útil.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("primerParrafoReadme devuelve null si no hay README", () => {
  const dir = crearWorkspaceTemporal();
  try {
    assert.equal(primerParrafoReadme(dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("inferirStack detecta gradle+java y node por presencia de archivos de build", () => {
  const dir = crearWorkspaceTemporal();
  try {
    writeFileSync(path.join(dir, "build.gradle"), "");
    writeFileSync(path.join(dir, "package.json"), "{}");
    assert.deepEqual(inferirStack(dir), ["gradle", "java", "node"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("evaluarConfianza es baja sin remoto, media sin stack, alta con todo", () => {
  assert.equal(evaluarConfianza({ remoto: null, readme: "algo largo suficiente para pasar el umbral", stack: ["java"] }), "baja");
  assert.equal(evaluarConfianza({ remoto: "git@x:y.git", readme: "algo largo suficiente para pasar el umbral", stack: [] }), "media");
  assert.equal(evaluarConfianza({ remoto: "git@x:y.git", readme: "algo largo suficiente para pasar el umbral", stack: ["java"] }), "alta");
});

test("descubrirComponentes escanea sólo carpetas con .git y devuelve candidatos ordenados", () => {
  const workspaceRoot = crearWorkspaceTemporal();
  try {
    crearRepoGit(path.join(workspaceRoot, "mi-producto", "ms-b"), {
      remote: "git@bitbucket.org:x/ms-b.git",
      readme: "# ms-b\n\nServicio B que hace cosas relevantes para el producto.\n",
      archivos: ["build.gradle"],
    });
    crearRepoGit(path.join(workspaceRoot, "mi-producto", "ms-a"), {
      remote: "git@bitbucket.org:x/ms-a.git",
      readme: "# ms-a\n\nServicio A que hace otras cosas relevantes también.\n",
      archivos: ["package.json"],
    });
    // Placeholder sin working tree real (sin .git) — no debe aparecer como candidato.
    mkdirSync(path.join(workspaceRoot, "mi-producto", "placeholder-sin-clonar"), { recursive: true });

    const resultado = descubrirComponentes("mi-producto", { workspaceRoot });

    assert.equal(resultado.candidatos.length, 2);
    assert.deepEqual(
      resultado.candidatos.map((c) => c.component_id),
      ["ms-a", "ms-b"] // orden alfabético
    );
    const b = resultado.candidatos.find((c) => c.component_id === "ms-b");
    assert.equal(b.confianza, "alta");
    assert.equal(b.remote, "git@bitbucket.org:x/ms-b.git");
    assert.ok(b.evidencia.some((e) => e.type === "repo" && e.ref === b.remote));
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("descubrirComponentes sobre un producto sin carpeta local devuelve nota, sin candidatos", () => {
  const workspaceRoot = crearWorkspaceTemporal();
  try {
    const resultado = descubrirComponentes("producto-sin-checkout", { workspaceRoot });
    assert.deepEqual(resultado.candidatos, []);
    assert.match(resultado.nota, /No existe/);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});
