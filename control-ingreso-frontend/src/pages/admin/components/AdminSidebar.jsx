import React from "react";
import { Users, Calendar, UserCheck, History, LogOut } from "lucide-react";

export default function Sidebar({ currentTab, setCurrentTab }) {
    const menuItems = [
        { id: "usuarios", label: "Gestión de Usuarios", icon: Users },
        { id: "examenes", label: "Registro de Exámenes", icon: Calendar },
        { id: "habilitacion", label: "Habilitación de Estudiantes", icon: UserCheck },
        { id: "auditoria", label: "Historial de Auditoría", icon: History },
    ];

    return (
        <aside className="w-64 bg-[#011632] text-white p-4 flex flex-col justify-between h-screen shrink-0 border-r border-slate-800">
            <div className="space-y-2">
                {/* Título o Logo de la App opcional */}
                <div className="px-4 py-3 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Menú Principal</span>
                </div>

                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentTab && setCurrentTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${isActive
                                ? "bg-gradient-to-r from-[#0066FF] to-[#021B3B] text-white shadow-md shadow-blue-500/20 border border-blue-400/20"
                                : "text-slate-300 hover:text-white hover:bg-white/5 font-semibold"
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Botón Cerrar Sesión */}
            <div className="pt-4 border-t border-slate-800/80">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-xs font-semibold">
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}