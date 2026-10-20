# Fase 5 — Validación

**Proyecto 04 · Intérprete de expresiones matemáticas**

Este documento muestra que la herramienta cumple el reto, la especificación y la rúbrica. Todas las cifras salen de ejecutar el código y se pueden reproducir con los comandos indicados.

---

## 1. Resumen

| Indicador | Resultado | Cómo reproducirlo |
|---|---|---|
| Pruebas automáticas | **266 de 266** en verde (27 grupos, 8 archivos) | `npm test` |
| Casos de la especificación | **42 de 42** correctos (24 válidos, 14 de error y 4 de código intermedio) | `npm run evidencias` |
| Cobertura de líneas | **99.03 %** | `npm run cobertura` |
| Cobertura de ramas | **95.99 %** | `npm run cobertura` |
| Cobertura de funciones | **94.87 %** | `npm run cobertura` |
| Dependencias externas | **0** | `package.json` |
| Uso de `eval()` / `Function()` | **ninguno** | buscar en `src/` |

## 2. Requisitos del reto

| Requisito (catálogo de proyectos) | Cómo se cumple | Evidencia |
|---|---|---|
| Procesar expresiones con operadores, variables y paréntesis | `+ - * / % ^`, menos unario, paréntesis anidados, variables con asignación y persistencia, constantes y funciones | Casos 1–24 |
| Realizar tokenización | Lexer escrito como tabla de transiciones de un AFD, sin expresiones regulares | `src/lexer.js`, 48 pruebas |
| Realizar parsing | Parser descendente recursivo LL(1), una función por regla de la gramática | `src/parser.js`, 63 pruebas |
| Respetar precedencia y asociatividad | Un nivel de la gramática por nivel de precedencia; pliegue por la izquierda y recursión por la derecha | Casos 1–9, 16; pruebas "precedencia" y "asociatividad" |
| Mostrar árbol sintáctico **o** notación polaca inversa | Se muestran **ambos**, además de tripletes y cuádruplos | Pestañas Árbol y Código intermedio |
| Producto: calculadora que explica cómo evalúa | Traza de la pila paso a paso, resaltado del nodo en el árbol y explicación en lenguaje natural del motivo de cada operación | Pestañas Evaluación y Explicación |

## 3. Pruebas automáticas

### 3.1 Por archivo

| Archivo | Pruebas | Qué verifica |
|---|---|---|
| `tests/lexer.test.js` | 48 | Tokens y columnas, notación científica, retroceso del AFD (`2e`, `2e+1`), palabras reservadas, L01 y L02 |
| `tests/parser.test.js` | 63 | Agrupación del AST con precedencia, asociatividad, unarios, multiplicación implícita y asignación encadenada; S01–S07 |
| `tests/semantico.test.js` | 23 | Tabla de símbolos, funciones predefinidas, E01 (con pista), E03 y E04 |
| `tests/intermedio.test.js` | 42 | RPN de los 24 casos válidos; tripletes y cuádruplos de la sección 4.4 |
| `tests/evaluador.test.js` | 23 | Valores, estado de la pila en cada paso, asignaciones transaccionales, E02, E05 y E06 |
| `tests/interprete.test.js` | 56 | Los 38 casos de extremo a extremo en una misma sesión, resultados parciales y explicación |
| `tests/formato.test.js` | 5 | Redondeo a 10 decimales y árbol como texto |
| `tests/errores.test.js` | 6 | Catálogo de errores y formato de los mensajes |
| **Total** | **266** | |

### 3.2 Cobertura

| Módulo | Líneas | Ramas | Funciones |
|---|---|---|---|
| `ast.js` | 100 % | 100 % | 100 % |
| `errores.js` | 100 % | 90 % | 100 % |
| `evaluador.js` | 95.68 % | 93.48 % | 90.91 % |
| `explicador.js` | 99.33 % | 95.65 % | 100 % |
| `formato.js` | 100 % | 91.43 % | 100 % |
| `intermedio.js` | 98.18 % | 92.31 % | 100 % |
| `interprete.js` | 100 % | 83.33 % | 100 % |
| `lexer.js` | 99.50 % | 98.39 % | 100 % |
| `parser.js` | 100 % | 100 % | 100 % |
| `rpn.js` | 98.55 % | 92.31 % | 100 % |
| `semantico.js` | 100 % | 100 % | 100 % |
| `simbolos.js` | 98.86 % | 97.50 % | 83.87 % |
| `tokens.js` | 100 % | 100 % | 100 % |

