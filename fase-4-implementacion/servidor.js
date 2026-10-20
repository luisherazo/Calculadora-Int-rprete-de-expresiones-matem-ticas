/**
 * servidor.js — Servidor estático local para la interfaz web.
 *
 * Los navegadores bloquean los módulos ES cuando la página se abre con
 * file://, así que se sirve la carpeta en http://localhost:8080.
 * Solo usa módulos de Node.js, sin dependencias. Diseño, sección 5.4.
 *
 * Uso: npm start   (o, desde esta carpeta: node servidor.js [puerto])
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PUERTO = Number(process.argv[2]) || 8080;

const TIPOS_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const servidor = createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
  const archivo = normalize(join(RAIZ, ruta === '/' ? 'index.html' : ruta));

  // Impide salir de la carpeta del proyecto con rutas como /../
  if (!archivo.startsWith(RAIZ.endsWith(sep) ? RAIZ : RAIZ + sep)) {
    respuesta.writeHead(403).end('Prohibido');
    return;
  }

  try {
    const contenido = await readFile(archivo);
    const tipo = TIPOS_MIME[extname(archivo)] ?? 'application/octet-stream';
    respuesta.writeHead(200, { 'Content-Type': tipo }).end(contenido);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Calculadora explicativa en http://localhost:${PUERTO}`);
});
