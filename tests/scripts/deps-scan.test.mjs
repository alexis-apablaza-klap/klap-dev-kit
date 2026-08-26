import test from "node:test";
import assert from "node:assert/strict";
import { evaluarHallazgos } from "../../scripts/deps-scan.mjs";

const gates = { dependencias: { bloquear_severidad_minima: "HIGH", permitir_excepcion_explicita: true } };

test("sin hallazgos aprueba", () => {
  const veredicto = evaluarHallazgos([], gates);
  assert.equal(veredicto.aprobado, true);
  assert.equal(veredicto.bloqueantes.length, 0);
});

test("severidad bajo el umbral (LOW, MEDIUM) no bloquea", () => {
  const hallazgos = [
    { herramienta: "trivy", severidad: "LOW", paquete: "a", id: "CVE-1" },
    { herramienta: "trivy", severidad: "MEDIUM", paquete: "b", id: "CVE-2" },
  ];
  const veredicto = evaluarHallazgos(hallazgos, gates);
  assert.equal(veredicto.aprobado, true);
  assert.equal(veredicto.total_hallazgos, 2);
  assert.equal(veredicto.bloqueantes.length, 0);
});

test("severidad HIGH (igual al umbral) bloquea", () => {
  const hallazgos = [{ herramienta: "trivy", severidad: "HIGH", paquete: "c", id: "CVE-3" }];
  const veredicto = evaluarHallazgos(hallazgos, gates);
  assert.equal(veredicto.aprobado, false);
  assert.equal(veredicto.bloqueantes.length, 1);
});

test("severidad CRITICAL (sobre el umbral) bloquea", () => {
  const hallazgos = [{ herramienta: "owasp-dependency-check", severidad: "CRITICAL", paquete: "d", id: "CVE-4" }];
  const veredicto = evaluarHallazgos(hallazgos, gates);
  assert.equal(veredicto.aprobado, false);
});

test("expone si se permite excepción explícita según el gate", () => {
  const veredicto = evaluarHallazgos([], gates);
  assert.equal(veredicto.requiere_excepcion_si_se_ignora, true);
});
