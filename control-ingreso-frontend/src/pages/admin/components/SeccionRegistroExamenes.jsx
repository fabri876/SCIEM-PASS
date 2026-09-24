import { useState, useEffect } from "react";
import {
    obtenerExamenes,
    obtenerTiposExamen,
} from "../../../services/examenService";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import ExamenFormAdmin from "./ExamenFormAdmin";

function IconoMas() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
    );
}

function IconoOjo() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function IconoLapiz() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
    );
}

const COLORES_TIPO = {
    "Primer parcial": { fondo: "#E7EEFC", texto: "#2B6CB0" },
    "Segundo parcial": { fondo: "#E7EEFC", texto: "#2B6CB0" },
    Final: { fondo: "#FBE7EA", texto: "#C0273D" },
    Práctico: { fondo: "#FDEFE0", texto: "#B4650C" },
};

function colorTipo(strTipo) {
    return COLORES_TIPO[strTipo] || { fondo: "#EEF1F8", texto: "#5E6B8A" };
}

function formatearFecha(strFechaIso) {
    if (!strFechaIso) return "-";
    const [anio, mes, dia] = strFechaIso.split("-");
    return `${dia}/${mes}/${anio}`;
}

function formatearDuracion(strDuracion) {
    // duracionExamen llega como "HH:mm:ss" (LocalTime)
    if (!strDuracion) return "-";
    const [hh, mm] = strDuracion.split(":");
    const partes = [];
    if (parseInt(hh, 10) > 0) partes.push(`${parseInt(hh, 10)}h`);
    if (parseInt(mm, 10) > 0) partes.push(`${parseInt(mm, 10)}min`);
    return partes.length > 0 ? partes.join(" ") : "-";
}

function EtiquetaPendiente({ texto = "Próximamente" }) {
    return (
        <span className="inline-block text-[11.5px] font-semibold px-2.5 py-1 rounded-md bg-[#F4F1E4] text-[#9A7A16] border border-dashed border-[#D8C583]">
            {texto}
        </span>
    );
}

export default function SeccionRegistroExamenes() {
    const [arrExamenes, setArrExamenes] = useState([]);
    const [mapTiposExamen, setMapTiposExamen] = useState({});
    const [boolCargando, setBoolCargando] = useState(true);
    const [boolModalAbierto, setBoolModalAbierto] = useState(false);

    function cargarTodo() {
        setBoolCargando(true);

        Promise.all([obtenerExamenes(), obtenerTiposExamen()])
            .then(([examenes, tipos]) => {
                setArrExamenes(examenes || []);

                const objMapTipo = {};
                (tipos || []).forEach((t) => {
                    objMapTipo[t.idTipoExamen] = t.nombreTipoExamen;
                });
                setMapTiposExamen(objMapTipo);
            })
            .catch(() => {
                setArrExamenes([]);
            })
            .finally(() => setBoolCargando(false));
    }

    useEffect(() => {
        cargarTodo();
    }, []);

    function handleCerrarModal() {
        setBoolModalAbierto(false);
        cargarTodo();
    }

    function handleEditar() {
        alert("La edición de exámenes estará disponible próximamente.");
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-[17px] font-bold text-[#163F79]">Exámenes registrados</h2>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                        {arrExamenes.length} examen{arrExamenes.length === 1 ? "" : "es"} en el periodo actual
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setBoolModalAbierto(true)}
                    className="flex items-center gap-2 h-[42px] px-5 rounded-md bg-[#163F79] text-white font-semibold text-[13.5px]"
                >
                    <IconoMas />
                    Registrar examen
                </button>
            </div>

            {boolCargando && (
                <p className="text-[13px] text-gray-500 py-6 text-center">Cargando exámenes…</p>
            )}

            {!boolCargando && arrExamenes.length === 0 && (
                <p className="text-[13px] text-gray-500 py-6 text-center">
                    Todavía no hay exámenes registrados.
                </p>
            )}

            {!boolCargando && arrExamenes.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wide">
                                <th className="pb-3 pr-3">Asignatura</th>
                                <th className="pb-3 pr-3">Tipo</th>
                                <th className="pb-3 pr-3">Fecha</th>
                                <th className="pb-3 pr-3">Duración</th>
                                <th className="pb-3 pr-3">Docente / Aula / Hora</th>
                                <th className="pb-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {arrExamenes.map((ex) => {
                                const strNombreTipo =
                                    mapTiposExamen[ex.idTipoExamen] || ex.detalleTipoExamen || "-";
                                const objColor = colorTipo(strNombreTipo);
                                return (
                                    <tr key={ex.idExamen} className="border-t border-[#EEF1F8] text-[13.5px] text-[#22304F]">
                                        <td className="py-3.5 pr-3 font-semibold">
                                            Asignatura #{ex.idAsignatura}
                                        </td>
                                        <td className="py-3.5 pr-3">
                                            <span
                                                className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                                                style={{ background: objColor.fondo, color: objColor.texto }}
                                            >
                                                {strNombreTipo}
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-3">{formatearFecha(ex.fechaExamen)}</td>
                                        <td className="py-3.5 pr-3">{formatearDuracion(ex.duracionExamen)}</td>
                                        <td className="py-3.5 pr-3">
                                            <EtiquetaPendiente />
                                        </td>
                                        <td className="py-3.5">
                                            <div className="flex items-center gap-3.5">
                                                <button type="button" title="Ver detalles" className="text-[#5E71A0] hover:text-[#163F79]">
                                                    <IconoOjo />
                                                </button>
                                                <button type="button" title="Editar" onClick={handleEditar} className="text-[#5E71A0] hover:text-[#163F79]">
                                                    <IconoLapiz />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <VentanaEmergente boolAbierto={boolModalAbierto} onCerrar={handleCerrarModal}>
                <ExamenFormAdmin onCancelar={handleCerrarModal} />
            </VentanaEmergente>
        </div>
    );
}