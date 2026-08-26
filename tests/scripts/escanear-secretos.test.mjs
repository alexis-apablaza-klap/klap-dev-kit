import test from "node:test";
import assert from "node:assert/strict";
import { detectarSecretos } from "../../scripts/escanear-secretos.mjs";

test("detecta una AWS Access Key ID", () => {
  const hallazgos = detectarSecretos('const key = "AKIAABCDEFGHIJKLMNOP";');
  assert.ok(hallazgos.some((h) => h.tipo === "AWS Access Key ID"));
});

test("detecta el header de una llave privada", () => {
  const hallazgos = detectarSecretos("-----BEGIN RSA PRIVATE KEY-----");
  assert.ok(hallazgos.some((h) => h.tipo === "Llave privada"));
});

test("detecta un token JWT", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
  const hallazgos = detectarSecretos(`const token = "${jwt}";`);
  assert.ok(hallazgos.some((h) => h.tipo === "Token JWT"));
});

test("una línea con placeholder Spring (${...}) no se reporta", () => {
  const hallazgos = detectarSecretos('password: "${SECRET_MANAGER_DB_PASSWORD}"');
  assert.equal(hallazgos.length, 0);
});

test("un secreto real hardcodeado en la misma línea que una referencia ${...} sí se reporta", () => {
  const hallazgos = detectarSecretos(
    'awsSecretKey = "AKIAABCDEFGHIJKLMNOP"; // fallback for ${AWS_KEY} env var'
  );
  assert.ok(hallazgos.some((h) => h.tipo === "AWS Access Key ID"));
});

test("una password de ejemplo con 'changeme' no se reporta", () => {
  const hallazgos = detectarSecretos('password: "changeme123"');
  assert.equal(hallazgos.length, 0);
});

test("texto sin secretos no genera hallazgos", () => {
  const hallazgos = detectarSecretos("const saludo = 'hola mundo';\nconst x = 1 + 1;");
  assert.equal(hallazgos.length, 0);
});

test("detecta un PAN sin enmascarar dentro de un log.info", () => {
  const hallazgos = detectarSecretos('log.info("Procesando pago con tarjeta {}", 4111111111111111);');
  assert.ok(hallazgos.some((h) => h.tipo === "Posible PAN sin enmascarar en logging (heurística)"));
});

test("un PAN enmascarado (sólo últimos 4 dígitos) en logging no se reporta", () => {
  const hallazgos = detectarSecretos('log.info("Procesando pago con tarjeta ****1111");');
  assert.equal(hallazgos.length, 0);
});

test("un número largo fuera de una llamada de logging no se reporta como PAN", () => {
  const hallazgos = detectarSecretos("const referencia = 1234567890123456;");
  assert.equal(hallazgos.length, 0);
});
