/**
 * parser.js — Analizador sintáctico descendente recursivo LL(1).
 *
 * Una función por regla de la gramática EBNF (especificación, sección 2.2):
 *
 *   sentencia      → expresion ( '=' sentencia )?
 *   expresion      → termino ( ( '+' | '-' ) termino )*
 *   termino        → unario ( ( '*' | '/' | '%' ) unario | atomo potencia_resto )*
 *   unario         → '-' unario | potencia
 *   potencia       → primario potencia_resto
 *   potencia_resto → ( '^' unario )?
 *   primario       → NUMERO | atomo
 *   atomo          → IDENT | FUNCION '(' argumentos ')' | '(' expresion ')'
 *   argumentos     → expresion ( ',' expresion )*
 *
 * Cada función decide qué alternativa seguir mirando solo el token actual,
 * como indica la tabla LL(1) de la sección 2.6. El AST se construye con la
 * definición dirigida por la sintaxis de la sección 3.4.
 */

import { ErrorCalc } from './errores.js';
import { TIPOS_TOKEN as T } from './tokens.js';
import {
  TIPOS_NODO, reiniciarIds,
  crearNumero, crearVariable, crearUnario, crearBinario, crearLlamada, crearAsignacion,
} from './ast.js';

/**
 * Máximo de tokens por expresión (sin contar EOF). Acota la profundidad de la
 * recursión del parser y de los recorridos del AST: sin este límite, unos
 * 3000 paréntesis anidados desbordan la pila de llamadas de JavaScript.
 */
export const MAX_TOKENS = 1000;

/** Cómo se nombra un token en los mensajes de error. */
function describir(token) {
  return token.tipo === T.EOF ? 'el fin de la expresión' : `'${token.lexema}'`;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  /** Token actual (el símbolo de preanálisis). */
  get actual() {
    return this.tokens[this.pos];
  }

  /** ¿El token actual es de alguno de estos tipos? */
  es(...tipos) {
    return tipos.includes(this.actual.tipo);
  }

  /** Avanza y devuelve el token consumido. */
  consumir() {
    return this.tokens[this.pos++];
  }

  // sentencia → expresion ( '=' sentencia )?
  sentencia() {
    const izq = this.expresion();
    if (!this.es(T.ASIGNA)) return izq;

    const igual = this.consumir();
    // La gramática acepta cualquier expresión a la izquierda del '=' para seguir
    // siendo LL(1); aquí se exige que sea una variable (error S06).
    if (izq.tipo !== TIPOS_NODO.VARIABLE) {
      throw new ErrorCalc('S06', igual.columna);
    }
    // Recursión por la derecha → la asignación asocia por la derecha: a = (b = 4).
    return crearAsignacion(izq.nombre, this.sentencia(), izq.columna);
  }

  // expresion → termino ( ( '+' | '-' ) termino )*
  expresion() {
    let nodo = this.termino();
    while (this.es(T.MAS, T.MENOS)) {
      const op = this.consumir();
      // Pliegue por la izquierda → asociatividad izquierda: (10 - 4) - 3.
      nodo = crearBinario(op.lexema, nodo, this.termino(), op.columna);
    }
    return nodo;
  }

  // termino → unario ( ( '*' | '/' | '%' ) unario | atomo potencia_resto )*
  termino() {
    let nodo = this.unario();
    for (;;) {
      if (this.es(T.POR, T.DIV, T.MOD)) {
        const op = this.consumir();
        nodo = crearBinario(op.lexema, nodo, this.unario(), op.columna);
      } else if (this.es(T.IDENT, T.FUNCION, T.PAR_IZQ)) {
        // Multiplicación implícita: solo si el factor derecho empieza por
        // variable, función o '('. Por eso '2 3' no entra aquí y da S03.
        const columna = this.actual.columna;
        if (nodo.tipo === TIPOS_NODO.VARIABLE && this.es(T.PAR_IZQ)) {
          // Para la pista de E01: 'foo(3)' quizá quiso ser una llamada a función.
          nodo.seguidaDeParentesis = true;
        }
        const der = this.potenciaResto(this.atomo());
        nodo = crearBinario('*', nodo, der, columna, true);
      } else {
        return nodo;
      }
    }
  }

  // unario → '-' unario | potencia
  unario() {
    if (this.es(T.MENOS)) {
      const menos = this.consumir();
      return crearUnario('-', this.unario(), menos.columna);
    }
    return this.potencia();
  }

  // potencia → primario potencia_resto
  potencia() {
    return this.potenciaResto(this.primario());
  }

  // potencia_resto → ( '^' unario )?
  potenciaResto(base) {
    if (!this.es(T.POT)) return base;
    const op = this.consumir();
    // El exponente es un 'unario': admite signo (2 ^ -1) y, como 'unario' llega
    // de nuevo a 'potencia', la potencia asocia por la derecha: 2 ^ (3 ^ 2).
    return crearBinario('^', base, this.unario(), op.columna);
  }

  // primario → NUMERO | atomo
  primario() {
    if (this.es(T.NUMERO)) {
      const t = this.consumir();
      return crearNumero(t.valor, t.lexema, t.columna);
    }
    if (this.es(T.IDENT, T.FUNCION, T.PAR_IZQ)) {
      return this.atomo();
    }
    throw new ErrorCalc('S01', this.actual.columna, { encontrado: describir(this.actual) });
  }

  // atomo → IDENT | FUNCION '(' argumentos ')' | '(' expresion ')'
  atomo() {
    if (this.es(T.IDENT)) {
      const t = this.consumir();
      return crearVariable(t.lexema, t.columna);
    }

    if (this.es(T.FUNCION)) {
      const fn = this.consumir();
      if (!this.es(T.PAR_IZQ)) {
        throw new ErrorCalc('S04', this.actual.columna, { funcion: fn.lexema });
      }
      const abre = this.consumir();
      const args = this.argumentos();
      this.cerrarParentesis(abre);
      return crearLlamada(fn.lexema, args, fn.columna);
    }

    // '(' expresion ')': los paréntesis solo agrupan, no generan nodo.
    const abre = this.consumir();
    const interior = this.expresion();
    this.cerrarParentesis(abre);
    interior.entreParentesis = true;
    return interior;
  }

  // argumentos → expresion ( ',' expresion )*
  argumentos() {
    const args = [this.expresion()];
    while (this.es(T.COMA)) {
      this.consumir();
      args.push(this.expresion());
    }
    return args;
  }

  cerrarParentesis(abre) {
    if (!this.es(T.PAR_DER)) {
      throw new ErrorCalc('S02', this.actual.columna, { abre: abre.columna });
    }
    this.consumir();
  }
}

/**
 * Analiza la lista de tokens y devuelve el AST de la sentencia.
 *
 * @param {import('./tokens.js').Token[]} tokens  Lista terminada en EOF.
 * @returns {import('./ast.js').Nodo}
 * @throws {ErrorCalc} S01–S07
 */
export function analizar(tokens) {
  reiniciarIds();
  const parser = new Parser(tokens);

  if (parser.es(T.EOF)) {
    throw new ErrorCalc('S05', parser.actual.columna);
  }
  if (tokens.length - 1 > MAX_TOKENS) {
    throw new ErrorCalc('S07', tokens[MAX_TOKENS].columna, { maximo: MAX_TOKENS });
  }

  const ast = parser.sentencia();

  // Si la sentencia terminó y aún quedan tokens, sobra algo o falta un operador.
  if (!parser.es(T.EOF)) {
    throw new ErrorCalc('S03', parser.actual.columna, { encontrado: describir(parser.actual) });
  }
  return ast;
}
