/**
 * lexer.js — Analizador léxico.
 *
 * Implementa el AFD de la especificación (sección 1.3) como una tabla de
 * transiciones explícita: estados q0–q8, coincidencia más larga y retroceso
 * desde q4/q5 al último estado de aceptación.
 *
 * No usa expresiones regulares: el autómata es el que reconoce los tokens.
 */

import { ErrorCalc } from './errores.js';
import { TIPOS_TOKEN, OPERADORES, PALABRAS_RESERVADAS } from './tokens.js';

/** Clases de caracteres: son las columnas de la tabla de transiciones. */
export const CLASES = Object.freeze({
  DIGITO: 'D',
  EXPONENTE: 'e',     // 'e' o 'E': letra, pero también inicio del exponente
  LETRA: 'L',         // otra letra o '_'
  PUNTO: '.',
  SIGNO: '+-',
  OPERADOR: 'op',     // * / % ^ ( ) = ,
  BLANCO: 'blanco',
  OTRO: 'otro',       // cualquier otro carácter, o el fin de la entrada
});

/** Acciones de la tabla que no son un cambio de estado. */
export const ACCIONES = Object.freeze({
  FIN: 'fin',               // emitir el token del estado actual
  RETROCESO: 'retroceso',   // volver al último estado de aceptación y emitir
  L01: 'L01',               // carácter no válido
  L02: 'L02',               // número incompleto
});

const { DIGITO, EXPONENTE, LETRA, PUNTO, SIGNO, OPERADOR, BLANCO, OTRO } = CLASES;
const { FIN, RETROCESO, L01, L02 } = ACCIONES;

/** Construye una fila de la tabla: `porDefecto` en todas las columnas salvo las indicadas. */
function fila(porDefecto, excepciones = {}) {
  const resultado = {};
  for (const clase of Object.values(CLASES)) {
    resultado[clase] = excepciones[clase] ?? porDefecto;
  }
  return Object.freeze(resultado);
}

/** Tabla de transiciones del AFD (especificación, sección 1.3). */
export const TRANSICIONES = Object.freeze({
  q0: fila(L01, { [DIGITO]: 'q1', [EXPONENTE]: 'q7', [LETRA]: 'q7', [SIGNO]: 'q8', [OPERADOR]: 'q8', [BLANCO]: 'q0' }),
  q1: fila(FIN, { [DIGITO]: 'q1', [EXPONENTE]: 'q4', [PUNTO]: 'q2' }),
  q2: fila(L02, { [DIGITO]: 'q3' }),
  q3: fila(FIN, { [DIGITO]: 'q3', [EXPONENTE]: 'q4' }),
  q4: fila(RETROCESO, { [DIGITO]: 'q6', [SIGNO]: 'q5' }),
  q5: fila(RETROCESO, { [DIGITO]: 'q6' }),
  q6: fila(FIN, { [DIGITO]: 'q6' }),
  q7: fila(FIN, { [DIGITO]: 'q7', [EXPONENTE]: 'q7', [LETRA]: 'q7' }),
  q8: fila(FIN),
});

/** Estados de aceptación y la clase de token que reconocen. */
export const ACEPTACION = Object.freeze({
  q1: 'NUMERO',
  q3: 'NUMERO',
  q6: 'NUMERO',
  q7: 'IDENT',      // o FUNCION, si es palabra reservada
  q8: 'OPERADOR',
});

/**
 * Clase de un carácter. `undefined` (fin de la entrada) cuenta como OTRO,
 * que en todos los estados de aceptación significa "emitir el token".
 */
export function clasificar(c) {
  if (c === undefined) return OTRO;
  if (c >= '0' && c <= '9') return DIGITO;
  if (c === 'e' || c === 'E') return EXPONENTE;
  if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') return LETRA;
  if (c === '.') return PUNTO;
  if (c === '+' || c === '-') return SIGNO;
  if (Object.hasOwn(OPERADORES, c)) return OPERADOR;
  if (c === ' ' || c === '\t') return BLANCO;
  return OTRO;
}

