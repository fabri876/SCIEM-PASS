import React from "react";
import { Home, Calendar, UserCheck, BarChart2, HelpCircle, Headphones, ChevronDown } from "lucide-react";
import logoSciemPass from "../../../assets/images/logo-sciem-pass.png";

export default function AdminHeader() {
    return (
        <header className="h-24 bg-[#F8FAFC] border-b border-slate-200/80 px-6 flex items-center justify-between z-20 sticky top-0 shadow-xs">
            {/* Logo oficial extra grande */}
            <div className="flex items-center cursor-pointer py-1">
                <img
                    src={logoSciemPass}
                    alt="SCIEM-PASS Logo"
                    className="h-16 sm:h-20 w-auto object-contain max-w-[280px]"
                />
            </div>

            {/* Navegación Central */}
            <nav className="hidden lg:flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0070F3] text-white text-xs font-semibold shadow-sm">
                    <Home className="w-4 h-4" /> Inicio
                </button>
                <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0070F3] hover:bg-blue-50/50 rounded-full transition-colors">
                    <Calendar className="w-4 h-4" /> Mis exámenes
                </button>
                <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0070F3] hover:bg-blue-50/50 rounded-full transition-colors">
                    <UserCheck className="w-4 h-4" /> Habilitaciones
                </button>
                <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0070F3] hover:bg-blue-50/50 rounded-full transition-colors">
                    <BarChart2 className="w-4 h-4" /> Reportes
                </button>
            </nav>

            {/* Derecha / Perfil */}
            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-5 text-xs font-medium text-[#0070F3] border-r border-slate-200 pr-6">
                    <button className="flex items-center gap-1.5 hover:underline">
                        <HelpCircle className="w-4 h-4 text-[#0070F3]" /> Preguntas frecuentes
                    </button>
                    <button className="flex items-center gap-1.5 hover:underline">
                        <Headphones className="w-4 h-4 text-[#0070F3]" /> Soporte técnico
                    </button>
                </div>

                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-[#032B69] text-white font-bold text-xs flex items-center justify-center">
                        PR
                    </div>
                    <div className="text-left hidden sm:block leading-tight">
                        <p className="text-xs font-bold text-[#032B69]">Patricia Rodríguez</p>
                        <p className="text-[11px] text-slate-400 font-medium">Administrador</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </header>
    );
}