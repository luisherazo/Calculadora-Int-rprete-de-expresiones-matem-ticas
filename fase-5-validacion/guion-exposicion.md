# Guion de exposición: Calculadora explicativa

**Duración total:** 10 minutos, en 6 partes, una por integrante.
**Antes de empezar:** `npm start` corriendo, el navegador abierto en http://localhost:8080 y las variables borradas.

Lo que se **dice** va en texto normal y lo que se **muestra** va en cursiva. Cada parte indica su tramo de tiempo, que ya incluye unos segundos para el cambio de turno.

---

## Parte 1. El problema y cómo funciona por dentro (0:00 – 1:35)

**Muestra:** la pantalla de inicio de la calculadora.

**Dice:**
"Cualquier calculadora responde que dos más tres por cuatro a la dos es 50, pero no dice cómo llegó ahí. No muestra que la potencia va primero, ni por qué diez menos cuatro menos tres da 3 y no 9. Y si la expresión está mal escrita, solo dice 'error', sin indicar dónde.

Nuestra calculadora resuelve eso: muestra cómo un compilador entiende la expresión. Por dentro es una tubería de cinco etapas, las mismas de un compilador:
el analizador léxico separa el texto en tokens usando un autómata finito determinista;
el analizador sintáctico comprueba que la expresión cumpla una gramática LL(1) y construye el árbol sintáctico;
el análisis semántico verifica que las variables existan y que las funciones reciban los argumentos correctos;
el traductor convierte el árbol en código intermedio;
y el evaluador ejecuta ese código con una pila para obtener el resultado.

Todo está programado por nosotros en JavaScript, sin librerías externas y sin usar la función eval del lenguaje. La herramienta se usa desde una página web o desde la terminal."

---

## Parte 2. La interfaz y el análisis léxico (1:35 – 3:25)

**Muestra:** clic en el ejemplo `2 + 3 * 4 ^ 2`.

**Dice:**
"Arriba se escribe la expresión y se pulsa Evaluar o Enter. El resultado muestra la expresión, el valor, 50, y la agrupación: la expresión con todos los paréntesis que entendió el programa. Aquí se ve que primero va la potencia, después la multiplicación y al final la suma.

A la derecha está la tabla de variables. Trae pi y e como constantes, y guarda las variables que asignemos.

Abajo están las cinco etapas. Cada una se marca en verde si se completó o en rojo si falló."

**Muestra:** clic en `2.5e-3 * 1e3`; pestaña Tokens; abrir el recorrido del autómata.

**Dice:**
"La primera etapa son los tokens: cada pieza con su tipo y su columna. El recorrido del autómata muestra cada transición, incluso en números con notación científica como este.

Un caso interesante es la letra e, que puede ser la constante o el exponente. En dos e más uno, el autómata lee todo como un solo número, 20. En dos e solo, no encuentra el exponente, retrocede y lo entiende como dos por la constante e. Eso se llama coincidencia más larga con retroceso."

---

## Parte 3. La gramática y el árbol sintáctico (3:25 – 5:10)

**Muestra:** pestaña Árbol con `2 + 3 * 4 ^ 2`.

**Dice:**
"La segunda etapa es el árbol sintáctico. La gramática tiene un nivel por cada nivel de precedencia, y el analizador tiene una función por cada regla. Por eso los operadores que van primero quedan más abajo en el árbol, y lo que está más abajo se calcula antes."

**Muestra:** clic en `10 - 4 - 3` y luego en `2 ^ 3 ^ 2`.

**Dice:**
"El árbol también muestra la asociatividad. En diez menos cuatro menos tres, crece hacia la izquierda: primero se resta diez menos cuatro y el resultado es 3. En dos a la tres a la dos, crece hacia la derecha: primero se calcula tres al cuadrado y el resultado es 512, no 64."

**Muestra:** clic en `-2 ^ 2`.

**Dice:**
"El menos unario tiene menor precedencia que la potencia: menos dos al cuadrado da menos 4. Para obtener 4 hay que escribir el menos dos entre paréntesis."

