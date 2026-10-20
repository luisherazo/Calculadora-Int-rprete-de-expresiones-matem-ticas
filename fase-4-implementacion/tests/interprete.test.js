/**
 * Pruebas de extremo a extremo con la fachada interpretar() (Fase 4.3).
 * Ejecuta los 38 casos de la especificación (sección 6) en orden y en una
 * misma sesión, y comprueba la explicación.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { interpretar } from '../src/interprete.js';
import { TablaSimbolos } from '../src/simbolos.js';
import { formatearNumero } from '../src/formato.js';
import { rpnComoTexto } from '../src/rpn.js';
import { tripleteComoTexto, cuadruploComoTexto } from '../src/intermedio.js';
import { CASOS_VALIDOS, CASOS_ERROR, CASOS_INTERMEDIO } from './casos.js';

/** Etapa en la que debe fallar cada código de error. */
function etapaEsperada(codigo) {
  if (codigo.startsWith('L')) return 'lexico';
  if (codigo.startsWith('S')) return 'sintactico';
  return ['E01', 'E03', 'E04'].includes(codigo) ? 'semantico' : 'evaluacion';
}

describe('los 38 casos de la especificación, en una misma sesión', () => {
  const tabla = new TablaSimbolos();

  for (const caso of CASOS_VALIDOS) {
    test(`caso ${caso.n}: ${caso.entrada} = ${caso.resultado} (${caso.prueba})`, () => {
      const r = interpretar(caso.entrada, tabla);
      assert.equal(r.error, null, r.error?.message);
      assert.equal(rpnComoTexto(r.rpn), caso.rpn);
      assert.equal(formatearNumero(r.valor), caso.resultado);
    });
  }

  for (const caso of CASOS_ERROR) {
    test(`caso ${caso.n}: '${caso.entrada}' → ${caso.codigo} en la columna ${caso.columna}`, () => {
      const r = interpretar(caso.entrada, tabla);
      assert.ok(r.error, 'debería haber error');
      assert.equal(r.error.codigo, caso.codigo);
      assert.equal(r.error.columna, caso.columna);
      assert.equal(r.etapaFallida, etapaEsperada(caso.codigo));
      assert.equal(r.valor, null);
    });
  }
});

describe('código intermedio de extremo a extremo', () => {
  for (const caso of CASOS_INTERMEDIO) {
    test(caso.entrada, () => {
      const tabla = new TablaSimbolos();
      for (const nombre of ['b', 'c', 'd', 'x']) tabla.asignar(nombre, 2);
      const r = interpretar(caso.entrada, tabla);
      assert.equal(r.error, null, r.error?.message);
      assert.equal(rpnComoTexto(r.rpn), caso.rpn);
      assert.deepEqual(r.tripletes.map(tripleteComoTexto), caso.tripletes);
      assert.deepEqual(r.cuadruplos.map(cuadruploComoTexto), caso.cuadruplos);
    });
  }
});

describe('resultados parciales', () => {
  test('un error sintáctico conserva los tokens', () => {
    const r = interpretar('(2 + 3', new TablaSimbolos());
    assert.equal(r.tokens.length, 5);
    assert.equal(r.ast, null);
    assert.equal(r.rpn, null);
  });

  test('un error léxico conserva el recorrido del AFD hasta el error', () => {
    const r = interpretar('3 + $', new TablaSimbolos());
    assert.equal(r.tokens, null);
    assert.ok(r.trazaLexica.length > 0);
    assert.equal(r.trazaLexica.at(-1).accion, 'L01');
  });

  test('un error de ejecución conserva el código intermedio y la traza parcial', () => {
    const r = interpretar('2 + 5 / 0', new TablaSimbolos());
    assert.equal(r.etapaFallida, 'evaluacion');
    assert.ok(r.tripletes.length > 0);
    assert.equal(r.traza.length, 3);
  });

  test('una expresión de 1000 tokens se evalúa completa sin desbordar la pila', () => {
    const r = interpretar(Array(500).fill('1').join('+'), new TablaSimbolos());
    assert.equal(r.valor, 500);
    assert.ok(r.explicacion.length > 0);
  });

  test('un error de ejecución no modifica las variables', () => {
    const tabla = new TablaSimbolos();
    interpretar('a = 1 / 0', tabla);
    assert.ok(!tabla.existe('a'));
  });
});

describe('explicación', () => {
  const explicar = (texto, preparar = () => {}) => {
    const tabla = new TablaSimbolos();
    preparar(tabla);
    return interpretar(texto, tabla).explicacion;
  };

  test('2 + 3 * 4 ^ 2: precedencia paso a paso', () => {
    assert.deepEqual(explicar('2 + 3 * 4 ^ 2'), [
      'Análisis léxico: se reconocieron 7 tokens: [2] [+] [3] [*] [4] [^] [2]',
      'Análisis sintáctico: la expresión se agrupa como (2 + (3 * (4 ^ 2)))',
      'Código intermedio en notación polaca inversa: 2 3 4 2 ^ * +',
      'Se calcula 4 ^ 2 = 16, porque ^ tiene mayor precedencia que *.',
      'Se calcula 3 * 16 = 48, porque * tiene mayor precedencia que +.',
      'Por último, se calcula 2 + 48 = 50.',
      'Resultado: 50',
    ]);
  });

  test('asociatividad izquierda', () => {
    assert.ok(explicar('10 - 4 - 3').includes(
      'Se calcula 10 - 4 = 6, por asociatividad izquierda: entre operadores del mismo nivel se resuelve primero la operación de la izquierda.',
    ));
  });

  test('asociatividad derecha', () => {
    assert.ok(explicar('2 ^ 3 ^ 2').includes(
      'Se calcula 3 ^ 2 = 9, por asociatividad derecha: las potencias se resuelven de derecha a izquierda.',
    ));
  });

  test('paréntesis', () => {
    assert.ok(explicar('(2 + 3) * 4').includes('Se calcula 2 + 3 = 5, porque está entre paréntesis.'));
  });

  test('multiplicación implícita', () => {
    const lineas = explicar('2x + 1', (t) => t.asignar('x', 3));
    assert.ok(lineas.includes('Se calcula 2 * 3 = 6 (multiplicación implícita), porque * tiene mayor precedencia que +.'));
  });

  test('menos unario y funciones', () => {
    const lineas = explicar('-2 ^ 2 + sqrt(9)');
    assert.ok(lineas.includes('Se calcula 2 ^ 2 = 4, porque ^ tiene mayor precedencia que el menos unario.'));
    assert.ok(lineas.includes('Se calcula -(4) = -4, porque el menos unario tiene mayor precedencia que +.'));
    assert.ok(lineas.includes('Se calcula sqrt(9) = 3, porque es un operando de +.'));
  });

  test('asignación', () => {
    const lineas = explicar('x = 2 + 3');
    assert.ok(lineas.includes('Se calcula 2 + 3 = 5, que es el valor que se asigna a x.'));
    assert.ok(lineas.includes('Se asigna x = 5.'));
  });

  test('sin operaciones', () => {
    assert.ok(explicar('7').includes('No hay operaciones: el valor es 7.'));
  });

  test('con error, explica dónde se detuvo', () => {
    const lineas = explicar('foo(3)');
    assert.ok(lineas.includes("El análisis se detuvo en la etapa semántica: La variable 'foo' no está definida (columna 1)."));
    assert.match(lineas.at(-1), /¿Quisiste llamar a una función\?/);
  });
});
