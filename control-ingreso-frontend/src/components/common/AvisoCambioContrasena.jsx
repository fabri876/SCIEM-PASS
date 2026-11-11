import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Ventana de aviso de primer ingreso: obliga a cambiar la contraseña por
 * defecto (el CI). No se cierra con Esc ni con clic afuera; solo se sale
 * cambiando la contraseña o cerrando sesión.
 */
export default function AvisoCambioContrasena({ boolAbierto, onCambiar, onCerrarSesion }) {
    const refBotonCambiar = useRef(null);

    useEffect(() => {
        if (!boolAbierto) return;
        const strOverflowPrevio = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        refBotonCambiar.current?.focus();
        return () => {
            document.body.style.overflow = strOverflowPrevio;
        };
    }, [boolAbierto]);

    if (!boolAbierto) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="titulo-aviso-contrasena"
                aria-describedby="texto-aviso-contrasena"
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current stroke-[1.8]" aria-hidden="true">
                        <rect x="5" y="10" width="14" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                </div>

                <h2 id="titulo-aviso-contrasena" className="text-center text-lg font-black text-[#1A365D]">
                    Cambia tu contraseña ahora
                </h2>
                <p id="texto-aviso-contrasena" className="mt-2 text-center text-sm font-medium text-slate-600">
                    Estás usando una contraseña temporal (tu Carnet de Identidad). Por la seguridad de tu cuenta
                    debes cambiarla por una nueva y segura antes de continuar.
                </p>
                <p className="mt-2 text-center text-xs font-medium text-slate-500">
                    Usa mayúsculas, minúsculas, números y símbolos hasta llegar al nivel 8.
                </p>

                <button
                    ref={refBotonCambiar}
                    type="button"
                    onClick={onCambiar}
                    className="mt-5 w-full rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-blue-700"
                >
                    Cambiar contraseña
                </button>
                <button
                    type="button"
                    onClick={onCerrarSesion}
                    className="mt-2 w-full rounded-xl px-5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
                >
                    Cerrar sesión
                </button>
            </div>
        </div>,
        document.body
    );
}