# Plan de implementación — Proyecto 04: Intérprete de expresiones matemáticas

**Producto:** calculadora que explica paso a paso cómo evalúa una expresión.
**Reto:** procesar expresiones con operadores, variables y paréntesis.
**Unidades PAT:** 2 (análisis de lenguajes) y 3 (código intermedio).

Cada fase termina en un **entregable revisable**. No se avanza a la siguiente fase sin confirmación.

---

## Decisiones base (propuestas, se confirman en la Fase 1)

| Tema | Propuesta | Por qué |
|---|---|---|
| Lenguaje | JavaScript (módulos ES), sin dependencias | El mismo núcleo corre en el navegador (demo visual) y en Node 22 (pruebas y CLI). Ya está instalado. |
| Interfaz | Página web local (`index.html`) que dibuja el árbol y la traza | Se sirve con `npm start` (servidor local sin dependencias); ideal para la sustentación. |
| Parser | Descendente recursivo LL(1), escrito a mano | La rúbrica exige implementar la lógica central, no usar librerías ni `eval()`. |
| Pruebas | `node --test` (incluido en Node) | Cero instalación. |

**Componentes técnicos centrales que se justificarán** (la guía pide al menos dos): (1) analizador léxico basado en AFD, (2) gramática libre de contexto + parser LL(1), (3) generación de notación polaca inversa y evaluación con pila, (4) código intermedio en tripletes y cuádruplos.

---

## Fase 1 — Problema y alcance
**Objetivo:** definir qué resuelve la herramienta, para quién y hasta dónde llega.

Contenido:
- Necesidad: los estudiantes usan calculadoras que dan el resultado pero no muestran cómo se interpreta la expresión (precedencia, asociatividad, orden de evaluación).
- Usuarios: estudiantes de Compiladores / Matemáticas básicas y docentes.
- Objetivo general y 3–4 objetivos específicos medibles.
- **Alcance incluido:** números enteros, decimales y en notación científica (`2.5e-3`); operadores `+ - * / % ^`; menos unario; paréntesis; multiplicación implícita (`2x`, `3(4)`, `(a+b)(a-b)`); variables con asignación (`x = 3`); funciones básicas (`sin, cos, sqrt, abs, ...`); constantes `pi`, `e`; código intermedio en RPN, tripletes y cuádruplos.
- **Fuera de alcance:** derivadas, simplificación simbólica, ecuaciones, matrices, optimización de código intermedio.
- Stack confirmado y estructura del repositorio.

**Entregable 1:** `fase-1-problema/01-problema.md` + estructura de carpetas vacía del repositorio + `README.md` inicial.
**Criterio de aceptación:** alcance claro, sin ambigüedades sobre qué expresiones se soportan.

---

## Fase 2 — Especificación formal (tokens, gramática y reglas)
**Objetivo:** el modelo formal del lenguaje, antes de escribir código.

Contenido:
- **Tokens** con su expresión regular: `NUMERO` (incluye exponente `e`/`E`), `IDENT`, `FUNCION` (palabras reservadas), `MAS`, `MENOS`, `POR`, `DIV`, `MOD`, `POT`, `PAR_IZQ`, `PAR_DER`, `ASIGNA`, `COMA`, `EOF`.
- **AFD del analizador léxico** (diagrama de estados y tabla de transiciones).
- **Tabla de precedencia y asociatividad:**

  | Nivel | Operador | Asociatividad |
  |---|---|---|
  | 1 (menor) | `=` | derecha |
  | 2 | `+ -` | izquierda |
  | 3 | `* / %` y multiplicación implícita | izquierda |
  | 4 | `-` unario | derecha |
  | 5 (mayor) | `^` | derecha (`2^3^2 = 2^9`) |

- **Gramática (EBNF), sin recursión por la izquierda, apta para LL(1):**
  ```
  sentencia  → expresion ( '=' sentencia )?
  expresion  → termino ( ( '+' | '-' ) termino )*
  termino    → unario ( ( '*' | '/' | '%' ) unario | atomo potencia_resto )*
  unario     → '-' unario | potencia
  potencia   → primario potencia_resto
  potencia_resto → ( '^' unario )?
  primario   → NUMERO | atomo
  atomo      → IDENT | FUNCION '(' argumentos ')' | '(' expresion ')'
  argumentos → expresion ( ',' expresion )*
  ```
  (Versión final, ver `fase-2-especificacion/02-especificacion.md`. `-2^2 = -4`, `2^-1 = 0.5`. La multiplicación implícita solo empieza con `IDENT`, `FUNCION` o `(`, así que `2 3` es error y `2x^2 = 2·(x^2)`.)
- Conjuntos **PRIMEROS y SIGUIENTES**, y demostración de que es LL(1).
- **Reglas semánticas:** variable no definida, división por cero, función desconocida o con aridad incorrecta.
- **Catálogo de errores** (léxico, sintáctico, semántico) con mensaje y posición.
- **Esquema de traducción** del AST a tripletes y cuádruplos (temporales `t1, t2, ...`).
- Tabla de **casos de prueba esperados** (entrada → RPN → tripletes → resultado), incluidos casos de error.

**Entregable 2:** `fase-2-especificacion/02-especificacion.md` con diagramas (AFD y árboles de derivación de ejemplo).
**Criterio de aceptación:** cualquier expresión del alcance puede derivarse a mano con la gramática.

---

## Fase 3 — Diseño (arquitectura y modelos)
**Objetivo:** cómo se organiza el software.

