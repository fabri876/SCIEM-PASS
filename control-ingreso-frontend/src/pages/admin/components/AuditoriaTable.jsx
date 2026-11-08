import React from "react";

/**
 * Historial de auditoría (HU16, criterio #8): lista de solo lectura de
 * GET /api/admin/auditoria — quién hizo qué, cuándo y desde qué IP.
 */
export default function AuditoriaTable({ registros, boolCargando, strError }) {
  const listaSegura = Array.isArray(registros) ? registros : [];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-extrabold text-[#021B3B] tracking-tight">
          Historial de Auditoría
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Registro de operaciones sobre usuarios e intentos de inicio de sesión.
        </p>
      </div>

      {strError && (
        <p className="mb-4 text-sm font-semibold text-rose-600" role="alert">
          {strError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Operación</th>
              <th className="py-3 px-4">Ejecutor</th>
              <th className="py-3 px-4">Afectado</th>
              <th className="py-3 px-4">Detalles</th>
              <th className="py-3 px-4">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {boolCargando ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                  Cargando auditoría…
                </td>
              </tr>
            ) : listaSegura.length > 0 ? (
              listaSegura.map((registro) => (
                <tr key={registro.idAuditoria} className="text-xs text-slate-700">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                    {registro.fechaHora ? new Date(registro.fechaHora).toLocaleString("es-BO") : "-"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                      {registro.tipoOperacion}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600">{registro.usuarioEjecutor || "-"}</td>
                  <td className="py-3 px-4 text-slate-600">{registro.usuarioAfectado || "-"}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={registro.detalles}>
                    {registro.detalles}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{registro.ipOrigen || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                  Todavía no hay operaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
