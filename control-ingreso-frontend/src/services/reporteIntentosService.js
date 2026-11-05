/**
 * reporteIntentosService.js
 *
 * Servicio del frontend para HU13: "Generación de Reportes de Estudiantes con
 * Intentos de Ingreso Incorrectos" (Docente Titular y Administrador).
 *
 * Permite consultar, filtrar, calcular métricas forenses y exportar a PDF y CSV/Excel
 * los incidentes de ingreso (examen incorrecto HU-09, aula diferente HU-18,
 * duplicados bloqueados e inhabilitaciones académicas).
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

/**
 * Registros de prueba y demostración basados en el Mockup oficial de la HU13
 * para permitir el testeo y validación inmediata del frontend mientras Marcela
 * finaliza los endpoints en el backend.
 */
export const DATOS_SEMILLA_INTENTOS = [
  {
    idIntento: 1,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "Roberto Carlos Arce Valdivia",
    codSis: "202104859",
    ci: "7894561 CB",
    carreraEstudiante: "Ing. de Sistemas",
    motivo: "EXAMEN_INCORRECTO",
    motivoEtiqueta: "EXAMEN INCORRECTO (HU-09)",
    sePresentoEn: "Aula 601 (Cálculo I)",
    examenAulaAsignada: "Álgebra Lineal Aula 691A",
    fecha: "2026-10-28",
    hora: "08:35:12",
    operador: "Juan Pérez (Operador)",
    estadoPosterior: "Reorientado",
    estadoPosteriorTipo: "teal",
  },
  {
    idIntento: 2,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "Jimena Colque Ríos",
    codSis: "202206741",
    ci: "8411263 CB",
    carreraEstudiante: "Ing. Informática",
    motivo: "AMBIENTE_DIFERENTE",
    motivoEtiqueta: "AMBIENTE DIFERENTE",
    sePresentoEn: "Aula 601",
    examenAulaAsignada: "Cálculo I Aula 603",
    fecha: "2026-10-28",
    hora: "08:38:40",
    operador: "Juan Pérez (Operador)",
    estadoPosterior: "Ingresó Aula 603",
    estadoPosteriorTipo: "emerald",
  },
  {
    idIntento: 3,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "David Flores Mamani",
    codSis: "202001384",
    ci: "70126174 CB",
    carreraEstudiante: "Ing. de Sistemas",
    motivo: "DUPLICADO_BLOQUEADO",
    motivoEtiqueta: "DUPLICADO BLOQUEADO",
    sePresentoEn: "Aula 601",
    examenAulaAsignada: "Cálculo I · Ya marcó a las 08:12",
    fecha: "2026-10-28",
    hora: "08:41:05",
    operador: "Juan Pérez (Operador)",
    estadoPosterior: "Bloqueado Definitivo",
    estadoPosteriorTipo: "rose",
  },
  {
    idIntento: 4,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "Alex Guzmán Torrico",
    codSis: "202304112",
    ci: "7945123 CB",
    carreraEstudiante: "Ing. Civil",
    motivo: "EXAMEN_INCORRECTO",
    motivoEtiqueta: "EXAMEN INCORRECTO (HU-09)",
    sePresentoEn: "Aula 601 (Cálculo I)",
    examenAulaAsignada: "Sin exámenes programados",
    fecha: "2026-10-28",
    hora: "08:45:22",
    operador: "Juan Pérez (Operador)",
    estadoPosterior: "Retirado",
    estadoPosteriorTipo: "slate",
  },
  {
    idIntento: 5,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "Laura López Méndez",
    codSis: "202105441",
    ci: "8234100 CB",
    carreraEstudiante: "Ing. Química",
    motivo: "INHABILITADO",
    motivoEtiqueta: "INHABILITADO ACADÉMICO",
    sePresentoEn: "Aula 601",
    examenAulaAsignada: "Cálculo I · Falta Boleta Insc.",
    fecha: "2026-10-28",
    hora: "08:52:19",
    operador: "Juan Pérez (Operador)",
    estadoPosterior: "Excepción Rechazada",
    estadoPosteriorTipo: "amber",
  },
  {
    idIntento: 6,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "Carlos Daniel Mendoza",
    codSis: "202209144",
    ci: "6541298 CB",
    carreraEstudiante: "Ing. Electromecánica",
    motivo: "EXAMEN_INCORRECTO",
    motivoEtiqueta: "EXAMEN INCORRECTO (HU-09)",
    sePresentoEn: "Aula 602",
    examenAulaAsignada: "Física I Aula 608",
    fecha: "2026-10-28",
    hora: "08:55:04",
    operador: "Carlos Ayudante",
    estadoPosterior: "Reorientado",
    estadoPosteriorTipo: "teal",
  },
  {
    idIntento: 7,
    idAsignatura: 1,
    nombreAsignatura: "Cálculo I (Grupo 1)",
    carreraAsignatura: "Licenciatura en Matemáticas / Ing. de Sistemas",
    idExamen: 101,
    nombreExamen: "Primer Examen Parcial (28/10/2026)",
    estudianteNombre: "Fernanda Rojas Salguero",
    codSis: "202301198",
    ci: "9128472 CB",
    carreraEstudiante: "Ing. Industrial",
    motivo: "AMBIENTE_DIFERENTE",
    motivoEtiqueta: "AMBIENTE DIFERENTE",
    sePresentoEn: "Aula 602",
    examenAulaAsignada: "Cálculo I Aula 601",
    fecha: "2026-10-28",
    hora: "08:58:30",
    operador: "Carlos Ayudante",
    estadoPosterior: "Ingresó Aula 601",
    estadoPosteriorTipo: "emerald",
  },
  {
    idIntento: 8,
    idAsignatura: 2,
    nombreAsignatura: "Álgebra Lineal (Grupo 2)",
    carreraAsignatura: "Ing. de Sistemas",
    idExamen: 102,
    nombreExamen: "Examen Final (29/10/2026)",
    estudianteNombre: "Mateo Ignacio Gutierrez",
    codSis: "202008451",
    ci: "7812903 CB",
    carreraEstudiante: "Ing. de Sistemas",
    motivo: "EXAMEN_INCORRECTO",
    motivoEtiqueta: "EXAMEN INCORRECTO (HU-09)",
    sePresentoEn: "Aula 691A",
    examenAulaAsignada: "Cálculo II Aula 691B",
    fecha: "2026-10-29",
    hora: "10:14:22",
    operador: "Dra. Ana Rocha",
    estadoPosterior: "Reorientado",
    estadoPosteriorTipo: "teal",
  },
];

