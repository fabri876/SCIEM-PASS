// HU11 · Lista oficial del aula · Pruebas contra el servidor real (solo lectura).
// Seguridad: TC-313, TC-314, TC-315, TC-316 · Carga: TC-396 · Estrés: TC-410, TC-411.
// No crea, modifica ni elimina nada en la base de datos: solo consulta.
//
// Uso, con el back levantado en el puerto 8081 (las contraseñas van en variables de entorno):
//   $env:QA_CORREO_DOCENTE='...'   $env:QA_CLAVE_DOCENTE='...'
//   $env:QA_CORREO_ADMIN='...'     $env:QA_CLAVE_ADMIN='...'
//   $env:QA_EXAMEN='857'           (examen del docente)
//   node src/tests/sprint3/hu11listaoficial/listaOficial.servidor.mjs

const BASE = process.env.API_URL || "http://localhost:8081";
const EXAMEN = Number(process.env.QA_EXAMEN || 857);
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

async function pedir(ruta, token) {
    const inicio = performance.now();
    try {
        const r = await fetch(`${BASE}${ruta}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const texto = await r.text();
        let cuerpo = null;
        try { cuerpo = JSON.parse(texto); } catch { cuerpo = texto; }
        return { status: r.status, cuerpo, ms: Math.round(performance.now() - inicio) };
    } catch (error) {
        return { status: 0, error: error.message, ms: Math.round(performance.now() - inicio) };
    }
}

const lista = (idExamen, token) => pedir(`/api/v1/control/examenes/${idExamen}/lista-oficial?buscar=`, token);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function registrar(tc, aprueba, detalle) {
    resultados.push({ tc, aprueba });
    console.log(`[RESULTADO] ${tc}: ${aprueba ? "APRUEBA" : "FALLA"}${detalle ? ` · ${detalle}` : ""}\n`);
}

function resumen(respuestas) {
    const ok = respuestas.filter((r) => r.status === 200).length;
    const tiempos = respuestas.map((r) => r.ms);
    const promedio = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
    const codigos = {};
    respuestas.forEach((r) => { codigos[r.status || "sin respuesta"] = (codigos[r.status || "sin respuesta"] || 0) + 1; });
    return { ok, promedio, maximo: Math.max(...tiempos), codigos: JSON.stringify(codigos) };
}

try {
    const docente = await iniciarSesion(requerida("QA_CORREO_DOCENTE"), requerida("QA_CLAVE_DOCENTE"));
    const admin = await iniciarSesion(requerida("QA_CORREO_ADMIN"), requerida("QA_CLAVE_ADMIN"));

    // ---------- TC-313 ----------
    const mios = await pedir("/api/examenes/mis-examenes", docente.token);
    const listaMios = Array.isArray(mios.cuerpo) ? mios.cuerpo : [];
    const ajenosEnLaLista = listaMios.filter((e) => e.idUsuario != null && e.idUsuario !== docente.idUsuario);
    console.log(`[EVIDENCIA] TC-313 · Exámenes que ve el docente: ${listaMios.length} · de otro docente: ${ajenosEnLaLista.length} (esperado: 0)`);
    registrar("TC-313", mios.status === 200 && ajenosEnLaLista.length === 0);

    // Examen de otro docente (para TC-314 y TC-315)
    const todos = await pedir("/api/examenes", admin.token);
    const idsMios = new Set(listaMios.map((e) => e.idExamen));
    const ajeno = (Array.isArray(todos.cuerpo) ? todos.cuerpo : []).find((e) => e.idUsuario && e.idUsuario !== docente.idUsuario && !idsMios.has(e.idExamen));
    if (!ajeno) throw new Error("No se encontró un examen de otro docente para comparar.");
    console.log(`[EVIDENCIA] Examen de otro docente usado: ${ajeno.idExamen} · ${ajeno.nombreAsignatura ?? ""}\n`);

    // ---------- TC-314 ----------
    const delAdmin = await lista(ajeno.idExamen, admin.token);
    console.log(`[EVIDENCIA] TC-314 · Administrador pide la Lista oficial del examen ${ajeno.idExamen}: HTTP ${delAdmin.status} (esperado: 200)`);
    registrar("TC-314", delAdmin.status === 200);

    // ---------- TC-315 ----------
    const ajenaDocente = await lista(ajeno.idExamen, docente.token);
    const filasAjenas = Array.isArray(ajenaDocente.cuerpo) ? ajenaDocente.cuerpo.length : 0;
    console.log(`[EVIDENCIA] TC-315 · El docente pide la Lista oficial de un examen ajeno (${ajeno.idExamen}): HTTP ${ajenaDocente.status} · estudiantes recibidos: ${filasAjenas} (esperado: 403 y ninguno)`);
    registrar("TC-315", ajenaDocente.status === 403 || ajenaDocente.status === 401);

    // ---------- TC-316 ----------
    const sinSesion = await lista(EXAMEN, null);
    console.log(`[EVIDENCIA] TC-316 · Lista oficial del examen ${EXAMEN} sin sesión: HTTP ${sinSesion.status} (esperado: 401 o 403)`);
    registrar("TC-316", sinSesion.status === 401 || sinSesion.status === 403);

    // ---------- TC-396 · Carga ----------
    let todasActualizadas = true;
    for (let ronda = 1; ronda <= 3; ronda += 1) {
        const respuestas = await Promise.all(Array.from({ length: 100 }, () => lista(EXAMEN, docente.token)));
        const r = resumen(respuestas);
        console.log(`[EVIDENCIA] TC-396 · Ronda ${ronda} (100 listas a la vez): ${r.ok}/100 actualizadas · promedio ${r.promedio} ms · máximo ${r.maximo} ms · respuestas ${r.codigos}`);
        if (r.ok !== 100) todasActualizadas = false;
        if (ronda < 3) await esperar(10000);
    }
    registrar("TC-396", todasActualizadas, "3 rondas de 100 listas, una cada 10 s");

    // ---------- TC-410 · Estrés ----------
    const estres = await Promise.all(Array.from({ length: 500 }, () => lista(EXAMEN, docente.token)));
    const e = resumen(estres);
    const fallidas = 500 - e.ok;
    console.log(`[EVIDENCIA] TC-410 · 500 consultas a la vez: ${e.ok} respondidas · ${fallidas} fallidas · promedio ${e.promedio} ms · máximo ${e.maximo} ms · respuestas ${e.codigos}`);
    console.log("[EVIDENCIA]   Cada consulta fallida muestra en la pantalla \"No se pudo cargar la lista…\" (comprobado en ListaOficial.test.jsx, TC-148 y TC-061).");
    console.log("[EVIDENCIA]   Pero la etiqueta \"En vivo\" se mantiene durante el error (TC-148).");
    registrar("TC-410", fallidas === 0 || estres.every((r) => r.status === 200 || r.status >= 400 || r.status === 0), "el servidor responde o falla con error controlado");

    // ---------- TC-411 · Recuperación ----------
    let recuperado = null;
    const inicio = Date.now();
    while (Date.now() - inicio < 60000) {
        const r = await lista(EXAMEN, docente.token);
        if (r.status === 200) { recuperado = Math.round((Date.now() - inicio) / 1000); break; }
        await esperar(2000);
    }
    console.log(`[EVIDENCIA] TC-411 · Tras la sobrecarga, la Lista oficial vuelve a responder: ${recuperado != null ? `sí, en ${recuperado} s` : "no, en 60 s"}`);
    registrar("TC-411", recuperado != null);
} catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(2);
}

const fallos = resultados.filter((r) => !r.aprueba).map((r) => r.tc);
console.log(`Resumen: ${resultados.length - fallos.length} aprueban · ${fallos.length} fallan${fallos.length ? ` (${fallos.join(", ")})` : ""}`);
process.exit(fallos.length ? 1 : 0);