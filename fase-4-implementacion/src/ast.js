/**
 * ast.js — Nodos del árbol sintáctico abstracto.
 *
 * Diseño, sección 3.2. Todo nodo tiene `id`, `tipo` y `columna`, y puede
 * tener `entreParentesis: true` (lo marca el parser; los paréntesis no
 * generan nodo propio).
 *
 * Tipos: Numero, Variable, Unario, Binario, Llamada, Asignacion.
 */

/**
 * @typedef {object} Nodo
 * @property {number} id        Único dentro de un árbol; enlaza el árbol con la traza.
 * @property {string} tipo
 * @property {number} columna
 * @property {boolean} [entreParentesis]
 */

export const TIPOS_NODO = Object.freeze({
  NUMERO: 'Numero',
  VARIABLE: 'Variable',
  UNARIO: 'Unario',
  BINARIO: 'Binario',
  LLAMADA: 'Llamada',
  ASIGNACION: 'Asignacion',
});

let siguienteId = 1;

/** Reinicia la numeración. El parser la llama al empezar cada árbol. */
export function reiniciarIds() {
  siguienteId = 1;
}

function nodo(tipo, columna, campos) {
  return { id: siguienteId++, tipo, columna, ...campos };
}

export function crearNumero(valor, lexema, columna) {
  return nodo(TIPOS_NODO.NUMERO, columna, { valor, lexema });
}

export function crearVariable(nombre, columna) {
  return nodo(TIPOS_NODO.VARIABLE, columna, { nombre });
}

export function crearUnario(op, operando, columna) {
  return nodo(TIPOS_NODO.UNARIO, columna, { op, operando });
}

/**
 * @param {boolean} implicita  true si es una multiplicación implícita (`2x`).
 *   En ese caso `columna` es la del inicio del operando derecho.
 */
export function crearBinario(op, izq, der, columna, implicita = false) {
  return nodo(TIPOS_NODO.BINARIO, columna, { op, izq, der, implicita });
}

export function crearLlamada(nombre, args, columna) {
  return nodo(TIPOS_NODO.LLAMADA, columna, { nombre, args });
}

export function crearAsignacion(nombre, valor, columna) {
  return nodo(TIPOS_NODO.ASIGNACION, columna, { nombre, valor });
}

/** Hijos de un nodo, de izquierda a derecha. Lo usan todos los recorridos. */
export function hijos(n) {
  switch (n.tipo) {
    case TIPOS_NODO.UNARIO: return [n.operando];
    case TIPOS_NODO.BINARIO: return [n.izq, n.der];
    case TIPOS_NODO.LLAMADA: return n.args;
    case TIPOS_NODO.ASIGNACION: return [n.valor];
    default: return [];
  }
}
