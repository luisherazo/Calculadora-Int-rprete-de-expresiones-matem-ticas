/**
 * Pruebas del analizador léxico (Fase 4.1).
 * Especificación, secciones 1.2 y 1.3.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { tokenizar, tokenizarConTraza, clasificar, TRANSICIONES } from '../src/lexer.js';
import { ErrorCalc } from '../src/errores.js';
import { CASOS_VALIDOS, CASOS_ERROR, CASOS_INTERMEDIO } from './casos.js';

/** Resume los tokens como 'TIPO(lexema)@columna' para comparar fácilmente. */
function resumen(texto) {
  return tokenizar(texto).map((t) => `${t.tipo}(${t.lexema})@${t.columna}`);
}

/** Solo los tipos, sin el EOF final. */
function tipos(texto) {
  return tokenizar(texto).slice(0, -1).map((t) => t.tipo);
}

/** Verifica que tokenizar(texto) lance un ErrorCalc con ese código y columna. */
function assertErrorLexico(texto, codigo, columna) {
  assert.throws(
    () => tokenizar(texto),
    (e) => e instanceof ErrorCalc && e.codigo === codigo && e.columna === columna,
    `'${texto}' debería dar ${codigo} en la columna ${columna}`,
  );
}

describe('tokens básicos', () => {
  test('expresión con operadores y columnas', () => {
    assert.deepEqual(resumen('2 + 3 * 4'), [
      'NUMERO(2)@1', 'MAS(+)@3', 'NUMERO(3)@5', 'POR(*)@7', 'NUMERO(4)@9', 'EOF()@10',
    ]);
  });

  test('todos los operadores y signos', () => {
    assert.deepEqual(tipos('+-*/%^()=,'), [
      'MAS', 'MENOS', 'POR', 'DIV', 'MOD', 'POT', 'PAR_IZQ', 'PAR_DER', 'ASIGNA', 'COMA',
    ]);
  });

  test('entrada vacía o solo blancos produce solo EOF', () => {
    assert.deepEqual(resumen(''), ['EOF()@1']);
    assert.deepEqual(resumen('   '), ['EOF()@4']);
  });

  test('los blancos y tabuladores se ignoran, pero cuentan para la columna', () => {
    assert.deepEqual(resumen('\t 7 '), ['NUMERO(7)@3', 'EOF()@5']);
  });

  test('no hace falta separar con espacios', () => {
    assert.deepEqual(tipos('(1+2)*3'), ['PAR_IZQ', 'NUMERO', 'MAS', 'NUMERO', 'PAR_DER', 'POR', 'NUMERO']);
  });
});

describe('números', () => {
  test('enteros y decimales', () => {
    const [entero, decimal] = tokenizar('42 3.14');
    assert.equal(entero.valor, 42);
    assert.equal(decimal.valor, 3.14);
    assert.equal(decimal.lexema, '3.14');
  });

  test('notación científica', () => {
    const valores = tokenizar('1e10 2.5E-3 6.02e+23 7e0').slice(0, -1).map((t) => t.valor);
    assert.deepEqual(valores, [1e10, 2.5e-3, 6.02e23, 7]);
  });

  test('un número en notación científica es un solo token', () => {
    assert.deepEqual(resumen('2.5e-3'), ['NUMERO(2.5e-3)@1', 'EOF()@7']);
  });

  test('3.4.5: el segundo punto no forma parte del número', () => {
    assertErrorLexico('3.4.5', 'L01', 4);
  });
});

describe('coincidencia más larga y retroceso (sección 1.3)', () => {
  test('2e3 → NUMERO(2000)', () => {
    assert.deepEqual(resumen('2e3'), ['NUMERO(2e3)@1', 'EOF()@4']);
    assert.equal(tokenizar('2e3')[0].valor, 2000);
  });

  test('2e+1 → NUMERO(20)', () => {
    assert.deepEqual(resumen('2e+1'), ['NUMERO(2e+1)@1', 'EOF()@5']);
    assert.equal(tokenizar('2e+1')[0].valor, 20);
  });

  test('2e → NUMERO(2) IDENT(e)', () => {
    assert.deepEqual(resumen('2e'), ['NUMERO(2)@1', 'IDENT(e)@2', 'EOF()@3']);
  });

  test('2e+x → NUMERO(2) IDENT(e) MAS IDENT(x)', () => {
    assert.deepEqual(resumen('2e+x'), ['NUMERO(2)@1', 'IDENT(e)@2', 'MAS(+)@3', 'IDENT(x)@4', 'EOF()@5']);
  });

  test('2e- (exponente sin dígitos al final) retrocede', () => {
    assert.deepEqual(resumen('2e-'), ['NUMERO(2)@1', 'IDENT(e)@2', 'MENOS(-)@3', 'EOF()@4']);
  });

  test('2ex → NUMERO(2) IDENT(ex)', () => {
    assert.deepEqual(resumen('2ex'), ['NUMERO(2)@1', 'IDENT(ex)@2', 'EOF()@4']);
  });

  test('2e3x → NUMERO(2000) IDENT(x)', () => {
    assert.deepEqual(resumen('2e3x'), ['NUMERO(2e3)@1', 'IDENT(x)@4', 'EOF()@5']);
  });

  test('1.5e → NUMERO(1.5) IDENT(e): retrocede a q3', () => {
    assert.deepEqual(resumen('1.5e'), ['NUMERO(1.5)@1', 'IDENT(e)@4', 'EOF()@5']);
  });

  test('2x → NUMERO(2) IDENT(x)', () => {
    assert.deepEqual(resumen('2x'), ['NUMERO(2)@1', 'IDENT(x)@2', 'EOF()@3']);
  });
});

