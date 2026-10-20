/**
 * Pruebas del analizador sintáctico (Fase 4.2).
 * Especificación, secciones 2 y 3.4.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { tokenizar } from '../src/lexer.js';
import { analizar } from '../src/parser.js';
import { hijos } from '../src/ast.js';
import { astComoExpresion } from '../src/formato.js';
import { ErrorCalc } from '../src/errores.js';
import { CASOS_VALIDOS, CASOS_ERROR, CASOS_INTERMEDIO } from './casos.js';

const ast = (texto) => analizar(tokenizar(texto));
const agrupado = (texto) => astComoExpresion(ast(texto));

function assertErrorSintactico(texto, codigo, columna) {
  assert.throws(
    () => ast(texto),
    (e) => e instanceof ErrorCalc && e.codigo === codigo && e.columna === columna,
    `'${texto}' debería dar ${codigo} en la columna ${columna}`,
  );
}

/** Mensaje del error que produce el texto. */
function mensaje(texto) {
  try {
    ast(texto);
  } catch (e) {
    return e.message;
  }
  assert.fail(`'${texto}' no produjo error`);
}

describe('precedencia', () => {
  const casos = [
    ['2 + 3 * 4', '(2 + (3 * 4))'],
    ['2 * 3 + 4', '((2 * 3) + 4)'],
    ['2 + 3 * 4 ^ 2', '(2 + (3 * (4 ^ 2)))'],
    ['7 % 3 + 1', '((7 % 3) + 1)'],
    ['(2 + 3) * 4', '((2 + 3) * 4)'],
    ['-2 ^ 2', '(-(2 ^ 2))'],
    ['(-2) ^ 2', '((-2) ^ 2)'],
    ['-2 * 3', '((-2) * 3)'],
    ['2 * -3', '(2 * (-3))'],
    ['2 - -3', '(2 - (-3))'],
  ];
  for (const [entrada, esperado] of casos) {
    test(`${entrada} → ${esperado}`, () => assert.equal(agrupado(entrada), esperado));
  }
});

describe('asociatividad', () => {
  const casos = [
    ['10 - 4 - 3', '((10 - 4) - 3)'],
    ['100 / 10 / 5', '((100 / 10) / 5)'],
    ['1 + 2 - 3 + 4', '(((1 + 2) - 3) + 4)'],
    ['2 ^ 3 ^ 2', '(2 ^ (3 ^ 2))'],
    ['2 ^ -1', '(2 ^ (-1))'],
    ['2 ^ -3 ^ 2', '(2 ^ (-(3 ^ 2)))'],
    ['--4', '(-(-4))'],
    ['a = b = 4', '(a = (b = 4))'],
  ];
  for (const [entrada, esperado] of casos) {
    test(`${entrada} → ${esperado}`, () => assert.equal(agrupado(entrada), esperado));
  }
});

describe('multiplicación implícita', () => {
  const casos = [
    ['2x', '(2 · x)'],
    ['2x^2', '(2 · (x ^ 2))'],
    ['(x + 1)(x - 1)', '((x + 1) · (x - 1))'],
    ['1 / 2x', '((1 / 2) · x)'],
    ['x(3)', '(x · 3)'],
    ['3(4 + 1)', '(3 · (4 + 1))'],
    ['2 sqrt(9)', '(2 · sqrt(9))'],
    ['x y', '(x · y)'],
    ['2pi', '(2 · pi)'],
    ['2^3x', '((2 ^ 3) · x)'],
    ['-2x', '((-2) · x)'],
    ['2x + 3y', '((2 · x) + (3 · y))'],
    ['2 x y', '((2 · x) · y)'],
  ];
  for (const [entrada, esperado] of casos) {
    test(`${entrada} → ${esperado}`, () => assert.equal(agrupado(entrada), esperado));
  }

  test('el nodo se marca como implícito y guarda la columna del factor derecho', () => {
    const n = ast('2x');
    assert.equal(n.op, '*');
    assert.equal(n.implicita, true);
    assert.equal(n.columna, 2);
  });

  test('la multiplicación explícita no se marca como implícita', () => {
    assert.equal(ast('2 * x').implicita, false);
  });
});

