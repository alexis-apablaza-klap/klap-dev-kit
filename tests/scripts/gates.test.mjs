import test from "node:test";
import assert from "node:assert/strict";
import { evaluarCondiciones, algunaCondicionCumple } from "../../scripts/lib/gates.mjs";

test("operador > dispara sólo cuando el dato supera el valor", () => {
  const condiciones = [{ campo: "bugs_nuevos", operador: ">", valor: 0 }];
  assert.deepEqual(evaluarCondiciones(condiciones, { bugs_nuevos: 0 }), []);
  assert.equal(evaluarCondiciones(condiciones, { bugs_nuevos: 1 }).length, 1);
});

// node:test no trae test.each — se listan los operadores explícitamente en un loop.
for (const [operador, actual, valor, esperado] of [
  [">=", 5, 5, true],
  [">=", 4, 5, false],
  ["<", 3, 5, true],
  ["<", 5, 5, false],
  ["<=", 5, 5, true],
  ["==", "OK", "OK", true],
  ["==", "ERROR", "OK", false],
  ["!=", "ERROR", "OK", true],
]) {
  test(`operador ${operador}: ${actual} vs ${valor} => ${esperado}`, () => {
    const motivos = evaluarCondiciones([{ campo: "x", operador, valor }], { x: actual });
    assert.equal(motivos.length > 0, esperado);
  });
}

test("con escala, la comparación es ordinal por índice en la lista nombrada", () => {
  const condiciones = [{ campo: "rating", operador: ">", valor: "A", escala: "rating" }];
  const escalas = { rating: ["A", "B", "C", "D", "E"] };
  assert.deepEqual(evaluarCondiciones(condiciones, { rating: "A" }, escalas), []);
  assert.equal(evaluarCondiciones(condiciones, { rating: "B" }, escalas).length, 1);
});

test("campo ausente o null en los datos no dispara la condición", () => {
  const condiciones = [{ campo: "bugs_nuevos", operador: ">", valor: 0 }];
  assert.deepEqual(evaluarCondiciones(condiciones, {}), []);
  assert.deepEqual(evaluarCondiciones(condiciones, { bugs_nuevos: null }), []);
});

test("mensaje por defecto cuando la condición no declara `mensaje`", () => {
  const motivos = evaluarCondiciones([{ campo: "bugs_nuevos", operador: ">", valor: 0 }], { bugs_nuevos: 3 });
  assert.deepEqual(motivos, ["bugs_nuevos > 0 (actual: 3)."]);
});

test("plantilla de `mensaje` interpola {actual}/{valor}/{campo}", () => {
  const motivos = evaluarCondiciones(
    [{ campo: "rating", operador: ">", valor: "A", escala: "rating", mensaje: "{campo}: {actual} peor que {valor}." }],
    { rating: "C" },
    { rating: ["A", "B", "C", "D", "E"] }
  );
  assert.deepEqual(motivos, ["rating: C peor que A."]);
});

test("operador desconocido lanza en vez de aprobar en silencio", () => {
  assert.throws(() => evaluarCondiciones([{ campo: "x", operador: "=>", valor: 1 }], { x: 2 }), /operador desconocido/);
});

test("escala referenciada pero no declarada en gates.escalas lanza", () => {
  assert.throws(() => evaluarCondiciones([{ campo: "x", operador: ">", valor: "A", escala: "no-existe" }], { x: "B" }, {}), /escala desconocida/);
});

test("valor actual fuera de la escala declarada lanza", () => {
  assert.throws(
    () => evaluarCondiciones([{ campo: "x", operador: ">", valor: "A", escala: "rating" }], { x: "Z" }, { rating: ["A", "B", "C"] }),
    /no está en la escala/
  );
});

test("algunaCondicionCumple: true si al menos una condición se dispara", () => {
  const condiciones = [
    { campo: "severidad", operador: ">=", valor: "HIGH", escala: "severidad" },
  ];
  const escalas = { severidad: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] };
  assert.equal(algunaCondicionCumple(condiciones, { severidad: "LOW" }, escalas), false);
  assert.equal(algunaCondicionCumple(condiciones, { severidad: "HIGH" }, escalas), true);
  assert.equal(algunaCondicionCumple(condiciones, { severidad: "CRITICAL" }, escalas), true);
});