Contenido:
- **Arquitectura en tubería:**
  `texto → Lexer → tokens → Parser → AST → { Generador RPN, Generador de tripletes/cuádruplos, Evaluador } → Explicador → Interfaz`
- Estructuras de datos: `Token {tipo, valor, posición}`, nodos del AST (`Numero`, `Variable`, `Binario`, `Unario`, `Asignacion`, `Llamada`), tabla de símbolos.
- Diseño del **explicador**: qué pasos registra (tokens reconocidos, reglas aplicadas, recorrido postorden, estado de la pila en cada paso).
- Boceto de la interfaz: entrada, lista de tokens, árbol sintáctico dibujado, RPN, traza de la pila, resultado, panel de variables y errores resaltados en la posición exacta.
- Plan de pruebas por módulo.

**Entregable 3:** `fase-3-diseno/03-diseno.md` (diagrama de componentes + boceto de UI) + esqueleto del repo con módulos vacíos y comentados.
**Criterio de aceptación:** cada módulo tiene responsabilidad, entrada y salida definidas.

---

## Fase 4 — Implementación (componentes funcionales)
Se entrega en tres hitos; cada uno se confirma por separado.

(Archivos y orden detallados en `fase-3-diseno/03-diseno.md`, sección 7.)

**4.1 Analizador léxico**
- `src/errores.js`, `src/tokens.js` y `src/lexer.js`, siguiendo el AFD de la Fase 2.
- Errores léxicos con posición (`3 + $` → "Carácter no válido '$' (columna 5)").
- `tests/lexer.test.js`.

**4.2 Analizador sintáctico, AST y semántico**
- `src/ast.js` y `src/parser.js`: descendente recursivo, una función por regla de la gramática.
- Construcción del AST respetando precedencia y asociatividad.
- `src/simbolos.js` y `src/semantico.js`: tabla de símbolos y verificación de E01, E03 y E04.
- `src/formato.js`: números a 10 decimales y AST como texto.
- Pruebas: precedencia, asociatividad, paréntesis, unarios, implícita, errores S y E.

**4.3 Código intermedio, evaluación, explicación e interfaz**
- `src/rpn.js`: notación polaca inversa por recorrido postorden del AST.
- `src/intermedio.js`: tripletes y cuádruplos a partir del AST.
- `src/evaluador.js`: evaluación de la RPN con **pila**, transaccional.
- `src/explicador.js`: explicación paso a paso en lenguaje natural.
- `src/interprete.js`: fachada que ejecuta toda la tubería.
- `index.html`, `estilos.css` y `src/ui.js`: interfaz que muestra tokens, árbol (SVG), RPN, tripletes, cuádruplos, pila y resultado.
- `cli.js` para usar desde la terminal.

**Entregable 4:** repositorio con código organizado y comentado, herramienta funcionando en el navegador.
**Criterio de aceptación:** todos los casos de la tabla de la Fase 2 pasan.

---

## Fase 5 — Validación, documentación y defensa
**Objetivo:** demostrar que funciona y preparar la sustentación.

Contenido:
- Suite de pruebas completa y reporte de resultados.
- Ejemplos de entrada, resultados y manejo de errores (capturas de pantalla).
- **Documento técnico consolidado:** problema, alcance, diseño, modelo formal, evidencias.
- `README.md` final: cómo ejecutar, ejemplos, estructura.
- Guion de sustentación (5–10 min): problema → modelo formal → demo en vivo → respuesta a la pregunta clave *"¿qué problema resuelve y qué técnicas de compiladores usa?"*.
- Lista de verificación contra la rúbrica.

**Entregable 5:** documento técnico final + evidencias + guion de defensa.
(Entregado en `fase-5-validacion/04-validacion.md`, `fase-5-validacion/05-sustentacion.md`, `fase-5-validacion/evidencias/` y `fase-5-validacion/documento-tecnico.md`.)

---

## Cobertura de la rúbrica

| Criterio | Peso | Dónde se evidencia |
|---|---|---|
| Aplicación de conceptos de compiladores | 30 % | Fases 2 y 4 (AFD, LL(1), AST, RPN, tripletes, cuádruplos, pila) |
| Funcionamiento técnico | 25 % | Fase 4 + pruebas de la Fase 5 |
| Gramáticas, autómatas y estructuras | 20 % | Fase 2 (AFD, EBNF, PRIMEROS/SIGUIENTES) y Fase 3 |
| Documentación y calidad del código | 15 % | Carpetas `fase-1` a `fase-5`, comentarios, README |
| Sustentación y dominio conceptual | 10 % | Fase 5 (guion y demo) |

## Estado

| Fase | Estado |
|---|---|
| 1. Problema y alcance | ✅ Aprobada |
| 2. Especificación formal | ✅ Aprobada |
| 3. Diseño | ✅ Aprobada |
| 4.1 Lexer | ✅ Aprobado |
| 4.2 Parser + AST + semántico | ✅ Aprobado |
| 4.3 RPN, evaluador, explicador, UI | ✅ Aprobado |
| 5. Validación y defensa | ✅ Aprobada: 266 pruebas, 42/42 casos, `fase-5-validacion/04-validacion.md`, `fase-5-validacion/05-sustentacion.md`, `fase-5-validacion/documento-tecnico.md` |

Pendiente del equipo: tomar las capturas de pantalla (`fase-5-validacion/04-validacion.md`, sección 5.1) y completar los integrantes en la portada (`fase-5-validacion/herramientas/documento.js`).