Casi todas las líneas sin cubrir son **código defensivo** que no se alcanza con entradas válidas del lenguaje:
- Las ramas `default` que lanzan "nodo desconocido" o "elemento RPN desconocido".
- La comprobación de que la pila termina con un solo elemento.
- La revalidación de E04 dentro del evaluador, que ya garantiza el análisis semántico.
- El caso `entre N y M argumentos` de `describirAridad`, que ninguna función predefinida usa.

`ui.js` no está en la tabla porque necesita un navegador. Se validó a mano (sección 5).

## 4. Casos de la especificación

El detalle completo, generado al ejecutar el intérprete, está en [evidencias/casos.md](evidencias/casos.md). Resumen:

| Grupo | Casos | Correctos |
|---|---|---|
| Válidos (precedencia, asociatividad, unarios, científica, implícita, variables, funciones, constantes) | 24 | 24 |
| Errores léxicos (L01, L02) | 2 | 2 |
| Errores sintácticos (S01–S06) | 6 | 6 |
| Errores semánticos estáticos (E01, E03, E04) | 3 | 3 |
| Errores de ejecución (E02, E05, E06) | 3 | 3 |
| Código intermedio (RPN, tripletes, cuádruplos) | 4 | 4 |
| **Total** | **42** | **42** |

En [evidencias/sesion-cli.txt](evidencias/sesion-cli.txt) hay una sesión de la terminal con 16 ejemplos que muestra tokens, árbol, RPN, tripletes, cuádruplos, pila, explicación y errores con su marca de columna.

### 4.1 Hallazgo corregido en esta fase

Al probar casos límite se encontró que una expresión con unos **3000 paréntesis anidados** desbordaba la pila de llamadas de JavaScript (`RangeError`). Se corrigió así:
- El parser rechaza las expresiones de más de **1000 tokens** con el error nuevo **S07**, agregado a la especificación.
- Hay pruebas de que 1000 tokens (499 paréntesis anidados, o una suma de 500 términos) se evalúan completos y de que 3000 paréntesis dan S07.
- La CLI captura cualquier error interno para que el modo interactivo no se cierre.

## 5. Validación de la interfaz web

Se probó en el navegador integrado con `npm start`:

| Verificación | Resultado |
|---|---|
| Ejemplo `2 + 3 * 4 ^ 2` | Resultado 50 y agrupación `(2 + (3 * (4 ^ 2)))` ✔ |
| `y = max(2, sqrt(9)) / 2`, pestaña Evaluación | 8 pasos; en el paso 5 la pila es `[&y, 3]` y el nodo `max` está resaltado; la variable `y = 1.5` aparece en la tabla ✔ |
| `2 + 5 / 0` | E02 en la columna 7 con la marca `^`; la traza parcial se detiene en `[2, 5, 0]` y `/` aparece marcado en la RPN ✔ |
| `3 + $` | L01 en la columna 5; el recorrido del AFD se abre solo y marca la fila del error ✔ |
| Historial | Registra las expresiones con su resultado o código de error ✔ |
| Ancho de teléfono (375 px) | Sin desplazamiento horizontal en ninguna de las 5 pestañas ✔ |
| Consola del navegador | Sin errores ✔ |
| Tema oscuro y claro | Ambos revisados en pantalla; el botón de tema alterna y recuerda la elección ✔ |
| Línea de etapas | Con `2 + 5 / 0`: tokens, árbol e intermedio en verde y evaluación en rojo ✔ |

### 5.1 Capturas para el documento final

