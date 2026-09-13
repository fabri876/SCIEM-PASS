import React, { useState } from "react";
import { Search, Plus, Filter, ChevronLeft, ChevronRight, Pencil, Ban } from "lucide-react";

const DEFAULT_USERS = [
  { id: 1, nombre: "Rodrigo Zárate", ci: "12345678", correo: "rodrigo.zarate@umss.edu.bo", rol: "Administrador", estado: "Activo", avatarBg: "bg-[#032B69]" },
  { id: 2, nombre: "Ana Torres", ci: "87654321", correo: "ana.torres@umss.edu.bo", rol: "Docente", estado: "Activo", avatarBg: "bg-[#B01246]" },
  { id: 3, nombre: "Luis Fernández", ci: "11223344", correo: "luis.fernandez@umss.edu.bo", rol: "Estudiante", estado: "Activo", avatarBg: "bg-[#00A86B]" },
  { id: 4, nombre: "Carla Mendoza", ci: "55667788", correo: "carla.mendoza@umss.edu.bo", rol: "Operador", estado: "Activo", avatarBg: "bg-[#F59E0B]" },
  { id: 5, nombre: "Jorge Silva", ci: "99887766", correo: "jorge.silva@umss.edu.bo", rol: "Docente", estado: "Activo", avatarBg: "bg-[#6366F1]" },
  { id: 6, nombre: "María López", ci: "44332211", correo: "maria.lopez@umss.edu.bo", rol: "Estudiante", estado: "Inactivo", avatarBg: "bg-[#EF4444]" },
  { id: 7, nombre: "Diego Rojas", ci: "66778899", correo: "diego.rojas@umss.edu.bo", rol: "Operador", estado: "Activo", avatarBg: "bg-[#0284C7]" },
  { id: 8, nombre: "Valentina Cruz", ci: "55443322", correo: "valentina.cruz@umss.edu.bo", rol: "Docente", estado: "Activo", avatarBg: "bg-[#0D9488]" },
  { id: 9, nombre: "Andrés Vargas", ci: "22334455", correo: "andres.vargas@umss.edu.bo", rol: "Estudiante", estado: "Activo", avatarBg: "bg-[#D97706]" },
  { id: 10, nombre: "Paola Gutiérrez", ci: "77889900", correo: "paola.gutierrez@umss.edu.bo", rol: "Operador", estado: "Inactivo", avatarBg: "bg-[#A855F7]" },
];

export default function UserTableCard({ users }) {
  const [searchTerm, setSearchTerm] = useState("");
  const safeUsers = Array.isArray(users) && users.length > 0 ? users : DEFAULT_USERS;

  const filteredUsers = safeUsers.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (
      (u?.nombre?.toLowerCase() || "").includes(search) ||
      (u?.ci || "").includes(search) ||
      (u?.correo?.toLowerCase() || "").includes(search)
    );
  });

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
              Crea, asigna permisos y gestiona los accesos del sistema.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0066FF] to-[#021B3B] hover:from-[#0052CC] hover:to-[#011229] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-blue-500/20 active:scale-[0.98] transition-all shrink-0 border border-blue-400/20">
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        {/* Buscador y Filtro */}
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

          <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar</span>
          </button>
        </div>

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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const initials = user?.nombre
                    ? user.nombre.split(" ").map((n) => n[0]).join("").substring(0, 2)
                    : "U";

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors text-xs text-slate-700">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${user.avatarBg || "bg-[#032B69]"} text-white font-bold text-[11px] flex items-center justify-center shrink-0`}>
                            {initials}
                          </div>
                          <span className="font-bold text-slate-800 truncate">{user.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{user.ci}</td>
                      <td className="py-3 px-4 text-slate-500">{user.correo}</td>
                      <td className="py-3 px-4">
                        {/* Dropdown de Rol */}
                        <select
                          defaultValue={user.rol}
                          className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Docente">Docente</option>
                          <option value="Estudiante">Estudiante</option>
                          <option value="Operador">Operador</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {/* Badge de Estado pill ligero */}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.estado === "Activo"
                            ? "bg-emerald-100/70 text-emerald-600"
                            : "bg-rose-100/70 text-rose-500"
                          }`}>
                          {user.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {/* Botones de Editar y Bloquear */}
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1 text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors">
                            <Ban className="w-4 h-4" />
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

      {/* Footer original con paginación numérica completa */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>Mostrando 1 - 10 de 1,240 usuarios</span>

        {/* Componente de Paginación Numérica */}
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button className="w-7 h-7 flex items-center justify-center bg-[#0066FF] text-white font-bold rounded-lg shadow-sm">
            1
          </button>
          <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            2
          </button>
          <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            3
          </button>
          <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            4
          </button>
          <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            5
          </button>
          <span className="px-1 text-slate-400">...</span>
          <button className="w-8 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            124
          </button>

          <button className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}