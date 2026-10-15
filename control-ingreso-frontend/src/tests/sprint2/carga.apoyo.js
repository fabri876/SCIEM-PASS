import ExcelJS from "exceljs";

// Ayudas de las pruebas de carga (QA · sprint 2).
// Los datos son personas inventadas con nombres comunes y correos @gmail.com.
// El sistema no envía correos, así que nadie recibe nada.

const NOMBRES = [
    "Mariana", "Jorge", "Lucía", "Andrés", "Valeria", "Carlos", "Camila", "Luis", "Daniela", "Miguel",
    "Gabriela", "José", "Natalia", "Fernando", "Sofía", "Ricardo", "Paula", "Sergio", "Andrea", "Javier",
    "Fabiola", "Marcelo", "Carolina", "Diego", "Vanessa", "Rodrigo", "Patricia", "Álvaro", "Mónica", "Gonzalo",
    "Verónica", "Hugo", "Claudia", "Raúl", "Elena", "Mauricio", "Silvia", "Óscar", "Rocío", "Iván",
];
const APELLIDOS = [
    "López", "Vargas", "Rojas", "Mendoza", "Gutiérrez", "Fernández", "Quispe", "Mamani", "Flores", "Torrez",
    "Choque", "Romero", "Herrera", "Salazar", "Castillo", "Ortiz", "Morales", "Suárez", "Peña", "Rivera",
    "Montaño", "Villarroel", "Zurita", "Arce", "Camacho", "Paredes", "Soria", "Terrazas", "Ugarte", "Vega",
    "Aguirre", "Barrientos", "Cabrera", "Delgado", "Escobar", "Fuentes", "Guzmán", "Iriarte", "Jiménez", "Lara",
    "Medina", "Navarro", "Orellana", "Pinto", "Ramírez", "Saavedra", "Tapia", "Urquidi", "Valdez", "Zambrana",
];

const sinTildes = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Genera estudiantes inventados, todos distintos entre sí.
 * "desde" permite que dos pruebas no repitan las mismas personas.
 */
export function generarEstudiantes(cantidad, desde = 0) {
    const lista = [];
    for (let n = desde; n < desde + cantidad; n++) {
        const nombre = NOMBRES[n % NOMBRES.length];
        const i1 = Math.floor(n / NOMBRES.length) % APELLIDOS.length;
        const i2 = (i1 + 1 + (n % 7)) % APELLIDOS.length;
        const apellidos = `${APELLIDOS[i1]} ${APELLIDOS[i2]}`;
        const vuelta = Math.floor(n / (NOMBRES.length * APELLIDOS.length)); // solo pasa de 2000 personas
        lista.push({
            codsis: 202650000 + n,
            correo: `${sinTildes(nombre)}.${sinTildes(APELLIDOS[i1])}.${sinTildes(APELLIDOS[i2])}${vuelta ? vuelta : ""}@gmail.com`,
            ci: String(6100000 + n),
            apellidos,
            nombres: nombre,
            telefono: 71000000 + n,
        });
    }
    return lista;
}

/**
 * Arma en memoria (sin guardarlo en la computadora) un Excel con el formato de la plantilla de estudiantes:
 * CODSIS, CORREO, CI, APELLIDOS, NOMBRES, TELEFONO.
 */
export async function excelEstudiantes(estudiantes, nombreArchivo) {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Estudiantes");
    hoja.addRow(["CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"]);
    for (const e of estudiantes) hoja.addRow([e.codsis, e.correo, e.ci, e.apellidos, e.nombres, e.telefono]);
    return {
        name: nombreArchivo,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from(await libro.xlsx.writeBuffer()),
    };
}

/**
 * Seguro de la prueba: bloquea cualquier pedido que guarde usuarios
 * (carga masiva confirmada y registro individual). La vista previa sí pasa, porque no guarda nada.
 * Devuelve la lista de pedidos bloqueados para dejarlo en la evidencia.
 */
export async function bloquearGuardado(page) {
    const bloqueados = [];
    await page.route(
        (url) => /\/api\/usuarios\/(carga-masiva|registro-individual)$/.test(url.pathname),
        async (route) => {
            bloqueados.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
            await route.abort("blockedbyclient");
        },
    );
    return bloqueados;
}