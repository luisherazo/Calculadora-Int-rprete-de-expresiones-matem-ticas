/**
 * errores.js — Errores del intérprete.
 *
 * Define la clase ErrorCalc y el catálogo único de mensajes
 * (especificación, sección 5: códigos L01–L02, S01–S06, E01–E06).
 * Todos los textos de error del proyecto viven aquí.
 */

/** Tipo de error según la etapa que lo detecta. */
export const TIPOS = {
  LEXICO: 'léxico',
  SINTACTICO: 'sintáctico',
  SEMANTICO: 'semántico',
};

/**
 * Catálogo de errores. Las plantillas usan {nombre} para los datos variables.
 * `conColumna: false` indica que el mensaje no termina con la columna.
 */
export const CATALOGO = {
  L01: { tipo: TIPOS.LEXICO, plantilla: "Carácter no válido '{caracter}'" },
  L02: { tipo: TIPOS.LEXICO, plantilla: 'Se esperaba un dígito después del punto decimal' },

  S01: { tipo: TIPOS.SINTACTICO, plantilla: "Se esperaba un número, variable, función o '(' y se encontró {encontrado}" },
  S02: { tipo: TIPOS.SINTACTICO, plantilla: "Falta ')' para cerrar el '(' de la columna {abre}" },
  S03: { tipo: TIPOS.SINTACTICO, plantilla: 'Se esperaba un operador o el fin de la expresión y se encontró {encontrado}' },
  S04: { tipo: TIPOS.SINTACTICO, plantilla: "Se esperaba '(' después de '{funcion}'" },
  S05: { tipo: TIPOS.SINTACTICO, plantilla: 'La expresión está vacía', conColumna: false },
  S06: { tipo: TIPOS.SINTACTICO, plantilla: 'Solo se puede asignar a una variable' },
  S07: { tipo: TIPOS.SINTACTICO, plantilla: 'La expresión es demasiado larga (máximo {maximo} tokens)' },

  E01: { tipo: TIPOS.SEMANTICO, plantilla: "La variable '{nombre}' no está definida" },
  E02: { tipo: TIPOS.SEMANTICO, plantilla: 'División por cero' },
  E03: { tipo: TIPOS.SEMANTICO, plantilla: "'{funcion}' espera {esperado} y recibió {recibido}" },
  E04: { tipo: TIPOS.SEMANTICO, plantilla: "'{nombre}' es una constante y no se puede modificar" },
  E05: { tipo: TIPOS.SEMANTICO, plantilla: "'{funcion}' no está definida para {valor}" },
  E06: { tipo: TIPOS.SEMANTICO, plantilla: 'El resultado es demasiado grande' },
};

/** Reemplaza cada {clave} de la plantilla por datos[clave]. */
function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (marca, clave) => (clave in datos ? String(datos[clave]) : marca));
}

/**
 * Error con código, tipo y columna, para mostrarlo subrayado en la entrada.
 *
 * Ejemplo:
 *   new ErrorCalc('L01', 5, { caracter: '$' }).message
 *   → "Carácter no válido '$' (columna 5)."
 */
export class ErrorCalc extends Error {
  /**
   * @param {string} codigo   Código del catálogo, p. ej. 'S02'.
   * @param {number} columna  Columna (desde 1) donde se detectó.
   * @param {object} [datos]  Valores para la plantilla del mensaje.
   * @param {string} [pista]  Texto de ayuda opcional.
   */
  constructor(codigo, columna, datos = {}, pista = null) {
    const entrada = CATALOGO[codigo];
    if (!entrada) {
      throw new Error(`Código de error desconocido: ${codigo}`);
    }
    const texto = rellenar(entrada.plantilla, datos);
    const mensaje = entrada.conColumna === false ? `${texto}.` : `${texto} (columna ${columna}).`;

    super(mensaje);
    this.name = 'ErrorCalc';
    this.codigo = codigo;
    this.tipo = entrada.tipo;
    this.columna = columna;
    this.datos = datos;
    this.pista = pista;
  }

  /** Mensaje completo para mostrar al usuario, p. ej. "S02 · Error sintáctico: ...". */
  get titulo() {
    return `${this.codigo} · Error ${this.tipo}: ${this.message}`;
  }
}