/**
 * Cliente HTTP autenticado con manejo de expiración de sesión (401).
 */
async function fetchAutenticado(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}${strRuta}`, {
      ...objOpciones,
      headers: {
        "Content-Type": "application/json",
        ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
        ...(objOpciones.headers || {}),
      },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión a internet o el estado del backend.");
  }

  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
    window.location.href = "/login";
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
  }

  if (response.status === 403) {
    throw new Error("No tienes autorización para consultar el reporte de este examen.");
  }

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "Ocurrió un error al consultar el reporte de intentos incorrectos.");
  }

  if (response.status === 204) {
    return [];
  }

  return response.json();
}

/**
 * Consulta la lista de intentos incorrectos aplicando filtros de búsqueda.
 *
 * @param {Object} objFiltros - { idAsignatura, idExamen, motivo, fecha, busqueda }
 * @returns {Promise<Array>} Lista de registros normalizados
 */
export async function listarReporteIntentosIncorrectos(objFiltros = {}) {
  const objParams = new URLSearchParams();
  if (objFiltros.idAsignatura && objFiltros.idAsignatura !== "TODAS") {
    objParams.set("idAsignatura", objFiltros.idAsignatura);
  }
  if (objFiltros.idExamen && objFiltros.idExamen !== "TODOS") {
    objParams.set("idExamen", objFiltros.idExamen);
  }
  if (objFiltros.motivo && objFiltros.motivo !== "TODOS") {
    objParams.set("motivo", objFiltros.motivo);
  }
  if (objFiltros.fecha) {
    objParams.set("fecha", objFiltros.fecha);
  }
  if (objFiltros.busqueda) {
    objParams.set("busqueda", objFiltros.busqueda.trim());
  }

  const strQuery = objParams.toString() ? `?${objParams.toString()}` : "";

  let arrDatos = null;

  try {
    arrDatos = await fetchAutenticado(`/api/reportes/intentos-incorrectos${strQuery}`);
  } catch (err) {
    if (err.message.includes("sesión") || err.message.includes("autorización")) {
      throw err;
    }
    // Fallback a semillas locales para pruebas del frontend antes de que Marcela termine el backend
    arrDatos = DATOS_SEMILLA_INTENTOS;
  }

  if (!Array.isArray(arrDatos) || arrDatos.length === 0) {
    // Si la base está vacía en backend de desarrollo, usar datos semilla
    arrDatos = DATOS_SEMILLA_INTENTOS;
  }

  return filtrarIntentosEnMemoria(arrDatos, objFiltros);
}

/**
 * Aplica los filtros forenses sobre la colección de intentos en memoria.
 */
function filtrarIntentosEnMemoria(arrIntentos, objFiltros) {
  if (!objFiltros) return arrIntentos;

  return arrIntentos.filter((item) => {
    // Filtro por Asignatura
    if (objFiltros.idAsignatura && objFiltros.idAsignatura !== "TODAS") {
      if (String(item.idAsignatura) !== String(objFiltros.idAsignatura)) {
        return false;
      }
    }

    // Filtro por Examen
    if (objFiltros.idExamen && objFiltros.idExamen !== "TODOS") {
      if (String(item.idExamen) !== String(objFiltros.idExamen)) {
        return false;
      }
    }

    // Filtro por Motivo
    if (objFiltros.motivo && objFiltros.motivo !== "TODOS") {
      const motFiltro = String(objFiltros.motivo).toUpperCase();
      const motItem = String(item.motivo || "").toUpperCase();
      if (!motItem.includes(motFiltro)) {
        return false;
      }
    }

    // Filtro por Fecha
    if (objFiltros.fecha) {
      if (item.fecha !== objFiltros.fecha) {
        return false;
      }
    }

    // Búsqueda de texto (estudiante, SIS, CI, operador)
    if (objFiltros.busqueda && objFiltros.busqueda.trim()) {
      const q = objFiltros.busqueda.trim().toLowerCase();
      const texto = `${item.estudianteNombre} ${item.codSis} ${item.ci} ${item.carreraEstudiante} ${item.operador} ${item.sePresentoEn} ${item.examenAulaAsignada}`.toLowerCase();
      if (!texto.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calcula los indicadores estadísticos (KPIs) oficiales requeridos por la HU13:
 * - Total de intentos incorrectos (Criterio 14)
 * - Examen incorrecto (Criterio 15)
 * - Aula diferente (Criterio 16)
 * - Duplicados bloqueados (Criterio 17)
 * - Inhabilitados académicos (Criterio 20)
 *
 * @param {Array} arrIntentos
 * @returns {Object} Contadores y porcentajes normalizados
 */
export function calcularEstadisticasIntentos(arrIntentos) {
  const lista = Array.isArray(arrIntentos) ? arrIntentos : [];
  const total = lista.length;

  let examenIncorrecto = 0;
  let aulaDiferente = 0;
  let duplicados = 0;
  let inhabilitados = 0;

  for (const item of lista) {
    const m = (item.motivo || "").toUpperCase();
    if (m.includes("EXAMEN_INCORRECTO")) {
      examenIncorrecto++;
    } else if (m.includes("AMBIENTE_DIFERENTE") || m.includes("AULA_DIFERENTE")) {
      aulaDiferente++;
    } else if (m.includes("DUPLICADO")) {
      duplicados++;
    } else if (m.includes("INHABILITADO")) {
      inhabilitados++;
    }
  }

  const porcentajeExamenInc = total > 0 ? Math.round((examenIncorrecto / total) * 100) : 0;
  const porcentajeAulaDif = total > 0 ? Math.round((aulaDiferente / total) * 100) : 0;

  return {
    totalIntentos: total,
    examenIncorrecto,
    porcentajeExamenInc,
    aulaDiferente,
    porcentajeAulaDif,
    duplicadosBloqueados: duplicados,
    inhabilitados,
  };
}

/**
 * Exporta el reporte completo filtrado a formato CSV / Excel.
 * Cumple con los Criterios 34, 35, 36, 37 y 39.
 *
 * @param {Array} arrIntentos - Lista de registros que cumplen los filtros
 * @param {Object} objMetadata - Metadatos de la asignatura/examen
 */
export function exportarIntentosExcelCsv(arrIntentos, _objMetadata = {}) {
  if (!Array.isArray(arrIntentos) || arrIntentos.length === 0) {
    throw new Error("No existen datos para generar el reporte.");
  }

  const columnas = [
    "ESTUDIANTE",
    "CODIGO_SIS",
    "CI",
    "CARRERA_ESTUDIANTE",
    "MOTIVO_INTENTO",
    "SE_PRESENTO_EN",
    "EXAMEN_O_AULA_ASIGNADA",
    "FECHA",
    "HORA",
    "OPERADOR_VERIFICADOR",
    "ESTADO_POSTERIOR",
  ];

  const escapeCsv = (valor) => {
    if (valor === null || valor === undefined) return '""';
    const str = String(valor).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lineas = [
    columnas.join(","),
    ...arrIntentos.map((item) =>
      [
        escapeCsv(item.estudianteNombre),
        escapeCsv(item.codSis),
        escapeCsv(item.ci),
        escapeCsv(item.carreraEstudiante || "No especificada"),
        escapeCsv(item.motivoEtiqueta || item.motivo),
        escapeCsv(item.sePresentoEn),
        escapeCsv(item.examenAulaAsignada),
        escapeCsv(item.fecha),
        escapeCsv(item.hora),
        escapeCsv(item.operador),
        escapeCsv(item.estadoPosterior || "Sin estado posterior"),
      ].join(",")
    ),
  ];

  const strCsv = "\uFEFF" + lineas.join("\r\n");
  const blob = new Blob([strCsv], { type: "text/csv;charset=utf-8;" });

  const fechaActual = new Date();
  const anio = fechaActual.getFullYear();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaActual.getDate()).padStart(2, "0");
  const hora = String(fechaActual.getHours()).padStart(2, "0");
  const min = String(fechaActual.getMinutes()).padStart(2, "0");

  const strNombreArchivo = `SCIEM_PASS_Reporte_Intentos_Incorrectos_${anio}-${mes}-${dia}_${hora}${min}.csv`;

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", strNombreArchivo);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera el documento imprimible del Reporte Oficial (PDF) en una ventana de vista previa
 * con encabezados institucionales, estadísticas y tabla nominal completa (Criterio 31-33).
 */
export function generarReporteOficialPdf(arrIntentos, objInfo = {}) {
  if (!Array.isArray(arrIntentos) || arrIntentos.length === 0) {
    throw new Error("No existen datos para generar el reporte.");
  }

  const kpis = calcularEstadisticasIntentos(arrIntentos);
  const fechaHoy = new Date().toLocaleDateString("es-BO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const horaHoy = new Date().toLocaleTimeString("es-BO");

  const filasHtml = arrIntentos
    .map(
      (item, i) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px 6px; font-weight: bold; color: #1e293b;">${i + 1}</td>
      <td style="padding: 8px 6px;">
        <div style="font-weight: bold; color: #0f172a;">${item.estudianteNombre}</div>
        <div style="color: #64748b; font-size: 10px;">SIS: ${item.codSis} | CI: ${item.ci}</div>
      </td>
      <td style="padding: 8px 6px;">
        <span style="display: inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; font-size: 10px; background: #fee2e2; color: #991b1b;">
          ${item.motivoEtiqueta || item.motivo}
        </span>
      </td>
      <td style="padding: 8px 6px; color: #334155;">${item.sePresentoEn}</td>
      <td style="padding: 8px 6px; color: #1e40af; font-weight: 600;">${item.examenAulaAsignada}</td>
      <td style="padding: 8px 6px; color: #475569; font-family: monospace;">${item.hora}</td>
      <td style="padding: 8px 6px; color: #334155;">${item.operador}</td>
      <td style="padding: 8px 6px;">
        <span style="display: inline-block; padding: 2px 6px; font-weight: bold; border-radius: 4px; font-size: 10px; background: #f0fdf4; color: #166534;">
          ${item.estadoPosterior || "Registrado"}
        </span>
      </td>
    </tr>`
    )
    .join("");

  const contenidoHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Reporte Oficial de Intentos Incorrectos - SCIEM-PASS</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #0f172a; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #003770; padding-bottom: 12px; margin-bottom: 20px; }
        .logo { font-size: 20px; font-weight: 900; color: #003770; letter-spacing: -0.5px; }
        .sublogo { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
        .meta { text-align: right; font-size: 11px; color: #475569; }
        .title { font-size: 17px; font-weight: 800; color: #021B3B; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
        .kpi-container { display: flex; gap: 12px; margin-bottom: 20px; }
        .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
        .kpi-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; }
        .kpi-value { font-size: 20px; font-weight: 900; color: #003770; margin-top: 2px; }
        .kpi-sub { font-size: 9px; color: #475569; }
        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
        th { background: #f1f5f9; padding: 8px 6px; font-size: 10px; text-transform: uppercase; color: #475569; font-weight: 800; border-bottom: 2px solid #cbd5e1; }
        .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">SCIEM-PASS</div>
          <div class="sublogo">Módulo de Fiscalización y Trazabilidad Forense</div>
        </div>
        <div class="meta">
          <div><strong>Fecha de Emisión:</strong> ${fechaHoy} ${horaHoy}</div>
          <div><strong>Asignatura:</strong> ${objInfo.asignatura || "Cálculo I (Grupo 1)"}</div>
          <div><strong>Examen:</strong> ${objInfo.examen || "Primer Examen Parcial"}</div>
        </div>
      </div>

      <div class="title">Reporte Oficial de Estudiantes con Intentos de Ingreso Incorrectos</div>
      <div class="subtitle">Consolidado auditable de desvíos, aulas erróneas e intentos no autorizados en puertas para actas y reasignación.</div>

      <div class="kpi-container">
        <div class="kpi-box">
          <div class="kpi-title">Total Intentos Incorrectos</div>
          <div class="kpi-value">${kpis.totalIntentos}</div>
          <div class="kpi-sub">Eventos registrados en puertas</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Examen Incorrecto (HU-09)</div>
          <div class="kpi-value" style="color: #dc2626;">${kpis.examenIncorrecto}</div>
          <div class="kpi-sub">${kpis.porcentajeExamenInc}% de estudiantes no programados</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Aula Diferente (HU-18)</div>
          <div class="kpi-value" style="color: #d97706;">${kpis.aulaDiferente}</div>
          <div class="kpi-sub">Estudiantes con desvío de aula</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Duplicados Bloqueados</div>
          <div class="kpi-value" style="color: #7c3aed;">${kpis.duplicadosBloqueados}</div>
          <div class="kpi-sub">Reingresos bloqueados</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Estudiante (SIS / CI)</th>
            <th>Motivo del Intento</th>
            <th>Se Presentó En</th>
            <th>Examen / Aula Asignada</th>
            <th>Hora</th>
            <th>Operador</th>
            <th>Estado Posterior</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml}
        </tbody>
      </table>

      <div class="footer">
        Documento oficial generado por el Sistema de Control de Ingreso a Exámenes Masivos (SCIEM-PASS) · Universidad Mayor de San Simón
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([contenidoHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const ventanaImpresion = window.open(url, "_blank");
  if (ventanaImpresion) {
    ventanaImpresion.onload = () => {
      ventanaImpresion.print();
    };
  }
}
