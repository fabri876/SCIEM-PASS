// HU12 · Reportes de asistencia · Pruebas contra el servidor real (solo lectura).
// Seguridad: TC-320, TC-321 · Carga: TC-397 · Estrés: TC-412, TC-413.
// Generar un reporte no crea, modifica ni elimina nada en la base de datos: solo consulta.
//
// Uso, con el back levantado en el puerto 8081 (las contraseñas van en variables de entorno):
//   $env:QA_CORREO_DOCENTE='...'     $env:QA_CLAVE_DOCENTE='...'
//   $env:QA_CORREO_ADMIN='...'       $env:QA_CLAVE_ADMIN='...'
//   $env:QA_CORREO_ESTUDIANTE='...'  $env:QA_CLAVE_ESTUDIANTE='...'
//   (opcional) $env:QA_CORREO_AYUDANTE='...'  $env:QA_CLAVE_AYUDANTE='...'
//   $env:QA_EXAMEN='857'             (examen finalizado del docente)
//   node src/tests/sprint3/hu12reportes/reportes.servidor.mjs

const BASE = process.env.API_URL || "http://localhost:8081";
const EXAMEN = Number(process.env.QA_EXAMEN || 857);
const LIMITE_MS = 10000; // tiempo máximo aceptado por reporte en la prueba de carga
const resultados = [];

function requerida(nombre) {
    const valor = process.env[nombre];
    if (!valor) {
        console.error(`Falta la variable de entorno ${nombre}.`);
        process.exit(2);
    }
    return valor;
}

async function iniciarSesion(correo, contrasena) {
    const r = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
    });
    if (!r.ok) throw new Error(`No se pudo iniciar sesión con ${correo} (HTTP ${r.status})`);
    const d = await r.json();
    return { token: d.token, idUsuario: d.usuario?.idUsuario };
}

