import React from "react";
import { Users, UserCheck, Clock, Ban, MapPinOff, AlertOctagon, UserPlus, AlertTriangle } from "lucide-react";

function Kpi({ Icono, titulo, valor, detalle, tono = "navy", children }) {
    const colores = {
        navy: "text-[#003770]",
        verde: "text-emerald-700",
        ambar: "text-amber-700",
        rojo: "text-rose-700",
    };
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                <Icono className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{titulo}</span>
            </div>
            <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${colores[tono]}`}>{valor}</span>
            {children}
            {detalle && <span className="text-[11px] font-semibold text-slate-500">{detalle}</span>}
        </div>
    );
}

/** Indicadores de arriba del dashboard (HU10). Todo viene del tablero del backend. */
export default function TarjetasMetricas({ metricas, intAulas, intAlertasAulaCruzada, incidencias }) {
    const m = metricas;
    const intAvance = Math.min(100, Math.max(0, Number(m.porcentajeAvance) || 0));
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi Icono={Users} titulo="Habilitados" valor={m.habilitados} detalle={`${intAulas} aula(s) asignada(s)`} />
            <Kpi
                Icono={UserCheck}
                titulo="Ingresados"
                valor={m.ingresados}
                tono="verde"
                detalle={`${intAvance} % de los habilitados`}
            >
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={intAvance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de ingreso">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${intAvance}%` }} />
                </div>
            </Kpi>
            <Kpi Icono={UserPlus} titulo="Excepcionales" valor={m.excepcionales} tono={m.excepcionales > 0 ? "ambar" : "navy"} detalle="Incluidos en ingresados" />
            <Kpi Icono={Clock} titulo="Pendientes" valor={m.pendientes} tono="ambar" detalle="Habilitados que aún no ingresan" />
            <Kpi
                Icono={Ban}
                titulo="Duplicados bloqueados"
                valor={m.duplicadosBloqueados}
                tono={m.duplicadosBloqueados > 0 ? "rojo" : "navy"}
                detalle="Intentos de reingreso denegados"
            />
            <Kpi
                Icono={MapPinOff}
                titulo="Aulas cruzadas"
                valor={intAlertasAulaCruzada}
                tono={intAlertasAulaCruzada > 0 ? "rojo" : "navy"}
                detalle="Estudiantes en un aula que no es la suya"
            />
            <Kpi
                Icono={AlertTriangle}
                titulo="Incidencias abiertas"
                valor={incidencias ? incidencias.abiertas : "—"}
                tono={incidencias?.altas > 0 ? "rojo" : incidencias?.abiertas > 0 ? "ambar" : "navy"}
                detalle={!incidencias ? "Cargando..." : incidencias.altas > 0 ? `${incidencias.altas} de severidad alta` : "Ninguna de severidad alta"}
            />
            <Kpi
                Icono={AlertOctagon}
                titulo="Aulas fuera de límite"
                valor={m.aulasFueraDeLimite}
                tono={m.aulasFueraDeLimite > 0 ? "rojo" : "navy"}
                detalle="Pasaron su capacidad"
            />
        </div>
    );
}