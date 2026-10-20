/**
 * Pruebas de la tabla de símbolos y del análisis semántico (Fase 4.2).
 * Especificación, sección 3.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { tokenizar } from '../src/lexer.js';
import { analizar } from '../src/parser.js';
import { verificar } from '../src/semantico.js';
import { TablaSimbolos, FUNCIONES, describirAridad } from '../src/simbolos.js';
import { PALABRAS_RESERVADAS } from '../src/tokens.js';
import { ErrorCalc } from '../src/errores.js';
import { CASOS_ERROR } from './casos.js';

/** Verifica el texto con una tabla que tiene las variables indicadas. */
function verificarTexto(texto, variables = {}) {
  const tabla = new TablaSimbolos();
  for (const [nombre, valor] of Object.entries(variables)) tabla.asignar(nombre, valor);
  verificar(analizar(tokenizar(texto)), tabla);
}

function capturar(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  assert.fail('no se lanzó ningún error');
}

function assertErrorSemantico(texto, codigo, columna, variables = {}) {
  const e = capturar(() => verificarTexto(texto, variables));
  assert.ok(e instanceof ErrorCalc, `'${texto}': ${e}`);
  assert.equal(e.codigo, codigo, `'${texto}'`);
  assert.equal(e.columna, columna, `'${texto}'`);
  return e;
}

describe('tabla de símbolos', () => {
  test('pi y e están predefinidas como constantes', () => {
    const tabla = new TablaSimbolos();
    assert.equal(tabla.obtener('pi'), Math.PI);
    assert.equal(tabla.obtener('e'), Math.E);
    assert.ok(tabla.esConstante('pi'));
    assert.ok(!tabla.esConstante('x'));
  });

  test('asignar y obtener variables', () => {
    const tabla = new TablaSimbolos();
    assert.ok(!tabla.existe('x'));
    tabla.asignar('x', 3);
    assert.ok(tabla.existe('x'));
    assert.equal(tabla.obtener('x'), 3);
    tabla.asignar('x', 5);
    assert.equal(tabla.obtener('x'), 5);
  });

  test('obtener una variable inexistente lanza E01', () => {
    const e = capturar(() => new TablaSimbolos().obtener('y', 4));
    assert.equal(e.codigo, 'E01');
    assert.equal(e.columna, 4);
  });

  test('asignar a una constante lanza E04', () => {
    const e = capturar(() => new TablaSimbolos().asignar('pi', 3, 1));
    assert.equal(e.codigo, 'E04');
    assert.equal(e.message, "'pi' es una constante y no se puede modificar (columna 1).");
  });

  test('variables() lista constantes y variables; reiniciar() solo borra variables', () => {
    const tabla = new TablaSimbolos();
    tabla.asignar('x', 1);
    assert.deepEqual(tabla.variables().map((v) => `${v.nombre}:${v.constante}`), ['pi:true', 'e:true', 'x:false']);
    tabla.reiniciar();
    assert.deepEqual(tabla.variables().map((v) => v.nombre), ['pi', 'e']);
  });
});

describe('funciones predefinidas', () => {
  test('coinciden con las palabras reservadas del lexer', () => {
    assert.deepEqual(Object.keys(FUNCIONES).sort(), [...PALABRAS_RESERVADAS].sort());
  });

  test('descripción de la aridad', () => {
    assert.equal(describirAridad(FUNCIONES.sqrt), '1 argumento');
    assert.equal(describirAridad(FUNCIONES.max), 'al menos 1 argumento');
    assert.equal(describirAridad({ aridadMin: 2, aridadMax: 2 }), '2 argumentos');
  });

  test('dominios', () => {
    assert.ok(FUNCIONES.sqrt.dominio([0]));
    assert.ok(!FUNCIONES.sqrt.dominio([-1]));
    assert.ok(!FUNCIONES.ln.dominio([0]));
    assert.ok(!FUNCIONES.log.dominio([-5]));
    assert.ok(FUNCIONES.sin.dominio([-100]));
  });

  test('cálculos', () => {
    assert.equal(FUNCIONES.sqrt.calcular([16]), 4);
    assert.equal(FUNCIONES.log.calcular([1000]), 3);
    assert.equal(FUNCIONES.max.calcular([2, 7, 3]), 7);
    assert.equal(FUNCIONES.round.calcular([10 / 3]), 3);
  });
});

describe('verificación semántica', () => {
  test('expresiones correctas no lanzan errores', () => {
    assert.doesNotThrow(() => verificarTexto('2 + 3 * pi'));
    assert.doesNotThrow(() => verificarTexto('x = 5'));
    assert.doesNotThrow(() => verificarTexto('a = b = 4'));
    assert.doesNotThrow(() => verificarTexto('max(1, 2, 3) + min(4)'));
    assert.doesNotThrow(() => verificarTexto('2x + 1', { x: 3 }));
  });

  test('E01: variable no definida', () => {
    const e = assertErrorSemantico('y + 1', 'E01', 1);
    assert.equal(e.message, "La variable 'y' no está definida (columna 1).");
    assert.equal(e.pista, null);
  });

  test('E01: se usa la variable antes de que la asignación la cree', () => {
    assertErrorSemantico('x = x + 1', 'E01', 5);
    assertErrorSemantico('a = b = a + 1', 'E01', 9);
  });

  test('E01: un nombre desconocido seguido de "(" sugiere las funciones', () => {
    const e = assertErrorSemantico('foo(3)', 'E01', 1);
    assert.match(e.pista, /¿Quisiste llamar a una función\? Disponibles: sqrt, abs/);
  });

  test('E01 dentro de los argumentos de una función', () => {
    assertErrorSemantico('max(2, z)', 'E01', 8);
  });

  test('E03: número de argumentos incorrecto', () => {
    const e = assertErrorSemantico('sqrt(1, 2)', 'E03', 1);
    assert.equal(e.message, "'sqrt' espera 1 argumento y recibió 2 (columna 1).");
    assertErrorSemantico('1 + abs(1, 2, 3)', 'E03', 5);
  });

  test('E04: asignación a una constante', () => {
    assertErrorSemantico('pi = 3', 'E04', 1);
    assertErrorSemantico('x = e = 3', 'E04', 5);
  });

  test('se reporta el primer error de izquierda a derecha', () => {
    assertErrorSemantico('sqrt(y, 2)', 'E03', 1);
    assertErrorSemantico('y + sqrt(1, 2)', 'E01', 1);
  });
});

describe('casos de la especificación (sección 6)', () => {
  const estaticos = new Set(['E01', 'E03', 'E04']);
  for (const caso of CASOS_ERROR.filter((c) => estaticos.has(c.codigo))) {
    test(`caso ${caso.n}: '${caso.entrada}' → ${caso.codigo} en la columna ${caso.columna}`, () => {
      assertErrorSemantico(caso.entrada, caso.codigo, caso.columna);
    });
  }

  for (const caso of CASOS_ERROR.filter((c) => ['E02', 'E05', 'E06'].includes(c.codigo))) {
    test(`caso ${caso.n}: '${caso.entrada}' pasa la verificación estática (${caso.codigo} se detecta al evaluar)`, () => {
      assert.doesNotThrow(() => verificarTexto(caso.entrada));
    });
  }
});
