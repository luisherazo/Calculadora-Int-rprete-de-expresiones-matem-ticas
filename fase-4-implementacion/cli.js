/**
 * cli.js — Calculadora explicativa en la terminal.
 *
 * Uso:
 *   npm run cli                      modo interactivo
 *   node cli.js "2 + 3 * 4" "x = 2"   evalúa cada argumento y termina
 *
 * Para cada expresión imprime tokens, agrupación, árbol, RPN, tripletes,
 * cuádruplos, evolución de la pila, explicación y resultado.
 * Comandos del modo interactivo: :vars, :borrar, :ayuda, :salir.
 * Diseño, sección 5.5.
 */

import { createInterface } from 'node:readline';
import { interpretar } from './src/interprete.js';
import { TablaSimbolos } from './src/simbolos.js';
import { formatearNumero as f, astComoExpresion, astComoTexto } from './src/formato.js';
import { rpnComoTexto } from './src/rpn.js';
import { tripleteComoTexto, cuadruploComoTexto } from './src/intermedio.js';
import { mostrarElementoPila } from './src/evaluador.js';

const tabla = new TablaSimbolos();

const AYUDA = `
Sintaxis:
  números      42  3.14  2.5e-3
  operadores   +  -  *  /  %  ^   (precedencia: ^ > - unario > * / % > + -)
  implícita    2x  3(4 + 1)  (a + b)(a - b)
  variables    x = 3   a = b = 4   (constantes: pi, e)
  funciones    sqrt abs sin cos tan ln log round min max
Comandos:
  :vars    muestra la tabla de símbolos
  :borrar  borra las variables
  :ayuda   muestra esta ayuda
  :salir   termina
`;

const sangrar = (texto, prefijo = '    ') => texto.split('\n').map((l) => prefijo + l).join('\n');

function imprimirResultado(r) {
  const salida = [];
  const seccion = (titulo, contenido) => salida.push(`  ${titulo.padEnd(13)}${contenido}`);

  if (r.tokens) {
    seccion('Tokens:', r.tokens.filter((t) => t.tipo !== 'EOF').map((t) => t.lexema).join('  '));
  }
  if (r.ast) {
    seccion('Agrupación:', astComoExpresion(r.ast));
    salida.push('  Árbol:');
    salida.push(sangrar(astComoTexto(r.ast)));
  }
  if (r.rpn) {
    seccion('RPN:', rpnComoTexto(r.rpn));
    seccion('Tripletes:', r.tripletes.length ? r.tripletes.map(tripleteComoTexto).join(' | ') : '(ninguno)');
    seccion('Cuádruplos:', r.cuadruplos.length ? r.cuadruplos.map(cuadruploComoTexto).join(' | ') : '(ninguno)');
  }
  if (r.traza?.length) {
    const pilas = r.traza.map((p) => `[${p.pilaDespues.map(mostrarElementoPila).join(', ')}]`);
    seccion('Pila:', pilas.join(' → '));
  }

  if (r.error) {
    salida.push('');
    salida.push(`  ${r.entrada.replace(/\t/g, ' ')}`);
    salida.push(`  ${' '.repeat(Math.max(0, r.error.columna - 1))}^`);
    salida.push(`  ${r.error.titulo ?? r.error.message}`);
    if (r.error.pista) salida.push(`  ${r.error.pista}`);
  } else {
    salida.push('  Explicación:');
    // Las tres primeras líneas repiten tokens, agrupación y RPN; se omiten aquí.
    salida.push(...r.explicacion.slice(3, -1).map((l) => `    - ${l}`));
    salida.push(`  = ${f(r.valor)}`);
  }
  console.log(salida.join('\n'));
}

function mostrarVariables() {
  for (const v of tabla.variables()) {
    console.log(`  ${v.nombre.padEnd(10)} ${f(v.valor)}${v.constante ? '   (constante)' : ''}`);
  }
}

/** Procesa una línea. Devuelve false si hay que terminar. */
function procesar(linea) {
  const texto = linea.trim();
  switch (texto) {
    case ':salir': return false;
    case ':ayuda': console.log(AYUDA); return true;
    case ':vars': mostrarVariables(); return true;
    case ':borrar': tabla.reiniciar(); console.log('  Variables borradas.'); return true;
    case '': return true;
    default:
      try {
        imprimirResultado(interpretar(linea, tabla));
      } catch (e) {
        // Solo ante un fallo interno; el bucle interactivo sigue funcionando.
        console.log(`  Error interno del intérprete: ${e.message}`);
      }
      return true;
  }
}

const argumentos = process.argv.slice(2);
if (argumentos.length > 0) {
  for (const expresion of argumentos) {
    console.log(`calc> ${expresion}`);
    procesar(expresion);
    console.log();
  }
} else {
  console.log('Calculadora explicativa. Escribe una expresión o :ayuda.');
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'calc> ' });
  rl.prompt();
  rl.on('line', (linea) => {
    if (procesar(linea)) {
      console.log();
      rl.prompt();
    } else {
      rl.close();
    }
  });
}
