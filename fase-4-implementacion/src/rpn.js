/**
 * rpn.js — Generación de notación polaca inversa.
 *
 * Recorrido en postorden del AST: primero los hijos de izquierda a derecha
 * y después el nodo (especificación, sección 4.1).
 *
 *   Numero(n)            → n
 *   Variable(v)          → v
 *   Binario(op, i, d)    → i d op
 *   Unario('-', h)       → h neg
 *   Llamada(f, a1..an)   → a1 … an f[n]
 *   Asignacion(v, e)     → &v e =
 *
 * Cada elemento guarda `nodoId` (para resaltar el nodo en el árbol) y
 * `columna` (para ubicar los errores de ejecución).
 */

import { TIPOS_NODO } from './ast.js';

/**
 * @param {import('./ast.js').Nodo} ast
 * @returns {object[]} Elementos RPN: { clase, texto, nodoId, columna, ... }
 */
export function generarRPN(ast) {
  const salida = [];
  const emitir = (nodo, clase, texto, extra = {}) => {
    salida.push({ clase, texto, nodoId: nodo.id, columna: nodo.columna, ...extra });
  };

  const visitar = (n) => {
    switch (n.tipo) {
      case TIPOS_NODO.NUMERO:
        emitir(n, 'num', n.lexema, { valor: n.valor });
        break;
      case TIPOS_NODO.VARIABLE:
        emitir(n, 'var', n.nombre, { nombre: n.nombre });
        break;
      case TIPOS_NODO.UNARIO:
        visitar(n.operando);
        emitir(n, 'neg', 'neg');
        break;
      case TIPOS_NODO.BINARIO:
        visitar(n.izq);
        visitar(n.der);
        emitir(n, 'op', n.op, { op: n.op, implicita: n.implicita });
        break;
      case TIPOS_NODO.LLAMADA:
        n.args.forEach(visitar);
        emitir(n, 'fn', `${n.nombre}[${n.args.length}]`, { nombre: n.nombre, aridad: n.args.length });
        break;
      case TIPOS_NODO.ASIGNACION:
        // La referencia va antes del valor: en la pila queda debajo de él.
        emitir(n, 'ref', `&${n.nombre}`, { nombre: n.nombre });
        visitar(n.valor);
        emitir(n, 'asig', '=', { nombre: n.nombre });
        break;
      default:
        throw new Error(`Nodo desconocido: ${n.tipo}`);
    }
  };

  visitar(ast);
  return salida;
}

/** RPN como texto separado por espacios: '2 3 4 * +'. */
export function rpnComoTexto(rpn) {
  return rpn.map((e) => e.texto).join(' ');
}
