import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validarPlugin } from "../../scripts/validar-plugin.mjs";

/**
 * La versión del plugin vive en dos archivos (.claude-plugin/plugin.json y package.json) y se
 * derivaron en silencio: plugin.json quedó en 0.3.0 mientras package.json seguía en 0.1.0, sin
 * ningún tag en el repo. El chequeo cruza ambos y exige entrada de CHANGELOG, igual que el
 * chequeo de contractVersion cruza tools.json contra config/klap.yaml.
 *
 * Los casos negativos corren sobre un root temporal mínimo, así que validarPlugin reporta además
 * todo lo que falta ahí (manifests, schemas, standards…). Sólo se filtran los problemas de
 * versión — lo demás es ruido esperado de un root incompleto, no parte de lo que se prueba.
 */
const PROBLEMA_DE_VERSION = /versión desalineada|falta "version"|CHANGELOG\.md: no tiene entrada/;

function crearRoot({ versionPlugin, versionPaquete, changelog }) {
  const root = mkdtempSync(path.join(os.tmpdir(), "klap-version-test-"));
  mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(
    path.join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "klap", description: "x", version: versionPlugin })
  );
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "klap-dev-kit", version: versionPaquete }));
  if (changelog !== undefined) writeFileSync(path.join(root, "CHANGELOG.md"), changelog);
  return root;
}

function problemasDeVersion(opciones) {
  const root = crearRoot(opciones);
  try {
    return validarPlugin(root).problemas.filter((p) => PROBLEMA_DE_VERSION.test(p));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("dos versiones distintas se reportan, nombrando ambos archivos", () => {
  const problemas = problemasDeVersion({
    versionPlugin: "0.3.0",
    versionPaquete: "0.1.0",
    changelog: "## [0.3.0]\n",
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /plugin\.json=0\.3\.0/);
  assert.match(problemas[0], /package\.json=0\.1\.0/);
});

test("versiones alineadas con entrada de CHANGELOG no reportan nada", () => {
  assert.deepEqual(
    problemasDeVersion({
      versionPlugin: "0.2.0-alpha",
      versionPaquete: "0.2.0-alpha",
      changelog: "# Changelog\n\n## [Unreleased]\n\n## [0.2.0-alpha] - 2026-09-10\n",
    }),
    []
  );
});

test("una versión sin entrada en el CHANGELOG se reporta", () => {
  const problemas = problemasDeVersion({
    versionPlugin: "0.9.0",
    versionPaquete: "0.9.0",
    changelog: "# Changelog\n\n## [Unreleased]\n\n## [0.2.0-alpha] - 2026-09-10\n",
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /## \[0\.9\.0\]/);
});

test("un pre-release no se confunde con la versión final que lo precede", () => {
  // "## [0.1.0]" NO satisface a la versión 0.1.0-alpha: son versiones distintas y el chequeo
  // busca la entrada exacta. Es justo la colisión del CHANGELOG real, que ya trae un 0.1.0.
  const problemas = problemasDeVersion({
    versionPlugin: "0.1.0-alpha",
    versionPaquete: "0.1.0-alpha",
    changelog: "# Changelog\n\n## [0.1.0] - 2026-08-26\n",
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /## \[0\.1\.0-alpha\]/);
});

test("falta la versión en plugin.json", () => {
  const problemas = problemasDeVersion({ versionPlugin: undefined, versionPaquete: "0.2.0-alpha", changelog: "" });
  assert.deepEqual(problemas, ['plugin.json: falta "version"']);
});
