import React, { useState } from "react";
import { Search, Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import UsuarioFormModal from "./UsuarioFormModal";

const COLORES_AVATAR = [
  "bg-[#032B69]", "bg-[#B01246]", "bg-[#00A86B]", "bg-[#F59E0B]",
  "bg-[#6366F1]", "bg-[#0284C7]", "bg-[#0D9488]", "bg-[#D97706]", "bg-[#A855F7]",
];

function colorAvatar(idUsuario) {
  const idx = Math.abs(Number(idUsuario) || 0) % COLORES_AVATAR.length;
  return COLORES_AVATAR[idx];
}

/**
 * Tabla de administración de usuarios (HU16). Recibe la lista ya traída
 * del backend (GET /api/admin/usuarios) por AdminDashboard y expone las
 * 3 acciones que sí soporta el backend: crear, editar datos básicos, y
 * activar/desactivar (ya no existe "cambiar rol" — el rol se fija desde
 * el registro, ver docs/Contrato-API-HU-Usuarios-Roles-Auditoria.md).
 */
export default function UserTableCard({ usuarios, boolCargando, strError, onCrear, onEditar, onCambiarEstado }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalUsuario, setModalUsuario] = useState(null); // { modo: "crear"|"editar", usuario }
  const [usuarioParaCambiarEstado, setUsuarioParaCambiarEstado] = useState(null);
  const [boolProcesando, setBoolProcesando] = useState(false);

  const listaSegura = Array.isArray(usuarios) ? usuarios : [];

  const filteredUsers = listaSegura.filter((u) => {
    const search = searchTerm.toLowerCase();
    const nombreCompleto = `${u?.nombre || ""} ${u?.apellido || ""}`.toLowerCase();
    return (
      nombreCompleto.includes(search) ||
      (u?.ci || "").includes(search) ||
      (u?.correo?.toLowerCase() || "").includes(search)
    );
  });

  const fnGuardarUsuario = async (datos) => {
    if (modalUsuario.modo === "editar") {
      await onEditar(modalUsuario.usuario.idUsuario, datos);
    } else {
      await onCrear(datos);
    }
    setModalUsuario(null);
  };

  const fnConfirmarCambioEstado = async () => {
    setBoolProcesando(true);
    try {
      const nuevoEstado = usuarioParaCambiarEstado.estado ? "INACTIVO" : "ACTIVO";
      await onCambiarEstado(usuarioParaCambiarEstado.idUsuario, nuevoEstado);
      setUsuarioParaCambiarEstado(null);
    } finally {
      setBoolProcesando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#021B3B] tracking-tight">
              Administración de Usuarios y Roles
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Crea, edita y activa/desactiva las cuentas del sistema.
            </p>
          </div>

          <button
            onClick={() => setModalUsuario({ modo: "crear", usuario: null })}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0066FF] to-[#021B3B] hover:from-[#0052CC] hover:to-[#011229] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-blue-500/20 active:scale-[0.98] transition-all shrink-0 border border-blue-400/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, CI o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] text-slate-700"
            />
          </div>
        </div>

        {strError && (
          <p className="mb-4 text-sm font-semibold text-rose-600" role="alert">
            {strError}
          </p>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">CI</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {boolCargando ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    Cargando usuarios…
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const nombreCompleto = `${user?.nombre || ""} ${user?.apellido || ""}`.trim();
                  const initials = nombreCompleto
                    ? nombreCompleto.split(" ").map((n) => n[0]).join("").substring(0, 2)
                    : "U";

                  return (
                    <tr key={user.idUsuario} className="hover:bg-slate-50/80 transition-colors text-xs text-slate-700">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${colorAvatar(user.idUsuario)} text-white font-bold text-[11px] flex items-center justify-center shrink-0`}>
                            {initials}
                          </div>
                          <span className="font-bold text-slate-800 truncate">{nombreCompleto}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{user.ci}</td>
                      <td className="py-3 px-4 text-slate-500">{user.correo}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs">
                          {user.rol || "PENDIENTE"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.estado
                            ? "bg-emerald-100/70 text-emerald-600"
                            : "bg-rose-100/70 text-rose-500"
                          }`}>
                          {user.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalUsuario({ modo: "editar", usuario: user })}
                            title="Editar"
                            className="p-1 text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setUsuarioParaCambiarEstado(user)}
                            title={user.estado ? "Desactivar" : "Activar"}
                            className={user.estado ? "p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors" : "p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"}
                          >
                            {user.estado ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>Mostrando {filteredUsers.length} de {listaSegura.length} usuarios</span>
      </div>

      <UsuarioFormModal
        boolAbierto={!!modalUsuario}
        modo={modalUsuario?.modo}
        usuarioInicial={modalUsuario?.usuario}
        onCerrar={() => setModalUsuario(null)}
        onGuardar={fnGuardarUsuario}
      />

      <VentanaEmergente boolAbierto={!!usuarioParaCambiarEstado} onCerrar={() => setUsuarioParaCambiarEstado(null)}>
        <div className="p-6">
          <h2 className="text-lg font-extrabold text-[#021B3B] mb-2">
            {usuarioParaCambiarEstado?.estado ? "¿Está seguro de desactivar a este usuario?" : "¿Está seguro de activar a este usuario?"}
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            {usuarioParaCambiarEstado?.nombre} {usuarioParaCambiarEstado?.apellido} ({usuarioParaCambiarEstado?.correo})
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setUsuarioParaCambiarEstado(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={fnConfirmarCambioEstado}
              disabled={boolProcesando}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-60 ${usuarioParaCambiarEstado?.estado ? "bg-rose-600" : "bg-emerald-600"}`}
            >
              {boolProcesando ? "Procesando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </VentanaEmergente>
    </div>
  );
}
