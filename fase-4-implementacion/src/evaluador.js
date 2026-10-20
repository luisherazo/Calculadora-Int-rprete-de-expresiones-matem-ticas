/**
 * evaluador.js — Evaluación de la RPN con una pila.
 *
 * Acciones por elemento (especificación, sección 4.1):
 *   número        apilar
 *   variable v    apilar su valor
 *   &v            apilar la referencia a v
 *   + - * / % ^   desapilar d, desapilar i, apilar i op d
 *   neg           desapilar a, apilar -a
 *   f[n]          desapilar n valores, apilar f(…)
 *   =             desapilar el valor y &v, asignar, apilar el valor
 *
 * Cada paso queda registrado con la pila antes y después (diseño, sección 3.5).
 *
 * Evaluación transaccional: las asignaciones se anotan y solo se aplican a la
 * tabla de símbolos si toda la evaluación termina sin errores.
 */

import { ErrorCalc } from './errores.js';
import { FUNCIONES } from './simbolos.js';
import { formatearNumero as f } from './formato.js';

const OPERACIONES = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '%': (a, b) => a % b,   // el resultado toma el signo del dividendo: -7 % 3 = -1
  '^': (a, b) => Math.pow(a, b),
};

/** E06 si el resultado no es finito. */
function comprobarFinito(valor, elemento) {
  if (!Number.isFinite(valor)) {
    throw new ErrorCalc('E06', elemento.columna);
  }
  return valor;
}

/** Muestra un elemento de la pila: número formateado o referencia '&x'. */
function mostrar(item) {
  return typeof item === 'number' ? f(item) : item;
}

/**
 * @param {object[]} rpn  Elementos generados por generarRPN().
 * @param {import('./simbolos.js').TablaSimbolos} tabla
 * @returns {{valor: number, traza: object[], asignaciones: {nombre: string, valor: number}[]}}
 * @throws {ErrorCalc} E01, E02, E04, E05, E06. El error lleva `trazaParcial`
 *   con los pasos ejecutados hasta ese momento.
 */
export function evaluarRPN(rpn, tabla) {
  const pila = [];
  const traza = [];
  const asignaciones = [];

  const registrar = (elemento, pilaAntes, datos) => {
    traza.push({
      paso: traza.length + 1,
      elemento: elemento.texto,
      clase: elemento.clase,
      nodoId: elemento.nodoId,
      columna: elemento.columna,
      pilaAntes,
      pilaDespues: [...pila],
      ...datos,
    });
  };

  try {
    for (const el of rpn) {
      const antes = [...pila];

      switch (el.clase) {
        case 'num':
          pila.push(el.valor);
          registrar(el, antes, { accion: 'apilar', resultado: el.valor, descripcion: `Se apila el número ${el.texto}.` });
          break;

        case 'var': {
          const valor = tabla.obtener(el.nombre, el.columna);
          pila.push(valor);
          registrar(el, antes, { accion: 'apilar', resultado: valor, descripcion: `Se apila el valor de ${el.nombre}: ${f(valor)}.` });
          break;
        }

        case 'ref':
          pila.push(`&${el.nombre}`);
          registrar(el, antes, { accion: 'apilar', descripcion: `Se apila la referencia a ${el.nombre}, destino de la asignación.` });
          break;

        case 'op': {
          const d = pila.pop();
          const i = pila.pop();
          if ((el.op === '/' || el.op === '%') && d === 0) {
            throw new ErrorCalc('E02', el.columna);
          }
          if (el.op === '^' && i === 0 && d < 0) {
            throw new ErrorCalc('E02', el.columna);   // 0 ^ -1 = 1 / 0
          }
          const r = OPERACIONES[el.op](i, d);
          if (Number.isNaN(r)) {
            // p. ej. (-8) ^ (1/3): potencia de base negativa con exponente no entero
            throw new ErrorCalc('E05', el.columna, { funcion: el.op, valor: `${f(i)} ${el.op} ${f(d)}` });
          }
          comprobarFinito(r, el);
          pila.push(r);
          registrar(el, antes, {
            accion: 'operar', operandos: [i, d], resultado: r,
            descripcion: `Se desapilan ${f(i)} y ${f(d)}, se calcula ${f(i)} ${el.op} ${f(d)} = ${f(r)} y se apila el resultado.`,
          });
          break;
        }

        case 'neg': {
          const a = pila.pop();
          const r = -a;
          pila.push(r);
          registrar(el, antes, {
            accion: 'negar', operandos: [a], resultado: r,
            descripcion: `Se desapila ${f(a)} y se apila su opuesto: ${f(r)}.`,
          });
          break;
        }

        case 'fn': {
          const fn = FUNCIONES[el.nombre];
          const args = pila.splice(pila.length - el.aridad, el.aridad);
          if (!fn.dominio(args)) {
            throw new ErrorCalc('E05', el.columna, { funcion: el.nombre, valor: args.map(f).join(', ') });
          }
          const r = comprobarFinito(fn.calcular(args), el);
          pila.push(r);
          const textos = args.map(f);
          const enumeracion = textos.length === 1
            ? textos[0]
            : `${textos.slice(0, -1).join(', ')} y ${textos.at(-1)}`;
          registrar(el, antes, {
            accion: 'llamar', nombre: el.nombre, operandos: args, resultado: r,
            descripcion: `Se ${args.length === 1 ? 'desapila' : 'desapilan'} ${enumeracion} y se calcula ${el.nombre}(${textos.join(', ')}) = ${f(r)}.`,
          });
          break;
        }

        case 'asig': {
          const valor = pila.pop();
          pila.pop();   // la referencia &nombre
          if (tabla.esConstante(el.nombre)) {
            throw new ErrorCalc('E04', el.columna, { nombre: el.nombre });
          }
          asignaciones.push({ nombre: el.nombre, valor, columna: el.columna });
          pila.push(valor);
          registrar(el, antes, {
            accion: 'asignar', nombre: el.nombre, operandos: [valor], resultado: valor,
            descripcion: `Se desapilan ${f(valor)} y &${el.nombre}, se asigna ${el.nombre} = ${f(valor)} y se apila el valor.`,
          });
          break;
        }

        default:
          throw new Error(`Elemento RPN desconocido: ${el.clase}`);
      }
    }
  } catch (e) {
    if (e instanceof ErrorCalc) e.trazaParcial = traza;
    throw e;
  }

  if (pila.length !== 1) {
    throw new Error(`La pila terminó con ${pila.length} elementos: [${pila.map(mostrar).join(', ')}]`);
  }

  // Sin errores: se confirman las asignaciones.
  for (const { nombre, valor, columna } of asignaciones) {
    tabla.asignar(nombre, valor, columna);
  }

  return {
    valor: pila[0],
    traza,
    asignaciones: asignaciones.map(({ nombre, valor }) => ({ nombre, valor })),
  };
}

export { mostrar as mostrarElementoPila };
