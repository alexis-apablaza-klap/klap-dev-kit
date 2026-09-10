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

test("el rating numérico que devuelve el MCP de Sonar lanza: la conversión a A-E es obligatoria", () => {
  // `get_component_measures` devuelve sqale_rating como "1.0", no como "A" (verificado contra un
  // proyecto real). Pasarlo tal cual al gate no reprueba: lanza, y la HU queda sin veredicto.
  // Por eso agents/certificador.md exige convertir 1→A … 5→E antes de armar el reporte.
  assert.throws(
    () =>
      evaluarCondiciones(
        [{ campo: "rating_mantenibilidad", operador: ">", valor: "A", escala: "rating" }],
        { rating_mantenibilidad: "1.0" },
        { rating: ["A", "B", "C", "D", "E"] }
      ),
    /no está en la escala/
  );
  // Convertido, el mismo dato aprueba sin ruido.
  assert.deepEqual(
    evaluarCondiciones(
      [{ campo: "rating_mantenibilidad", operador: ">", valor: "A", escala: "rating" }],
      { rating_mantenibilidad: "A" },
      { rating: ["A", "B", "C", "D", "E"] }
    ),
    []
  );
});

test("una métrica new_* ausente no reprueba, y un 0 inventado sí aprobaría en falso", () => {
  // Las medidas `new_*` vuelven sin `value` cuando el proyecto no tiene período de nuevo código
  // con cambios. El campo se omite del reporte: ausente no es cero.
  const condiciones = [{ campo: "bugs_nuevos", operador: ">", valor: 0 }];
  assert.deepEqual(evaluarCondiciones(condiciones, {}, {}), []);
  assert.deepEqual(evaluarCondiciones(condiciones, { bugs_nuevos: undefined }, {}), []);
  // Y el caso que sí debe reprobar, para que el test anterior no pase por vacuidad.
  assert.equal(evaluarCondiciones(condiciones, { bugs_nuevos: 1 }, {}).length, 1);
});

