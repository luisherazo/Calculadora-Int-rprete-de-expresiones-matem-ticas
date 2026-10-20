# Fase 1 — Problema y alcance

**Proyecto 04 · Intérprete de expresiones matemáticas**
Compiladores · Proyecto integrador · Unidades PAT 2 y 3

---

## 1. Problema

Las calculadoras comunes reciben una expresión como `2 + 3 * 4 ^ 2` y devuelven `50`, pero no muestran **cómo** llegaron a ese resultado. Para quien la usa, el proceso es una caja negra:

- No se ve que `^` se resuelve antes que `*`, y `*` antes que `+` (**precedencia**).
- No se ve por qué `10 - 4 - 3` da `3` y no `9`, ni por qué `2 ^ 3 ^ 2` da `512` y no `64` (**asociatividad**).
- Si la expresión está mal escrita (`3 + * 4`, `(2 + 3`), solo aparece "Error", sin decir **dónde** ni **por qué**.

Precisamente ese proceso es el que hace un compilador: separar el texto en tokens, comprobar que cumpla una gramática, construir un árbol y traducirlo a una forma intermedia que una máquina evalúa. Este proyecto hace visible ese proceso.

## 2. Solución propuesta

Una **calculadora que explica cómo evalúa expresiones**. Para cada entrada muestra:

1. **Tokens** reconocidos por el analizador léxico.
2. **Árbol sintáctico** (AST) construido por el analizador sintáctico.
3. **Código intermedio** en tres formas: notación polaca inversa (RPN), tripletes y cuádruplos.
4. **Traza de evaluación** con el estado de la pila en cada paso.
5. **Resultado**, o un **error explicado** con su tipo y la columna exacta.

## 3. Usuarios

| Usuario | Para qué la usa |
|---|---|
| Estudiantes de Compiladores | Ver en funcionamiento el análisis léxico y sintáctico, el AST y el código intermedio. |
| Estudiantes de matemáticas básicas | Entender el orden de las operaciones con ejemplos propios. |
| Docentes | Proyectar ejemplos en clase y mostrar errores típicos. |

## 4. Objetivos

**Objetivo general.** Desarrollar un intérprete de expresiones matemáticas que tokenice, analice y evalúe expresiones con operadores, variables y paréntesis, y explique paso a paso cada etapa del proceso.

**Objetivos específicos.**

1. Implementar un **analizador léxico** basado en un autómata finito determinista que reconozca los tokens del lenguaje y reporte errores léxicos con su posición.
2. Implementar un **analizador sintáctico descendente recursivo** (LL(1)) a partir de una gramática libre de contexto que respete la precedencia y la asociatividad de los operadores.
3. Generar el **árbol sintáctico** y traducirlo a **código intermedio** (notación polaca inversa, tripletes y cuádruplos). Evaluar la RPN con una **pila**.
4. Presentar una **explicación paso a paso** de la evaluación en una interfaz web, junto con mensajes de error comprensibles.

## 5. Alcance

### 5.1 Incluido

| Elemento | Detalle | Ejemplo |
|---|---|---|
| Números | Enteros y decimales | `42`, `3.14`, `0.5` |
| Notación científica | Exponente `e`/`E` con signo opcional | `1e10`, `2.5E-3`, `6.02e+23` |
| Operadores binarios | `+ - * / %` y potencia `^` | `7 % 3`, `2 ^ 10` |
| Multiplicación implícita | Factores yuxtapuestos cuando el de la derecha es variable, función o paréntesis. Misma precedencia y asociatividad que `*`. | `2x`, `3(4 + 1)`, `(a + b)(a - b)`, `2 sqrt(9)`, `x y` |
| Menos unario | Negación, incluso anidada | `-5`, `-(2 + 3)`, `--4` |
| Paréntesis | Anidamiento arbitrario | `((1 + 2) * (3 - 4))` |
| Variables | Asignación y uso; persisten durante la sesión | `x = 3`, luego `2 * x + 1` |
| Constantes | Predefinidas | `pi`, `e` |
| Funciones | `sqrt, abs, sin, cos, tan, ln, log, min, max, round` (palabras reservadas) | `sqrt(16) + max(2, 7)` |
| Código intermedio | RPN, tripletes `(op, arg1, arg2)` y cuádruplos `(op, arg1, arg2, temporal)` | `a = b * c + d` → `(0) * b c`, `(1) + (0) d`, `(2) = a (1)` |
| Errores léxicos | Carácter no válido | `3 + $` |
| Errores sintácticos | Estructura incorrecta | `3 + * 4`, `(2 + 3` |
| Errores semánticos | Variable no definida, división por cero, función desconocida o con aridad incorrecta | `y + 1`, `5 / 0`, `sqrt(1, 2)` |

### 5.2 Fuera de alcance

