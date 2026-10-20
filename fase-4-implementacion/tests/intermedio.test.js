/**
 * Pruebas del código intermedio: RPN, tripletes y cuádruplos (Fase 4.3).
 * Especificación, sección 4.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { tokenizar } from '../src/lexer.js';
import { analizar } from '../src/parser.js';
import { generarRPN, rpnComoTexto } from '../src/rpn.js';
import {
  generarTripletes, generarCuadruplos, tripleteComoTexto, cuadruploComoTexto,
} from '../src/intermedio.js';
import { CASOS_VALIDOS, CASOS_INTERMEDIO } from './casos.js';

const ast = (texto) => analizar(tokenizar(texto));
const rpn = (texto) => rpnComoTexto(generarRPN(ast(texto)));
const tripletes = (texto) => generarTripletes(ast(texto)).map(tripleteComoTexto);
const cuadruplos = (texto) => generarCuadruplos(ast(texto)).map(cuadruploComoTexto);

describe('notación polaca inversa', () => {
  for (const caso of CASOS_VALIDOS) {
    test(`caso ${caso.n}: ${caso.entrada} → ${caso.rpn}`, () => {
      assert.equal(rpn(caso.entrada), caso.rpn);
    });
  }

  test('cada elemento sabe de qué nodo y columna viene', () => {
    const elementos = generarRPN(ast('2 + 3'));
    assert.deepEqual(elementos.map((e) => [e.clase, e.texto, e.columna]), [
      ['num', '2', 1], ['num', '3', 5], ['op', '+', 3],
    ]);
    assert.ok(elementos.every((e) => Number.isInteger(e.nodoId)));
  });

  test('la multiplicación implícita queda marcada', () => {
    const [, , por] = generarRPN(ast('2x'));
    assert.equal(por.op, '*');
    assert.equal(por.implicita, true);
  });
});

describe('tripletes y cuádruplos (sección 4.4)', () => {
  for (const caso of CASOS_INTERMEDIO) {
    test(`${caso.entrada}: RPN`, () => assert.equal(rpn(caso.entrada), caso.rpn));
    test(`${caso.entrada}: tripletes`, () => assert.deepEqual(tripletes(caso.entrada), caso.tripletes));
    test(`${caso.entrada}: cuádruplos`, () => assert.deepEqual(cuadruplos(caso.entrada), caso.cuadruplos));
  }

  test('un número o una variable solos no generan instrucciones', () => {
    assert.deepEqual(tripletes('7'), []);
    assert.deepEqual(cuadruplos('x'), []);
  });

  test('asignación encadenada', () => {
    assert.deepEqual(tripletes('a = b = 4'), ['(0) = b 4', '(1) = a (0)']);
    assert.deepEqual(cuadruplos('a = b = 4'), ['(=, 4, —, b)', '(=, b, —, a)']);
  });

  test('la multiplicación implícita se traduce como *', () => {
    assert.deepEqual(tripletes('2x + 1'), ['(0) * 2 x', '(1) + (0) 1']);
  });

  test('los argumentos se generan antes que los param', () => {
    assert.deepEqual(tripletes('max(1 + 2, 3)'), [
      '(0) + 1 2', '(1) param (0) —', '(2) param 3 —', '(3) call max 2',
    ]);
  });
});
