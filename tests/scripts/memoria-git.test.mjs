import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  correr,
  parsearArgs,
  nombreRama,
  mensajeCommit,
  tituloPr,
  cuerpoPr,
  resolverRepoPath,
} from "../../scripts/memoria-git.mjs";

test("parsearArgs: --producto y --issue", () => {
  const args = parsearArgs(["--producto", "abono-ya", "--issue", "SVA-1925"]);
  assert.equal(args.producto, "abono-ya");
  assert.equal(args.issue, "SVA-1925");
  assert.equal(args.base, "main");
});

test("parsearArgs: --changed-files se separa por coma y se recorta", () => {
  const args = parsearArgs([
    "--producto",
    "abono-ya",
    "--changed-files",
    "products/abono-ya/product.yaml, products/abono-ya/sources.yaml",
  ]);
  assert.deepEqual(args.changedFiles, ["products/abono-ya/product.yaml", "products/abono-ya/sources.yaml"]);
});

test("parsearArgs: --base y --repo sobrescriben default", () => {
  const args = parsearArgs(["--producto", "x", "--base", "develop", "--repo", "/tmp/otro-repo"]);
  assert.equal(args.base, "develop");
  assert.equal(args.repo, "/tmp/otro-repo");
});

test("nombreRama: sigue la convención producto/<id>", () => {
  assert.equal(nombreRama("abono-ya"), "producto/abono-ya");
});

test("mensajeCommit: incluye el issue cuando está presente", () => {
  const msg = mensajeCommit({ producto: "abono-ya", issue: "SVA-1925" });
  assert.match(msg, /^memoria\(abono-ya\): actualiza memoria de producto \(SVA-1925\)$/);
});

test("mensajeCommit: sin issue, sin motivo", () => {
  const msg = mensajeCommit({ producto: "abono-ya" });
  assert.equal(msg, "memoria(abono-ya): actualiza memoria de producto");
});

test("mensajeCommit: agrega el motivo como cuerpo", () => {
  const msg = mensajeCommit({ producto: "abono-ya", issue: "SVA-1925", motivo: "alta inicial" });
  assert.equal(msg, "memoria(abono-ya): actualiza memoria de producto (SVA-1925)\n\nalta inicial");
});

test("tituloPr: incluye el issue cuando está presente", () => {
  assert.equal(tituloPr({ producto: "abono-ya", issue: "SVA-1925" }), "memoria(abono-ya): SVA-1925");
  assert.equal(tituloPr({ producto: "abono-ya" }), "memoria(abono-ya): actualización de memoria");
});

test("cuerpoPr: cita producto, issue y motivo, y deja claro que el merge es humano", () => {
  const cuerpo = cuerpoPr({ producto: "abono-ya", issue: "SVA-1925", motivo: "alta inicial" });
  assert.match(cuerpo, /abono-ya/);
  assert.match(cuerpo, /SVA-1925/);
  assert.match(cuerpo, /alta inicial/);
  assert.match(cuerpo, /Revisión humana antes del merge/);
});

test("resolverRepoPath: usa memoria.repo_path del config, relativo a la raíz del plugin", () => {
  const resuelto = resolverRepoPath({
    config: { memoria: { repo_path: "../klap-dev-kit-knowledge" } },
    root: "C:\\klap-workspace\\klap-dev-kit",
  });
  assert.equal(resuelto, path.resolve("C:\\klap-workspace\\klap-dev-kit", "../klap-dev-kit-knowledge"));
});

test("resolverRepoPath: --repo explícito tiene prioridad sobre el config", () => {
  const resuelto = resolverRepoPath({
    repoOverride: "/tmp/otro-checkout",
    config: { memoria: { repo_path: "../klap-dev-kit-knowledge" } },
    root: "/cualquier/raiz",
  });
  assert.equal(resuelto, path.resolve("/tmp/otro-checkout"));
});

test("resolverRepoPath: sin memoria.repo_path ni --repo, falla explícito", () => {
  assert.throws(() => resolverRepoPath({ config: {}, root: "/cualquier/raiz" }), /memoria\.repo_path/);
});

test("correr: aborta si hay cambios de otro producto sin commitear", async () => {
  // El default `git add -- memory/` stagea todo lo pendiente, no lo del producto pedido. Este
  // test fija que la mezcla se detecta ANTES del commit: el modo de fallo real no era un error,
  // era un PR silencioso con dos productos adentro.
  const repo = mkdtempSync(path.join(tmpdir(), "memoria-git-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: repo, stdio: "pipe" });
    git("init", "--initial-branch=main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    mkdirSync(path.join(repo, "memory", "products", "abono-ya"), { recursive: true });
    mkdirSync(path.join(repo, "memory", "products", "impulso-klap"), { recursive: true });
    writeFileSync(path.join(repo, "memory", "products", "abono-ya", "product.yaml"), "id: abono-ya\n");
    git("add", "-A");
    git("commit", "-m", "base");

    writeFileSync(path.join(repo, "memory", "products", "abono-ya", "product.yaml"), "id: abono-ya\nrev: 2\n");
    writeFileSync(path.join(repo, "memory", "products", "impulso-klap", "product.yaml"), "id: impulso-klap\n");

    await assert.rejects(
      () => correr({ producto: "abono-ya", repoOverride: repo }),
      /impulso-klap/,
      "debe nombrar al producto ajeno que se iba a arrastrar"
    );
    // Y deja el índice limpio: un abort no puede quedarse con todo staged.
    const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repo, encoding: "utf8" });
    assert.equal(staged.trim(), "");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