**Muestra:** clic en `x = 3` y luego en `(x + 1)(x - 1)`.

**Dice:**
"Además acepta multiplicación implícita, como dos equis o equis más uno por equis menos uno. En el árbol, ese nodo se marca con borde punteado. Con equis igual a 3, el resultado es 8."

---

## Parte 4. Código intermedio y evaluación con pila (5:10 – 6:55)

**Muestra:** clic en `y = max(2, sqrt(9)) / 2`; pestaña Intermedio.

**Dice:**
"La tercera etapa traduce el árbol a código intermedio de tres formas. La notación polaca inversa pone cada operador después de sus operandos. Los tripletes se refieren a resultados anteriores por su posición. Los cuádruplos guardan cada resultado en un temporal: t1, t2, t3.

En este ejemplo aparecen param y call, que es como se traducen las llamadas a funciones, y la variable y, donde se guarda el resultado: 1.5."

**Muestra:** clic en `2x^2 + 1`; pestaña Evaluación; pulsar el botón de inicio y avanzar con la flecha derecha.

**Dice:**
"La cuarta etapa evalúa la notación polaca con una pila, igual que un autómata de pila. Los números se apilan, y cada operador desapila sus operandos, calcula y apila el resultado.

Mientras avanzamos, se ve la pila, arriba se resalta el elemento que se está ejecutando y en el árbol brilla el nodo que se calcula, con su valor debajo. También se puede reproducir automáticamente. El resultado es 19."

---

## Parte 5. Explicación y manejo de errores (6:55 – 8:40)

**Muestra:** pestaña Explicación con `2x^2 + 1`.

**Dice:**
"La quinta etapa explica en palabras qué se calcula y por qué: porque tiene mayor precedencia, por asociatividad, porque está entre paréntesis o porque es el argumento de una función.

Cada error tiene un código, su tipo y la columna exacta. Hay cuatro tipos, uno por etapa."

**Muestra:** escribir `3 + $`; luego clic en `(2 + 3`; luego escribir `foo(3)`.

**Dice:**
"Léxico: el signo de dólar no pertenece al lenguaje, es el error L01 en la columna 5. Sintáctico: falta cerrar el paréntesis, error S02 en la columna 7. Semántico: foo no existe, y como va seguido de un paréntesis, sugiere las funciones disponibles."

**Muestra:** clic en `5 / 0`; pestaña Evaluación.

**Dice:**
"De ejecución: división por cero, error E02. La traza se detiene justo antes de la división y la marca en rojo. Además, la evaluación es transaccional: si escribimos a igual a uno entre cero, la variable a no se crea, porque una expresión que falla no guarda nada."

---

## Parte 6. Terminal, alcance, pruebas y cierre (8:40 – 10:00)

**Muestra:** terminal con `npm run cli` y luego `npm test`.

**Dice:**
"Todo esto funciona también en la terminal: por cada expresión imprime los tokens, el árbol, el código intermedio, la pila y la explicación.

El lenguaje acepta enteros, decimales y notación científica; suma, resta, multiplicación, división, módulo, potencia y menos unario; paréntesis y multiplicación implícita; variables, constantes y diez funciones, como raíz cuadrada, logaritmos, mínimo y máximo.

Para comprobar que funciona tenemos 266 pruebas automáticas, que pasan todas, y 42 casos de la especificación, todos correctos, con 99 % del código cubierto. Como limitaciones, trabaja en radianes e informa solo el primer error.

En resumen, la herramienta hace visible lo que una calculadora esconde, usando un autómata finito, una gramática LL(1), un análisis semántico y código intermedio evaluado con una pila."

---

## Si algo falla durante la demo

La misma demo se puede hacer en la terminal:

```bash
node fase-4-implementacion/cli.js "2 + 3 * 4 ^ 2" "x = 3" "(x + 1)(x - 1)" "(2 + 3"
```
