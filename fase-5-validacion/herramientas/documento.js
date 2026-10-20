/**
 * herramientas/documento.js — Une las fases en un solo documento técnico.
 *
 *   fase-5-validacion/documento-tecnico.md  portada, índice, fases 1–4 y anexos con las evidencias
 *
 * Uso: npm run evidencias && npm run documento
 *
 * Se genera a partir de los documentos de cada fase, así que no hay que
 * mantener dos copias del mismo contenido.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ_DOCS = fileURLToPath(new URL('../../', import.meta.url));
const leer = (archivo) => readFileSync(join(RAIZ_DOCS, archivo), 'utf8').replace(/\r\n/g, '\n');

const SECCIONES = [
  ['fase-1-problema/01-problema.md', 'Problema y alcance'],
  ['fase-2-especificacion/02-especificacion.md', 'Especificación formal'],
  ['fase-3-diseno/03-diseno.md', 'Diseño'],
  ['fase-5-validacion/04-validacion.md', 'Validación'],
];

/** Quita la línea "**Proyecto 04 · …**" que repite cada documento bajo su título. */
function limpiar(texto) {
  return texto.replace(/^\*\*Proyecto 04[^\n]*\*\*\n(?:[^\n]+\n)?\n?/m, '').trim();
}

/** Baja un nivel todos los títulos (# → ##), sin tocar los bloques de código. */
function bajarTitulos(texto) {
  let enCodigo = false;
  return texto.split('\n').map((linea) => {
    if (linea.startsWith('```')) enCodigo = !enCodigo;
    return !enCodigo && /^#{1,5} /.test(linea) ? `#${linea}` : linea;
  }).join('\n');
}

const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

const partes = [
  '# Documento técnico',
  '## Calculadora explicativa: intérprete de expresiones matemáticas',
  '',
  '| | |',
  '|---|---|',
  '| Asignatura | Compiladores, proyecto integrador |',
  '| Proyecto | 04 · Intérprete de expresiones matemáticas (nivel medio) |',
  '| Unidades PAT | 2 (análisis de lenguajes) y 3 (código intermedio) |',
  '| Integrantes | *[completar]* |',
  `| Fecha | ${fecha} |`,
  '',
  '**Producto:** calculadora que explica cómo evalúa expresiones. Muestra tokens, árbol sintáctico, notación polaca inversa, tripletes, cuádruplos, la pila de evaluación paso a paso y una explicación en lenguaje natural.',
  '',
  '## Índice',
  '',
  ...SECCIONES.map(([, titulo], i) => `${i + 1}. ${titulo}`),
  'A. Anexo: casos de prueba',
  'B. Anexo: sesión de la terminal',
  '',
  'El guion de sustentación está aparte, en `fase-5-validacion/05-sustentacion.md`.',
  '',
  '---',
  '',
];

for (const [archivo] of SECCIONES) {
  partes.push(limpiar(leer(archivo)), '', '---', '');
}

partes.push('# Anexo A. Casos de prueba', '');
partes.push(bajarTitulos(leer('fase-5-validacion/evidencias/casos.md').replace(/^# [^\n]*\n/, '')).trim(), '', '---', '');

partes.push('# Anexo B. Sesión de la terminal', '');
partes.push('Generada con `npm run evidencias` (ejecuta `cli.js` con 16 ejemplos).', '');
partes.push('```text', leer('fase-5-validacion/evidencias/sesion-cli.txt').trimEnd(), '```', '');

writeFileSync(join(RAIZ_DOCS, 'fase-5-validacion', 'documento-tecnico.md'), partes.join('\n'));
console.log('Escrito: fase-5-validacion/documento-tecnico.md');
