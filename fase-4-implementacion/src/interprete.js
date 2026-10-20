/**
 * interprete.js — Fachada del intérprete.
 *
 * Ejecuta la tubería completa:
 *   léxico → sintáctico → semántico → RPN / tripletes / cuádruplos → evaluación → explicación
 * y devuelve un objeto con lo que produjo cada etapa (diseño, sección 3.7).
 *
 * No lanza errores del usuario: un ErrorCalc se devuelve en `error` y
 * `etapaFallida`, y las etapas anteriores conservan su resultado. Si falla
 * el lexer o el evaluador, también se conserva su traza parcial.
 *
 * Lo usan la interfaz web, la CLI y las pruebas.
 */

import { ErrorCalc } from './errores.js';
import { tokenizarConTraza } from './lexer.js';
import { analizar } from './parser.js';
import { verificar } from './semantico.js';
import { generarRPN } from './rpn.js';
import { generarTripletes, generarCuadruplos } from './intermedio.js';
import { evaluarRPN } from './evaluador.js';
import { explicar } from './explicador.js';

/**
 * @param {string} texto
 * @param {import('./simbolos.js').TablaSimbolos} tabla  Se modifica si hay asignaciones.
 * @returns {object} Resultado.
 */
export function interpretar(texto, tabla) {
  const r = {
    entrada: texto,
    tokens: null,
    trazaLexica: null,
    ast: null,
    rpn: null,
    tripletes: null,
    cuadruplos: null,
    traza: null,
    valor: null,
    asignaciones: [],
    explicacion: [],
    error: null,
    etapaFallida: null,
  };

  let etapa = 'lexico';
  try {
    ({ tokens: r.tokens, traza: r.trazaLexica } = tokenizarConTraza(texto));

    etapa = 'sintactico';
    r.ast = analizar(r.tokens);

    etapa = 'semantico';
    verificar(r.ast, tabla);
    r.rpn = generarRPN(r.ast);
    r.tripletes = generarTripletes(r.ast);
    r.cuadruplos = generarCuadruplos(r.ast);

    etapa = 'evaluacion';
    const { valor, traza, asignaciones } = evaluarRPN(r.rpn, tabla);
    r.valor = valor;
    r.traza = traza;
    r.asignaciones = asignaciones;
  } catch (e) {
    if (!(e instanceof ErrorCalc)) throw e;
    r.error = e;
    r.etapaFallida = etapa;
    if (e.trazaLexica) r.trazaLexica = e.trazaLexica;
    if (e.trazaParcial) r.traza = e.trazaParcial;
  }

  r.explicacion = explicar(r);
  return r;
}
