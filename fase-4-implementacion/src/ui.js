/**
 * ui.js — Lógica de la interfaz web.
 *
 * Conecta la entrada con interpretar() y dibuja las etapas:
 * tokens (con el recorrido del AFD), árbol (SVG), código intermedio,
 * evaluación paso a paso con la pila, y explicación. Diseño, sección 5.
 *
 * Todo el contenido se crea con nodos del DOM (nunca con innerHTML), así que
 * el texto que escribe el usuario no se interpreta como HTML.
 */

import { interpretar } from './interprete.js';
import { TablaSimbolos } from './simbolos.js';
import { TIPOS_NODO } from './ast.js';
import { TIPOS_TOKEN } from './tokens.js';
import { formatearNumero as f, astComoExpresion, astComoTexto } from './formato.js';
import { mostrarElementoPila } from './evaluador.js';

const EJEMPLOS = [
  '2 + 3 * 4 ^ 2',
  '10 - 4 - 3',
  '2 ^ 3 ^ 2',
  '-2 ^ 2',
  'x = 3',
  '2x^2 + 1',
  '(x + 1)(x - 1)',
  'y = max(2, sqrt(9)) / 2',
  '2.5e-3 * 1e3',
  '(2 + 3',
  '5 / 0',
];

const NOMBRE_ETAPA = {
  lexico: 'léxica',
  sintactico: 'sintáctica',
  semantico: 'semántica',
  evaluacion: 'de evaluación',
};

const PESTANAS = ['tokens', 'arbol', 'intermedio', 'evaluacion', 'explicacion'];
const MAX_HISTORIAL = 20;
const MS_POR_PASO = 800;
const CLAVE_TEMA = 'calculadora-tema';

const estado = {
  tabla: new TablaSimbolos(),
  r: null,            // último resultado de interpretar()
  paso: 0,            // paso de la traza que se muestra (0 = antes de empezar)
  pestana: 'tokens',
  temporizador: null,
  historial: [],
  valoresPrevios: new Map(),   // para resaltar las variables que cambian
};

// ---------------------------------------------------------------- utilidades

const $ = (id) => document.getElementById(id);

const sinVacios = (hijos) => hijos.flat().filter((h) => h !== null && h !== undefined && h !== false);

