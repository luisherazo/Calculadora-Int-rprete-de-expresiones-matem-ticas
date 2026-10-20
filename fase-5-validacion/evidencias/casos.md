# Evidencia: casos de prueba de la especificación

Generado por `npm run evidencias` ejecutando el intérprete. Los casos se ejecutan en orden y en una misma sesión (las variables persisten).

**Resultado: 42 de 42 casos correctos.**

## Casos válidos

| # | Entrada | RPN obtenida | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| 1 | `2 + 3 * 4` | `2 3 4 * +` | 14 | 14 | ✅ |
| 2 | `(2 + 3) * 4` | `2 3 + 4 *` | 20 | 20 | ✅ |
| 3 | `10 - 4 - 3` | `10 4 - 3 -` | 3 | 3 | ✅ |
| 4 | `100 / 10 / 5` | `100 10 / 5 /` | 2 | 2 | ✅ |
| 5 | `2 ^ 3 ^ 2` | `2 3 2 ^ ^` | 512 | 512 | ✅ |
| 6 | `-2 ^ 2` | `2 2 ^ neg` | -4 | -4 | ✅ |
| 7 | `(-2) ^ 2` | `2 neg 2 ^` | 4 | 4 | ✅ |
| 8 | `2 ^ -1` | `2 1 neg ^` | 0.5 | 0.5 | ✅ |
| 9 | `--4` | `4 neg neg` | 4 | 4 | ✅ |
| 10 | `7 % 3 + 1` | `7 3 % 1 +` | 2 | 2 | ✅ |
| 11 | `2.5e-3 * 1e3` | `2.5e-3 1e3 *` | 2.5 | 2.5 | ✅ |
| 12 | `x = 3` | `&x 3 =` | 3 | 3 | ✅ |
| 13 | `2x` | `2 x *` | 6 | 6 | ✅ |
| 14 | `2x^2` | `2 x 2 ^ *` | 18 | 18 | ✅ |
| 15 | `(x + 1)(x - 1)` | `x 1 + x 1 - *` | 8 | 8 | ✅ |
| 16 | `1 / 2x` | `1 2 / x *` | 1.5 | 1.5 | ✅ |
| 17 | `x(3)` | `x 3 *` | 9 | 9 | ✅ |
| 18 | `sqrt(16) + max(2, 7)` | `16 sqrt[1] 2 7 max[2] +` | 11 | 11 | ✅ |
| 19 | `round(10 / 3)` | `10 3 / round[1]` | 3 | 3 | ✅ |
| 20 | `2pi` | `2 pi *` | 6.2831853072 | 6.2831853072 | ✅ |
| 21 | `2e` | `2 e *` | 5.4365636569 | 5.4365636569 | ✅ |
| 22 | `2e+1` | `2e+1` | 20 | 20 | ✅ |
| 23 | `a = b = 4` | `&a &b 4 = =` | 4 | 4 | ✅ |
| 24 | `a + b` | `a b +` | 8 | 8 | ✅ |

## Casos de error

| # | Entrada | Esperado | Obtenido | Etapa | Mensaje | Estado |
|---|---|---|---|---|---|---|
| 25 | `3 + $` | L01 col 5 | L01 col 5 | lexico | Carácter no válido '$' (columna 5). | ✅ |
| 26 | `3.` | L02 col 2 | L02 col 2 | lexico | Se esperaba un dígito después del punto decimal (columna 2). | ✅ |
| 27 | `3 + * 4` | S01 col 5 | S01 col 5 | sintactico | Se esperaba un número, variable, función o '(' y se encontró '*' (columna 5). | ✅ |
| 28 | `(2 + 3` | S02 col 7 | S02 col 7 | sintactico | Falta ')' para cerrar el '(' de la columna 1 (columna 7). | ✅ |
| 29 | `2 3` | S03 col 3 | S03 col 3 | sintactico | Se esperaba un operador o el fin de la expresión y se encontró '3' (columna 3). | ✅ |
| 30 | `sqrt 4` | S04 col 6 | S04 col 6 | sintactico | Se esperaba '(' después de 'sqrt' (columna 6). | ✅ |
| 31 | *(vacía)* | S05 col 1 | S05 col 1 | sintactico | La expresión está vacía. | ✅ |
| 32 | `x + 1 = 3` | S06 col 7 | S06 col 7 | sintactico | Solo se puede asignar a una variable (columna 7). | ✅ |
| 33 | `y + 1` | E01 col 1 | E01 col 1 | semantico | La variable 'y' no está definida (columna 1). | ✅ |
| 34 | `5 / 0` | E02 col 3 | E02 col 3 | evaluacion | División por cero (columna 3). | ✅ |
| 35 | `sqrt(1, 2)` | E03 col 1 | E03 col 1 | semantico | 'sqrt' espera 1 argumento y recibió 2 (columna 1). | ✅ |
| 36 | `pi = 3` | E04 col 1 | E04 col 1 | semantico | 'pi' es una constante y no se puede modificar (columna 1). | ✅ |
| 37 | `sqrt(-1)` | E05 col 1 | E05 col 1 | evaluacion | 'sqrt' no está definida para -1 (columna 1). | ✅ |
| 38 | `10 ^ 400` | E06 col 4 | E06 col 4 | evaluacion | El resultado es demasiado grande (columna 4). | ✅ |

## Código intermedio

### `a = b * c + d` ✅

RPN: `&a b c * d + =`

| Tripletes | Cuádruplos |
|---|---|
| `(0) * b c` | `(*, b, c, t1)` |
| `(1) + (0) d` | `(+, t1, d, t2)` |
| `(2) = a (1)` | `(=, t2, —, a)` |

### `-2 ^ 2` ✅

RPN: `2 2 ^ neg`

| Tripletes | Cuádruplos |
|---|---|
| `(0) ^ 2 2` | `(^, 2, 2, t1)` |
| `(1) neg (0) —` | `(neg, t1, —, t2)` |

### `(x + 1)(x - 1)` ✅

RPN: `x 1 + x 1 - *`

| Tripletes | Cuádruplos |
|---|---|
| `(0) + x 1` | `(+, x, 1, t1)` |
| `(1) - x 1` | `(-, x, 1, t2)` |
| `(2) * (0) (1)` | `(*, t1, t2, t3)` |

### `y = max(2, sqrt(9)) / 2` ✅

RPN: `&y 2 9 sqrt[1] max[2] 2 / =`

| Tripletes | Cuádruplos |
|---|---|
| `(0) param 9 —` | `(param, 9, —, —)` |
| `(1) call sqrt 1` | `(call, sqrt, 1, t1)` |
| `(2) param 2 —` | `(param, 2, —, —)` |
| `(3) param (1) —` | `(param, t1, —, —)` |
| `(4) call max 2` | `(call, max, 2, t2)` |
| `(5) / (4) 2` | `(/, t2, 2, t3)` |
| `(6) = y (5)` | `(=, t3, —, y)` |

