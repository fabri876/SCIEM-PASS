import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import VentanaEmergente from "./VentanaEmergente";
import CambiarContrasenaModal from "./CambiarContrasenaModal";
import AvisoCambioContrasena from "./AvisoCambioContrasena";
import { fnDebeCambiarContrasena, fnLimpiarPrimerIngreso } from "../../utils/primerIngreso";

/**
 * Menú de cuenta compartido por los 4 paneles (admin, docente, ayudante,
 * estudiante): al hacer clic en el avatar/nombre se abre un panel chico
 * (nombre + correo arriba, "Cambiar contraseña" y "Cerrar sesión" abajo),
 * en vez de tener esos botones sueltos en el header. Incluye el modal de
 * cambiar contraseña, así cada panel solo necesita renderizar este único
 * componente.
 *
 * También monta el aviso de primer ingreso: si el login dejó la marca de
 * "debe cambiar contraseña", se muestra una ventana obligatoria al abrir
 * el panel hasta que el usuario cambie su contraseña o cierre sesión.
 */
export default function UserAccountMenu({ usuario, onCerrarSesion, strClaseAvatar = "bg-primary-navy" }) {
  const [boolMenuAbierto, setBoolMenuAbierto] = useState(false);
  const [boolModalContrasenaAbierto, setBoolModalContrasenaAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [boolAvisoPendiente, setBoolAvisoPendiente] = useState(() => fnDebeCambiarContrasena());
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

  const fnContrasenaCambiada = () => {
    fnLimpiarPrimerIngreso();
    setBoolAvisoPendiente(false);
  };

  const strNombre = usuario?.nombre || "Usuario";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

  return (
    <div className="relative min-w-0 w-full md:w-auto" ref={refMenu}>
      <button
        onClick={() => setBoolMenuAbierto((prev) => !prev)}
        aria-label="Abrir menú de cuenta" aria-expanded={boolMenuAbierto}
        className="flex max-w-full items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-full ${strClaseAvatar} text-white font-bold text-sm flex items-center justify-center shadow shrink-0`}>
          {strIniciales}
        </div>
        <div className="min-w-0 max-w-40 lg:max-w-48 flex flex-col text-left">
          <span className="text-xs font-bold text-slate-800 leading-tight truncate">
            {strNombre} {strApellido}
          </span>
          <span className="text-[11px] text-primary-blue font-semibold leading-tight truncate">
            {usuario?.rol === "OPERADOR" ? "AYUDANTE" : (usuario?.rol || "")}
          </span>
        </div>
        <svg className="w-3.5 h-3.5 text-slate-400 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {boolMenuAbierto && (
        <div className="relative md:absolute md:right-0 md:top-full mt-2 w-full md:w-64 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="font-bold text-sm text-slate-800 truncate">{strNombre} {strApellido}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{usuario?.correo || ""}</p>
          </div>

          <button type="button" onClick={() => { setBoolMenuAbierto(false); setCuentaAbierta(true); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Mi Cuenta</button>
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

      {cuentaAbierta && createPortal(<VentanaEmergente boolAbierto onCerrar={() => setCuentaAbierta(false)}><section role="dialog" aria-label="Mi Cuenta" className="p-6 space-y-4"><h2 className="font-bold text-xl">Mi Cuenta</h2><dl><dt>Nombre</dt><dd>{strNombre} {strApellido}</dd><dt>Correo</dt><dd className="break-all">{usuario?.correo}</dd><dt>Rol</dt><dd>{usuario?.rol === "OPERADOR" ? "AYUDANTE" : usuario?.rol}</dd></dl><p>Para corregir sus datos personales, contacte al administrador.</p><button type="button" onClick={() => { setCuentaAbierta(false); setBoolModalContrasenaAbierto(true); }}>Cambiar contraseña</button><button type="button" onClick={() => setCuentaAbierta(false)} className="ml-4">Cerrar</button></section></VentanaEmergente>, document.body)}

      {/* El aviso se oculta mientras el modal de contraseña está abierto y vuelve si lo cancelan */}
      <AvisoCambioContrasena
        boolAbierto={boolAvisoPendiente && !boolModalContrasenaAbierto}
        onCambiar={() => setBoolModalContrasenaAbierto(true)}
        onCerrarSesion={onCerrarSesion}
      />

      <CambiarContrasenaModal
        boolAbierto={boolModalContrasenaAbierto}
        onCerrar={() => setBoolModalContrasenaAbierto(false)}
        onExito={fnContrasenaCambiada}
      />
    </div>
  );
}