import { TablaConReporte } from '../../../components/common/ReporteLista.jsx';
import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Ban, CheckCircle2, Trash2 } from "lucide-react";
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

const PESTANAS = [
  { id: "ESTUDIANTE", nombre: "Estudiantes" },
  { id: "DOCENTE", nombre: "Docentes" },
  { id: "OPERADOR", nombre: "Ayudantes" },
  { id: "ADMINISTRADOR", nombre: "Administradores" },
  { id: "TODOS", nombre: "Todos" },
];

/**
 * Tabla de administración de usuarios (HU16).
 */
export default function UserTableCard({ usuarios, boolCargando, strError, onCrear, onEditar, onCambiarRol, onCambiarEstado, onEliminar }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [rolSeleccionado, setRolSeleccionado] = useState("ESTUDIANTE");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("TODOS");
  const [modalUsuario, setModalUsuario] = useState(null);
  const [usuarioParaCambiarEstado, setUsuarioParaCambiarEstado] = useState(null);
  const [usuarioParaEliminar, setUsuarioParaEliminar] = useState(null);
  const [mensajeExito, setMensajeExito] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [boolProcesando, setBoolProcesando] = useState(false);

  useEffect(() => {
    if (!mensajeExito) return undefined;
    const timer = setTimeout(() => setMensajeExito(""), 4000);
    return () => clearTimeout(timer);
  }, [mensajeExito]);

  const listaSegura = Array.isArray(usuarios) ? usuarios : [];

  const filteredUsers = listaSegura.filter((u) => {
    if (rolSeleccionado !== "TODOS" && u?.rol !== rolSeleccionado) return false;
    if (estadoSeleccionado === "ACTIVO" && !u?.estado) return false;
    if (estadoSeleccionado === "INACTIVO" && u?.estado) return false;
    const search = searchTerm.toLowerCase();
    const nombreCompleto = `${u?.nombre || ""} ${u?.apellido || ""}`.toLowerCase();
    return (
      nombreCompleto.includes(search) ||
      String(u?.ci || "").includes(search) ||
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
      const respuesta = await onCrear(datos);
      setMensajeExito(respuesta?.usuarioExistente
        ? "El usuario ya estaba registrado; se actualizó su asociación correctamente."
        : "Usuario creado correctamente.");
    }
    setModalUsuario(null);
  };

  const fnConfirmarCambioEstado = async () => {
    setBoolProcesando(true); setErrorAccion("");
    try {
      const nuevoEstado = usuarioParaCambiarEstado.estado ? "INACTIVO" : "ACTIVO";
      await onCambiarEstado(usuarioParaCambiarEstado.idUsuario, nuevoEstado);
      setUsuarioParaCambiarEstado(null);
    } catch (e) { setErrorAccion(e.message); } finally {
      setBoolProcesando(false);
    }
  };

  const fnEliminar = async () => {
    setBoolProcesando(true);
    setErrorAccion("");
    try {
      await onEliminar(usuarioParaEliminar.idUsuario);
      setUsuarioParaEliminar(null);
    } catch (e) {
      setErrorAccion(e.message);
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
            <h2 className="text-card-title font-extrabold text-primary-navy tracking-tight">
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

        <div className="flex gap-1 overflow-x-auto border-b border-border mb-4" aria-label="Filtrar usuarios por rol">
          {PESTANAS.map(tab => <button key={tab.id} type="button" aria-pressed={rolSeleccionado === tab.id}
            onClick={() => setRolSeleccionado(tab.id)}
            className={`shrink-0 px-3 py-3 text-secondary font-bold border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-blue ${rolSeleccionado === tab.id ? "border-primary-blue text-primary-blue bg-primary-blue/5" : "border-transparent text-text-body hover:bg-bg-app hover:text-primary-navy"}`}>
            {textoInterfaz(tab.nombre)} <span className="ml-1 text-badge rounded-full bg-bg-app px-1.5 py-0.5">{tab.id === "TODOS" ? listaSegura.length : listaSegura.filter(u => u?.rol === tab.id).length}</span>
          </button>)}
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-bg-app p-1 mb-4 w-fit" aria-label="Filtrar por estado de la cuenta">
          {[{id: "TODOS", nombre: "Todos los estados"}, {id: "ACTIVO", nombre: "Activos"}, {id: "INACTIVO", nombre: "Inactivos"}].map(estado =>
            <button key={estado.id} type="button" aria-pressed={estadoSeleccionado === estado.id} onClick={() => setEstadoSeleccionado(estado.id)}
              className={`px-3 py-2 rounded-lg text-secondary font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-blue ${estadoSeleccionado === estado.id ? "bg-bg-card text-primary-navy shadow-sm" : "text-text-body hover:text-primary-navy"}`}>
              {textoInterfaz(estado.nombre)}
            </button>)}
        </div>

        {mensajeExito && <p role="status" className="text-green-700 font-semibold mb-3">{mensajeExito}</p>}
      {/* Buscador */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-body/60" />
            <input
              type="text"
              aria-label="Buscar usuarios por nombre, CI o correo"
              placeholder="Buscar por nombre, CI o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-secondary bg-bg-app border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue text-text-body"
            />
          </div>
        </div>

        {strError && (
          <p className="mb-4 text-body font-semibold text-accent-red" role="alert">
            {textoInterfaz(strError)}
          </p>
        )}

        {/* Tabla */}
        <div className="max-h-[520px] overflow-auto rounded-xl border border-border" tabIndex={0} aria-label="Lista de usuarios" role="region">
          <TablaConReporte titulo="Usuarios">{(_paraReporte) => (<table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-bg-app text-badge font-bold text-text-body/70 tracking-wider border-b border-border">
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
                          {/* No cargar fotos faciales masivamente en la tabla general.
                              Evita solicitudes 404 para estudiantes sin enrolamiento. */}
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
                          {textoInterfaz(({ ESTUDIANTE: "Estudiante", DOCENTE: "Docente", OPERADOR: "Ayudante", ADMINISTRADOR: "Administrador" })[user.rol] || user.rol || "PENDIENTE")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-secondary font-semibold ${user.estado
                          ? "bg-emerald-100/70 text-emerald-600"
                          : "bg-red-100/70 text-accent-red"
                          }`}>
                          {textoInterfaz(user.estado ? "Activo" : "Inactivo")}
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
                            onClick={() => { setErrorAccion(""); setUsuarioParaCambiarEstado(user); }}
                            title={user.estado ? "Desactivar" : "Activar"}
                            className={user.estado ? "p-1 text-accent-red hover:bg-red-50 rounded-md transition-colors" : "p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"}
                          >
                            {user.estado ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          {onEliminar && user.rol !== "ADMINISTRADOR" && <button type="button" title="Eliminar usuario" aria-label={`Eliminar a ${nombreCompleto}`} onClick={() => { setErrorAccion(""); setUsuarioParaEliminar(user); }} className="p-1 text-accent-red hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-secondary text-text-body/60">
                    No hay usuarios que coincidan con el rol, estado y búsqueda seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>)}</TablaConReporte>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-border text-secondary text-text-body/70 font-medium">
        <span aria-live="polite">{filteredUsers.length} usuario(s) en esta selección · {listaSegura.length} en total</span>
      </div>

      <UsuarioFormModal
        boolAbierto={!!modalUsuario}
        modo={modalUsuario?.modo}
        usuarioInicial={modalUsuario?.usuario}
        onCerrar={() => setModalUsuario(null)}
        onGuardar={fnGuardarUsuario}
      />

      <VentanaEmergente boolAbierto={!!usuarioParaEliminar} onCerrar={() => { if (!boolProcesando) setUsuarioParaEliminar(null); }}>
        <div className="p-6 space-y-4">
          <h2 className="text-h3 font-extrabold text-primary-navy">¿Eliminar este usuario?</h2>
          <p>{textoInterfaz(usuarioParaEliminar?.nombre)} {usuarioParaEliminar?.apellido} · {usuarioParaEliminar?.correo}</p>
          <p>Se eliminarán la cuenta y todas sus asignaciones a materias y grupos. Esta acción no se puede deshacer. Si tiene registros de exámenes, se impedirá la eliminación; puede desactivarlo.</p>
          {errorAccion && <p role="alert" className="text-accent-red">{errorAccion}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={boolProcesando} onClick={() => setUsuarioParaEliminar(null)} className="px-4 py-2 rounded-xl border border-border">Cancelar</button><button type="button" disabled={boolProcesando} onClick={fnEliminar} className="px-4 py-2 rounded-xl bg-accent-red text-white font-bold">{boolProcesando ? "Eliminando…" : "Eliminar definitivamente"}</button></div>
        </div>
      </VentanaEmergente>
      <VentanaEmergente boolAbierto={!!usuarioParaCambiarEstado} onCerrar={() => setUsuarioParaCambiarEstado(null)}>
        <div className="p-6">
          <h2 className="text-h3 font-extrabold text-primary-navy mb-2">
            {textoInterfaz(usuarioParaCambiarEstado?.estado ? "¿Está seguro de desactivar a este usuario?" : "¿Está seguro de activar a este usuario?")}
          </h2>
          <p className="text-secondary text-text-body/80 mb-5">
            {textoInterfaz(usuarioParaCambiarEstado?.nombre)} {textoInterfaz(usuarioParaCambiarEstado?.apellido)} ({textoInterfaz(usuarioParaCambiarEstado?.correo)})
          </p>
          {errorAccion && <p role="alert" className="text-accent-red mb-3">{errorAccion}</p>}
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