describe('funciones, asignación y paréntesis', () => {
  test('llamadas con uno y varios argumentos', () => {
    assert.equal(agrupado('sqrt(16) + max(2, 7)'), '(sqrt(16) + max(2, 7))');
    assert.equal(agrupado('max(1, 2 + 3, min(4, 5))'), 'max(1, (2 + 3), min(4, 5))');
  });

  test('asignación', () => {
    const n = ast('x = 2 + 3');
    assert.equal(n.tipo, 'Asignacion');
    assert.equal(n.nombre, 'x');
    assert.equal(n.columna, 1);
    assert.equal(agrupado('x = 2 + 3'), '(x = (2 + 3))');
  });

  test('una variable entre paréntesis también se puede asignar', () => {
    assert.equal(ast('(x) = 3').tipo, 'Asignacion');
  });

  test('los paréntesis no crean nodos pero se marcan', () => {
    const n = ast('((2 + 3)) * 4');
    assert.equal(n.izq.op, '+');
    assert.equal(n.izq.entreParentesis, true);
    assert.equal(n.entreParentesis, undefined);
  });

  test('los números conservan su lexema y su valor', () => {
    const n = ast('2.5e-3');
    assert.equal(n.tipo, 'Numero');
    assert.equal(n.lexema, '2.5e-3');
    assert.equal(n.valor, 0.0025);
  });

  test('cada nodo tiene un id único y los ids se reinician en cada análisis', () => {
    const ids = [];
    const recorrer = (n) => { ids.push(n.id); hijos(n).forEach(recorrer); };
    recorrer(ast('y = max(2, sqrt(9)) / 2'));
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ast('7').id, 1);
  });

  test('columnas de los operadores', () => {
    const n = ast('10 - 4 - 3');
    assert.equal(n.columna, 8);
    assert.equal(n.izq.columna, 4);
  });
});

describe('errores sintácticos', () => {
  test('S01: falta un operando', () => {
    assertErrorSintactico('3 + * 4', 'S01', 5);
    assertErrorSintactico('= 3', 'S01', 1);
    assertErrorSintactico('max()', 'S01', 5);
    assert.equal(mensaje('3 + * 4'), "Se esperaba un número, variable, función o '(' y se encontró '*' (columna 5).");
  });

  test('S01: la expresión termina antes de tiempo', () => {
    assertErrorSintactico('2 +', 'S01', 4);
    assert.equal(mensaje('2 +'), "Se esperaba un número, variable, función o '(' y se encontró el fin de la expresión (columna 4).");
  });

  test('S02: paréntesis sin cerrar', () => {
    assertErrorSintactico('(2 + 3', 'S02', 7);
    assertErrorSintactico('((1)', 'S02', 5);
    assertErrorSintactico('(2 + 3 4', 'S02', 8);
    assertErrorSintactico('max(2 3)', 'S02', 7);
    assert.equal(mensaje('(2 + 3'), "Falta ')' para cerrar el '(' de la columna 1 (columna 7).");
  });

  test('S03: sobra un token o falta un operador', () => {
    assertErrorSintactico('2 3', 'S03', 3);
    assertErrorSintactico('x 2', 'S03', 3);
    assertErrorSintactico('(1)2', 'S03', 4);
    assertErrorSintactico('2 + 3)', 'S03', 6);
    assert.equal(mensaje('2 + 3)'), "Se esperaba un operador o el fin de la expresión y se encontró ')' (columna 6).");
  });

  test('S04: función sin paréntesis', () => {
    assertErrorSintactico('sqrt 4', 'S04', 6);
    assertErrorSintactico('2 + sqrt', 'S04', 9);
  });

  test('S05: entrada vacía', () => {
    assertErrorSintactico('', 'S05', 1);
    assert.equal(mensaje('   '), 'La expresión está vacía.');
  });

  test('S06: destino de asignación inválido', () => {
    assertErrorSintactico('x + 1 = 3', 'S06', 7);
    assertErrorSintactico('2 = 3', 'S06', 3);
    assertErrorSintactico('sqrt(4) = 3', 'S06', 9);
  });

  test('S07: expresión demasiado larga', () => {
    const anidada = `${'('.repeat(3000)}1${')'.repeat(3000)}`;
    assertErrorSintactico(anidada, 'S07', 1001);
    assertErrorSintactico(Array(600).fill('1').join('+'), 'S07', 1001);
  });

  test('el límite admite expresiones de hasta 1000 tokens', () => {
    const anidada = `${'('.repeat(499)}1${')'.repeat(499)}`;   // 999 tokens
    assert.equal(ast(anidada).tipo, 'Numero');
    const larga = Array(500).fill('1').join('+');               // 999 tokens, AST de profundidad 499
    assert.equal(ast(larga).op, '+');
  });

  test('una asignación entre paréntesis no está permitida', () => {
    assertErrorSintactico('(a = 3)', 'S02', 4);
  });
});

describe('casos de la especificación (sección 6)', () => {
  test('todos los casos válidos se analizan sin error', () => {
    for (const caso of [...CASOS_VALIDOS, ...CASOS_INTERMEDIO]) {
      assert.doesNotThrow(() => ast(caso.entrada), caso.entrada);
    }
  });

  for (const caso of CASOS_ERROR) {
    if (caso.codigo.startsWith('S')) {
      test(`caso ${caso.n}: '${caso.entrada}' → ${caso.codigo} en la columna ${caso.columna}`, () => {
        assertErrorSintactico(caso.entrada, caso.codigo, caso.columna);
      });
    } else if (caso.codigo.startsWith('E')) {
      test(`caso ${caso.n}: '${caso.entrada}' es sintácticamente correcto (su error es ${caso.codigo})`, () => {
        assert.doesNotThrow(() => ast(caso.entrada));
      });
    }
  }
});
