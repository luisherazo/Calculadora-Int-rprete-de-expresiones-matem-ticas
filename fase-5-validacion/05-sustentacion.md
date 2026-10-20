# Guion de sustentación

**Proyecto 04 · Intérprete de expresiones matemáticas**
Duración objetivo: **10 minutos** de exposición y demo, más preguntas.

---

## Pregunta clave

> *¿Qué problema resuelve nuestra herramienta y qué técnicas de compiladores utiliza?*

**Respuesta (30 segundos, para memorizar):**

"Las calculadoras dan el resultado pero no muestran cómo interpretan la expresión. Nuestra calculadora sí lo muestra: dice qué operación se hace primero y por qué. Para eso aplica las fases de un compilador. Un **autómata finito determinista** reconoce los tokens. Un **parser LL(1) descendente recursivo**, construido a partir de una gramática libre de contexto, arma el árbol sintáctico respetando precedencia y asociatividad. Un **análisis semántico** con tabla de símbolos valida variables y funciones. Por último, el árbol se traduce a **código intermedio** (notación polaca inversa, tripletes y cuádruplos) y la RPN se evalúa con una **pila**. Todo está implementado a mano, sin librerías ni `eval`."

---

## Guion

| Tiempo | Bloque | Qué decir | Qué mostrar |
|---|---|---|---|
| 0:00–1:00 | **Problema** | La calculadora como caja negra. Preguntar al público cuánto da `2 + 3 * 4 ^ 2` y por qué `2 ^ 3 ^ 2` da 512 y no 64. | Diapositiva de título, o la herramienta con la entrada vacía. |
| 1:00–1:30 | **Solución** | La respuesta a la pregunta clave, en una frase. | — |
| 1:30–3:30 | **Modelo formal** | AFD del lexer (estados q0–q8 y retroceso con `2e`). Gramática por niveles: un no terminal por nivel de precedencia. Por qué es LL(1): PRIMEROS y SIGUIENTES disjuntos. | `fase-2-especificacion/02-especificacion.md`: diagrama del AFD (1.3), gramática (2.2) y tabla LL(1) (2.6). |
| 3:30–4:30 | **Arquitectura** | Tubería léxico → sintáctico → semántico → código intermedio → evaluación → explicación. Cada etapa es un módulo y la interfaz solo usa la fachada. | Diagrama de `fase-3-diseno/03-diseno.md`, sección 1. |
| 4:30–8:30 | **Demo en vivo** | Ver la sección siguiente. | `npm start` → http://localhost:8080 |
| 8:30–9:30 | **Validación** | 266 pruebas, 42 de 42 casos, 99 % de cobertura. El hallazgo de los 3000 paréntesis y cómo se corrigió (S07). | `npm test` en la terminal; `fase-5-validacion/04-validacion.md`. |
| 9:30–10:00 | **Cierre** | Limitaciones honestas y trabajo futuro: recuperación de errores, modo de grados, optimización del código intermedio. | — |

---

## Demo en vivo (4 minutos)

Preparación: el servidor ya está corriendo (`npm start`), el navegador está abierto en http://localhost:8080 y las variables están borradas.

| # | Escribir | Pestaña | Qué señalar |
|---|---|---|---|
| 1 | `2 + 3 * 4 ^ 2` | **Tokens** | 7 tokens con su tipo y columna. |
| | | **Árbol** | `^` queda más abajo que `*`, y `*` más abajo que `+`: lo más profundo se evalúa primero. |
| | | **Evaluación** | Pulsar ⏮ y avanzar con ▶ o con las flechas. La pila crece hasta `[2, 3, 4, 2]` y luego se reduce. El nodo activo se resalta en el árbol. |
| | | **Explicación** | "porque ^ tiene mayor precedencia que *". |
| 2 | `2 ^ 3 ^ 2` y luego `10 - 4 - 3` | Árbol | Asociatividad derecha frente a izquierda: el árbol crece hacia la derecha en un caso y hacia la izquierda en el otro. |
| 3 | `x = 3` y luego `(x + 1)(x - 1)` | Árbol y Variables | Multiplicación implícita (nodo con borde punteado); `x` aparece en la tabla de variables. |
| 4 | `y = max(2, sqrt(9)) / 2` | **Código intermedio** | RPN con `&y`, tripletes con `param` y `call`, cuádruplos con temporales. |
| 5 | `2.5e-3 * 1e3` | Tokens → recorrido del AFD | Notación científica reconocida por los estados q4–q6. |
| 6 | `(2 + 3` | — | S02 con la marca `^` en la columna 7. |
| 7 | `foo(3)` | — | E01 con la pista "¿quisiste llamar a una función?". |
| 8 | `2 + 5 / 0` | Evaluación | E02 a mitad de la ejecución: la traza se detiene en `[2, 5, 0]` y `/` aparece en rojo. |

Si falla el navegador, la demo de respaldo es la terminal:

```bash
node fase-4-implementacion/cli.js "2 + 3 * 4 ^ 2" "x = 3" "(x + 1)(x - 1)" "(2 + 3"
```

---

## Banco de preguntas

**¿Por qué un parser descendente recursivo y no LR?**
La gramática se puede escribir sin recursión por la izquierda y sin prefijos comunes, así que es LL(1). El parser descendente recursivo se escribe a mano con una función por regla, lo que hace visible la relación entre la gramática y el código. Un LR necesitaría generar tablas con una herramienta, y la guía pide implementar la lógica central.

