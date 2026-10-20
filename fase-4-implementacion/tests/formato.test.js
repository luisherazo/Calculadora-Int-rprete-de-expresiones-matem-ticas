/**
 * Pruebas de las utilidades de presentación (Fase 4.2).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tokenizar } from '../src/lexer.js';
import { analizar } from '../src/parser.js';
import { formatearNumero, astComoTexto, etiquetaNodo } from '../src/formato.js';

test('formatearNumero redondea a 10 decimales y quita ceros', () => {
  assert.equal(formatearNumero(14), '14');
  assert.equal(formatearNumero(-4), '-4');
  assert.equal(formatearNumero(0.5), '0.5');
  assert.equal(formatearNumero(2 * Math.PI), '6.2831853072');
  assert.equal(formatearNumero(2 * Math.E), '5.4365636569');
  assert.equal(formatearNumero(0.1 + 0.2), '0.3');
  assert.equal(formatearNumero(10 / 3), '3.3333333333');
});

test('formatearNumero: casos especiales', () => {
  assert.equal(formatearNumero(0), '0');
  assert.equal(formatearNumero(-0), '0');
  assert.equal(formatearNumero(1e-15), '1e-15');
  assert.equal(formatearNumero(-2.5e-7), '-2.5e-7');
  assert.equal(formatearNumero(1e21), '1e+21');
  assert.equal(formatearNumero(0.000001), '0.000001');
});

test('astComoTexto dibuja el árbol con sangría', () => {
  const ast = analizar(tokenizar('2 + 3 * x'));
  assert.equal(astComoTexto(ast), [
    '+',
    '├── 2',
    '└── *',
    '    ├── 3',
    '    └── x',
  ].join('\n'));
});

test('astComoTexto con unario, función, implícita y asignación', () => {
  const ast = analizar(tokenizar('y = -sqrt(4) + 2x'));
  assert.equal(astComoTexto(ast), [
    'y =',
    '└── +',
    '    ├── neg',
    '    │   └── sqrt()',
    '    │       └── 4',
    '    └── * (implícita)',
    '        ├── 2',
    '        └── x',
  ].join('\n'));
});

test('etiquetas de los nodos', () => {
  assert.equal(etiquetaNodo(analizar(tokenizar('2.5e-3'))), '2.5e-3');
  assert.equal(etiquetaNodo(analizar(tokenizar('max(1, 2)'))), 'max()');
});
