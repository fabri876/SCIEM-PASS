import React, { useState } from "react";
import { Search, Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import UsuarioFormModal from "./UsuarioFormModal";

const COLORES_AVATAR = [
  "bg-primary-navy",
  "bg-accent-red",
  "bg-[#00A86B]",
  "bg-accent-gold",
  "bg-[#6366F1]",
  "bg-[#0284C7]",
  "bg-[#0D9488]",
  "bg-[#D97706]",
  "bg-[#A855F7]",
];

function colorAvatar(idUsuario) {
  const idx = Math.abs(Number(idUsuario) || 0) % COLORES_AVATAR.length;
  return COLORES_AVATAR[idx];
}

/**
 * Tabla de administración de usuarios (HU16).
 */
export default function UserTableCard({ usuarios, boolCargando, strError, onCrear, onEditar, onCambiarRol, onCambiarEstado }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalUsuario, setModalUsuario] = useState(null);
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
      const { rolCambio, ...datosBasicos } = datos;
      await onEditar(modalUsuario.usuario.idUsuario, datosBasicos);
      if (rolCambio) {
        await onCambiarRol(modalUsuario.usuario.idUsuario, rolCambio.nuevoRol, rolCambio.codigoSis);
      }
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
    <div className="bg-bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between h-full text-text-body">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sub font-extrabold text-primary-navy tracking-tight">
              Administración de Usuarios y Roles
            </h2>
            <p className="text-secondary text-text-body font-medium">
              Crea, edita y activa/desactiva las cuentas del sistema.
            </p>
          </div>

          <button
            onClick={() => setModalUsuario({ modo: "crear", usuario: null })}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-blue to-primary-navy hover:opacity-90 text-bg-card text-secondary font-bold px-4 py-2.5 rounded-xl shadow-md active:scale-[0.98] transition-all shrink-0 border border-border/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-body/60" />
            <input
              type="text"
              placeholder="Buscar por nombre, CI o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-secondary bg-bg-app border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue text-text-body"
            />
          </div>
        </div>

        {strError && (
          <p className="mb-4 text-body font-semibold text-accent-red" role="alert">
            {strError}
          </p>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-app text-badge font-bold text-text-body/70 uppercase tracking-wider border-b border-border">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">CI</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-card">
              {boolCargando ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-secondary text-text-body/60">
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
                    <tr key={user.idUsuario} className="hover:bg-bg-app/80 transition-colors text-secondary text-text-body">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${colorAvatar(user.idUsuario)} text-bg-card font-bold text-badge flex items-center justify-center shrink-0`}>
                            {initials}
                          </div>
                          <span className="font-bold text-primary-navy truncate">{nombreCompleto}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-text-body">{user.ci}</td>
                      <td className="py-3 px-4 text-text-body/80">{user.correo}</td>
                      <td className="py-3 px-4">
                        <span className="bg-bg-app border border-border text-primary-navy font-semibold px-3 py-1.5 rounded-xl text-secondary">
                          {user.rol || "PENDIENTE"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-secondary font-semibold ${user.estado
                          ? "bg-emerald-100/70 text-emerald-600"
                          : "bg-red-100/70 text-accent-red"
                          }`}>
                          {user.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalUsuario({ modo: "editar", usuario: user })}
                            title="Editar"
                            className="p-1 text-primary-blue hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setUsuarioParaCambiarEstado(user)}
                            title={user.estado ? "Desactivar" : "Activar"}
                            className={user.estado ? "p-1 text-accent-red hover:bg-red-50 rounded-md transition-colors" : "p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"}
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
                  <td colSpan="6" className="py-8 text-center text-secondary text-text-body/60">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-border text-secondary text-text-body/70 font-medium">
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
          <h2 className="text-h3 font-extrabold text-primary-navy mb-2">
            {usuarioParaCambiarEstado?.estado ? "¿Está seguro de desactivar a este usuario?" : "¿Está seguro de activar a este usuario?"}
          </h2>
          <p className="text-secondary text-text-body/80 mb-5">
            {usuarioParaCambiarEstado?.nombre} {usuarioParaCambiarEstado?.apellido} ({usuarioParaCambiarEstado?.correo})
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setUsuarioParaCambiarEstado(null)}
              className="px-4 py-2.5 rounded-xl text-secondary font-bold text-text-body hover:bg-bg-app transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={fnConfirmarCambioEstado}
              disabled={boolProcesando}
              className={`px-5 py-2.5 rounded-xl text-secondary font-bold text-bg-card shadow-md disabled:opacity-60 ${usuarioParaCambiarEstado?.estado ? "bg-accent-red" : "bg-emerald-600"}`}
            >
              {boolProcesando ? "Procesando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </VentanaEmergente>
    </div>
  );
}
