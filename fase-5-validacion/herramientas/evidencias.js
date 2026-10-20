/**
 * herramientas/evidencias.js — Genera las evidencias de la Fase 5.
 *
 *   fase-5-validacion/evidencias/casos.md        los 38 casos de la especificación: esperado vs. obtenido
 *   fase-5-validacion/evidencias/sesion-cli.txt  sesión de la CLI con ejemplos representativos
 *
 * Uso: npm run evidencias
 *
 * Los archivos se generan ejecutando el intérprete real, así que siempre
 * reflejan el comportamiento actual del código.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { interpretar } from '../../fase-4-implementacion/src/interprete.js';
import { TablaSimbolos } from '../../fase-4-implementacion/src/simbolos.js';
import { formatearNumero } from '../../fase-4-implementacion/src/formato.js';
import { rpnComoTexto } from '../../fase-4-implementacion/src/rpn.js';
import { tripleteComoTexto, cuadruploComoTexto } from '../../fase-4-implementacion/src/intermedio.js';
import { CASOS_VALIDOS, CASOS_ERROR, CASOS_INTERMEDIO } from '../../fase-4-implementacion/tests/casos.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CARPETA = join(RAIZ, 'fase-5-validacion', 'evidencias');
mkdirSync(CARPETA, { recursive: true });

/** Escapa el texto para una celda de tabla Markdown. */
const celda = (texto) => `\`${String(texto).replace(/\|/g, '\\|')}\``;

// ---------------------------------------------------------- casos.md

const lineas = [];
let correctos = 0;
let total = 0;
const tabla = new TablaSimbolos();

lineas.push('# Evidencia: casos de prueba de la especificación');
lineas.push('');
lineas.push('Generado por `npm run evidencias` ejecutando el intérprete. Los casos se ejecutan en orden y en una misma sesión (las variables persisten).');
lineas.push('');
lineas.push('## Casos válidos');
lineas.push('');
lineas.push('| # | Entrada | RPN obtenida | Esperado | Obtenido | Estado |');
lineas.push('|---|---|---|---|---|---|');
for (const caso of CASOS_VALIDOS) {
  const r = interpretar(caso.entrada, tabla);
  const obtenido = r.error ? `${r.error.codigo}` : formatearNumero(r.valor);
  const rpn = r.rpn ? rpnComoTexto(r.rpn) : '—';
  const ok = !r.error && obtenido === caso.resultado && rpn === caso.rpn;
  total++;
  if (ok) correctos++;
  lineas.push(`| ${caso.n} | ${celda(caso.entrada)} | ${celda(rpn)} | ${caso.resultado} | ${obtenido} | ${ok ? '✅' : '❌'} |`);
}

lineas.push('');
lineas.push('## Casos de error');
lineas.push('');
lineas.push('| # | Entrada | Esperado | Obtenido | Etapa | Mensaje | Estado |');
lineas.push('|---|---|---|---|---|---|---|');
for (const caso of CASOS_ERROR) {
  const r = interpretar(caso.entrada, tabla);
  const obtenido = r.error ? `${r.error.codigo} col ${r.error.columna}` : formatearNumero(r.valor);
  const ok = r.error?.codigo === caso.codigo && r.error?.columna === caso.columna;
  total++;
  if (ok) correctos++;
  const entrada = caso.entrada === '' ? '*(vacía)*' : celda(caso.entrada);
  lineas.push(`| ${caso.n} | ${entrada} | ${caso.codigo} col ${caso.columna} | ${obtenido} | ${r.etapaFallida ?? '—'} | ${r.error?.message ?? ''} | ${ok ? '✅' : '❌'} |`);
}

lineas.push('');
lineas.push('## Código intermedio');
lineas.push('');
for (const caso of CASOS_INTERMEDIO) {
  const t = new TablaSimbolos();
  for (const nombre of ['b', 'c', 'd', 'x']) t.asignar(nombre, 2);
  const r = interpretar(caso.entrada, t);
  const tripletes = r.tripletes.map(tripleteComoTexto);
  const cuadruplos = r.cuadruplos.map(cuadruploComoTexto);
  const ok = JSON.stringify(tripletes) === JSON.stringify(caso.tripletes)
    && JSON.stringify(cuadruplos) === JSON.stringify(caso.cuadruplos)
    && rpnComoTexto(r.rpn) === caso.rpn;
  total++;
  if (ok) correctos++;
  lineas.push(`### ${celda(caso.entrada)} ${ok ? '✅' : '❌'}`);
  lineas.push('');
  lineas.push(`RPN: ${celda(rpnComoTexto(r.rpn))}`);
  lineas.push('');
  lineas.push('| Tripletes | Cuádruplos |');
  lineas.push('|---|---|');
  for (let i = 0; i < Math.max(tripletes.length, cuadruplos.length); i++) {
    lineas.push(`| ${celda(tripletes[i] ?? '')} | ${celda(cuadruplos[i] ?? '')} |`);
  }
  lineas.push('');
}

lineas.splice(4, 0, `**Resultado: ${correctos} de ${total} casos correctos.**`, '');
writeFileSync(join(CARPETA, 'casos.md'), `${lineas.join('\n')}\n`);

// ---------------------------------------------------------- sesion-cli.txt

const EJEMPLOS_CLI = [
  '2 + 3 * 4 ^ 2',
  '10 - 4 - 3',
  '2 ^ 3 ^ 2',
  '-2 ^ 2',
  'x = 3',
  '2x^2 + 1',
  '(x + 1)(x - 1)',
  'y = max(2, sqrt(9)) / 2',
  '2.5e-3 * 1e3',
  '3 + $',
  '(2 + 3',
  '2 3',
  'foo(3)',
  'sqrt(1, 2)',
  'pi = 3',
  '2 + 5 / 0',
];
const sesion = execFileSync(process.execPath, [join(RAIZ, 'fase-4-implementacion', 'cli.js'), ...EJEMPLOS_CLI], { encoding: 'utf8' });
writeFileSync(join(CARPETA, 'sesion-cli.txt'), sesion);

console.log(`Casos: ${correctos} de ${total} correctos.`);
console.log(`Escrito: fase-5-validacion/evidencias/casos.md y fase-5-validacion/evidencias/sesion-cli.txt`);
if (correctos !== total) process.exitCode = 1;
