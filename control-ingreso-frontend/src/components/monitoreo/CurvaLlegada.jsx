import React, { useMemo, useState } from "react";
import { horaCorta } from "./utilidadesMonitoreo";

const ANCHO = 640;
const ALTO = 210;
const M = { izq: 34, der: 8, arr: 14, abajo: 26 };
const COLOR_BARRA = "#2563EB";

function maximoLimpio(intMax) {
    if (intMax <= 4) return 4;
    const dblCrudo = intMax / 4;
    const dblEscala = Math.pow(10, Math.floor(Math.log10(dblCrudo)));
    const dblPaso = [1, 2, 2.5, 5, 10].find((f) => f * dblEscala >= dblCrudo) * dblEscala;
    return dblPaso * 4; // 4 divisiones con números redondos
}

/**
 * Curva de llegada: ingresos cada 5 minutos (una sola serie → sin leyenda).
 * Barras finas con extremo redondeado, grilla discreta, tooltip al pasar el cursor,
 * marca de «Inicio HH:MM» y vista de tabla para lectores de pantalla.
 *   estado: "cargando" | "ok" | "noDisponible" | "error"
 */
export default function CurvaLlegada({ estado, datos, strHoraInicio, boolEnCurso }) {
    const [intHover, setIntHover] = useState(null);
    const [boolTabla, setBoolTabla] = useState(false);

    const g = useMemo(() => {
        const intMaxDato = Math.max(0, ...datos.map((d) => d.cantidad));
        const intMax = maximoLimpio(intMaxDato);
        const w = ANCHO - M.izq - M.der;
        const h = ALTO - M.arr - M.abajo;
        const banda = datos.length ? w / datos.length : w;
        const anchoBarra = Math.max(3, Math.min(22, banda - 2)); // 2 px de aire entre barras
        const xCentro = (i) => M.izq + banda * i + banda / 2;
        const y = (v) => M.arr + h - (v / intMax) * h;
        const intInicio = strHoraInicio ? datos.findIndex((d) => d.etiqueta >= horaCorta(strHoraInicio)) : -1;
        const intCadaN = Math.max(1, Math.ceil(datos.length / 8));
        return { intMax, h, banda, anchoBarra, xCentro, y, intInicio, intCadaN, ticks: [0, 1, 2, 3, 4].map((k) => (intMax / 4) * k) };
    }, [datos, strHoraInicio]);

    const intTotal = datos.reduce((s, d) => s + d.cantidad, 0);

    return (
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0" aria-label="Curva de llegada">
            <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                    <h4 className="text-sm font-black text-[#003770]">Curva de llegada</h4>
                    <p className="text-[11px] font-semibold text-slate-500">Ingresos cada 5 minutos{estado === "ok" && datos.length > 0 ? ` · ${intTotal} en total` : ""}</p>
                </div>
                {estado === "ok" && datos.length > 0 && (
                    <button type="button" onClick={() => setBoolTabla((v) => !v)} className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer">
                        {boolTabla ? "Ver gráfico" : "Ver como tabla"}
                    </button>
                )}
            </div>

            {estado === "cargando" && <p className="text-xs text-slate-400 font-semibold py-10 text-center animate-pulse">Cargando la curva de llegada...</p>}
            {estado === "noDisponible" && (
                <p className="text-xs text-slate-500 font-semibold py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 px-4">
                    La curva de llegada se activará cuando el backend publique el endpoint de llegadas.
                </p>
            )}
            {estado === "error" && <p className="text-xs text-rose-700 font-bold py-8 text-center">✕ No se pudo cargar la curva de llegada. Se reintenta sola.</p>}
            {estado === "ok" && datos.length === 0 && <p className="text-xs text-slate-400 font-semibold py-8 text-center">Todavía no hay ingresos registrados.</p>}

            {estado === "ok" && datos.length > 0 && boolTabla && (
                <div className="max-h-56 overflow-y-auto pr-4 [scrollbar-gutter:stable]">

                    <table className="w-full text-xs">
                        <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3 font-bold">Hora</th><th className="py-1 pr-3 font-bold text-right">Ingresos</th></tr></thead>

                        <tbody>
                            {datos.map((d) => (
                                <tr key={d.etiqueta} className="border-t border-slate-100"><td className="py-1 pr-3 tabular-nums">{d.etiqueta}</td><td className="py-1 pr-3 text-right tabular-nums font-bold">{d.cantidad}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {estado === "ok" && datos.length > 0 && !boolTabla && (
                <div className="relative">
                    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto" role="img" aria-label={`Ingresos cada 5 minutos, ${intTotal} en total. Use la vista de tabla para ver cada valor.`}>
                        {g.ticks.map((t) => (
                            <g key={t}>
                                <line x1={M.izq} x2={ANCHO - M.der} y1={g.y(t)} y2={g.y(t)} stroke="#E2E8F0" strokeWidth="1" />
                                <text x={M.izq - 6} y={g.y(t) + 3} textAnchor="end" fontSize="10" fill="#64748B">{Math.round(t)}</text>
                            </g>
                        ))}
                        {datos.map((d, i) => {
                            const boolActual = boolEnCurso && i === datos.length - 1;
                            const yTop = g.y(d.cantidad);
                            const hBarra = Math.max(0, M.arr + g.h - yTop);
                            return (
                                <g key={`${d.etiqueta}-${i}`}>
                                    {hBarra > 0 && (
                                        <path
                                            d={`M${g.xCentro(i) - g.anchoBarra / 2},${M.arr + g.h} V${yTop + 4} Q${g.xCentro(i) - g.anchoBarra / 2},${yTop} ${g.xCentro(i) - g.anchoBarra / 2 + Math.min(4, g.anchoBarra / 2)},${yTop} H${g.xCentro(i) + g.anchoBarra / 2 - Math.min(4, g.anchoBarra / 2)} Q${g.xCentro(i) + g.anchoBarra / 2},${yTop} ${g.xCentro(i) + g.anchoBarra / 2},${yTop + 4} V${M.arr + g.h} Z`}
                                            fill={COLOR_BARRA}
                                            opacity={boolActual ? 0.55 : intHover === i ? 1 : 0.9}
                                        />
                                    )}
                                    {i % g.intCadaN === 0 && (
                                        <text x={g.xCentro(i)} y={ALTO - 8} textAnchor="middle" fontSize="10" fill="#64748B">{d.etiqueta}</text>
                                    )}
                                    <rect
                                        x={M.izq + g.banda * i} y={M.arr} width={g.banda} height={g.h} fill="transparent"
                                        onPointerEnter={() => setIntHover(i)} onPointerLeave={() => setIntHover(null)}
                                    />
                                </g>
                            );
                        })}
                        {g.intInicio >= 0 && (
                            <g>
                                <line x1={g.xCentro(g.intInicio) - g.banda / 2} x2={g.xCentro(g.intInicio) - g.banda / 2} y1={M.arr} y2={M.arr + g.h} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                                <text x={g.xCentro(g.intInicio) - g.banda / 2 + 4} y={M.arr + 9} fontSize="10" fontWeight="700" fill="#475569">Inicio {horaCorta(strHoraInicio)}</text>
                            </g>
                        )}
                        {boolEnCurso && (
                            <text x={g.xCentro(datos.length - 1)} y={g.y(datos[datos.length - 1].cantidad) - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#2563EB">en curso</text>
                        )}
                    </svg>
                    {intHover != null && datos[intHover] && (
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
                            style={{ left: `${(g.xCentro(intHover) / ANCHO) * 100}%`, top: 0 }}
                            role="tooltip"
                        >
                            {datos[intHover].etiqueta} · {datos[intHover].cantidad} ingreso(s)
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}