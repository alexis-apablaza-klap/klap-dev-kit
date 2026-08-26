import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const hookPath = resolveFromRoot("hooks", "pre-push-quality-gate.mjs");

function crearRepoGit(rama) {
  const repo = mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-hook-test-"));
  execSync("git init -q", { cwd: repo });
  execSync('git config user.email "test@klap.cl"', { cwd: repo });
  execSync('git config user.name "Test"', { cwd: repo });
  writeFileSync(path.join(repo, "README.md"), "# repo de prueba\n");
  execSync("git add README.md", { cwd: repo });
  execSync('git commit -q -m "inicial"', { cwd: repo });
  if (rama) execSync(`git checkout -q -b ${rama}`, { cwd: repo });
  return repo;
}

function correrHook(repo, command) {
  return spawnSync("node", [hookPath], {
    cwd: repo,
    input: JSON.stringify({ tool_input: { command }, cwd: repo }),
    encoding: "utf8",
  });
}

test("bloquea git push cuando no existe certificación para el issue de la rama", () => {
  const repo = crearRepoGit("feature/KLAP-123-algo");
  try {
    const r = correrHook(repo, "git push");
    assert.equal(r.status, 2);
    const salida = JSON.parse(r.stdout);
    assert.equal(salida.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(salida.hookSpecificOutput.permissionDecisionReason.includes("KLAP-123"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("bloquea git push cuando la certificación existe pero aprobado es false", () => {
  const repo = crearRepoGit("feature/KLAP-123-algo");
  try {
    mkdirSync(path.join(repo, ".klap", "hu", "KLAP-123"), { recursive: true });
    writeFileSync(
      path.join(repo, ".klap", "hu", "KLAP-123", "certificacion.json"),
      JSON.stringify({ aprobado: false, motivos: ["coverage bajo el mínimo"] })
    );

    const r = correrHook(repo, "git push");
    assert.equal(r.status, 2);
    const salida = JSON.parse(r.stdout);
    assert.ok(salida.hookSpecificOutput.permissionDecisionReason.includes("coverage bajo el mínimo"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("permite git push cuando la certificación existe y está aprobada", () => {
  const repo = crearRepoGit("feature/KLAP-123-algo");
  try {
    mkdirSync(path.join(repo, ".klap", "hu", "KLAP-123"), { recursive: true });
    writeFileSync(
      path.join(repo, ".klap", "hu", "KLAP-123", "certificacion.json"),
      JSON.stringify({ aprobado: true, motivos: [] })
    );

    const r = correrHook(repo, "git push");
    assert.equal(r.status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("bloquea git push con mensaje claro cuando certificacion.json existe pero no es JSON válido", () => {
  const repo = crearRepoGit("feature/KLAP-123-algo");
  try {
    mkdirSync(path.join(repo, ".klap", "hu", "KLAP-123"), { recursive: true });
    writeFileSync(path.join(repo, ".klap", "hu", "KLAP-123", "certificacion.json"), "{ esto no es json");

    const r = correrHook(repo, "git push");
    assert.equal(r.status, 2);
    const salida = JSON.parse(r.stdout);
    assert.equal(salida.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(salida.hookSpecificOutput.permissionDecisionReason.includes("no es JSON válido"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("permite git push en una rama sin issue detectable", () => {
  const repo = crearRepoGit("chore/sin-issue-detectable");
  try {
    const r = correrHook(repo, "git push");
    assert.equal(r.status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("no interviene en un comando Bash que no es git push", () => {
  const repo = crearRepoGit("feature/KLAP-123-algo");
  try {
    const r = correrHook(repo, "git status");
    assert.equal(r.status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
