import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserPlus, ListChecks, ScanLine } from "lucide-react";

const ANCHO_MENU = 232;
const ALTO_MENU = 176;

function Opcion({ Icono, strTexto, strAyuda, boolDeshabilitada, onClick }) {
    return (
        <button
            type="button"
            disabled={boolDeshabilitada}
            onClick={onClick}
            className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${boolDeshabilitada
                ? "text-slate-400 cursor-not-allowed"
                : "text-[#10294D] hover:bg-[#F1F5F9] cursor-pointer"
                }`}
        >
            <Icono className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
                <span className="block text-[12.5px] font-bold leading-tight">{textoInterfaz(strTexto)}</span>
                {strAyuda && <span className="block text-[10.5px] text-slate-400 mt-0.5">{strAyuda}</span>}
            </span>
        </button>
    );
}

/**
 * Botón "Ingreso ▾" de cada fila de Gestión de Exámenes.
 * El menú usa posición fija para que no lo corte el scroll horizontal de la tabla.
 */
export default function MenuIngresoExamen({
    boolSoloLectura = false,
    boolFinalizado = false,
    boolControlDisponible = true,
    strDisponibleDesde = "",
    onAsignar,
    onVerLista,
    onAbrirControl,
}) {
    const [boolAbierto, setBoolAbierto] = useState(false);
    const [objPos, setObjPos] = useState({ top: 0, left: 0 });
    const refBoton = useRef(null);
    const refMenu = useRef(null);

    function alternar() {
        if (!boolAbierto && refBoton.current) {
            const r = refBoton.current.getBoundingClientRect();
            const boolArriba = r.bottom + ALTO_MENU + 12 > window.innerHeight;
            setObjPos({
                top: boolArriba ? r.top - ALTO_MENU - 6 : r.bottom + 6,
                left: Math.max(8, r.right - ANCHO_MENU),
            });
        }
        setBoolAbierto((v) => !v);
    }

    useEffect(() => {
        if (!boolAbierto) return undefined;
        const fnCerrarFuera = (e) => {
            if (refMenu.current?.contains(e.target) || refBoton.current?.contains(e.target)) return;
            setBoolAbierto(false);
        };
        const fnCerrar = () => setBoolAbierto(false);
        const fnTecla = (e) => { if (e.key === "Escape") setBoolAbierto(false); };
        document.addEventListener("mousedown", fnCerrarFuera);
        document.addEventListener("keydown", fnTecla);
        window.addEventListener("scroll", fnCerrar, true);
        window.addEventListener("resize", fnCerrar);
        return () => {
            document.removeEventListener("mousedown", fnCerrarFuera);
            document.removeEventListener("keydown", fnTecla);
            window.removeEventListener("scroll", fnCerrar, true);
            window.removeEventListener("resize", fnCerrar);
        };
    }, [boolAbierto]);

    function elegir(fn) {
        setBoolAbierto(false);
        if (fn) fn();
    }

    return (
        <>
            <button
                ref={refBoton}
                type="button"
                onClick={alternar}
                aria-haspopup="menu"
                aria-expanded={boolAbierto}
                className="inline-flex items-center gap-1.5 h-[32px] px-3.5 rounded-lg bg-[#003770] hover:bg-[#002a55] text-white text-[12px] font-bold cursor-pointer transition"
            >
                Ingreso
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${boolAbierto ? "rotate-180" : ""}`} />
            </button>

            {boolAbierto && (
                <div
                    ref={refMenu}
                    role="menu"
                    style={{ position: "fixed", top: objPos.top, left: objPos.left, width: ANCHO_MENU }}
                    className="z-50 bg-white border border-[#D5DEEC] rounded-xl shadow-[0_12px_30px_rgba(0,30,80,0.18)] p-1.5"
                >
                    <Opcion
                        Icono={UserPlus}
                        strTexto={boolSoloLectura ? "Ver ayudantes" : "Asignar ayudantes"}
                        onClick={() => elegir(onAsignar)}
                    />
                    <Opcion
                        Icono={ListChecks}
                        strTexto="Ver ingresos"
                        onClick={() => elegir(onVerLista)}
                    />
                    <div className="my-1 mx-2 border-t border-slate-100" />
                    <Opcion
                        Icono={ScanLine}
                        strTexto={boolFinalizado ? "Ver registro de ingreso" : "Registrar ingreso"}
                        strAyuda={!boolControlDisponible && strDisponibleDesde ? `Registro desde las ${strDisponibleDesde}` : ""}
                        boolDeshabilitada={!boolControlDisponible}
                        onClick={() => elegir(onAbrirControl)}
                    />
                </div>
            )}
        </>
    );
}
