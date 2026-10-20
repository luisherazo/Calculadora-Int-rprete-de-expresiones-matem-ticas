# Calculadora explicativa

Intérprete de expresiones matemáticas que **muestra cómo evalúa** cada expresión: tokens, árbol sintáctico, notación polaca inversa, tripletes, cuádruplos, la pila paso a paso y una explicación de por qué cada operación se hace en ese orden.

Proyecto 04 · Compiladores · Proyecto integrador (Unidades PAT 2 y 3).

> **Estado:** proyecto completo. 266 pruebas en verde, 42 de 42 casos de la especificación correctos y 99 % de cobertura de líneas. Ver [PLAN.md](PLAN.md).

## Ejemplo

```
calc> 2 + 3 * 4 ^ 2
  Tokens:      2  +  3  *  4  ^  2
  Agrupación:  (2 + (3 * (4 ^ 2)))
  RPN:         2 3 4 2 ^ * +
  Tripletes:   (0) ^ 4 2 | (1) * 3 (0) | (2) + 2 (1)
  Cuádruplos:  (^, 4, 2, t1) | (*, 3, t1, t2) | (+, 2, t2, t3)
  Pila:        [2] → [2, 3] → [2, 3, 4] → [2, 3, 4, 2] → [2, 3, 16] → [2, 48] → [50]
  Explicación:
    - Se calcula 4 ^ 2 = 16, porque ^ tiene mayor precedencia que *.
    - Se calcula 3 * 16 = 48, porque * tiene mayor precedencia que +.
    - Por último, se calcula 2 + 48 = 50.
  = 50
```

## Qué acepta

| Elemento | Ejemplos |
|---|---|
| Números, también en notación científica | `42`, `3.14`, `2.5e-3` |
| Operadores con precedencia y asociatividad | `+ - * / % ^`, menos unario (`-2 ^ 2 = -4`, `2 ^ 3 ^ 2 = 512`) |
| Paréntesis y multiplicación implícita | `(a + b)(a - b)`, `2x^2`, `3(4 + 1)` |
| Variables y constantes | `x = 3`, `a = b = 4`, `pi`, `e` |
| Funciones | `sqrt abs sin cos tan ln log round min max` |
| Errores con código, tipo y columna | léxicos (L01–L02), sintácticos (S01–S07), semánticos (E01–E06) |

## Técnicas de compiladores aplicadas

1. **Autómata finito determinista** para el análisis léxico, escrito como tabla de transiciones con retroceso (`src/lexer.js`).
2. **Gramática libre de contexto LL(1)** y **parser descendente recursivo** que construye el AST (`src/parser.js`).
3. **Análisis semántico** con tabla de símbolos (`src/semantico.js`, `src/simbolos.js`).
4. **Código intermedio**: notación polaca inversa evaluada con una **pila**, tripletes y cuádruplos (`src/rpn.js`, `src/intermedio.js`, `src/evaluador.js`).

Toda la lógica central es propia: sin dependencias, sin `eval()` y sin librerías de parsing.

## Requisitos

- Node.js 22 o superior.
- Un navegador moderno, para la interfaz web.

No hace falta `npm install`.

## Uso

| Comando | Qué hace |
|---|---|
| `npm start` | Sirve la interfaz web en http://localhost:8080 |
| `npm run cli` | Calculadora interactiva en la terminal (`:ayuda`, `:vars`, `:borrar`, `:salir`) |
| `node fase-4-implementacion/cli.js "2 + 3" "x = 4"` | Evalúa las expresiones dadas y termina |
| `npm test` | Ejecuta las 266 pruebas |
| `npm run cobertura` | Pruebas con reporte de cobertura |
| `npm run evidencias` | Regenera `fase-5-validacion/evidencias/` ejecutando el intérprete |
| `npm run documento` | Une todas las fases en `fase-5-validacion/documento-tecnico.md` |

## Estructura

Cada fase del proyecto está en su propia carpeta:

```
Calculadora/
├── README.md, PLAN.md, package.json
├── fase-1-problema/            Problema, usuarios, objetivos y alcance
│   └── 01-problema.md
├── fase-2-especificacion/      Tokens, AFD, gramática LL(1), semántica, errores y casos
│   └── 02-especificacion.md
├── fase-3-diseno/              Arquitectura, estructuras de datos e interfaz
│   └── 03-diseno.md
├── fase-4-implementacion/      Código fuente funcionando
│   ├── index.html, estilos.css   Interfaz web
│   ├── cli.js                    Calculadora en la terminal
│   ├── servidor.js               Servidor estático local (sin dependencias)
│   ├── src/
│   │   ├── tokens.js, lexer.js   Análisis léxico (AFD)
│   │   ├── ast.js, parser.js     Análisis sintáctico (LL(1) → AST)
│   │   ├── simbolos.js           Tabla de símbolos y funciones
│   │   ├── semantico.js          Análisis semántico
│   │   ├── rpn.js, intermedio.js Código intermedio
│   │   ├── evaluador.js          Evaluación con pila
│   │   ├── explicador.js         Explicación en lenguaje natural
│   │   ├── interprete.js         Fachada que une todas las etapas
│   │   ├── errores.js, formato.js
│   │   └── ui.js                 Lógica de la interfaz
│   └── tests/                    Pruebas (node --test) y casos de la especificación
└── fase-5-validacion/          Validación, defensa y entrega
    ├── 04-validacion.md
    ├── 05-sustentacion.md
    ├── documento-tecnico.md      Todas las fases en un solo documento (generado)
    ├── evidencias/               Casos y sesión de la terminal (generados)
    └── herramientas/             Generadores de evidencias y del documento
```

Todos los comandos `npm` se ejecutan desde la carpeta raíz `Calculadora/`. En la documentación, las rutas `src/…` y `tests/…` son relativas a `fase-4-implementacion/`.

## Documentación

| Fase | Documento |
|---|---|
| 1. Problema y alcance | [fase-1-problema/01-problema.md](fase-1-problema/01-problema.md) |
| 2. Especificación formal | [fase-2-especificacion/02-especificacion.md](fase-2-especificacion/02-especificacion.md) |
| 3. Diseño | [fase-3-diseno/03-diseno.md](fase-3-diseno/03-diseno.md) |
| 5. Validación | [fase-5-validacion/04-validacion.md](fase-5-validacion/04-validacion.md) |
| 5. Sustentación | [fase-5-validacion/05-sustentacion.md](fase-5-validacion/05-sustentacion.md) |
| Documento consolidado | [fase-5-validacion/documento-tecnico.md](fase-5-validacion/documento-tecnico.md) |
| Evidencias | [fase-5-validacion/evidencias/](fase-5-validacion/evidencias/) |
