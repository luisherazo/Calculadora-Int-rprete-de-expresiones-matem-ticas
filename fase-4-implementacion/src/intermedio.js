/**
 * intermedio.js — Código de tres direcciones: tripletes y cuádruplos.
 *
 * Ambos se generan con un recorrido en postorden del AST
 * (especificación, secciones 4.2 y 4.3). La función `dir(nodo)` devuelve
 * dónde queda el resultado de cada subárbol:
 *   - hojas: el propio número o nombre (no generan instrucciones);
 *   - tripletes: '(k)', la posición de la instrucción que lo calculó;
 *   - cuádruplos: un temporal nuevo 't1', 't2', …
 *
 * En una llamada se generan primero todos los argumentos y después los
 * 'param', para que las llamadas anidadas no queden intercaladas.
 */

import { TIPOS_NODO } from './ast.js';

const VACIO = '—';

/**
 * @param {import('./ast.js').Nodo} ast
 * @returns {{indice: number, op: string, arg1: string, arg2: string}[]}
 */
export function generarTripletes(ast) {
  const lista = [];
  const emitir = (op, arg1, arg2 = VACIO) => {
    lista.push({ indice: lista.length, op, arg1, arg2 });
    return `(${lista.length - 1})`;
  };

  const dir = (n) => {
    switch (n.tipo) {
      case TIPOS_NODO.NUMERO: return n.lexema;
      case TIPOS_NODO.VARIABLE: return n.nombre;
      case TIPOS_NODO.UNARIO: return emitir('neg', dir(n.operando));
      case TIPOS_NODO.BINARIO: {
        const a = dir(n.izq);
        const b = dir(n.der);
        return emitir(n.op, a, b);
      }
      case TIPOS_NODO.LLAMADA: {
        const args = n.args.map(dir);
        args.forEach((a) => emitir('param', a));
        return emitir('call', n.nombre, String(args.length));
      }
      case TIPOS_NODO.ASIGNACION: {
        const valor = dir(n.valor);
        return emitir('=', n.nombre, valor);
      }
      default:
        throw new Error(`Nodo desconocido: ${n.tipo}`);
    }
  };

  dir(ast);
  return lista;
}

/**
 * @param {import('./ast.js').Nodo} ast
 * @returns {{op: string, arg1: string, arg2: string, resultado: string}[]}
 */
export function generarCuadruplos(ast) {
  const lista = [];
  let temporales = 0;
  const nuevoTemporal = () => `t${++temporales}`;
  const emitir = (op, arg1, arg2, resultado) => {
    lista.push({ op, arg1, arg2, resultado });
    return resultado;
  };

  const dir = (n) => {
    switch (n.tipo) {
      case TIPOS_NODO.NUMERO: return n.lexema;
      case TIPOS_NODO.VARIABLE: return n.nombre;
      case TIPOS_NODO.UNARIO: {
        const a = dir(n.operando);
        return emitir('neg', a, VACIO, nuevoTemporal());
      }
      case TIPOS_NODO.BINARIO: {
        const a = dir(n.izq);
        const b = dir(n.der);
        return emitir(n.op, a, b, nuevoTemporal());
      }
      case TIPOS_NODO.LLAMADA: {
        const args = n.args.map(dir);
        args.forEach((a) => emitir('param', a, VACIO, VACIO));
        return emitir('call', n.nombre, String(args.length), nuevoTemporal());
      }
      case TIPOS_NODO.ASIGNACION: {
        const valor = dir(n.valor);
        return emitir('=', valor, VACIO, n.nombre);
      }
      default:
        throw new Error(`Nodo desconocido: ${n.tipo}`);
    }
  };

  dir(ast);
  return lista;
}

/** '(0) * b c' */
export function tripleteComoTexto(t) {
  return `(${t.indice}) ${t.op} ${t.arg1} ${t.arg2}`;
}

/** '(*, b, c, t1)' */
export function cuadruploComoTexto(c) {
  return `(${c.op}, ${c.arg1}, ${c.arg2}, ${c.resultado})`;
}
