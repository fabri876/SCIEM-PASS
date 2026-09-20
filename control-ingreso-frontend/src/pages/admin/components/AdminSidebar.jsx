import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, UserCheck, History, Shield, LogOut } from "lucide-react";
import { cerrarSesion } from "../../../services/authService";

const menuItems = [
    { id: "Gestión de Usuarios", label: "Gestión de Usuarios", icon: Users },
    { id: "Roles y Permisos", label: "Roles y Permisos", icon: Shield },
    { id: "Registro de Exámenes", label: "Registro de Exámenes", icon: Calendar },
    { id: "Habilitación de Estudiantes", label: "Habilitación de Estudiantes", icon: UserCheck },
    { id: "Historial de Auditoría", label: "Historial de Auditoría", icon: History },
];

export default function AdminSidebar({ activeMenu, setActiveMenu }) {
    const navigate = useNavigate();

    const fnCerrarSesion = () => {
        cerrarSesion();
        navigate("/login", { replace: true });
    };

    return (
        <div className="w-full h-full bg-primary-navy text-bg-card p-4 flex flex-col justify-between shrink-0 border-r border-border/20">
            <div className="space-y-2">
                <div className="px-4 py-3 mb-2">
                    <span className="text-badge font-black uppercase tracking-wider text-bg-card/60">
                        Menú Principal
                    </span>
                </div>

                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveMenu && setActiveMenu(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-secondary font-bold transition-all cursor-pointer ${isActive
                                ? "bg-gradient-to-r from-primary-blue to-primary-navy text-bg-card shadow-md border border-bg-card/20"
                                : "text-bg-card/80 hover:text-bg-card hover:bg-bg-card/10 font-semibold"
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-bg-card" : "text-bg-card/60"}`} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-border/20">

            </div>
        </div>
    );
}
