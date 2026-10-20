/**
 * casos.js — Casos de prueba de la especificación (sección 6).
 *
 * Se ejecutan en orden y en una misma sesión: las variables persisten
 * (x se define en el caso 12, a y b en el 23).
 * Los usan rpn.test.js, evaluador.test.js e interprete.test.js.
 */

/** Casos válidos: entrada, RPN esperada (texto) y resultado formateado. */
export const CASOS_VALIDOS = [
  { n: 1, entrada: '2 + 3 * 4', rpn: '2 3 4 * +', resultado: '14', prueba: 'precedencia' },
  { n: 2, entrada: '(2 + 3) * 4', rpn: '2 3 + 4 *', resultado: '20', prueba: 'paréntesis' },
  { n: 3, entrada: '10 - 4 - 3', rpn: '10 4 - 3 -', resultado: '3', prueba: 'asociatividad izquierda' },
  { n: 4, entrada: '100 / 10 / 5', rpn: '100 10 / 5 /', resultado: '2', prueba: 'asociatividad izquierda' },
  { n: 5, entrada: '2 ^ 3 ^ 2', rpn: '2 3 2 ^ ^', resultado: '512', prueba: 'asociatividad derecha' },
  { n: 6, entrada: '-2 ^ 2', rpn: '2 2 ^ neg', resultado: '-4', prueba: 'unario vs. potencia' },
  { n: 7, entrada: '(-2) ^ 2', rpn: '2 neg 2 ^', resultado: '4', prueba: 'unario entre paréntesis' },
  { n: 8, entrada: '2 ^ -1', rpn: '2 1 neg ^', resultado: '0.5', prueba: 'exponente negativo' },
  { n: 9, entrada: '--4', rpn: '4 neg neg', resultado: '4', prueba: 'unario anidado' },
  { n: 10, entrada: '7 % 3 + 1', rpn: '7 3 % 1 +', resultado: '2', prueba: 'módulo' },
  { n: 11, entrada: '2.5e-3 * 1e3', rpn: '2.5e-3 1e3 *', resultado: '2.5', prueba: 'notación científica' },
  { n: 12, entrada: 'x = 3', rpn: '&x 3 =', resultado: '3', prueba: 'asignación' },
  { n: 13, entrada: '2x', rpn: '2 x *', resultado: '6', prueba: 'multiplicación implícita' },
  { n: 14, entrada: '2x^2', rpn: '2 x 2 ^ *', resultado: '18', prueba: 'implícita vs. potencia' },
  { n: 15, entrada: '(x + 1)(x - 1)', rpn: 'x 1 + x 1 - *', resultado: '8', prueba: 'implícita entre paréntesis' },
  { n: 16, entrada: '1 / 2x', rpn: '1 2 / x *', resultado: '1.5', prueba: 'implícita con precedencia de *' },
  { n: 17, entrada: 'x(3)', rpn: 'x 3 *', resultado: '9', prueba: 'variable seguida de paréntesis' },
  { n: 18, entrada: 'sqrt(16) + max(2, 7)', rpn: '16 sqrt[1] 2 7 max[2] +', resultado: '11', prueba: 'funciones' },
  { n: 19, entrada: 'round(10 / 3)', rpn: '10 3 / round[1]', resultado: '3', prueba: 'función con expresión' },
  { n: 20, entrada: '2pi', rpn: '2 pi *', resultado: '6.2831853072', prueba: 'constante' },
  { n: 21, entrada: '2e', rpn: '2 e *', resultado: '5.4365636569', prueba: 'retroceso del lexer' },
  { n: 22, entrada: '2e+1', rpn: '2e+1', resultado: '20', prueba: 'coincidencia más larga' },
  { n: 23, entrada: 'a = b = 4', rpn: '&a &b 4 = =', resultado: '4', prueba: 'asignación encadenada' },
  { n: 24, entrada: 'a + b', rpn: 'a b +', resultado: '8', prueba: 'variables persistentes' },
];

/** Casos de error: entrada, código y columna esperados. */
export const CASOS_ERROR = [
  { n: 25, entrada: '3 + $', codigo: 'L01', columna: 5 },
  { n: 26, entrada: '3.', codigo: 'L02', columna: 2 },
  { n: 27, entrada: '3 + * 4', codigo: 'S01', columna: 5 },
  { n: 28, entrada: '(2 + 3', codigo: 'S02', columna: 7 },
  { n: 29, entrada: '2 3', codigo: 'S03', columna: 3 },
  { n: 30, entrada: 'sqrt 4', codigo: 'S04', columna: 6 },
  { n: 31, entrada: '', codigo: 'S05', columna: 1 },
  { n: 32, entrada: 'x + 1 = 3', codigo: 'S06', columna: 7 },
  { n: 33, entrada: 'y + 1', codigo: 'E01', columna: 1 },
  { n: 34, entrada: '5 / 0', codigo: 'E02', columna: 3 },
  { n: 35, entrada: 'sqrt(1, 2)', codigo: 'E03', columna: 1 },
  { n: 36, entrada: 'pi = 3', codigo: 'E04', columna: 1 },
  { n: 37, entrada: 'sqrt(-1)', codigo: 'E05', columna: 1 },
  { n: 38, entrada: '10 ^ 400', codigo: 'E06', columna: 4 },
];

/** Casos de código intermedio (especificación, sección 4.4). */
export const CASOS_INTERMEDIO = [
  {
    entrada: 'a = b * c + d',
    rpn: '&a b c * d + =',
    tripletes: ['(0) * b c', '(1) + (0) d', '(2) = a (1)'],
    cuadruplos: ['(*, b, c, t1)', '(+, t1, d, t2)', '(=, t2, —, a)'],
  },
  {
    entrada: '-2 ^ 2',
    rpn: '2 2 ^ neg',
    tripletes: ['(0) ^ 2 2', '(1) neg (0) —'],
    cuadruplos: ['(^, 2, 2, t1)', '(neg, t1, —, t2)'],
  },
  {
    entrada: '(x + 1)(x - 1)',
    rpn: 'x 1 + x 1 - *',
    tripletes: ['(0) + x 1', '(1) - x 1', '(2) * (0) (1)'],
    cuadruplos: ['(+, x, 1, t1)', '(-, x, 1, t2)', '(*, t1, t2, t3)'],
  },
  {
    entrada: 'y = max(2, sqrt(9)) / 2',
    rpn: '&y 2 9 sqrt[1] max[2] 2 / =',
    tripletes: [
      '(0) param 9 —', '(1) call sqrt 1', '(2) param 2 —', '(3) param (1) —',
      '(4) call max 2', '(5) / (4) 2', '(6) = y (5)',
    ],
    cuadruplos: [
      '(param, 9, —, —)', '(call, sqrt, 1, t1)', '(param, 2, —, —)', '(param, t1, —, —)',
      '(call, max, 2, t2)', '(/, t2, 2, t3)', '(=, t3, —, y)',
    ],
  },
];
