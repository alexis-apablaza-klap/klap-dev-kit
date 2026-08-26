/**
 * Evaluador declarativo y genérico de condiciones contra config/quality-gates.yaml (v2).
 * Sustituye el patrón "cada campo de bloquear_si traducido a mano en el script", causa raíz
 * de 3 defectos separados encontrados en Pass 9 (quality-gate.mjs, deps-scan.mjs y el hueco
 * de bloquear_si mismo): cambiar un umbral, o agregar uno nuevo, es editar sólo el YAML —
 * nunca este archivo, quality-gate.mjs ni deps-scan.mjs.
 *
 * Cada condición: { campo, operador, valor, escala?, mensaje? }
 *   operador: > >= < <= == !=
 *   escala: nombre de una entrada en gates.escalas — la comparación pasa a ser ordinal por
 *           índice en esa lista (así "peor_que" desaparece: es sólo ">" con una escala
 *           nombrada, p.ej. escalas.rating: [A, B, C, D, E]).
 *   mensaje: plantilla opcional con {campo}/{actual}/{valor}; si se omite, se genera una
 *            por defecto.
 * Un campo ausente/null en `datos` no dispara la condición — dato no reportado no es lo
 * mismo que violación del umbral.
 */
const OPERADORES = {
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
};

function resolverOperandos(cond, actual, escalas) {
  if (!cond.escala) return [actual, cond.valor];
  const orden = escalas?.[cond.escala];
  if (!Array.isArray(orden)) {
    throw new Error(`gates: escala desconocida "${cond.escala}" (campo "${cond.campo}"). Declárala en gates.escalas.`);
  }
  const ia = orden.indexOf(actual);
  const ib = orden.indexOf(cond.valor);
  if (ia === -1) {
    throw new Error(`gates: valor "${actual}" no está en la escala "${cond.escala}" (campo "${cond.campo}").`);
  }
  if (ib === -1) {
    throw new Error(`gates: umbral "${cond.valor}" no está en la escala "${cond.escala}" (campo "${cond.campo}").`);
  }
  return [ia, ib];
}

function formatearMensaje(cond, actual) {
  if (cond.mensaje) {
    return cond.mensaje
      .replace(/\{actual\}/g, actual)
      .replace(/\{valor\}/g, cond.valor)
      .replace(/\{campo\}/g, cond.campo);
  }
  return `${cond.campo} ${cond.operador} ${cond.valor} (actual: ${actual}).`;
}

/** @returns {string[]} un motivo por cada condición de `condiciones` que se cumple contra `datos`. */
export function evaluarCondiciones(condiciones, datos, escalas = {}) {
  const motivos = [];
  for (const cond of condiciones ?? []) {
    if (!(cond.operador in OPERADORES)) {
      throw new Error(`gates: operador desconocido "${cond.operador}" (campo "${cond.campo}").`);
    }
    const actual = datos?.[cond.campo];
    if (actual === undefined || actual === null) continue;
    const [a, b] = resolverOperandos(cond, actual, escalas);
    if (OPERADORES[cond.operador](a, b)) motivos.push(formatearMensaje(cond, actual));
  }
  return motivos;
}

/** true si `datos` dispara al menos una condición de `condiciones` — para filtrar listas (p.ej. hallazgos). */
export function algunaCondicionCumple(condiciones, datos, escalas = {}) {
  return evaluarCondiciones(condiciones, datos, escalas).length > 0;
}
