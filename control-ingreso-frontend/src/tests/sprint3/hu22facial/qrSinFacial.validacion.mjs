// HU22 · Registro y Verificación Facial · TC-303 y TC-305 (pruebas de validación).
// Pide el QR del examen directo al servidor, SIN pasar por la verificación facial.
// Solo consulta: no registra fotos, ingresos ni intentos faciales.
// (Si el estudiante no tenía credencial para el examen, el servidor crea una sola fila en "credencial").
//
// Uso, con el back levantado en el puerto 8081 (las contraseñas van en variables de entorno):
//   $env:QA_CORREO_A="202608004@est.umss.edu"   (estudiante con registro facial activo)
//   $env:QA_CLAVE_A="..."
//   $env:QA_CORREO_B="202608002@est.umss.edu"   (estudiante con registro facial bloqueado)
//   $env:QA_CLAVE_B="..."
//   $env:QA_EXAMEN="857"
//   node src/tests/sprint3/hu22facial/qrSinFacial.validacion.mjs

const BASE = process.env.API_URL || "http://localhost:8081";
const EXAMEN = process.env.QA_EXAMEN || "857";
let fallo = false;

function requerida(nombre) {
    const valor = process.env[nombre];
    if (!valor) {
        console.error(`Falta la variable de entorno ${nombre}.`);
        process.exit(2);
    }
    return valor;
}

async function iniciarSesion(correo, contrasena) {
    const respuesta = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
    });
    if (!respuesta.ok) throw new Error(`No se pudo iniciar sesión con ${correo} (HTTP ${respuesta.status})`);
    const datos = await respuesta.json();
    if (!datos?.token) throw new Error(`El login de ${correo} no devolvió token`);
    return datos.token;
}

async function pedir(ruta, token) {
    const respuesta = await fetch(`${BASE}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
    const texto = await respuesta.text();
    let cuerpo = null;
    try { cuerpo = JSON.parse(texto); } catch { cuerpo = texto; }
    return { status: respuesta.status, cuerpo };
}

// Muestra solo el inicio del contenido del QR, para no exponer la credencial completa.
const oculto = (valor) => (valor ? `${String(valor).slice(0, 12)}… (${String(valor).length} caracteres)` : "ninguno");

async function revisar(etiqueta, correo, contrasena, esperado) {
    const token = await iniciarSesion(correo, contrasena);
    const estadoFacial = await pedir("/api/face/enrollment/status", token);
    const qr = await pedir(`/api/v1/estudiante/examenes/${EXAMEN}/qr`, token);
    const contenido = qr.cuerpo?.contenidoQr || qr.cuerpo?.token || null;
    const entregado = qr.status === 200 && Boolean(contenido);

    console.log(`\n[EVIDENCIA] ${etiqueta} · ${correo}`);
    console.log(`[EVIDENCIA]   Estado del registro facial: ${estadoFacial.cuerpo?.estado ?? `HTTP ${estadoFacial.status}`}`);
    console.log("[EVIDENCIA]   Verificación facial previa: ninguna (se pidió el QR directo al servidor)");
    console.log(`[EVIDENCIA]   Respuesta del QR: HTTP ${qr.status} · estado ${qr.cuerpo?.estado ?? "—"}`);
    console.log(`[EVIDENCIA]   Contenido del QR entregado: ${oculto(contenido)}`);
    console.log(`[EVIDENCIA]   ¿El servidor entregó el QR?: ${entregado ? "sí" : "no"} (esperado: no)`);
    console.log(`[EVIDENCIA]   ${esperado}`);

    if (entregado) {
        fallo = true;
        console.log(`[RESULTADO] ${etiqueta}: FALLA`);
    } else {
        console.log(`[RESULTADO] ${etiqueta}: APRUEBA`);
    }
}

try {
    await revisar(
        "TC-303",
        requerida("QA_CORREO_A"),
        requerida("QA_CLAVE_A"),
        "Esperado: sin una foto que coincida, el servidor no entrega el QR."
    );
    await revisar(
        "TC-305",
        requerida("QA_CORREO_B"),
        requerida("QA_CLAVE_B"),
        "Esperado: sin registro facial activo, el servidor no entrega el QR."
    );
} catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(2);
}

process.exit(fallo ? 1 : 0);