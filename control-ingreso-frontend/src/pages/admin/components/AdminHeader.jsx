import React from "react";
import { Home, Calendar, UserCheck, BarChart2, HelpCircle, Headphones, ChevronDown } from "lucide-react";
import logoSciemPass from "../../../assets/images/logo-sciem-pass.png";

export default function AdminHeader() {
    return (
        <header className="h-16 bg-bg-card border-b border-border px-6 flex items-center justify-between z-20 sticky top-0 shadow-xs">
            {/* Logo oficial ajustado en tamaño */}
            <div className="flex items-center cursor-pointer">
                <img
                    src={logoSciemPass}
                    alt="SCIEM-PASS Logo"
                    className="h-10 sm:h-12 w-auto object-contain max-w-[220px]"
                />
            </div>

            {/* Navegación Central */}
            <nav className="hidden lg:flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-blue text-bg-card text-secondary font-bold shadow-xs">
                    <Home className="w-4 h-4" /> Inicio
                </button>
                <button className="flex items-center gap-2 px-3.5 py-1.5 text-secondary font-bold text-primary-blue hover:bg-bg-input rounded-full transition-colors">
                    <Calendar className="w-4 h-4" /> Mis exámenes
                </button>
                <button className="flex items-center gap-2 px-3.5 py-1.5 text-secondary font-bold text-primary-blue hover:bg-bg-input rounded-full transition-colors">
                    <UserCheck className="w-4 h-4" /> Habilitaciones
                </button>
                <button className="flex items-center gap-2 px-3.5 py-1.5 text-secondary font-bold text-primary-blue hover:bg-bg-input rounded-full transition-colors">
                    <BarChart2 className="w-4 h-4" /> Reportes
                </button>
            </nav>

            {/* Derecha / Perfil */}
            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-5 text-secondary font-bold text-primary-blue border-r border-border pr-6">
                    <button className="flex items-center gap-1.5 hover:underline">
                        <HelpCircle className="w-4 h-4 text-primary-blue" /> Preguntas frecuentes
                    </button>
                    <button className="flex items-center gap-1.5 hover:underline">
                        <Headphones className="w-4 h-4 text-primary-blue" /> Soporte técnico
                    </button>
                </div>

                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-primary-navy text-bg-card font-bold text-secondary flex items-center justify-center">
                        PR
                    </div>
                    <div className="text-left hidden sm:block leading-tight">
                        <p className="text-secondary font-bold text-primary-navy">Patricia Rodríguez</p>
                        <p className="text-badge text-text-body/60 font-medium">Administrador</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-body/60" />
                </div>
            </div>
        </header>
    );
}
