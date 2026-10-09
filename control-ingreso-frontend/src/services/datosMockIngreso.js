// Datos de prueba del control de ingreso.
// Solo se usan mientras USAR_MOCK = true en ingresoService.js.
// Tienen la MISMA forma que devolverá el backend.

// estado lo calcula el backend con la hora del servidor:
// EN_CURSO | PROXIMO | FINALIZADO
export const EXAMENES_MOCK = [
  { id: 1, materia: "Cálculo I", tipo: "Primer Parcial", aula: "691", edificio: "Edificio Multidisciplinario", fecha: "2026-10-05", horaInicio: "08:00", horaFin: "10:00", estado: "EN_CURSO" },
  { id: 2, materia: "Física II", tipo: "Examen Final", aula: "605", edificio: "Edificio Académico 2", fecha: "2026-10-05", horaInicio: "10:30", horaFin: "12:30", estado: "PROXIMO" },
  { id: 3, materia: "Álgebra Lineal", tipo: "Segundo Parcial", aula: "622", edificio: "Edificio Académico 2", fecha: "2026-10-05", horaInicio: "06:45", horaFin: "07:45", estado: "FINALIZADO" },
];

// Reparto de estudiantes por la primera letra del apellido (lo asigna el docente).
// Si un examen no tiene filas, hay un único operador y atiende todos los apellidos.
// esMia = la fila del operador que tiene la sesión.
export const FILAS_MOCK = {
  1: [
    { desde: "A", hasta: "F", operador: "Tú", esMia: true },
    { desde: "G", hasta: "M", operador: "Neil Nina Zarate", esMia: false },
    { desde: "N", hasta: "Z", operador: "Diego Montaño Quispe", esMia: false },
  ],
};

const NOMBRES = ["Ana", "Bruno", "Camila", "David", "Elena", "Fabián", "Gabriela", "Hugo", "Isabel", "Joel", "Karen", "Luis", "Mariana", "Nicolás", "Olga", "Pablo", "Rocío", "Sergio", "Tatiana", "Víctor", "Ximena", "Yesenia", "Álvaro", "Diana"];
const APELLIDOS = ["Rojas", "Mamani", "Quispe", "Vargas", "Flores", "Gutiérrez", "Choque", "Arce", "Torrico", "Salazar", "Camacho", "Paz", "Montaño", "Rocha", "Cruz", "Villca", "Antezana", "Claros"];
const CARRERAS = ["Ingeniería de Sistemas", "Ingeniería Informática", "Ingeniería Industrial", "Ingeniería Civil", "Ingeniería Electrónica"];
const METODOS = ["QR", "C.I.", "SIS"];

const pad = (n) => String(n).padStart(2, "0");
export const formatearHora = (seg) =>
  pad(Math.floor(seg / 3600)) + ":" + pad(Math.floor(seg / 60) % 60) + ":" + pad(seg % 60);

// Genera una nómina: numTotal estudiantes, numIngresados ya marcados desde horaBase (segundos)
function generarNomina({ numTotal, numIngresados, aula, semilla, horaBase }) {
  const list = [];
  for (let i = 0; i < numTotal; i++) {
    const k = i + semilla;
    list.push({
      nombres: NOMBRES[k % NOMBRES.length],
      apellidos: APELLIDOS[(k * 5) % APELLIDOS.length] + " " + APELLIDOS[(k * 7 + 3) % APELLIDOS.length],
      ci: String(7100000 + ((k * 13579) % 900000)),
      sis: "2023" + String(10000 + k * 217).slice(-5),
      carrera: CARRERAS[k % CARRERAS.length],
      aulaAsignada: aula,
      habilitado: true,
      ingreso: i < numIngresados
        ? { hora: formatearHora(horaBase + Math.floor((i * 22 * 60) / Math.max(numIngresados, 1)) + ((i * 17) % 40)), metodo: METODOS[i % 3] }
        : null,
    });
  }
  return list;
}

export function crearNominasMock() {
  // Examen 1 · Cálculo I (en curso): 46 + casos especiales
  const calculo = generarNomina({ numTotal: 46, numIngresados: 30, aula: "691", semilla: 0, horaBase: 7 * 3600 + 50 * 60 });
  calculo.push(
    { nombres: "Lucía", apellidos: "Fernández Rocha", ci: "8765432", sis: "202301245", carrera: "Ingeniería de Sistemas", aulaAsignada: "691", habilitado: true, normaParticular: "Tiempo adicional de 15 minutos", ingreso: null },
    { nombres: "Carlos", apellidos: "Mendoza Paz", ci: "1234567", sis: "202308374", carrera: "Ingeniería Industrial", aulaAsignada: "691", habilitado: true, ingreso: { hora: "08:05:00", metodo: "QR" } },
    { nombres: "Jhonny", apellidos: "Quispe Mamani", ci: "9988776", sis: "202102233", carrera: "Ingeniería de Sistemas", aulaAsignada: "691", habilitado: false, motivos: ["Asistencia insuficiente (62 %, mínimo 80 %)", "Prerrequisito no aprobado: Álgebra I"], ingreso: null },
    { nombres: "Marco", apellidos: "Antezana Vela", ci: "6677889", sis: "202207761", carrera: "Ingeniería Electrónica", aulaAsignada: "692", habilitado: true, ingreso: null },
    { nombres: "Ricardo", apellidos: "Torrico Salazar", ci: "7766554", sis: "202305512", carrera: "Ingeniería Civil", aulaAsignada: "691", habilitado: true, ingreso: null },
  );

  // Examen 2 · Física II (próximo): nadie ingresó todavía
  const fisica = generarNomina({ numTotal: 39, numIngresados: 0, aula: "605", semilla: 60, horaBase: 0 });
  fisica.push(
    { nombres: "Sofía", apellidos: "Rivera Claros", ci: "5544332", sis: "202304410", carrera: "Ingeniería Civil", aulaAsignada: "605", habilitado: true, ingreso: null },
  );

  // Examen 3 · Álgebra Lineal (finalizado)
  const algebra = generarNomina({ numTotal: 35, numIngresados: 33, aula: "622", semilla: 120, horaBase: 6 * 3600 + 35 * 60 });

  return { 1: calculo, 2: fisica, 3: algebra };
}

/*
  Valores para probar en "Ingreso manual" (examen Cálculo I):
  8765432    → permitido (con norma particular). Una 2da vez sale "ya registrado".
  202308374  → ya registrado (08:05:00)
  9988776    → inhabilitado
  6677889    → aula incorrecta (692)
  7766554    → no pertenece a tu fila (apellido T: le toca a la fila N – Z)
  5544332    → inscrita en otro examen (Física II)
  1111111    → no encontrado
  Recargar la página (F5) reinicia los datos de prueba.
*/