Las capturas las debe tomar el equipo en su propio navegador (`npm start` → http://localhost:8080) y guardarlas en `fase-5-validacion/evidencias/capturas/`:

| Archivo sugerido | Qué mostrar |
|---|---|
| `01-tokens.png` | `2.5e-3 * 1e3` en la pestaña Tokens, con el recorrido del AFD abierto |
| `02-arbol.png` | `2 + 3 * 4 ^ 2` en la pestaña Árbol |
| `03-intermedio.png` | `y = max(2, sqrt(9)) / 2` en Código intermedio (RPN, tripletes, cuádruplos) |
| `04-evaluacion.png` | El mismo ejemplo en Evaluación, a mitad de la traza |
| `05-explicacion.png` | `2x^2 + 1` (con `x = 3`) en Explicación |
| `06-error-sintactico.png` | `(2 + 3` con la marca de columna |
| `07-error-ejecucion.png` | `2 + 5 / 0` en Evaluación, con la traza parcial |
| `08-movil.png` | Cualquier ejemplo con el ancho de un teléfono |

## 6. Cumplimiento de la rúbrica

| Criterio | Peso | Evidencia |
|---|---|---|
| Aplicación de conceptos de compiladores | 30 % | Cuatro componentes implementados a mano: AFD (`lexer.js`), gramática LL(1) y parser descendente recursivo (`parser.js`), análisis semántico con tabla de símbolos (`semantico.js`, `simbolos.js`), y código intermedio en RPN, tripletes y cuádruplos evaluado con pila (`rpn.js`, `intermedio.js`, `evaluador.js`). |
| Funcionamiento técnico del sistema | 25 % | 266 pruebas y 42 de 42 casos correctos; interfaz web y CLI funcionando; errores con código, tipo y columna; evaluación transaccional. |
| Gramáticas, autómatas y estructuras | 20 % | [Especificación](../fase-2-especificacion/02-especificacion.md): AFD con diagrama y tabla de transiciones, gramática EBNF y BNF, PRIMEROS y SIGUIENTES, demostración LL(1), tabla LL(1) y traza del autómata de pila. [Diseño](../fase-3-diseno/03-diseno.md): AST, tabla de símbolos, elementos RPN y traza. |
| Documentación y calidad del código | 15 % | Documento técnico por fases; cada módulo comentado y referenciado a su sección de la especificación; una función por regla de la gramática; sin dependencias; 99 % de cobertura de líneas. |
| Sustentación y dominio conceptual | 10 % | [Guion de sustentación](05-sustentacion.md) con demo, respuesta a la pregunta clave y banco de preguntas. |

La guía pide además:
- **"No basta con integrar una librería"**: no hay dependencias ni se usa `eval()`. Toda la lógica central está en `src/`.
- **"Justificar al menos dos componentes técnicos centrales"**: hay cuatro, justificados en la Fase 1 (sección 6) y en la sustentación.

## 7. Limitaciones conocidas

| Limitación | Ejemplo | Comentario |
|---|---|---|
| Aritmética de punto flotante | `0.1 + 0.2` vale internamente 0.30000000000000004 | Se muestra `0.3` por el redondeo a 10 decimales. |
| `round` redondea las mitades hacia +∞ | `round(-2.5) = -2` | Es el comportamiento de `Math.round`. |
| Trigonometría solo en radianes | `sin(90)` ≠ 1 | No hay modo de grados. |
| Sin `+` unario | `+5` → S01 | Fuera del alcance de la gramática. |
| Solo se informa el primer error | `3 + * 4 )` → solo S01 | No hay recuperación de errores (decisión de la Fase 2). |
| Identificadores solo ASCII | `año` → L01 | Alfabeto definido en la especificación, sección 1.1. |
| `xy` es una sola variable | `xy` ≠ `x · y` | Se escribe `x y` o `x*y`. |
| Máximo 1000 tokens por expresión | — | Límite S07 para evitar el desbordamiento de la pila. |
| La interfaz necesita un servidor local | Doble clic en `index.html` no carga los módulos | Se usa `npm start` (ver diseño, sección 5.4). |
