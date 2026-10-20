/**
 * tokens.js — Tipos de token y palabras reservadas.
 *
 * Especificación, sección 1.2.
 */

/**
 * @typedef {object} Token
 * @property {string} tipo      Uno de los valores de TIPOS_TOKEN.
 * @property {string} lexema    Texto tal como aparece en la entrada.
 * @property {number} [valor]   Solo en NUMERO.
 * @property {number} columna   Columna (desde 1) de su primer carácter.
 */

/** Tipos de token. */
export const TIPOS_TOKEN = Object.freeze({
  NUMERO: 'NUMERO',
  IDENT: 'IDENT',
  FUNCION: 'FUNCION',
  MAS: 'MAS',
  MENOS: 'MENOS',
  POR: 'POR',
  DIV: 'DIV',
  MOD: 'MOD',
  POT: 'POT',
  PAR_IZQ: 'PAR_IZQ',
  PAR_DER: 'PAR_DER',
  ASIGNA: 'ASIGNA',
  COMA: 'COMA',
  EOF: 'EOF',
});

/** Tipo de token de cada operador o signo de un solo carácter (estado q8 del AFD). */
export const OPERADORES = Object.freeze({
  '+': TIPOS_TOKEN.MAS,
  '-': TIPOS_TOKEN.MENOS,
  '*': TIPOS_TOKEN.POR,
  '/': TIPOS_TOKEN.DIV,
  '%': TIPOS_TOKEN.MOD,
  '^': TIPOS_TOKEN.POT,
  '(': TIPOS_TOKEN.PAR_IZQ,
  ')': TIPOS_TOKEN.PAR_DER,
  '=': TIPOS_TOKEN.ASIGNA,
  ',': TIPOS_TOKEN.COMA,
});

/**
 * Nombres de las funciones predefinidas. Son palabras reservadas:
 * el lexer los emite como FUNCION y nunca como IDENT. Distinguen mayúsculas.
 */
export const PALABRAS_RESERVADAS = Object.freeze([
  'sqrt', 'abs', 'sin', 'cos', 'tan', 'ln', 'log', 'min', 'max', 'round',
]);
