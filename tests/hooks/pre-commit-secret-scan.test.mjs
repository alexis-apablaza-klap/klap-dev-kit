import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { resolveFromRoot } from "../../scripts/lib/paths.mjs";

const hookPath = resolveFromRoot("hooks", "pre-commit-secret-scan.mjs");

function crearRepoGit() {
  const repo = mkdtempSync(path.join(os.tmpdir(), "klap-dev-kit-hook-test-"));
  execSync("git init -q", { cwd: repo });
  execSync('git config user.email "test@klap.cl"', { cwd: repo });
  execSync('git config user.name "Test"', { cwd: repo });
  return repo;
}

function correrHook(repo, command) {
  return spawnSync("node", [hookPath], {
    cwd: repo,
    input: JSON.stringify({ tool_input: { command }, cwd: repo }),
    encoding: "utf8",
  });
}

test("bloquea git commit con un secreto en el diff staged", () => {
  const repo = crearRepoGit();
  try {
    writeFileSync(path.join(repo, "config.js"), 'const key = "AKIAABCDEFGHIJKLMNOP";\n');
    execSync("git add config.js", { cwd: repo });

    const r = correrHook(repo, 'git commit -m "add config"');
    assert.equal(r.status, 2);
    const salida = JSON.parse(r.stdout);
    assert.equal(salida.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(salida.hookSpecificOutput.permissionDecisionReason.includes("AWS Access Key"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("permite git commit sin secretos en el diff staged", () => {
  const repo = crearRepoGit();
  try {
    writeFileSync(path.join(repo, "saludo.js"), 'console.log("hola mundo");\n');
    execSync("git add saludo.js", { cwd: repo });

    const r = correrHook(repo, 'git commit -m "add saludo"');
    assert.equal(r.status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("no interviene en un comando Bash que no es git commit", () => {
  const repo = crearRepoGit();
  try {
    writeFileSync(path.join(repo, "config.js"), 'const key = "AKIAABCDEFGHIJKLMNOP";\n');
    execSync("git add config.js", { cwd: repo });

    const r = correrHook(repo, "git status");
    assert.equal(r.status, 0);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
