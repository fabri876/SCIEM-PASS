import React from "react";

/**
 * Tipos de usuario y sus permisos básicos (HU16, criterio #1): lista de
 * solo lectura de GET /api/admin/roles.
 */
export default function RolesTable({ roles, boolCargando, strError }) {
  const listaSegura = Array.isArray(roles) ? roles : [];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-extrabold text-[#021B3B] tracking-tight">
          Roles y Permisos
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Tipos de usuario del sistema y sus permisos básicos.
        </p>
      </div>

      {strError && (
        <p className="mb-4 text-sm font-semibold text-rose-600" role="alert">
          {strError}
        </p>
      )}

      {boolCargando ? (
        <p className="py-8 text-center text-xs text-slate-400">Cargando roles…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listaSegura.map((rol) => (
            <div key={rol.idRol} className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-extrabold text-[#021B3B] mb-1">{rol.nombre}</h3>
              <p className="text-xs text-slate-500 mb-3">{rol.descripcion}</p>
              <div className="flex flex-wrap gap-1.5">
                {(rol.permisos || []).map((permiso) => (
                  <span
                    key={permiso}
                    className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-semibold text-[10px] text-slate-600"
                  >
                    {permiso}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
