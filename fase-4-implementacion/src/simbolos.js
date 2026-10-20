/**
 * simbolos.js — Tabla de símbolos y funciones predefinidas.
 *
 * Especificación, secciones 3.1 y 3.2. Diseño, sección 3.6.
 */

import { ErrorCalc } from './errores.js';

/**
 * Funciones predefinidas: aridad, dominio y cálculo.
 * Son palabras reservadas (tokens.js), por eso no están en la tabla de símbolos.
 */
export const FUNCIONES = Object.freeze({
  sqrt: { aridadMin: 1, aridadMax: 1, dominio: ([a]) => a >= 0, calcular: ([a]) => Math.sqrt(a), descripcion: 'raíz cuadrada' },
  abs: { aridadMin: 1, aridadMax: 1, dominio: () => true, calcular: ([a]) => Math.abs(a), descripcion: 'valor absoluto' },
  sin: { aridadMin: 1, aridadMax: 1, dominio: () => true, calcular: ([a]) => Math.sin(a), descripcion: 'seno (radianes)' },
  cos: { aridadMin: 1, aridadMax: 1, dominio: () => true, calcular: ([a]) => Math.cos(a), descripcion: 'coseno (radianes)' },
  tan: { aridadMin: 1, aridadMax: 1, dominio: () => true, calcular: ([a]) => Math.tan(a), descripcion: 'tangente (radianes)' },
  ln: { aridadMin: 1, aridadMax: 1, dominio: ([a]) => a > 0, calcular: ([a]) => Math.log(a), descripcion: 'logaritmo natural' },
  log: { aridadMin: 1, aridadMax: 1, dominio: ([a]) => a > 0, calcular: ([a]) => Math.log10(a), descripcion: 'logaritmo base 10' },
  round: { aridadMin: 1, aridadMax: 1, dominio: () => true, calcular: ([a]) => Math.round(a), descripcion: 'redondeo al entero más cercano' },
  min: { aridadMin: 1, aridadMax: Infinity, dominio: () => true, calcular: (args) => Math.min(...args), descripcion: 'mínimo' },
  max: { aridadMin: 1, aridadMax: Infinity, dominio: () => true, calcular: (args) => Math.max(...args), descripcion: 'máximo' },
});

/** Texto de la aridad para los mensajes: '1 argumento', 'al menos 1 argumento'. */
export function describirAridad({ aridadMin, aridadMax }) {
  const argumentos = (n) => `${n} argumento${n === 1 ? '' : 's'}`;
  if (aridadMin === aridadMax) return argumentos(aridadMin);
  if (aridadMax === Infinity) return `al menos ${argumentos(aridadMin)}`;
  return `entre ${aridadMin} y ${argumentos(aridadMax)}`;
}

/** Constantes predefinidas, de solo lectura. */
const CONSTANTES = Object.freeze({ pi: Math.PI, e: Math.E });

/** Variables del usuario y constantes de solo lectura (pi, e). */
export class TablaSimbolos {
  constructor() {
    this.constantes = new Map(Object.entries(CONSTANTES));
    this.vars = new Map();
  }

  existe(nombre) {
    return this.constantes.has(nombre) || this.vars.has(nombre);
  }

  esConstante(nombre) {
    return this.constantes.has(nombre);
  }

  /**
   * @param {string} nombre
   * @param {number} [columna]  Para el mensaje de error.
   * @throws {ErrorCalc} E01 si no existe.
   */
  obtener(nombre, columna = 1) {
    if (this.constantes.has(nombre)) return this.constantes.get(nombre);
    if (this.vars.has(nombre)) return this.vars.get(nombre);
    throw new ErrorCalc('E01', columna, { nombre });
  }

  /**
   * @param {string} nombre
   * @param {number} valor
   * @param {number} [columna]  Para el mensaje de error.
   * @throws {ErrorCalc} E04 si es una constante.
   */
  asignar(nombre, valor, columna = 1) {
    if (this.esConstante(nombre)) {
      throw new ErrorCalc('E04', columna, { nombre });
    }
    this.vars.set(nombre, valor);
  }

  /** Constantes primero y después variables en orden de creación. */
  variables() {
    return [
      ...[...this.constantes].map(([nombre, valor]) => ({ nombre, valor, constante: true })),
      ...[...this.vars].map(([nombre, valor]) => ({ nombre, valor, constante: false })),
    ];
  }

  /** Borra las variables del usuario; las constantes se conservan. */
  reiniciar() {
    this.vars.clear();
  }
}
