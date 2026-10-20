/**
 * Pruebas del catálogo de errores (Fase 4.1).
 * Especificación, sección 5.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErrorCalc, CATALOGO, TIPOS } from '../src/errores.js';

test('el catálogo tiene los 15 códigos de la especificación', () => {
  assert.deepEqual(Object.keys(CATALOGO).sort(), [
    'E01', 'E02', 'E03', 'E04', 'E05', 'E06',
    'L01', 'L02',
    'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07',
  ]);
});

test('el tipo depende de la letra del código', () => {
  const esperado = { L: TIPOS.LEXICO, S: TIPOS.SINTACTICO, E: TIPOS.SEMANTICO };
  for (const [codigo, { tipo }] of Object.entries(CATALOGO)) {
    assert.equal(tipo, esperado[codigo[0]], codigo);
  }
});

test('los mensajes se rellenan con los datos y terminan con la columna', () => {
  assert.equal(
    new ErrorCalc('S02', 7, { abre: 1 }).message,
    "Falta ')' para cerrar el '(' de la columna 1 (columna 7).",
  );
  assert.equal(
    new ErrorCalc('E03', 1, { funcion: 'sqrt', esperado: '1 argumento', recibido: 2 }).message,
    "'sqrt' espera 1 argumento y recibió 2 (columna 1).",
  );
});

test('S05 no incluye la columna', () => {
  assert.equal(new ErrorCalc('S05', 1).message, 'La expresión está vacía.');
});

test('guarda código, tipo, columna y pista', () => {
  const e = new ErrorCalc('E01', 1, { nombre: 'foo' }, '¿Quisiste llamar a una función?');
  assert.ok(e instanceof Error);
  assert.equal(e.codigo, 'E01');
  assert.equal(e.tipo, 'semántico');
  assert.equal(e.columna, 1);
  assert.equal(e.pista, '¿Quisiste llamar a una función?');
  assert.equal(e.titulo, "E01 · Error semántico: La variable 'foo' no está definida (columna 1).");
});

test('un código desconocido es un error de programación', () => {
  assert.throws(() => new ErrorCalc('X99', 1), /desconocido/);
});
