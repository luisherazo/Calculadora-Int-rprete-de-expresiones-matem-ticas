/**
 * Pruebas del evaluador con pila (Fase 4.3).
 * Especificación, secciones 3.3 y 4.1.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { tokenizar } from '../src/lexer.js';
import { analizar } from '../src/parser.js';
import { generarRPN } from '../src/rpn.js';
import { evaluarRPN } from '../src/evaluador.js';
import { TablaSimbolos } from '../src/simbolos.js';
import { ErrorCalc } from '../src/errores.js';

function evaluar(texto, tabla = new TablaSimbolos()) {
  return evaluarRPN(generarRPN(analizar(tokenizar(texto))), tabla);
}

function assertErrorEvaluacion(texto, codigo, columna, tabla = new TablaSimbolos()) {
  try {
    evaluar(texto, tabla);
  } catch (e) {
    assert.ok(e instanceof ErrorCalc, String(e));
    assert.equal(e.codigo, codigo, texto);
    assert.equal(e.columna, columna, texto);
    return e;
  }
  assert.fail(`'${texto}' no produjo error`);
}

describe('valores', () => {
  const casos = [
    ['2 + 3 * 4', 14],
    ['10 - 4 - 3', 3],
    ['2 ^ 3 ^ 2', 512],
    ['-2 ^ 2', -4],
    ['(-2) ^ 2', 4],
    ['2 ^ -1', 0.5],
    ['-7 % 3', -1],
    ['0 ^ 0', 1],
    ['sqrt(16) + max(2, 7)', 11],
    ['min(4, -2, 9)', -2],
    ['log(1000) + ln(e)', 4],
    ['abs(-3) * round(2.6)', 9],
  ];
  for (const [entrada, esperado] of casos) {
    test(`${entrada} = ${esperado}`, () => assert.equal(evaluar(entrada).valor, esperado));
  }
});

describe('traza de la pila', () => {
  test('2 + 3 * 4 ^ 2: estado de la pila en cada paso', () => {
    const { traza } = evaluar('2 + 3 * 4 ^ 2');
    assert.deepEqual(traza.map((p) => p.pilaDespues), [
      [2], [2, 3], [2, 3, 4], [2, 3, 4, 2], [2, 3, 16], [2, 48], [50],
    ]);
    assert.deepEqual(traza.map((p) => p.accion), [
      'apilar', 'apilar', 'apilar', 'apilar', 'operar', 'operar', 'operar',
    ]);
  });

  test('cada paso registra la pila antes, los operandos y una descripción', () => {
    const { traza } = evaluar('2 + 3 * 4 ^ 2');
    const potencia = traza[4];
    assert.equal(potencia.paso, 5);
    assert.equal(potencia.elemento, '^');
    assert.deepEqual(potencia.pilaAntes, [2, 3, 4, 2]);
    assert.deepEqual(potencia.operandos, [4, 2]);
    assert.equal(potencia.resultado, 16);
    assert.equal(potencia.descripcion, 'Se desapilan 4 y 2, se calcula 4 ^ 2 = 16 y se apila el resultado.');
  });

  test('variables, menos unario y funciones', () => {
    const tabla = new TablaSimbolos();
    tabla.asignar('x', 3);
    const { traza, valor } = evaluar('-sqrt(x + 1)', tabla);
    assert.equal(valor, -2);
    assert.deepEqual(traza.map((p) => p.descripcion), [
      'Se apila el valor de x: 3.',
      'Se apila el número 1.',
      'Se desapilan 3 y 1, se calcula 3 + 1 = 4 y se apila el resultado.',
      'Se desapila 4 y se calcula sqrt(4) = 2.',
      'Se desapila 2 y se apila su opuesto: -2.',
    ]);
  });

  test('la referencia de la asignación aparece en la pila', () => {
    const { traza } = evaluar('a = b = 4');
    assert.deepEqual(traza.map((p) => p.pilaDespues), [
      ['&a'], ['&a', '&b'], ['&a', '&b', 4], ['&a', 4], [4],
    ]);
  });
});

describe('asignaciones', () => {
  test('se aplican a la tabla de símbolos', () => {
    const tabla = new TablaSimbolos();
    const { valor, asignaciones } = evaluar('a = b = 4', tabla);
    assert.equal(valor, 4);
    assert.deepEqual(asignaciones, [{ nombre: 'b', valor: 4 }, { nombre: 'a', valor: 4 }]);
    assert.equal(tabla.obtener('a'), 4);
    assert.equal(tabla.obtener('b'), 4);
  });

  test('son transaccionales: si la evaluación falla, no se asigna nada', () => {
    const tabla = new TablaSimbolos();
    assertErrorEvaluacion('a = 5 / 0', 'E02', 7, tabla);
    assert.ok(!tabla.existe('a'));
  });
});

describe('errores de ejecución', () => {
  test('E02: división y módulo por cero', () => {
    assertErrorEvaluacion('5 / 0', 'E02', 3);
    assertErrorEvaluacion('5 % (2 - 2)', 'E02', 3);
    assertErrorEvaluacion('0 ^ -1', 'E02', 3);
  });

  test('E05: fuera de dominio', () => {
    const e = assertErrorEvaluacion('sqrt(-1)', 'E05', 1);
    assert.equal(e.message, "'sqrt' no está definida para -1 (columna 1).");
    assertErrorEvaluacion('1 + ln(0)', 'E05', 5);
    assertErrorEvaluacion('log(-5)', 'E05', 1);
  });

  test('E05: potencia de base negativa con exponente no entero', () => {
    const e = assertErrorEvaluacion('(-8) ^ (1 / 3)', 'E05', 6);
    assert.equal(e.message, "'^' no está definida para -8 ^ 0.3333333333 (columna 6).");
  });

  test('E06: resultado no finito', () => {
    assertErrorEvaluacion('10 ^ 400', 'E06', 4);
    assertErrorEvaluacion('1e308 * 10', 'E06', 7);
  });

  test('el error conserva la traza parcial', () => {
    const e = assertErrorEvaluacion('2 + 5 / 0', 'E02', 7);
    assert.deepEqual(e.trazaParcial.map((p) => p.pilaDespues), [[2], [2, 5], [2, 5, 0]]);
  });
});