**¿Cómo garantizan la precedencia?**
Con la estructura de la gramática. Hay un no terminal por nivel (`expresion` → `termino` → `unario` → `potencia` → `primario`) y cada uno solo deriva al siguiente nivel. Por eso los operadores de mayor precedencia quedan más abajo en el árbol y, en el recorrido en postorden, se evalúan primero.

**¿Y la asociatividad?**
La izquierda (`+ - * / %`) se logra con un ciclo que pliega por la izquierda: `nodo = Binario(op, nodo, siguiente)`. La derecha (`^` y `=`) se logra con recursión por la derecha: el exponente vuelve a llamar a `unario`, que vuelve a llegar a `potencia`.

**¿Por qué `-2 ^ 2` da -4?**
Porque el menos unario tiene menor precedencia que `^` (convención matemática). El árbol es `neg(2 ^ 2)`. Para obtener 4 hay que escribir `(-2) ^ 2`.

**La gramática tiene `sentencia → expresion ('=' sentencia)?`. ¿No acepta `2 = 3`?**
La gramática sí la acepta. Así se mantiene LL(1), porque con `IDENT '=' expresion` habría que mirar dos tokens adelante. Después de reconocer el `=`, el parser verifica que la izquierda sea una variable y, si no lo es, lanza S06. Es una restricción de contexto que se comprueba fuera de la gramática.

**¿Cómo demuestran que es LL(1)?**
Con los conjuntos PRIMEROS y SIGUIENTES (especificación, sección 2.4): para cada no terminal, los PRIMEROS de sus alternativas son disjuntos y, cuando una alternativa deriva ε, no se cruzan con los SIGUIENTES. La tabla LL(1) (sección 2.6) no tiene ninguna celda con dos producciones.

**¿Cómo se resuelve la multiplicación implícita sin ambigüedad?**
Es una alternativa de `termino` que solo se elige si el token actual es `IDENT`, `FUNCION` o `(`. Esos tokens no están en SIGUIENTES(T'), así que no hay conflicto. Se excluyó el número a la derecha (`2 3`) porque es ambiguo para el usuario.

**¿Para qué sirve el retroceso del AFD?**
Para la coincidencia más larga con notación científica. En `2e+1` el autómata avanza por q1 → q4 → q5 → q6 y reconoce 20. En `2e` llega a q4, que no es de aceptación, al final de la entrada, así que retrocede al último estado de aceptación (q1), emite `2`, y luego la `e` se reconoce como la constante.

**¿Por qué las funciones son palabras reservadas?**
Para que `x(3)` signifique siempre `x · 3` sin depender de la tabla de símbolos. Si no lo fueran, el parser tendría que consultar en tiempo de análisis si un nombre es función o variable.

**¿Qué diferencia hay entre tripletes y cuádruplos?**
Los tripletes refieren resultados por la posición de la instrucción, `(k)`. Los cuádruplos guardan cada resultado en un temporal explícito (`t1`, `t2`, …). Los cuádruplos son más fáciles de reordenar en una optimización, porque mover una instrucción no cambia las referencias.

**¿Por qué evaluar la RPN y no el árbol directamente?**
Para usar el código intermedio de verdad, como haría una máquina de pila, y para poder mostrar la pila paso a paso. Es el mismo principio de un autómata de pila.

**¿Qué hace el análisis semántico si ya evalúan después?**
Detecta antes de ejecutar los errores que no dependen de los valores: variable no definida, aridad incorrecta y asignación a constante. Así ningún error de este tipo aparece a mitad de una evaluación. Los que dependen de los valores (división por cero, dominio, desbordamiento) solo se pueden detectar al evaluar.

**¿Qué pasa si falla la evaluación en medio de una asignación?**
Nada se asigna. El evaluador es transaccional: anota las asignaciones y solo las aplica si toda la evaluación termina bien. Por ejemplo, `a = 1 / 0` no crea `a`.

**¿Cómo saben que funciona?**
Hay 266 pruebas automáticas y los 42 casos de la especificación se verifican en el orden de una sesión real. La cobertura de líneas es del 99 %. Las evidencias se regeneran ejecutando el código (`npm run evidencias`), no están escritas a mano.

**¿Usaron alguna librería?**
Ninguna. `package.json` no tiene dependencias. Node.js solo se usa para las pruebas, la CLI y el servidor estático. No se usa `eval()`.

**¿Qué mejorarían?**
Recuperación de errores para informar varios a la vez, modo de grados, optimización del código intermedio (plegado de constantes y subexpresiones comunes) y funciones definidas por el usuario.

---

## Lista de verificación antes de presentar

- [ ] `npm test` en verde.
- [ ] `npm start` corriendo y la página abierta en http://localhost:8080.
- [ ] Variables borradas antes de empezar la demo.
- [ ] `fase-2-especificacion/02-especificacion.md` abierto en las secciones 1.3, 2.2 y 2.6.
- [ ] Terminal lista con la demo de respaldo.
- [ ] Capturas guardadas en `fase-5-validacion/evidencias/capturas/` (ver validación, sección 5.1).
- [ ] Cada integrante sabe responder la pregunta clave.
