/**
 * formato.js — Utilidades de presentación.
 *
 * - Números redondeados a 10 decimales sin ceros a la derecha
 *   (especificación, sección 3.3).
 * - AST como árbol de texto (CLI) y como expresión con todos los paréntesis
 *   explícitos (pruebas y explicación).
 */

import { TIPOS_NODO, hijos } from './ast.js';

/**
 * Redondea a 10 decimales y quita los ceros sobrantes.
 * Los valores muy pequeños (distintos de 0 y menores que 1e-6 en valor
 * absoluto) se muestran en notación científica con 10 cifras significativas,
 * para que 1e-15 no aparezca como 0.
 *
 * @param {number} valor
 * @returns {string} p. ej. 6.283185307179586 → '6.2831853072'
 */
export function formatearNumero(valor) {
  if (valor === 0) return '0';   // incluye -0
  if (Math.abs(valor) < 1e-6) return String(Number(valor.toPrecision(10)));
  const redondeado = Number(valor.toFixed(10));
  return redondeado === 0 ? '0' : String(redondeado);
}

/** Texto corto de un nodo, el mismo que se dibuja en el árbol. */
export function etiquetaNodo(n) {
  switch (n.tipo) {
    case TIPOS_NODO.NUMERO: return n.lexema;
    case TIPOS_NODO.VARIABLE: return n.nombre;
    case TIPOS_NODO.UNARIO: return 'neg';
    case TIPOS_NODO.BINARIO: return n.implicita ? '* (implícita)' : n.op;
    case TIPOS_NODO.LLAMADA: return `${n.nombre}()`;
    case TIPOS_NODO.ASIGNACION: return `${n.nombre} =`;
    default: return '?';
  }
}

/**
 * AST como árbol de texto con sangría.
 *
 *   +
 *   ├── 2
 *   └── *
 *       ├── 3
 *       └── x
 *
 * @param {import('./ast.js').Nodo} ast
 * @returns {string}
 */
export function astComoTexto(ast) {
  const lineas = [etiquetaNodo(ast)];
  const recorrer = (n, prefijo) => {
    const lista = hijos(n);
    lista.forEach((hijo, i) => {
      const ultimo = i === lista.length - 1;
      lineas.push(`${prefijo}${ultimo ? '└── ' : '├── '}${etiquetaNodo(hijo)}`);
      recorrer(hijo, prefijo + (ultimo ? '    ' : '│   '));
    });
  };
  recorrer(ast, '');
  return lineas.join('\n');
}

/**
 * AST como expresión con todos los paréntesis explícitos. Muestra cómo
 * agrupó el parser: '2 + 3 * 4' → '(2 + (3 * 4))'.
 * La multiplicación implícita se escribe con '·' y el menos unario como '(-a)'.
 *
 * @param {import('./ast.js').Nodo} n
 * @returns {string}
 */
export function astComoExpresion(n) {
  switch (n.tipo) {
    case TIPOS_NODO.NUMERO: return n.lexema;
    case TIPOS_NODO.VARIABLE: return n.nombre;
    case TIPOS_NODO.UNARIO: return `(-${astComoExpresion(n.operando)})`;
    case TIPOS_NODO.BINARIO:
      return `(${astComoExpresion(n.izq)} ${n.implicita ? '·' : n.op} ${astComoExpresion(n.der)})`;
    case TIPOS_NODO.LLAMADA: return `${n.nombre}(${n.args.map(astComoExpresion).join(', ')})`;
    case TIPOS_NODO.ASIGNACION: return `(${n.nombre} = ${astComoExpresion(n.valor)})`;
    default: return '?';
  }
}