- Números complejos y fracciones exactas.
- Multiplicación implícita con un número a la derecha (`2 3`, `x 2`, `(1)2`): se reporta como error sintáctico porque es ambigua.
- Optimización del código intermedio (eliminación de subexpresiones comunes, plegado de constantes).
- Cálculo simbólico: derivadas, simplificación, resolución de ecuaciones.
- Matrices, vectores, definición de funciones por el usuario.
- Persistencia de variables entre sesiones.

## 6. Componentes técnicos de compiladores

La guía exige justificar al menos dos componentes técnicos centrales. Este proyecto aplica cuatro:

| Componente | Tema del PAT | Uso en el proyecto |
|---|---|---|
| Autómata finito determinista | Unidad 1-2 · Análisis léxico | Reconocer números (también en notación científica), identificadores, palabras reservadas y operadores. |
| Gramática libre de contexto + parser LL(1) | Unidad 2 · Análisis sintáctico | Validar la estructura, resolver la multiplicación implícita y construir el AST con la precedencia correcta. |
| Notación polaca inversa + pila | Unidad 3 · Código intermedio | Traducir el AST a una forma lineal y evaluarla. |
| Tripletes y cuádruplos | Unidad 3 · Código intermedio | Representar la expresión como código de tres direcciones. |

Como **regla del proyecto**, toda la lógica central se implementa a mano. No se usa `eval()`, `Function()` ni librerías de parsing.

## 7. Restricciones y decisiones técnicas

| Decisión | Elección | Justificación |
|---|---|---|
| Lenguaje | JavaScript (módulos ES) | El mismo código corre en el navegador (demo) y en Node.js (pruebas y terminal). |
| Dependencias | Ninguna | Se demuestra que la lógica es propia y el proyecto funciona sin instalar nada. |
| Interfaz | Página web local | Permite dibujar el árbol y la pila. Se sirve con `npm start` (ver diseño, sección 5.4). |
| Pruebas | `node --test` (incluido en Node.js 22) | No requiere frameworks externos. |
| Aritmética | Punto flotante de 64 bits (`Number`) | Suficiente para el alcance. La precisión se documenta como limitación. |

## 8. Estructura del repositorio

```
Calculadora/
├── README.md, PLAN.md, package.json
├── fase-1-problema/          Este documento
├── fase-2-especificacion/    Modelo formal
├── fase-3-diseno/            Arquitectura y modelos
├── fase-4-implementacion/    Código: src/, tests/, index.html, cli.js, servidor.js
│   └── src/                  lexer, parser, semantico, rpn, intermedio, evaluador, explicador, interprete, ui
└── fase-5-validacion/        Validación, sustentación, evidencias y documento técnico
```

Cada fase tiene su propia carpeta. Los archivos de `src/`, `index.html` y `cli.js` se crean en las fases 3 y 4. La lista completa de módulos está en el [diseño](../fase-3-diseno/03-diseno.md#2-módulos).

## 9. Criterios de éxito

El proyecto se considera logrado si:

1. Evalúa correctamente todas las expresiones de la tabla de casos de prueba de la Fase 2.
2. `2 + 3 * 4` → `14`, `10 - 4 - 3` → `3`, `2 ^ 3 ^ 2` → `512` y `-2 ^ 2` → `-4`.
3. Con `x = 3`: `2x` → `6`, `(x + 1)(x - 1)` → `8`, `1 / 2x` → `1.5`. Además, `2.5e-3 * 1e3` → `2.5`.
4. Todo error indica tipo (léxico, sintáctico o semántico), mensaje y columna.
5. Cada evaluación muestra tokens, árbol, RPN, tripletes, cuádruplos, traza de la pila y resultado.
6. Funciona sin instalar dependencias.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Ambigüedad del `-` (binario o unario) | Se resuelve en la gramática con la regla `unario`, no en el lexer. |
| Asociatividad de `^` mal implementada | Regla gramatical con recursión por la derecha y pruebas dedicadas. |
| Dibujar el árbol en la web consume tiempo | Primero una versión textual con sangría; el SVG se agrega después. |
| `x(3)`: ¿llamada a función o `x * 3`? | Las funciones son palabras reservadas que reconoce el lexer. Por eso `x(3)` siempre es `x * 3`. |
| `1 / 2x`: ¿`(1/2)·x` o `1/(2x)`? | La multiplicación implícita tiene la misma precedencia que `*` y asocia por la izquierda, así que da `(1/2)·x`. La interfaz lo muestra en el árbol para que no haya sorpresas. |
| `2e`, `2e+1`: ¿notación científica o la constante `e`? | El lexer aplica la coincidencia más larga: `2e+1` es `20`. Si después de la `e` no viene un dígito (`2e`, `2e + x`), se toma como `2 · e`. |
| Errores de redondeo (`0.1 + 0.2`) | Se muestra el resultado redondeado a 10 decimales y se documenta la limitación. |
