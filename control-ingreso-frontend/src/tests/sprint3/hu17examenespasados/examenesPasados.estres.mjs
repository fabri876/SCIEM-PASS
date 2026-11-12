// HU17 · Sección de Exámenes Pasados · TC-419 (prueba de estrés).
// Lanza 300 descargas simultáneas del mismo PDF contra el backend que está corriendo (solo lectura).
// Para cada descarga que falle, calcula el mensaje que mostraría la pantalla, con la misma lógica
// que usa el front (servicio examenesPasadosService). No crea, modifica ni elimina nada.
// Uso: con el back levantado en el puerto 8081 →  node src/tests/sprint3/hu17examenespasados/examenesPasados.estres.mjs
import { createHash } from "node:crypto";

const BASE = process.env.API_URL || "http://localhost:8081";
const DESCARGAS = 300;
const MENSAJE_ESPERADO = "No se pudo descargar el archivo del examen.";
const huella = (buffer) => createHash("sha256").update(buffer).digest("hex");

// Mismo criterio que el front: si el servidor responde con error, muestra su "mensaje";
// si no responde, muestra el error del navegador ("Failed to fetch" en Chrome).
async function descargar(id) {
    const inicio = performance.now();
    try {
        const respuesta = await fetch(`${BASE}/api/publico/examenes/pasados/${id}/pdf`);
        if (!respuesta.ok) {
            const cuerpo = await respuesta.json().catch(() => null);
            return {
                ok: false, estado: respuesta.status, mensaje: cuerpo?.mensaje || cuerpo?.message
                    || "No se pudo consultar el archivo de exámenes pasados.", ms: Math.round(performance.now() - inicio)
            };
        }
        return { ok: true, bytes: Buffer.from(await respuesta.arrayBuffer()), ms: Math.round(performance.now() - inicio) };
    } catch (error) {
        return { ok: false, estado: "sin respuesta", mensaje: "Failed to fetch (error del navegador)", ms: Math.round(performance.now() - inicio) };
    }
}

// Se elige el PDF más liviano entre los primeros 5 de la lista
const lista = await (await fetch(`${BASE}/api/publico/examenes/pasados?offset=0&limite=50`)).json();
let elegido = null;
for (const documento of lista.slice(0, 5)) {
    const r = await descargar(documento.intId);
    if (r.ok && (!elegido || r.bytes.length < elegido.bytes.length)) elegido = { documento, bytes: r.bytes };
}
if (!elegido) {
    console.log("[EVIDENCIA] TC-419 · No se pudo descargar ningún documento de referencia");
    process.exit(1);
}
const original = huella(elegido.bytes);

const inicioTotal = performance.now();
const resultados = await Promise.all(Array.from({ length: DESCARGAS }, () => descargar(elegido.documento.intId)));
const total = Math.round(performance.now() - inicioTotal);

const completas = resultados.filter((r) => r.ok && r.bytes.length === elegido.bytes.length && huella(r.bytes) === original).length;
const incompletas = resultados.filter((r) => r.ok && !(r.bytes.length === elegido.bytes.length && huella(r.bytes) === original)).length;
const fallidas = resultados.filter((r) => !r.ok);
const mensajes = {};
for (const f of fallidas) {
    const clave = `${f.estado} -> "${f.mensaje}"`;
    mensajes[clave] = (mensajes[clave] || 0) + 1;
}
const tiempos = resultados.map((r) => r.ms);

console.log(`[EVIDENCIA] TC-419 · ${DESCARGAS} descargas simultáneas de "${elegido.documento.strNombre}" (${elegido.bytes.length} bytes)`);
console.log(`[EVIDENCIA]   Completas e idénticas al original: ${completas} · incompletas: ${incompletas} · fallidas: ${fallidas.length}`);
console.log(`[EVIDENCIA]   Tiempo por descarga: promedio ${Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)} ms · máximo ${Math.max(...tiempos)} ms · total ${total} ms`);
if (fallidas.length) {
    console.log(`[EVIDENCIA]   Mensaje que vería el usuario en las descargas fallidas (esperado: "${MENSAJE_ESPERADO}"):`);
    for (const [clave, cantidad] of Object.entries(mensajes)) console.log(`[EVIDENCIA]     ${cantidad} × ${clave}`);
} else {
    console.log(`[EVIDENCIA]   Ninguna descarga falló, por lo que no se mostró ningún mensaje de error`);
}
console.log("");

const mensajesCorrectos = fallidas.every((f) => f.mensaje === MENSAJE_ESPERADO);
const pasa = incompletas === 0 && mensajesCorrectos;
console.log(pasa ? "RESULTADO: PASA (TC-419)" : "RESULTADO: FALLA (TC-419)");
process.exitCode = pasa ? 0 : 1;