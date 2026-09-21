import React, { useState, useRef, useEffect } from "react";
import CambiarContrasenaModal from "./CambiarContrasenaModal";

/**
 * Menú de cuenta compartido por los 4 paneles (admin, docente, ayudante,
 * estudiante): al hacer clic en el avatar/nombre se abre un panel chico
 * (nombre + correo arriba, "Cambiar contraseña" y "Cerrar sesión" abajo),
 * en vez de tener esos botones sueltos en el header. Incluye el modal de
 * cambiar contraseña, así cada panel solo necesita renderizar este único
 * componente.
 */
export default function UserAccountMenu({ usuario, onCerrarSesion, strClaseAvatar = "bg-primary-navy" }) {
  const [boolMenuAbierto, setBoolMenuAbierto] = useState(false);
  const [boolModalContrasenaAbierto, setBoolModalContrasenaAbierto] = useState(false);
  const refMenu = useRef(null);

  useEffect(() => {
    if (!boolMenuAbierto) return;
    const fnClickFuera = (e) => {
      if (refMenu.current && !refMenu.current.contains(e.target)) {
        setBoolMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", fnClickFuera);
    return () => document.removeEventListener("mousedown", fnClickFuera);
  }, [boolMenuAbierto]);

  const strNombre = usuario?.nombre || "Usuario";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

  return (
    <div className="relative" ref={refMenu}>
      <button
        onClick={() => setBoolMenuAbierto((prev) => !prev)}
        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-full ${strClaseAvatar} text-white font-bold text-sm flex items-center justify-center shadow shrink-0`}>
          {strIniciales}
        </div>
        <div className="flex flex-col text-left hidden sm:flex">
          <span className="text-xs font-bold text-slate-800 leading-tight whitespace-nowrap">
            {strNombre} {strApellido}
          </span>
          <span className="text-[11px] text-primary-blue font-semibold leading-tight whitespace-nowrap">
            {usuario?.rol || ""}
          </span>
        </div>
        <svg className="w-3.5 h-3.5 text-slate-400 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {boolMenuAbierto && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="font-bold text-sm text-slate-800 truncate">{strNombre} {strApellido}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{usuario?.correo || ""}</p>
          </div>

          <button
            onClick={() => {
              setBoolMenuAbierto(false);
              setBoolModalContrasenaAbierto(true);
            }}
            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cambiar contraseña
          </button>

          <div className="border-t border-slate-100">
            <button
              onClick={onCerrarSesion}
              className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <CambiarContrasenaModal
        boolAbierto={boolModalContrasenaAbierto}
        onCerrar={() => setBoolModalContrasenaAbierto(false)}
      />
    </div>
  );
}
