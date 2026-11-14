import { useEffect, useRef, useState } from "react";
import { MoreVertical, UserPlus, ListChecks, ScanLine, Eye, Pencil, Ban } from "lucide-react";

const ANCHO_MENU = 236;

function Opcion({ Icono, strTexto, strAyuda, boolDeshabilitada, boolPeligro, onClick }) {
    return (
        <button
            type="button"
            role="menuitem"
            disabled={boolDeshabilitada}
            onClick={onClick}
            className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition ${boolDeshabilitada
                ? "text-slate-400 cursor-not-allowed"
                : boolPeligro
                    ? "text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                    : "text-[#10294D] hover:bg-[#F1F5F9] cursor-pointer"
                }`}
        >
            <Icono className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
                <span className="block text-[12.5px] font-bold leading-tight">{strTexto}</span>
                {strAyuda && <span className="block text-[10.5px] text-slate-400 mt-0.5">{strAyuda}</span>}
            </span>
        </button>
    );
}

function Titulo({ children }) {
    return <p className="px-3 pt-2 pb-0.5 text-[9.5px] font-extrabold tracking-wider text-slate-400">{children}</p>;
}

/**
 * Menú ⋮ de cada fila de Gestión de Exámenes.
 * Primero lo de ingreso (lo más usado) y al final lo del examen, con "Cancelar examen" en rojo.
 * El menú usa posición fija para que no lo corte el scroll horizontal de la tabla.
 */
export default function MenuAccionesExamen({
    boolSoloLectura = false,
    boolFinalizado = false,
    boolControlDisponible = true,
    strDisponibleDesde = "",
    boolPuedeCancelar = false,
    onAsignar,
    onVerLista,
    onAbrirControl,
    onVerDetalle,
    onEditar,
    onCancelar,
}) {
    const [boolAbierto, setBoolAbierto] = useState(false);
    const [objPos, setObjPos] = useState({ top: 0, left: 0 });
    const refBoton = useRef(null);
    const refMenu = useRef(null);
    const intAltoMenu = boolPuedeCancelar ? 320 : 280;

    function alternar() {
        if (!boolAbierto && refBoton.current) {
            const r = refBoton.current.getBoundingClientRect();
            const boolArriba = r.bottom + intAltoMenu + 12 > window.innerHeight;
            setObjPos({
                top: boolArriba ? Math.max(8, r.top - intAltoMenu - 6) : r.bottom + 6,
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
                aria-label="Opciones del examen"
                title="Opciones"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${boolAbierto
                    ? "bg-[#EEF2F7] text-[#003770]"
                    : "text-[#475569] hover:bg-[#EEF2F7] hover:text-[#003770]"
                    }`}
            >
                <MoreVertical className="w-[18px] h-[18px]" />
            </button>

            {boolAbierto && (
                <div
                    ref={refMenu}
                    role="menu"
                    style={{ position: "fixed", top: objPos.top, left: objPos.left, width: ANCHO_MENU }}
                    className="z-50 bg-white border border-[#D5DEEC] rounded-xl shadow-[0_12px_30px_rgba(0,30,80,0.18)] p-1.5"
                >
                    <Titulo>INGRESO</Titulo>
                    <Opcion
                        Icono={UserPlus}
                        strTexto={boolSoloLectura ? "Ver ayudantes" : "Asignar ayudantes"}
                        onClick={() => elegir(onAsignar)}
                    />
                    <Opcion
                        Icono={ScanLine}
                        strTexto={boolFinalizado ? "Ver registro de ingreso" : "Registrar ingreso"}
                        strAyuda={!boolControlDisponible && strDisponibleDesde ? `Registro desde las ${strDisponibleDesde}` : ""}
                        boolDeshabilitada={!boolControlDisponible}
                        onClick={() => elegir(onAbrirControl)}
                    />
                    <Opcion
                        Icono={ListChecks}
                        strTexto="Ver ingresos"
                        onClick={() => elegir(onVerLista)}
                    />

                    <div className="my-1 mx-2 border-t border-slate-100" />
                    <Titulo>EXAMEN</Titulo>
                    <Opcion Icono={Eye} strTexto="Ver detalle" onClick={() => elegir(onVerDetalle)} />
                    <Opcion Icono={Pencil} strTexto="Editar" onClick={() => elegir(onEditar)} />
                    {boolPuedeCancelar && (
                        <Opcion Icono={Ban} strTexto="Cancelar examen" boolPeligro onClick={() => elegir(onCancelar)} />
                    )}
                </div>
            )}
        </>
    );
}