/** Crea un elemento HTML con atributos e hijos (texto o nodos). */
function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);   // onclick → click
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const hijo of sinVacios(hijos)) {
    nodo.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return nodo;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Crea un elemento SVG con atributos e hijos. */
function svg(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElementNS(SVG_NS, etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor !== null && valor !== undefined) nodo.setAttribute(clave, valor);
  }
  for (const hijo of sinVacios(hijos)) {
    nodo.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return nodo;
}

/** Reemplaza el contenido de un contenedor, ignorando los hijos null. */
function poner(contenedor, ...hijos) {
  contenedor.replaceChildren(...sinVacios(hijos));
}

/** Iconos de trazo simples (24×24). */
const ICONOS = {
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  x: ['M7 7l10 10', 'M17 7L7 17'],
  inicio: ['M18 6l-8 6 8 6z', 'M6 6v12'],
  fin: ['M6 6l8 6-8 6z', 'M18 6v12'],
  anterior: ['M15 6l-6 6 6 6'],
  siguiente: ['M9 6l6 6-6 6'],
  reproducir: ['M8 5.5v13l10.5-6.5z'],
  pausa: ['M9 6v12', 'M15 6v12'],
  alerta: ['M12 7.5v6', 'M12 16.8v.2'],
  luna: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  sol: ['M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z', 'M12 2.5v2', 'M12 19.5v2', 'M2.5 12h2', 'M19.5 12h2',
    'M5.3 5.3l1.4 1.4', 'M17.3 17.3l1.4 1.4', 'M5.3 18.7l1.4-1.4', 'M17.3 6.7l1.4-1.4'],
};

function icono(nombre, tamano = 18) {
  return svg('svg', {
    width: tamano, height: tamano, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, ICONOS[nombre].map((d) => svg('path', { d })));
}

/** Mensaje para una vista cuyo contenido no existe. */
function noDisponible(r) {
  if (!r) return 'Escribe una expresión y pulsa Evaluar para ver esta etapa.';
  return `No disponible: la expresión falló en la etapa ${NOMBRE_ETAPA[r.etapaFallida] ?? 'interna'}.`;
}

const vacio = (texto) => el('p', { class: 'vacio' }, texto);

// ------------------------------------------------------------------ acciones

function evaluar(texto) {
  detenerReproduccion();
  let r;
  try {
    r = interpretar(texto, estado.tabla);
  } catch (e) {
    // Solo ocurre ante un fallo interno.
    console.error(e);
    r = {
      entrada: texto, tokens: null, trazaLexica: null, ast: null, rpn: null,
      tripletes: null, cuadruplos: null, traza: null, valor: null, asignaciones: [],
      explicacion: [], etapaFallida: null,
      error: { codigo: '—', tipo: 'interno', columna: 1, message: `Error interno del intérprete: ${e.message}` },
    };
  }

  estado.r = r;
  estado.paso = r.traza ? r.traza.length : 0;
  if (texto.trim() !== '') {
    estado.historial.unshift({ entrada: texto.trim(), salida: r.error ? r.error.codigo : f(r.valor), error: Boolean(r.error) });
    estado.historial.length = Math.min(estado.historial.length, MAX_HISTORIAL);
  }
  renderTodo();

  // Reinicia la animación del resultado en cada evaluación.
  const salida = $('resultado');
  salida.classList.remove('animar');
  void salida.offsetWidth;
  salida.classList.add('animar');
}

function cambiarPestana(nombre) {
  estado.pestana = nombre;
  for (const boton of document.querySelectorAll('[data-pestana]')) {
    const activa = boton.dataset.pestana === nombre;
    boton.setAttribute('aria-selected', String(activa));
    boton.tabIndex = activa ? 0 : -1;
  }
  for (const p of PESTANAS) {
    $(`vista-${p}`).hidden = p !== nombre;
  }
}

function irAPaso(paso) {
  const total = estado.r?.traza?.length ?? 0;
  estado.paso = Math.max(0, Math.min(total, paso));
  renderEvaluacion();
}

function reproducir() {
  const total = estado.r?.traza?.length ?? 0;
  if (estado.paso >= total) estado.paso = 0;
  estado.temporizador = setInterval(() => {
    if (estado.paso >= total) {
      detenerReproduccion();
      renderEvaluacion();
    } else {
      irAPaso(estado.paso + 1);
    }
  }, MS_POR_PASO);
  renderEvaluacion();
}

function detenerReproduccion() {
  clearInterval(estado.temporizador);
  estado.temporizador = null;
}

// ---- Tema claro / oscuro

function temaActual() {
  const elegido = document.documentElement.dataset.theme;
  if (elegido) return elegido;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function pintarBotonTema() {
  const boton = $('cambiar-tema');
  const oscuro = temaActual() === 'dark';
  poner(boton, icono(oscuro ? 'sol' : 'luna', 20));
  boton.title = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

function alternarTema() {
  const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try {
    localStorage.setItem(CLAVE_TEMA, nuevo);
  } catch { /* sin almacenamiento: el tema dura solo esta visita */ }
  pintarBotonTema();
}

// ------------------------------------------------------------- renderizado

function renderTodo() {
  renderError();
  renderResultado();
  renderVariables();
  renderEtapas();
  renderTokens();
  renderArbol();
  renderIntermedio();
  renderEvaluacion();
  renderExplicacion();
  renderHistorial();
}

function renderError() {
  const caja = $('error');
  const entrada = $('entrada');
  const r = estado.r;

  if (!r?.error) {
    caja.hidden = true;
    caja.replaceChildren();
    entrada.removeAttribute('aria-invalid');
    return;
  }

  const e = r.error;
  // Los tabuladores cuentan como una columna, igual que en el lexer.
  const linea = r.entrada.replace(/\t/g, ' ');
  const i = Math.max(0, e.columna - 1);
  const marca = linea.trim()
    ? el('pre', { class: 'error-marca' },
      linea.slice(0, i),
      el('span', { class: 'marca-error' }, linea.slice(i, i + 1)),
      linea.slice(i + 1),
      '\n',
      ' '.repeat(i),
      el('span', { class: 'marca-error' }, '^'))
    : null;

  poner(caja,
    el('span', { class: 'error-icono' }, icono('alerta', 18)),
    el('p', { class: 'error-titulo' }, `${e.codigo} · Error ${e.tipo}`),
    el('p', {}, e.message),
    marca,
    e.pista ? el('p', { class: 'error-pista' }, e.pista) : null,
  );
  caja.hidden = false;
  entrada.setAttribute('aria-invalid', 'true');
}

function renderResultado() {
  const salida = $('resultado');
  const detalle = $('detalle-resultado');
  const r = estado.r;

  salida.className = 'resultado';
  $('eco').textContent = r ? `${r.entrada.trim()} =` : 'Escribe una expresión para empezar';

  if (!r) {
    salida.textContent = '—';
    salida.classList.add('vacio-resultado');
    detalle.replaceChildren();
    return;
  }
  if (r.error) {
    salida.textContent = 'Error';
    salida.classList.add('resultado-error');
    poner(detalle,
      el('span', { class: 'pastilla pastilla-error' }, `${r.error.codigo} · columna ${r.error.columna}`),
      r.etapaFallida ? el('span', { class: 'pastilla' }, `Etapa ${NOMBRE_ETAPA[r.etapaFallida]}`) : null,
    );
    return;
  }

  salida.textContent = f(r.valor);
  poner(detalle,
    el('span', { class: 'pastilla' }, 'Agrupación', el('code', {}, astComoExpresion(r.ast))),
    r.asignaciones.map((a) => el('span', { class: 'pastilla pastilla-exito' },
      icono('check', 14), 'Guardado', el('code', {}, `${a.nombre} = ${f(a.valor)}`))),
  );
}

function renderVariables() {
  const anteriores = estado.valoresPrevios;
  const actuales = new Map();
  poner($('variables'), estado.tabla.variables().map((v) => {
    actuales.set(v.nombre, v.valor);
    const cambio = anteriores.size > 0 && anteriores.get(v.nombre) !== v.valor;
    return el('li', { class: cambio ? 'variable nueva' : 'variable' },
      el('span', { class: 'variable-nombre' }, v.nombre),
      el('span', { class: 'variable-tipo' }, v.constante ? 'constante' : 'variable'),
      el('span', { class: 'variable-valor' }, f(v.valor)),
    );
  }));
  estado.valoresPrevios = actuales;
}

/** Marca cada etapa como completada, fallida o pendiente según el resultado. */
function renderEtapas() {
  const r = estado.r;
  const estadoDe = {
    tokens: !r ? null : r.tokens ? 'ok' : r.etapaFallida === 'lexico' ? 'error' : null,
    arbol: !r ? null : r.ast ? 'ok' : r.etapaFallida === 'sintactico' ? 'error' : null,
    intermedio: !r ? null : r.rpn ? 'ok' : r.etapaFallida === 'semantico' ? 'error' : null,
    evaluacion: !r ? null : r.etapaFallida === 'evaluacion' ? 'error' : r.traza ? 'ok' : null,
    explicacion: r && !r.error ? 'ok' : null,
  };

  PESTANAS.forEach((nombre, i) => {
    const boton = document.querySelector(`[data-pestana="${nombre}"]`);
    const valor = estadoDe[nombre];
    boton.classList.toggle('etapa-ok', valor === 'ok');
    boton.classList.toggle('etapa-error', valor === 'error');
    boton.classList.toggle('etapa-pendiente', Boolean(r) && valor === null);
    const insignia = boton.querySelector('.etapa-icono');
    if (valor === 'ok') poner(insignia, icono('check', 16));
    else if (valor === 'error') poner(insignia, icono('x', 16));
    else insignia.textContent = String(i + 1);
  });
}

// ---- Tokens

function claseToken(tipo) {
  switch (tipo) {
    case TIPOS_TOKEN.NUMERO: return 'numero';
    case TIPOS_TOKEN.IDENT: return 'ident';
    case TIPOS_TOKEN.FUNCION: return 'funcion';
    case TIPOS_TOKEN.ASIGNA: return 'asigna';
    case TIPOS_TOKEN.PAR_IZQ:
    case TIPOS_TOKEN.PAR_DER:
    case TIPOS_TOKEN.COMA: return 'signo';
    default: return 'operador';
  }
}

function chipToken(t, i) {
  return el('div', {
    class: `token token-${claseToken(t.tipo)}`,
    title: `${t.tipo}, columna ${t.columna}`,
    style: `animation-delay: ${Math.min(i, 30) * 25}ms`,
  },
  el('span', { class: 'token-lexema' }, t.lexema),
  el('span', { class: 'token-tipo' }, t.tipo),
  el('span', { class: 'token-col' }, `col ${t.columna}`),
  );
}

function mostrarCaracter(c) {
  if (c === null) return 'fin';
  if (c === ' ') return '␣';
  if (c === '\t') return '⇥';
  return c;
}

function tablaAFD(traza, abierta) {
  const filas = traza.map((p) => {
    if (p.tipo === 'emision') {
      const lexema = p.token.lexema ? ` '${p.token.lexema}'` : '';
      return el('tr', { class: 'fila-emision' },
        el('td', { colspan: 5 }, `→ token ${p.token.tipo}${lexema}${p.retroceso ? ' (con retroceso)' : ''}`));
    }
    const esError = p.accion === 'L01' || p.accion === 'L02';
    return el('tr', { class: esError ? 'fila-error' : null },
      el('td', { class: 'col-indice' }, p.columna),
      el('td', {}, mostrarCaracter(p.caracter)),
      el('td', {}, p.desde),
      el('td', {}, p.clase),
      el('td', { class: 'col-op' }, p.accion),
    );
  });

  return el('details', { open: abierta },
    el('summary', {}, 'Recorrido del autómata (AFD)'),
    el('p', { class: 'nota' },
      'Estados de aceptación: q1, q3 y q6 (número), q7 (identificador o función), q8 (operador). ',
      '"fin" emite el token del estado actual; "retroceso" vuelve al último estado de aceptación.'),
    el('div', { class: 'desplazable' },
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {}, ['Col', 'Carácter', 'Estado', 'Clase', 'Acción'].map((t) => el('th', {}, t)))),
        el('tbody', {}, filas),
      )),
  );
}

function renderTokens() {
  const r = estado.r;
  const partes = [];
  if (r?.tokens) {
    const tokens = r.tokens.filter((t) => t.tipo !== TIPOS_TOKEN.EOF);
    partes.push(tokens.length ? el('div', { class: 'tokens' }, tokens.map(chipToken)) : vacio('La entrada no tiene tokens.'));
  } else {
    partes.push(vacio(noDisponible(r)));
  }
  if (r?.trazaLexica?.length) {
    partes.push(tablaAFD(r.trazaLexica, r.etapaFallida === 'lexico'));
  }
  poner($('vista-tokens'), partes);
}

// ---- Árbol

const ALTO_NODO = 36;
const NIVEL = 84;
const MARGEN = 22;
const SEPARACION = 16;

/** Convierte el AST en el árbol que se dibuja (la asignación muestra su destino como hoja). */
function arbolVisual(n) {
  switch (n.tipo) {
    case TIPOS_NODO.NUMERO:
      return { id: n.id, etiqueta: n.lexema, clase: 'numero', titulo: 'Número', hijos: [] };
    case TIPOS_NODO.VARIABLE:
      return { id: n.id, etiqueta: n.nombre, clase: 'variable', titulo: 'Variable', hijos: [] };
    case TIPOS_NODO.UNARIO:
      return { id: n.id, etiqueta: '−', clase: 'operador', titulo: 'Menos unario', hijos: [arbolVisual(n.operando)] };
    case TIPOS_NODO.BINARIO:
      return {
        id: n.id,
        etiqueta: n.implicita ? '·' : n.op,
        clase: n.implicita ? 'operador nodo-implicita' : 'operador',
        titulo: n.implicita ? 'Multiplicación implícita' : `Operador ${n.op}`,
        hijos: [arbolVisual(n.izq), arbolVisual(n.der)],
      };
    case TIPOS_NODO.LLAMADA:
      return { id: n.id, etiqueta: n.nombre, clase: 'funcion', titulo: 'Llamada a función', hijos: n.args.map(arbolVisual) };
    case TIPOS_NODO.ASIGNACION:
      return {
        id: n.id, etiqueta: '=', clase: 'asignacion', titulo: 'Asignación',
        hijos: [{ id: null, etiqueta: n.nombre, clase: 'destino', titulo: 'Variable destino', hijos: [] }, arbolVisual(n.valor)],
      };
    default:
      return { id: null, etiqueta: '?', clase: 'operador', titulo: '', hijos: [] };
  }
}

/**
 * Dibuja el AST en SVG (diseño, sección 5.3): las hojas ocupan columnas
 * consecutivas y cada nodo interno se centra sobre sus hijos.
 */
function dibujarArbol(ast, { activo = null, valores = new Map() } = {}) {
  const raiz = arbolVisual(ast);
  let cursor = MARGEN;
  let profundidadMax = 0;

  const ubicar = (v, profundidad, anchoMinimo) => {
    v.ancho = Math.max(40, v.etiqueta.length * 9.5 + 24);
    v.y = MARGEN + profundidad * NIVEL + ALTO_NODO / 2;
    profundidadMax = Math.max(profundidadMax, profundidad);
    if (v.hijos.length === 0) {
      const espacio = Math.max(v.ancho, anchoMinimo, 44);
      v.x = cursor + espacio / 2;
      cursor += espacio + SEPARACION;
    } else {
      // Con un solo hijo, el hijo reserva el ancho del padre para que no se encimen.
      const minimo = v.hijos.length === 1 ? Math.max(anchoMinimo, v.ancho) : 0;
      v.hijos.forEach((h) => ubicar(h, profundidad + 1, minimo));
      v.x = (v.hijos[0].x + v.hijos.at(-1).x) / 2;
    }
  };
  ubicar(raiz, 0, 0);

  const ancho = cursor - SEPARACION + MARGEN;
  const alto = MARGEN * 2 + profundidadMax * NIVEL + ALTO_NODO + 22;
  const aristas = [];
  const nodos = [];

  const recorrer = (v) => {
    for (const h of v.hijos) {
      // Curva suave del borde inferior del padre al borde superior del hijo.
      const y1 = v.y + ALTO_NODO / 2;
      const y2 = h.y - ALTO_NODO / 2;
      const ym = (y1 + y2) / 2;
      aristas.push(svg('path', {
        class: valores.has(v.id) ? 'arista recorrida' : 'arista',
        d: `M ${v.x} ${y1} C ${v.x} ${ym}, ${h.x} ${ym}, ${h.x} ${y2}`,
      }));
      recorrer(h);
    }

    const clases = ['nodo', `nodo-${v.clase}`];
    if (v.id !== null && v.id === activo) clases.push('activo');
    let insignia = null;
    if (valores.has(v.id)) {
      const texto = `= ${valores.get(v.id)}`;
      const anchoInsignia = texto.length * 7 + 12;
      const yInsignia = v.y + ALTO_NODO / 2 + 5;
      insignia = svg('g', {},
        svg('rect', { class: 'valor-fondo', x: v.x - anchoInsignia / 2, y: yInsignia, width: anchoInsignia, height: 18, rx: 9 }),
        svg('text', { class: 'valor-texto', x: v.x, y: yInsignia + 9, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, texto));
    }
    nodos.push(svg('g', { class: clases.join(' ') },
      svg('title', {}, v.titulo),
      svg('rect', {
        class: 'cuerpo', x: v.x - v.ancho / 2, y: v.y - ALTO_NODO / 2, width: v.ancho, height: ALTO_NODO, rx: ALTO_NODO / 2,
      }),
      svg('text', { class: 'etiqueta', x: v.x, y: v.y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, v.etiqueta),
      insignia,
    ));
  };
  recorrer(raiz);

  return svg('svg', {
    class: 'arbol', width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`,
    role: 'img', 'aria-label': `Árbol sintáctico de ${astComoExpresion(ast)}`,
  }, aristas, nodos);
}

function leyendaArbol() {
  const elementos = [
    ['número', '--c-numero'], ['variable', '--c-ident'], ['operador', '--c-operador'],
    ['función', '--c-funcion'], ['asignación', '--c-asigna'],
  ];
  return el('div', { class: 'leyenda' },
    elementos.map(([texto, color]) => el('span', { style: `--color-leyenda: var(${color})` }, texto)),
    el('span', { class: 'leyenda-implicita' }, 'multiplicación implícita'),
  );
}

function renderArbol() {
  const r = estado.r;
  if (!r?.ast) {
    poner($('vista-arbol'), vacio(noDisponible(r)));
    return;
  }
  poner($('vista-arbol'),
    el('p', { class: 'agrupacion-arbol' }, 'Agrupación', el('code', {}, astComoExpresion(r.ast))),
    el('div', { class: 'lienzo-arbol' }, dibujarArbol(r.ast)),
    leyendaArbol(),
    el('details', {},
      el('summary', {}, 'Árbol como texto'),
      el('pre', { class: 'arbol-texto' }, astComoTexto(r.ast))),
  );
}

// ---- Código intermedio

/** Tabla con celdas de texto o { texto, clase }. */
function tabla(encabezados, filas) {
  return el('div', { class: 'desplazable' },
    el('table', { class: 'tabla' },
      el('thead', {}, el('tr', {}, encabezados.map((t) => el('th', {}, t)))),
      el('tbody', {}, filas.map((celdas) => el('tr', {}, celdas.map((c) => (
        typeof c === 'object' ? el('td', { class: c.clase }, c.texto) : el('td', {}, c)
      )))))));
}

const claseTemporal = (texto) => (/^(t\d+|\(\d+\))$/.test(texto) ? { texto, clase: 'col-temp' } : texto);

function chipsRPN(rpn, claseExtra = () => '') {
  return el('div', { class: 'rpn' }, rpn.map((e, i) => el('span', {
    class: `rpn-item rpn-${e.clase} ${claseExtra(i)}`.trim(),
  }, e.texto)));
}

function renderIntermedio() {
  const r = estado.r;
  if (!r?.rpn) {
    poner($('vista-intermedio'), vacio(noDisponible(r)));
    return;
  }
  const sinInstrucciones = () => el('p', { class: 'nota' }, 'Sin instrucciones: la expresión es un solo valor.');
  poner($('vista-intermedio'),
    el('h3', {}, 'Notación polaca inversa'),
    chipsRPN(r.rpn),
    el('p', { class: 'nota' }, 'Recorrido en postorden del árbol. neg es el menos unario, f[n] una llamada con n argumentos y &v la variable destino de una asignación.'),
    el('div', { class: 'dos-columnas' },
      el('div', {},
        el('h3', {}, 'Tripletes'),
        r.tripletes.length
          ? tabla(['#', 'Operador', 'Arg 1', 'Arg 2'], r.tripletes.map((t) => [
            { texto: `(${t.indice})`, clase: 'col-indice' }, { texto: t.op, clase: 'col-op' },
            claseTemporal(t.arg1), claseTemporal(t.arg2),
          ]))
          : sinInstrucciones()),
      el('div', {},
        el('h3', {}, 'Cuádruplos'),
        r.cuadruplos.length
          ? tabla(['Operador', 'Arg 1', 'Arg 2', 'Resultado'], r.cuadruplos.map((c) => [
            { texto: c.op, clase: 'col-op' }, claseTemporal(c.arg1), claseTemporal(c.arg2), claseTemporal(c.resultado),
          ]))
          : sinInstrucciones()),
    ),
  );
}

// ---- Evaluación

function boton(atributos, ...hijos) {
  return el('button', { type: 'button', ...atributos }, ...hijos);
}

function renderEvaluacion() {
  const r = estado.r;
  if (!r?.traza || !r.ast) {
    poner($('vista-evaluacion'), vacio(noDisponible(r)));
    return;
  }

  const traza = r.traza;
  const total = traza.length;
  const paso = estado.paso;
  const actual = paso > 0 ? traza[paso - 1] : null;
  const falloAlFinal = Boolean(r.error) && paso === total;

  // Valor ya calculado de cada nodo hasta el paso actual (se muestra bajo el nodo).
  const valores = new Map();
  for (const p of traza.slice(0, paso)) {
    if (p.resultado !== undefined && (p.accion !== 'apilar' || p.clase === 'var')) {
      valores.set(p.nodoId, f(p.resultado));
    }
  }

  const rpn = chipsRPN(r.rpn, (i) => {
    if (falloAlFinal && i === total) return 'fallo';
    if (i === paso - 1) return 'actual';
    return i < paso - 1 ? 'hecho' : '';
  });

  const contenidoPila = actual ? [...actual.pilaDespues].reverse() : [];
  const pila = el('div', { class: 'pila-panel' },
    el('h3', {}, 'Pila', el('small', {}, `${contenidoPila.length} elemento${contenidoPila.length === 1 ? '' : 's'}`)),
    el('div', { class: 'pila' },
      contenidoPila.length
        ? contenidoPila.map((v, i) => el('div', {
          class: ['celda', typeof v === 'string' ? 'referencia' : '', i === 0 ? 'tope' : ''].join(' ').trim(),
        }, mostrarElementoPila(v)))
        : el('div', { class: 'pila-vacia' }, 'vacía')),
    el('p', { class: 'descripcion-paso' },
      actual ? actual.descripcion : 'La pila está vacía. Pulsa reproducir o avanza para ejecutar el primer elemento de la RPN.'),
    falloAlFinal
      ? el('div', { class: 'error-paso' }, `Elemento ${r.rpn[total]?.texto ?? ''}: ${r.error.codigo} · ${r.error.message}`)
      : null,
  );

  const reproduciendo = estado.temporizador !== null;
  const mover = (destino) => () => { detenerReproduccion(); irAPaso(destino); };
  const controles = el('div', { class: 'controles' },
    boton({ title: 'Inicio (Inicio)', 'aria-label': 'Ir al inicio', disabled: paso === 0, onclick: mover(0) }, icono('inicio')),
    boton({ title: 'Anterior (←)', 'aria-label': 'Paso anterior', disabled: paso === 0, onclick: mover(paso - 1) }, icono('anterior')),
    boton({
      class: 'boton-reproducir',
      onclick: () => { if (reproduciendo) { detenerReproduccion(); renderEvaluacion(); } else { reproducir(); } },
    }, icono(reproduciendo ? 'pausa' : 'reproducir'), reproduciendo ? 'Pausa' : 'Reproducir'),
    boton({ title: 'Siguiente (→)', 'aria-label': 'Paso siguiente', disabled: paso === total, onclick: mover(paso + 1) }, icono('siguiente')),
    boton({ title: 'Final (Fin)', 'aria-label': 'Ir al final', disabled: paso === total, onclick: mover(total) }, icono('fin')),
    el('div', { class: 'progreso' },
      el('div', { class: 'contador-paso', 'aria-live': 'polite' }, `Paso ${paso} de ${total}`),
      el('div', { class: 'progreso-barra' },
        el('div', { class: 'progreso-relleno', style: `width: ${total ? (paso / total) * 100 : 0}%` }))),
  );

  poner($('vista-evaluacion'),
    controles,
    el('div', { class: 'evaluacion' },
      el('div', {},
        rpn,
        el('div', { class: 'lienzo-arbol' }, dibujarArbol(r.ast, { activo: actual?.nodoId ?? null, valores }))),
      pila),
  );
}

// ---- Explicación

/** Clasifica una línea de la explicación para darle marcador y estilo. */
function tipoDeLinea(linea) {
  if (linea.startsWith('Análisis léxico')) return ['lexico', 'L'];
  if (linea.startsWith('Análisis sintáctico')) return ['sintactico', 'S'];
  if (linea.startsWith('Código intermedio')) return ['intermedio', 'CI'];
  if (linea.startsWith('Resultado')) return ['resultado', '='];
  if (linea.startsWith('El análisis se detuvo')) return ['error', '!'];
  if (linea.startsWith('¿')) return ['pista', '?'];
  return ['paso', null];
}

/** Resalta la parte técnica de cada línea (tokens, agrupación, RPN o cálculo). */
function contenidoLinea(linea, tipo) {
  if (tipo === 'lexico' || tipo === 'intermedio' || tipo === 'resultado') {
    const corte = linea.lastIndexOf(': ');
    if (corte > 0) return [linea.slice(0, corte + 2), el('span', { class: 'resaltado' }, linea.slice(corte + 2))];
  }
  if (tipo === 'sintactico') {
    const corte = linea.lastIndexOf(' como ');
    if (corte > 0) return [linea.slice(0, corte + 6), el('span', { class: 'resaltado' }, linea.slice(corte + 6))];
  }
  if (tipo === 'paso') {
    const calculo = linea.match(/^((?:Por último, se calcula|Se calcula) )(.+? = -?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?: \(multiplicación implícita\))?)(.*)$/);
    if (calculo) return [calculo[1], el('span', { class: 'resaltado' }, calculo[2]), calculo[3]];
    const asignacion = linea.match(/^(Se asigna )(.+)(\.)$/);
    if (asignacion) return [asignacion[1], el('span', { class: 'resaltado' }, asignacion[2]), asignacion[3]];
  }
  return [linea];
}

function renderExplicacion() {
  const r = estado.r;
  if (!r) {
    poner($('vista-explicacion'), vacio(noDisponible(r)));
    return;
  }
  let numero = 0;
  poner($('vista-explicacion'), el('ol', { class: 'explicacion' }, r.explicacion.map((linea) => {
    const [tipo, marcador] = tipoDeLinea(linea);
    return el('li', { class: `tipo-${tipo}` },
      el('span', { class: 'marcador' }, marcador ?? String(++numero)),
      el('span', { class: 'texto' }, contenidoLinea(linea, tipo)));
  })));
}

// ---- Historial

function renderHistorial() {
  const lista = $('historial');
  if (!estado.historial.length) {
    poner(lista, el('li', { class: 'vacio-historial' }, 'Aún no hay expresiones evaluadas.'));
    return;
  }
  poner(lista, estado.historial.map((h) => el('li', {},
    boton({
      class: h.error ? 'con-error' : null,
      title: 'Copiar a la entrada',
      onclick: () => { const entrada = $('entrada'); entrada.value = h.entrada; entrada.focus(); },
    },
    el('span', { class: 'entrada-historial' }, h.entrada),
    el('span', { class: 'flecha' }, '→'),
    el('span', { class: 'salida' }, h.salida)))));
}

// ------------------------------------------------------------------- inicio

function iniciar() {
  const entrada = $('entrada');

  $('formulario').addEventListener('submit', (evento) => {
    evento.preventDefault();
    evaluar(entrada.value);
  });

  poner($('ejemplos'), EJEMPLOS.map((ejemplo) => boton({
    class: 'chip-ejemplo',
    onclick: () => { entrada.value = ejemplo; evaluar(ejemplo); },
  }, ejemplo)));

  $('borrar-variables').addEventListener('click', () => {
    estado.tabla.reiniciar();
    renderVariables();
  });

  $('cambiar-tema').addEventListener('click', alternarTema);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pintarBotonTema);
  pintarBotonTema();

  for (const b of document.querySelectorAll('[data-pestana]')) {
    b.addEventListener('click', () => cambiarPestana(b.dataset.pestana));
  }

  // Flechas: navegan la traza en la pestaña Evaluación (si el foco no está en la entrada).
  document.addEventListener('keydown', (evento) => {
    if (estado.pestana !== 'evaluacion' || evento.target.closest('input, textarea')) return;
    const acciones = {
      ArrowRight: () => irAPaso(estado.paso + 1),
      ArrowLeft: () => irAPaso(estado.paso - 1),
      Home: () => irAPaso(0),
      End: () => irAPaso(Infinity),
    };
    if (acciones[evento.key]) {
      evento.preventDefault();
      detenerReproduccion();
      acciones[evento.key]();
    }
  });

  cambiarPestana(estado.pestana);
  renderTodo();
}

iniciar();