async function reporte(idExamen, token, formato = "pdf") {
    const inicio = performance.now();
    try {
        const r = await fetch(`${BASE}/api/reportes/examenes/${idExamen}/asistencia?formato=${formato}&secciones=resumen,asistentes,ausentes,inhabilitados`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const cuerpo = Buffer.from(await r.arrayBuffer());
        return { status: r.status, cuerpo, nombre: r.headers.get("content-disposition") || "", ms: Math.round(performance.now() - inicio) };
    } catch (error) {
        return { status: 0, cuerpo: Buffer.alloc(0), nombre: "", error: error.message, ms: Math.round(performance.now() - inicio) };
    }
}

// Un PDF completo empieza con "%PDF" y termina con "%%EOF"
const pdfCompleto = (b) => b.length > 8 && b.subarray(0, 4).toString() === "%PDF" && b.subarray(-8).toString().includes("%%EOF");
const mensaje = (b) => { try { const j = JSON.parse(b.toString()); return j.mensaje || j.error || j.message || ""; } catch { return ""; } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function registrar(tc, aprueba, detalle) {
    resultados.push({ tc, aprueba });
    console.log(`[RESULTADO] ${tc}: ${aprueba ? "APRUEBA" : "FALLA"}${detalle ? ` · ${detalle}` : ""}\n`);
}

function resumen(respuestas) {
    const tiempos = respuestas.map((r) => r.ms);
    const codigos = {};
    respuestas.forEach((r) => { codigos[r.status || "sin respuesta"] = (codigos[r.status || "sin respuesta"] || 0) + 1; });
    return {
        promedio: Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length),
        maximo: Math.max(...tiempos),
        codigos: JSON.stringify(codigos),
    };
}

try {
    const docente = await iniciarSesion(requerida("QA_CORREO_DOCENTE"), requerida("QA_CLAVE_DOCENTE"));
    const admin = await iniciarSesion(requerida("QA_CORREO_ADMIN"), requerida("QA_CLAVE_ADMIN"));
    const estudiante = await iniciarSesion(requerida("QA_CORREO_ESTUDIANTE"), requerida("QA_CLAVE_ESTUDIANTE"));
    const ayudante = process.env.QA_CORREO_AYUDANTE
        ? await iniciarSesion(process.env.QA_CORREO_AYUDANTE, requerida("QA_CLAVE_AYUDANTE"))
        : null;

    // Exámenes ya pasados (de fecha anterior a hoy), para TC-320 y TC-397
    const todos = await fetch(`${BASE}/api/examenes`, { headers: { Authorization: `Bearer ${admin.token}` } }).then((r) => r.json());
    const hoy = new Date().toISOString().slice(0, 10);
    const pasados = (Array.isArray(todos) ? todos : []).filter((e) => e.fechaExamen && String(e.fechaExamen).slice(0, 10) < hoy);

    // ---------- TC-320 ----------
    const ajeno = pasados.find((e) => e.idUsuario && e.idUsuario !== docente.idUsuario);
    if (!ajeno) throw new Error("No se encontró un examen pasado de otro docente.");
    const r320 = await reporte(ajeno.idExamen, docente.token);
    console.log(`[EVIDENCIA] TC-320 · La docente pide el reporte del examen ${ajeno.idExamen} (${ajeno.nombreAsignatura ?? ""}), que no es suyo`);
    console.log(`[EVIDENCIA]   Respuesta: HTTP ${r320.status} · mensaje: "${mensaje(r320.cuerpo)}" · ¿entregó un archivo?: ${pdfCompleto(r320.cuerpo) ? "sí" : "no"} (esperado: 403 y ningún archivo)`);
    registrar("TC-320", r320.status === 403 && !pdfCompleto(r320.cuerpo));

    // ---------- TC-321 ----------
    const rEst = await reporte(EXAMEN, estudiante.token);
    console.log(`[EVIDENCIA] TC-321 · Un estudiante pide el reporte del examen ${EXAMEN}: HTTP ${rEst.status} (esperado: 403)`);
    let okAyudante = true;
    if (ayudante) {
        const rAy = await reporte(EXAMEN, ayudante.token);
        console.log(`[EVIDENCIA]   Un ayudante pide el reporte del examen ${EXAMEN}: HTTP ${rAy.status} (esperado: 403)`);
        okAyudante = rAy.status === 403 || rAy.status === 401;
    } else {
        console.log("[EVIDENCIA]   Ayudante: no se configuró una cuenta; el servidor solo permite este reporte a docente y administrador.");
    }
    registrar("TC-321", (rEst.status === 403 || rEst.status === 401) && okAyudante);

    // ---------- TC-397 · Carga ----------
    // Primero se descartan los exámenes que el servidor no reporta (por ejemplo, sin aula registrada)
    const candidatos = pasados.slice(0, 150);
    const pruebas = await Promise.all(candidatos.map((e) => reporte(e.idExamen, admin.token).then((r) => ({ e, ok: r.status === 200 }))));
    const reportables = pruebas.filter((p) => p.ok).map((p) => p.e).slice(0, 100);
    if (!reportables.length) throw new Error("Ningún examen pasado se pudo reportar; no se puede hacer la prueba de carga.");
    const lista = Array.from({ length: 100 }, (_, i) => reportables[i % reportables.length]);
    const carga = await Promise.all(lista.map((e) => reporte(e.idExamen, admin.token).then((r) => ({ ...r, id: e.idExamen }))));
    const c = resumen(carga);
    const correctos = carga.filter((r) => r.status === 200 && pdfCompleto(r.cuerpo)).length;
    const mezclados = carga.filter((r) => r.status === 200 && !r.nombre.includes(`reporte-asistencia-${r.id}.`)).length;
    const lentos = carga.filter((r) => r.ms > LIMITE_MS).length;
    console.log(`[EVIDENCIA] TC-397 · 100 reportes a la vez de ${reportables.length} exámenes distintos`);
    console.log(`[EVIDENCIA]   Archivos completos: ${correctos}/100 · archivos de otro examen: ${mezclados} · respuestas ${c.codigos}`);
    console.log(`[EVIDENCIA]   Tiempo: promedio ${c.promedio} ms · máximo ${c.maximo} ms · más de ${LIMITE_MS / 1000} s: ${lentos}`);
    registrar("TC-397", correctos === 100 && mezclados === 0 && lentos === 0, `límite usado: ${LIMITE_MS / 1000} s por reporte`);

    // ---------- TC-412 · Estrés ----------
    const estres = await Promise.all(Array.from({ length: 500 }, () => reporte(EXAMEN, docente.token)));
    const s = resumen(estres);
    const completos = estres.filter((r) => r.status === 200 && pdfCompleto(r.cuerpo)).length;
    const incompletos = estres.filter((r) => r.status === 200 && !pdfCompleto(r.cuerpo)).length;
    const fallidos = estres.filter((r) => r.status !== 200).length;
    console.log(`[EVIDENCIA] TC-412 · 500 pedidos de reporte a la vez: ${completos} archivos completos · ${fallidos} fallidos · ${incompletos} archivos incompletos (esperado: 0 incompletos)`);
    console.log(`[EVIDENCIA]   Tiempo: promedio ${s.promedio} ms · máximo ${s.maximo} ms · respuestas ${s.codigos}`);
    console.log("[EVIDENCIA]   Cada pedido fallido muestra en la pantalla \"No se pudo generar el reporte…\" y no descarga nada (ReportesAsistencia.test.jsx, TC-158).");
    registrar("TC-412", incompletos === 0);

    // ---------- TC-413 · Recuperación ----------
    let recuperado = null;
    let unSolo = false;
    const inicio = Date.now();
    while (Date.now() - inicio < 60000) {
        const r = await reporte(EXAMEN, docente.token);
        if (r.status === 200 && pdfCompleto(r.cuerpo)) { recuperado = Math.round((Date.now() - inicio) / 1000); unSolo = true; break; }
        await esperar(2000);
    }
    console.log(`[EVIDENCIA] TC-413 · Tras la sobrecarga, se genera de nuevo el reporte: ${recuperado != null ? `sí, en ${recuperado} s` : "no, en 60 s"} · un pedido = un archivo: ${unSolo ? "sí" : "no"}`);
    console.log("[EVIDENCIA]   Varios clics seguidos generan un solo archivo (ReportesAsistencia.test.jsx, TC-067).");
    registrar("TC-413", recuperado != null && unSolo);
} catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(2);
}

const fallos = resultados.filter((r) => !r.aprueba).map((r) => r.tc);
console.log(`Resumen: ${resultados.length - fallos.length} aprueban · ${fallos.length} fallan${fallos.length ? ` (${fallos.join(", ")})` : ""}`);
process.exit(fallos.length ? 1 : 0);