import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { obtenerAsignacionIngreso } from "../../../services/asignacionOperadoresService";
import {
    ESTILOS_ESTADO,
    fechaLarga,
    rangoHorario,
    nombreGrupo,
} from "../utilidadesExamenAdmin";

function formatearFechaRegistro(strFechaIso) {
    const m = String(strFechaIso || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

function Tarjeta({ strTitulo, children }) {
    return (
        <section className="border border-[#E3EAF5] bg-[#F9FBFE] rounded-2xl px-4 py-3 mt-2.5">
            <h4 className="text-[11px] font-bold tracking-[0.7px] uppercase text-[#003770] mb-2">{strTitulo}</h4>
            {children}
        </section>
    );
}

function Campo({ strEtiqueta, children }) {
    return (
        <div className="min-w-0">
            <p className="text-[11.5px] font-bold text-slate-400 mb-0.5">{strEtiqueta}</p>
            <div className="text-[13.5px] text-[#10294D]">{children}</div>
        </div>
    );
}

function DosColumnas({ izquierda, derecha }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] gap-x-4 gap-y-3">
            {izquierda}
            <div className="hidden sm:block bg-[#E3EAF5]" />
            {derecha}
        </div>
    );
}

function ListaNormas({ arrNormas }) {
    if (!arrNormas || arrNormas.length === 0) {
        return <span className="text-slate-400">Ninguna</span>;
    }
    return (
        <ul className="space-y-1">
            {arrNormas.map((n, i) => (
                <li key={n.idNormaGeneral ?? n.idNormaEspecifica ?? i} className="flex gap-2 text-[13px]">
                    <span className="text-[#2B6CB0] shrink-0">•</span>
                    {n.descripcionNorma}
                </li>
            ))}
        </ul>
    );
}

/**
 * Resumen de solo lectura de un examen (el "ojito" de Gestión de Exámenes).
 * No tiene acciones: las acciones de ingreso están en el botón "Ingreso" de la tabla.
 */
export default function DetalleExamenAdmin({
    examen,
    strTipo,
    strDocente,
    strEstado,
    arrNormasParticulares = [],
    onCerrar,
}) {
    const [strOperadores, setStrOperadores] = useState("Cargando…");

    useEffect(() => {
        let boolVivo = true;
        obtenerAsignacionIngreso(examen.idExamen)
            .then((asig) => {
                if (!boolVivo) return;
                const arrNombres = [
                    ...new Set(
                        (asig?.responsables || [])
                            .filter((r) => r.rol !== "DOCENTE")
                            .map((r) => r.nombreResponsable)
                            .filter(Boolean)
                    ),
                ];
                setStrOperadores(arrNombres.length ? arrNombres.join(", ") : "Aún sin ayudantes");
            })
            .catch(() => boolVivo && setStrOperadores("Aún sin ayudantes"));
        return () => { boolVivo = false; };
    }, [examen.idExamen]);

    const estilo = ESTILOS_ESTADO[strEstado] || ESTILOS_ESTADO.PROXIMO;
    const strGrupo = nombreGrupo(examen);
    const arrAmbientes = Array.isArray(examen.ambientes) ? examen.ambientes : [];
    const strHorario = rangoHorario(examen);

    return (
        <div className="p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-[19px] font-bold text-[#0B3A73] flex items-center flex-wrap gap-2">
                        {examen.nombreAsignatura || `Asignatura #${examen.idAsignatura}`}
                        {strGrupo && (
                            <span className="bg-[#E8F0FB] text-[#003770] border border-[#BFD3F2] rounded-full text-[11px] font-bold px-2.5 py-px">
                                {strGrupo}
                            </span>
                        )}
                    </h3>
                    <p className="text-[13px] text-slate-500 mt-0.5">{strTipo || "-"}</p>
                </div>
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                    className="text-slate-400 hover:text-[#003770] cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className={`inline-block rounded-full border text-[11.5px] font-bold px-3 py-0.5 ${estilo.clase}`}>
                    {estilo.texto}
                </span>
                <span className="text-[12.5px] text-slate-500">
                    {fechaLarga(examen)}{strHorario ? ` · ${strHorario}` : ""}
                </span>
            </div>

            {strEstado === "CANCELADO" && (
                <div className="mt-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
                    <p className="text-[10.5px] font-extrabold tracking-wider text-[#B91C1C]">MOTIVO DE LA CANCELACIÓN</p>
                    <p className="text-[13px] text-[#7F1D1D] mt-1 break-words">{examen.motivoCancelacion || "Sin motivo registrado"}</p>
                </div>
            )}

            <Tarjeta strTitulo="Examen">
                <DosColumnas
                    izquierda={<Campo strEtiqueta="Docente">{strDocente}</Campo>}
                    derecha={
                        <Campo strEtiqueta="Aulas">
                            {arrAmbientes.length === 0 ? (
                                <span className="text-slate-400">Sin aula registrada</span>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {arrAmbientes.map((a) => (
                                        <span
                                            key={a.idAmbiente}
                                            className="bg-white border border-[#D5DEEC] rounded-lg px-2.5 py-0.5 text-[12.5px] font-bold"
                                        >
                                            {a.nombreAmbiente}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Campo>
                    }
                />
            </Tarjeta>

            <Tarjeta strTitulo="Ingreso">
                <Campo strEtiqueta="Ayudantes">
                    <span className={strOperadores === "Aún sin ayudantes" || strOperadores === "Cargando…" ? "text-slate-500" : ""}>
                        {strOperadores}
                    </span>
                </Campo>
            </Tarjeta>

            <Tarjeta strTitulo="Normas">
                <DosColumnas
                    izquierda={
                        <Campo strEtiqueta="Generales">
                            <ListaNormas arrNormas={examen.normasGenerales} />
                        </Campo>
                    }
                    derecha={
                        <Campo strEtiqueta="Particulares">
                            <ListaNormas arrNormas={arrNormasParticulares} />
                        </Campo>
                    }
                />
            </Tarjeta>

            <Tarjeta strTitulo="Registro">
                <Campo strEtiqueta="Registrado el">{formatearFechaRegistro(examen.fechaCreacionExamen)}</Campo>
            </Tarjeta>
        </div>
    );
}