describe('identificadores y funciones', () => {
  test('identificadores con dígitos y guion bajo', () => {
    assert.deepEqual(resumen('x2 _tmp total_1'), [
      'IDENT(x2)@1', 'IDENT(_tmp)@4', 'IDENT(total_1)@9', 'EOF()@16',
    ]);
  });

  test('xy es un solo identificador', () => {
    assert.deepEqual(resumen('xy'), ['IDENT(xy)@1', 'EOF()@3']);
  });

  test('las constantes pi y e son IDENT', () => {
    assert.deepEqual(tipos('pi e'), ['IDENT', 'IDENT']);
  });

  test('todas las funciones son palabras reservadas', () => {
    const nombres = ['sqrt', 'abs', 'sin', 'cos', 'tan', 'ln', 'log', 'min', 'max', 'round'];
    for (const nombre of nombres) {
      assert.equal(tokenizar(nombre)[0].tipo, 'FUNCION', nombre);
    }
  });

  test('una palabra que solo empieza como función es IDENT', () => {
    assert.deepEqual(tipos('sqrtx logaritmo'), ['IDENT', 'IDENT']);
  });

  test('las palabras reservadas distinguen mayúsculas', () => {
    assert.deepEqual(tipos('SQRT Sin'), ['IDENT', 'IDENT']);
  });

  test('llamada a función', () => {
    assert.deepEqual(resumen('max(2, x)'), [
      'FUNCION(max)@1', 'PAR_IZQ(()@4', 'NUMERO(2)@5', 'COMA(,)@6', 'IDENT(x)@8', 'PAR_DER())@9', 'EOF()@10',
    ]);
  });
});

describe('errores léxicos', () => {
  test('L01: carácter no válido, con mensaje del catálogo', () => {
    assertErrorLexico('3 + $', 'L01', 5);
    try {
      tokenizar('3 + $');
    } catch (e) {
      assert.equal(e.message, "Carácter no válido '$' (columna 5).");
      assert.equal(e.tipo, 'léxico');
      assert.equal(e.titulo, "L01 · Error léxico: Carácter no válido '$' (columna 5).");
    }
  });

  test('L01: punto sin parte entera', () => {
    assertErrorLexico('.5', 'L01', 1);
  });

  test('L01: letras fuera de A-Z', () => {
    assertErrorLexico('año', 'L01', 2);
  });

  test('L02: punto sin dígitos después (al final)', () => {
    assertErrorLexico('3.', 'L02', 2);
  });

  test('L02: punto sin dígitos después (en medio)', () => {
    assertErrorLexico('3.+1', 'L02', 2);
    assertErrorLexico('10 + 3.x', 'L02', 7);
  });
});

describe('autómata', () => {
  test('clasificación de caracteres', () => {
    assert.equal(clasificar('7'), 'D');
    assert.equal(clasificar('e'), 'e');
    assert.equal(clasificar('E'), 'e');
    assert.equal(clasificar('k'), 'L');
    assert.equal(clasificar('_'), 'L');
    assert.equal(clasificar('-'), '+-');
    assert.equal(clasificar('^'), 'op');
    assert.equal(clasificar(' '), 'blanco');
    assert.equal(clasificar('#'), 'otro');
    assert.equal(clasificar(undefined), 'otro');
  });

  test('la tabla tiene una acción para cada estado y cada clase', () => {
    for (const [estado, fila] of Object.entries(TRANSICIONES)) {
      assert.equal(Object.keys(fila).length, 8, estado);
    }
  });

  test('la traza muestra el recorrido de estados y el retroceso de 2e', () => {
    const { traza } = tokenizarConTraza('2e');
    const transiciones = traza.filter((p) => p.tipo === 'transicion').map((p) => `${p.desde}-${p.clase}->${p.accion}`);
    assert.deepEqual(transiciones, [
      'q0-D->q1', 'q1-e->q4', 'q4-otro->retroceso', // 2, e, fin → se emite 2
      'q0-e->q7', 'q7-otro->fin',                    // e → IDENT
    ]);
    const emisiones = traza.filter((p) => p.tipo === 'emision');
    assert.equal(emisiones[0].retroceso, true);
    assert.equal(emisiones.at(-1).token.tipo, 'EOF');
  });
});

describe('casos de la especificación (sección 6)', () => {
  const erroresLexicos = new Set(['L01', 'L02']);

  test('todos los casos válidos son léxicamente correctos', () => {
    for (const caso of [...CASOS_VALIDOS, ...CASOS_INTERMEDIO]) {
      assert.doesNotThrow(() => tokenizar(caso.entrada), caso.entrada);
    }
  });

  for (const caso of CASOS_ERROR) {
    if (erroresLexicos.has(caso.codigo)) {
      test(`caso ${caso.n}: '${caso.entrada}' → ${caso.codigo} en la columna ${caso.columna}`, () => {
        assertErrorLexico(caso.entrada, caso.codigo, caso.columna);
      });
    } else {
      test(`caso ${caso.n}: '${caso.entrada}' es léxicamente correcto (su error es ${caso.codigo})`, () => {
        assert.doesNotThrow(() => tokenizar(caso.entrada));
      });
    }
  }
});