/** Crea el token que corresponde al estado de aceptación `estado`. */
function crearToken(estado, lexema, columna) {
  switch (ACEPTACION[estado]) {
    case 'NUMERO':
      return { tipo: TIPOS_TOKEN.NUMERO, lexema, valor: Number(lexema), columna };
    case 'IDENT': {
      const tipo = PALABRAS_RESERVADAS.includes(lexema) ? TIPOS_TOKEN.FUNCION : TIPOS_TOKEN.IDENT;
      return { tipo, lexema, columna };
    }
    case 'OPERADOR':
      return { tipo: OPERADORES[lexema], lexema, columna };
    default:
      throw new Error(`Estado ${estado} no es de aceptación`);
  }
}

/**
 * Ejecuta el AFD desde `inicio` y reconoce un token.
 *
 * @param {string} texto
 * @param {number} inicio            Índice (desde 0) donde empieza a leer.
 * @param {Function|null} registrar  Recibe cada paso del autómata (para la traza).
 * @returns {{token: object, fin: number}} Token y el índice donde terminó.
 */
function siguienteToken(texto, inicio, registrar) {
  let estado = 'q0';
  let pos = inicio;
  let ultimaAceptacion = null;   // { estado, pos } del último estado de aceptación visitado

  for (;;) {
    const c = texto[pos];

    // En q0, el fin de la entrada produce el token EOF.
    if (estado === 'q0' && c === undefined) {
      const token = { tipo: TIPOS_TOKEN.EOF, lexema: '', columna: pos + 1 };
      registrar?.({ tipo: 'emision', token, retroceso: false });
      return { token, fin: pos };
    }

    const clase = clasificar(c);
    const accion = TRANSICIONES[estado][clase];
    registrar?.({ tipo: 'transicion', columna: pos + 1, caracter: c ?? null, desde: estado, clase, accion });

    switch (accion) {
      case FIN: {
        const token = crearToken(estado, texto.slice(inicio, pos), inicio + 1);
        registrar?.({ tipo: 'emision', token, retroceso: false });
        return { token, fin: pos };
      }
      case RETROCESO: {
        // Coincidencia más larga: se devuelve lo leído desde la última aceptación.
        const { estado: aceptado, pos: finAceptado } = ultimaAceptacion;
        const token = crearToken(aceptado, texto.slice(inicio, finAceptado), inicio + 1);
        registrar?.({ tipo: 'emision', token, retroceso: true });
        return { token, fin: finAceptado };
      }
      case L01:
        throw new ErrorCalc('L01', pos + 1, { caracter: c });
      case L02:
        // Se señala el punto decimal, que está justo antes de la posición actual.
        throw new ErrorCalc('L02', pos);
      default:
        pos++;
        if (accion === 'q0') {
          // Blanco en q0: se descarta y el token empieza después.
          inicio = pos;
        }
        estado = accion;
        if (ACEPTACION[estado]) {
          ultimaAceptacion = { estado, pos };
        }
    }
  }
}

function ejecutarAFD(texto, registrar) {
  const tokens = [];
  let pos = 0;
  for (;;) {
    const { token, fin } = siguienteToken(texto, pos, registrar);
    tokens.push(token);
    if (token.tipo === TIPOS_TOKEN.EOF) return tokens;
    pos = fin;
  }
}

/**
 * Convierte el texto de entrada en una lista de tokens terminada en EOF.
 *
 * @param {string} texto
 * @returns {import('./tokens.js').Token[]}
 * @throws {ErrorCalc} L01, L02
 */
export function tokenizar(texto) {
  return ejecutarAFD(texto, null);
}

/**
 * Igual que tokenizar(), pero también devuelve cada paso del autómata:
 *   { tipo: 'transicion', columna, caracter, desde, clase, accion }
 *   { tipo: 'emision', token, retroceso }
 * La interfaz lo usa para mostrar el AFD en funcionamiento.
 *
 * @param {string} texto
 * @returns {{tokens: object[], traza: object[]}}
 * @throws {ErrorCalc} L01, L02
 */
export function tokenizarConTraza(texto) {
  const traza = [];
  try {
    const tokens = ejecutarAFD(texto, (paso) => traza.push(paso));
    return { tokens, traza };
  } catch (e) {
    // Se conserva el recorrido hasta el error para poder mostrarlo.
    if (e instanceof ErrorCalc) e.trazaLexica = traza;
    throw e;
  }
}
