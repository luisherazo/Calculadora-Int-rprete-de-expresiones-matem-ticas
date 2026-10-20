/**
 * explicador.js — Explicación paso a paso en lenguaje natural.
 *
 * Resume cada etapa (tokens, agrupación, RPN) y, para cada operación de la
 * traza, dice qué se calcula y por qué se calcula en ese momento
 * (diseño, sección 4.2):
 *
 *   1. está entre paréntesis
 *   2. es argumento de una función / es el valor de una asignación
 *   3. su operador tiene mayor precedencia que el del padre
 *   4. asociatividad izquierda (mismo nivel, hijo izquierdo)
 *   5. asociatividad derecha (potencia, hijo derecho)
 *   6. en otro caso, es un operando del padre
 */

import { TIPOS_NODO, hijos } from './ast.js';
import { TIPOS_TOKEN } from './tokens.js';
import { formatearNumero as f, astComoExpresion } from './formato.js';
import { rpnComoTexto } from './rpn.js';

/** Nivel de precedencia de cada operador (especificación, sección 2.1). */
const PRECEDENCIA = { '=': 1, '+': 2, '-': 2, '*': 3, '/': 3, '%': 3, neg: 4, '^': 5 };

const NOMBRE_ETAPA = {
  lexico: 'léxica',
  sintactico: 'sintáctica',
  semantico: 'semántica',
  evaluacion: 'de evaluación',
};

/** Operador de un nodo para comparar precedencias; null en hojas y llamadas. */
function operadorDe(n) {
  switch (n.tipo) {
    case TIPOS_NODO.BINARIO: return n.op;
    case TIPOS_NODO.UNARIO: return 'neg';
    case TIPOS_NODO.ASIGNACION: return '=';
    default: return null;
  }
}

const nombreOp = (op) => (op === 'neg' ? 'el menos unario' : op);
const deOp = (op) => (op === 'neg' ? 'del menos unario' : `de ${op}`);

/** Recorre el AST y devuelve los nodos por id y el padre de cada uno. */
function indexar(ast) {
  const nodos = new Map();
  const padres = new Map();
  const visitar = (n, padre, indice) => {
    nodos.set(n.id, n);
    if (padre) padres.set(n.id, { padre, indice });
    hijos(n).forEach((h, i) => visitar(h, n, i));
  };
  visitar(ast, null, 0);
  return { nodos, padres };
}

/** Motivo por el que el nodo se evalúa en ese momento, o null si es la raíz. */
function motivo(nodo, relacion) {
  if (nodo.entreParentesis) return 'porque está entre paréntesis';
  if (!relacion) return null;

  const { padre, indice } = relacion;
  if (padre.tipo === TIPOS_NODO.LLAMADA) return `porque es un argumento de ${padre.nombre}`;
  if (padre.tipo === TIPOS_NODO.ASIGNACION) return `que es el valor que se asigna a ${padre.nombre}`;

  const op = operadorDe(nodo);
  const opPadre = operadorDe(padre);
  if (op === null) return `porque es un operando ${deOp(opPadre)}`;

  const p = PRECEDENCIA[op];
  const pp = PRECEDENCIA[opPadre];
  if (p > pp) {
    return `porque ${nombreOp(op)} tiene mayor precedencia que ${nombreOp(opPadre)}`;
  }
  if (p === pp && indice === 0 && op !== '^' && op !== 'neg') {
    return 'por asociatividad izquierda: entre operadores del mismo nivel se resuelve primero la operación de la izquierda';
  }
  if (p === pp && indice === 1 && op === '^') {
    return 'por asociatividad derecha: las potencias se resuelven de derecha a izquierda';
  }
  return `porque es un operando ${deOp(opPadre)}`;
}

/** Qué se calcula en un paso: '4 ^ 2 = 16'. */
function calculo(paso, nodo) {
  switch (paso.accion) {
    case 'operar': {
      const [i, d] = paso.operandos;
      const implicita = nodo.implicita ? ' (multiplicación implícita)' : '';
      return `${f(i)} ${nodo.op} ${f(d)} = ${f(paso.resultado)}${implicita}`;
    }
    case 'negar':
      return `-(${f(paso.operandos[0])}) = ${f(paso.resultado)}`;
    case 'llamar':
      return `${paso.nombre}(${paso.operandos.map(f).join(', ')}) = ${f(paso.resultado)}`;
    default:
      return '';
  }
}

/** Frases que explican la evaluación, una por operación. */
function explicarTraza(ast, traza) {
  const { nodos, padres } = indexar(ast);
  const operaciones = traza.filter((p) => p.accion !== 'apilar');
  if (operaciones.length === 0) {
    const ultimo = traza.at(-1);
    return ultimo ? [`No hay operaciones: el valor es ${f(ultimo.resultado)}.`] : [];
  }

  return operaciones.map((paso, i) => {
    const nodo = nodos.get(paso.nodoId);
    if (paso.accion === 'asignar') {
      return `Se asigna ${paso.nombre} = ${f(paso.resultado)}.`;
    }
    const razon = motivo(nodo, padres.get(nodo.id));
    const inicio = !razon && nodo === ast && i > 0 ? 'Por último, se calcula' : 'Se calcula';
    return `${inicio} ${calculo(paso, nodo)}${razon ? `, ${razon}` : ''}.`;
  });
}

/**
 * @param {object} r Resultado de interpretar(). Funciona también con
 *   resultados parciales (cuando alguna etapa falló).
 * @returns {string[]}
 */
export function explicar(r) {
  const lineas = [];

  if (r.tokens) {
    const lexemas = r.tokens.filter((t) => t.tipo !== TIPOS_TOKEN.EOF).map((t) => `[${t.lexema}]`);
    lineas.push(`Análisis léxico: se reconocieron ${lexemas.length} tokens: ${lexemas.join(' ')}`);
  }
  if (r.ast) {
    lineas.push(`Análisis sintáctico: la expresión se agrupa como ${astComoExpresion(r.ast)}`);
  }
  if (r.rpn) {
    lineas.push(`Código intermedio en notación polaca inversa: ${rpnComoTexto(r.rpn)}`);
  }
  if (r.ast && r.traza) {
    lineas.push(...explicarTraza(r.ast, r.traza));
  }

  if (r.error) {
    lineas.push(`El análisis se detuvo en la etapa ${NOMBRE_ETAPA[r.etapaFallida]}: ${r.error.message}`);
    if (r.error.pista) lineas.push(r.error.pista);
  } else if (r.valor !== null && r.valor !== undefined) {
    lineas.push(`Resultado: ${f(r.valor)}`);
  }
  return lineas;
}
