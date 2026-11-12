// HU17 · Sección de Exámenes Pasados · TC-403 y TC-404 (pruebas de carga).
// Hace solicitudes reales al backend que está corriendo (solo lectura: listar y descargar).
// No crea, modifica ni elimina nada en la base de datos.
// Uso: con el back levantado en el puerto 8081 →  node src/tests/sprint3/hu17examenespasados/examenesPasados.carga.mjs
import { createHash } from "node:crypto";

const BASE = process.env.API_URL || "http://localhost:8081";
const LISTA = `${BASE}/api/publico/examenes/pasados?offset=0&limite=50`;
const pdfUrl = (id) => `${BASE}/api/publico/examenes/pasados/${id}/pdf`;
const huella = (buffer) => createHash("sha256").update(buffer).digest("hex");
let fallo = false;

async function medir(tarea) {
    const inicio = performance.now();
    try {
        const valor = await tarea();
        return { valor, ms: Math.round(performance.now() - inicio) };
    } catch (error) {
        return { error: error.message, ms: Math.round(performance.now() - inicio) };
    }
}

function resumenTiempos(resultados) {
    const tiempos = resultados.map((r) => r.ms);
    const promedio = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
    return `promedio ${promedio} ms · máximo ${Math.max(...tiempos)} ms`;
}

async function leerLista() {
    const respuesta = await fetch(LISTA);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return respuesta.text();
}

async function descargar(id) {
    const respuesta = await fetch(pdfUrl(id));
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return Buffer.from(await respuesta.arrayBuffer());
}

// ---------------------------------------------------------------- TC-403
const referencia = await leerLista();
const documentos = JSON.parse(referencia);
const listas = await Promise.all(Array.from({ length: 100 }, () => medir(leerLista)));
const listasIguales = listas.filter((r) => r.valor === referencia).length;
const listasConError = listas.filter((r) => r.error).length;

console.log(`[EVIDENCIA] TC-403 · 100 usuarios abren la lista de exámenes pasados a la vez`);
console.log(`[EVIDENCIA]   Documentos en la lista de referencia: ${documentos.length}`);
console.log(`[EVIDENCIA]   Listas completas e iguales a la referencia: ${listasIguales} de 100 · con error: ${listasConError}`);
console.log(`[EVIDENCIA]   Tiempo por solicitud: ${resumenTiempos(listas)}`);
if (listasIguales !== 100) { fallo = true; console.log(`[EVIDENCIA]   FALLA: no todas las listas llegaron completas`); }
console.log("");

// ---------------------------------------------------------------- TC-404
// Se elige un PDF liviano (hasta 3 MB) para no saturar la conexión con 50 descargas.
let elegido = null;
for (const documento of documentos.slice(0, 5)) {
    const bytes = await descargar(documento.intId);
    if (!elegido || bytes.length < elegido.bytes.length) elegido = { documento, bytes };
    if (bytes.length <= 3 * 1024 * 1024) break;
}
if (!elegido) {
    console.log(`[EVIDENCIA] TC-404 · No hay documentos para descargar`);
    process.exit(1);
}
const huellaOriginal = huella(elegido.bytes);
const descargas = await Promise.all(Array.from({ length: 50 }, () => medir(() => descargar(elegido.documento.intId))));
const completas = descargas.filter((r) => r.valor && r.valor.length === elegido.bytes.length && huella(r.valor) === huellaOriginal).length;
const descargasConError = descargas.filter((r) => r.error).length;

console.log(`[EVIDENCIA] TC-404 · 50 descargas simultáneas de "${elegido.documento.strNombre}"`);
console.log(`[EVIDENCIA]   Tamaño del PDF: ${elegido.bytes.length} bytes · huella SHA-256: ${huellaOriginal.slice(0, 16)}…`);
console.log(`[EVIDENCIA]   Descargas completas e idénticas al archivo original: ${completas} de 50 · con error: ${descargasConError}`);
console.log(`[EVIDENCIA]   Tiempo por descarga: ${resumenTiempos(descargas)}`);
if (completas !== 50) { fallo = true; console.log(`[EVIDENCIA]   FALLA: no todas las descargas entregaron el archivo completo`); }
console.log("");

console.log(fallo ? "RESULTADO: FALLA" : "RESULTADO: PASA (TC-403 y TC-404)");
process.exitCode = fallo ? 1 : 0;