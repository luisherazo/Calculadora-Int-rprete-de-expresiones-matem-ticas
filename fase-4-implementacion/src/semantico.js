/**
 * semantico.js — Análisis semántico estático.
 *
 * Recorre el AST antes de evaluar y comprueba (diseño, sección 1.1):
 *   E01 variable no definida
 *   E03 número de argumentos incorrecto
 *   E04 asignación a una constante
 *
 * Se puede hacer antes de evaluar porque, dentro de una sentencia, todos los
 * usos de variables están a la derecha del último '=' y se evalúan antes de
 * cualquier asignación: en 'a = b = a + 1', 'a' debe existir de antemano.
 *
 * Los errores que dependen de los valores (E02, E05, E06) los detecta el evaluador.
 */

import { ErrorCalc } from './errores.js';
import { TIPOS_NODO, hijos } from './ast.js';
import { FUNCIONES, describirAridad } from './simbolos.js';

const PISTA_FUNCION =
  `¿Quisiste llamar a una función? Disponibles: ${Object.keys(FUNCIONES).join(', ')}.`;

/**
 * @param {import('./ast.js').Nodo} ast
 * @param {import('./simbolos.js').TablaSimbolos} tabla
 * @throws {ErrorCalc} E01, E03, E04 (el primero que aparezca, en preorden)
 */
export function verificar(ast, tabla) {
  switch (ast.tipo) {
    case TIPOS_NODO.VARIABLE:
      if (!tabla.existe(ast.nombre)) {
        const pista = ast.seguidaDeParentesis ? PISTA_FUNCION : null;
        throw new ErrorCalc('E01', ast.columna, { nombre: ast.nombre }, pista);
      }
      break;

    case TIPOS_NODO.LLAMADA: {
      const fn = FUNCIONES[ast.nombre];
      const n = ast.args.length;
      if (n < fn.aridadMin || n > fn.aridadMax) {
        throw new ErrorCalc('E03', ast.columna, {
          funcion: ast.nombre,
          esperado: describirAridad(fn),
          recibido: n,
        });
      }
      break;
    }

    case TIPOS_NODO.ASIGNACION:
      if (tabla.esConstante(ast.nombre)) {
        throw new ErrorCalc('E04', ast.columna, { nombre: ast.nombre });
      }
      break;

    default:
      break;
  }

  for (const hijo of hijos(ast)) {
    verificar(hijo, tabla);
  }
}
