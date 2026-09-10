import test from "node:test";
import assert from "node:assert/strict";
import { revisarConexiones, formatear } from "../../scripts/verificar-conexiones.mjs";

const config = {
  mcp: {
    knowledge: { server: "klap-knowledge", requiere_env: ["KLAP_KNOWLEDGE_HOME"], obtener_credencial: "docs/installation.md" },
    sonarqube: { server: "plugin_klap_sonarqube", requiere_env: ["KLAP_SONARQUBE_TOKEN"], obtener_credencial: "https://sonarcloud.io/account/access-tokens" },
    atlassian: { server: "plugin_klap_atlassian" },
    context7: { server: "plugin_klap_context7" },
  },
};

test("reporta las variables ausentes con su impacto y dónde obtener la credencial", () => {
  const faltantes = revisarConexiones(config, {});
  assert.equal(faltantes.length, 2);
  const sonar = faltantes.find((f) => f.conexion === "sonarqube");
  assert.equal(sonar.variable, "KLAP_SONARQUBE_TOKEN");
  assert.ok(sonar.impacto.includes("métricas"));
  assert.equal(sonar.obtener, "https://sonarcloud.io/account/access-tokens");
});

test("no reporta nada cuando todas las variables están definidas", () => {
  const faltantes = revisarConexiones(config, { KLAP_KNOWLEDGE_HOME: "/x", KLAP_SONARQUBE_TOKEN: "y" });
  assert.deepEqual(faltantes, []);
  assert.equal(formatear(faltantes), "", "sin faltantes la salida debe ser vacía — el hook no debe imprimir nada");
});

test("las conexiones sin requiere_env nunca se reportan (atlassian usa OAuth, context7 no pide nada)", () => {
  const faltantes = revisarConexiones(config, {});
  assert.ok(!faltantes.some((f) => f.conexion === "atlassian" || f.conexion === "context7"));
});

test("una conexión nueva con requiere_env se cubre sin tocar el script", () => {
  const conNueva = { mcp: { ...config.mcp, futura: { server: "x", requiere_env: ["KLAP_FUTURA_TOKEN"] } } };
  const faltantes = revisarConexiones(conNueva, {});
  const nueva = faltantes.find((f) => f.conexion === "futura");
  assert.ok(nueva, "debe detectarla leyendo la config, no una lista hardcodeada");
  assert.ok(nueva.impacto.length > 0, "sin impacto declarado debe caer al texto genérico");
});

test("el texto del aviso explica cómo dejar la variable a nivel de usuario", () => {
  const salida = formatear(revisarConexiones(config, {}));
  assert.ok(salida.includes("setx"), "debe explicar el caso Windows");
  assert.ok(salida.includes("~/.bashrc") || salida.includes("~/.zshrc"), "debe explicar el caso Linux/Mac");
});
