import test from "node:test";
import assert from "node:assert/strict";
import { evaluarGate } from "../../scripts/quality-gate.mjs";

const gates = {
  coverage: { minimo_porcentaje: 92 },
  sonarqube: {
    quality_gate_debe_pasar: true,
    bloquear_si: [
      "bugs_nuevos > 0",
      "vulnerabilities_nuevas > 0",
      "security_hotspots_sin_revisar > 0",
      { rating_mantenibilidad_peor_que: "A" },
    ],
  },
  dependencias: { bloquear_severidad_minima: "HIGH", permitir_excepcion_explicita: true },
  tests: { bloquear_si_falla_alguno: true },
};

const reporteOk = {
  coverage_porcentaje: 95,
  sonar: { bugs_nuevos: 0, vulnerabilities_nuevas: 0, security_hotspots_sin_revisar: 0, rating_mantenibilidad: "A", quality_gate_status: "OK" },
  tests: { total: 10, fallidos: 0 },
};

test("reporte perfecto aprueba", () => {
  const veredicto = evaluarGate(reporteOk, gates);
  assert.equal(veredicto.aprobado, true);
  assert.deepEqual(veredicto.motivos, []);
});

test("tests fallando reprueba", () => {
  const veredicto = evaluarGate({ ...reporteOk, tests: { total: 10, fallidos: 2 } }, gates);
  assert.equal(veredicto.aprobado, false);
  assert.ok(veredicto.motivos.some((m) => m.includes("fallando")));
});

test("coverage bajo el mínimo reprueba", () => {
  const veredicto = evaluarGate({ ...reporteOk, coverage_porcentaje: 80 }, gates);
  assert.equal(veredicto.aprobado, false);
  assert.ok(veredicto.motivos.some((m) => m.includes("Coverage")));
});

test("Sonar Quality Gate distinto de OK reprueba", () => {
  const veredicto = evaluarGate({ ...reporteOk, sonar: { ...reporteOk.sonar, quality_gate_status: "ERROR" } }, gates);
  assert.equal(veredicto.aprobado, false);
  assert.ok(veredicto.motivos.some((m) => m.includes("Quality Gate")));
});

test("rating de mantenibilidad peor que A reprueba", () => {
  const veredicto = evaluarGate({ ...reporteOk, sonar: { ...reporteOk.sonar, rating_mantenibilidad: "C" } }, gates);
  assert.equal(veredicto.aprobado, false);
  assert.ok(veredicto.motivos.some((m) => m.includes("Rating")));
});

test("bugs nuevos en Sonar reprueba", () => {
  const veredicto = evaluarGate({ ...reporteOk, sonar: { ...reporteOk.sonar, bugs_nuevos: 1 } }, gates);
  assert.equal(veredicto.aprobado, false);
});

test("el umbral de rating de mantenibilidad se lee de gates.sonarqube.bloquear_si, no está hardcodeado", () => {
  const gatesConUmbralB = {
    ...gates,
    sonarqube: {
      ...gates.sonarqube,
      bloquear_si: [{ rating_mantenibilidad_peor_que: "B" }],
    },
  };
  const veredictoB = evaluarGate({ ...reporteOk, sonar: { ...reporteOk.sonar, rating_mantenibilidad: "B" } }, gatesConUmbralB);
  assert.equal(veredictoB.aprobado, true, JSON.stringify(veredictoB.motivos));

  const veredictoC = evaluarGate({ ...reporteOk, sonar: { ...reporteOk.sonar, rating_mantenibilidad: "C" } }, gatesConUmbralB);
  assert.equal(veredictoC.aprobado, false);
});
