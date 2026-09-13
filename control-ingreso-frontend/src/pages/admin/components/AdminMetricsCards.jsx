import React from "react";
import {
    Users,
    ShieldCheck,
    GraduationCap,
    UserCheck,
    UserCog,
    Calendar,
    Clock
} from "lucide-react";

export default function AdminMetricsCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Tarjeta Total Usuarios (Ajustada según el modelo enviado) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                {/* Parte Superior: Ícono circular a la izquierda + Título y Número */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#032B69] flex items-center justify-center shrink-0 shadow-sm">
                        <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-[#021B3B]">Total Usuarios</span>
                        <div className="text-3xl font-black text-[#021B3B] tracking-tight leading-none mt-1">
                            1,240
                        </div>
                    </div>
                </div>

                {/* Parte Inferior: Sub-métricas divididas verticalmente */}
                <div className="grid grid-cols-4 divide-x divide-slate-200 mt-5 pt-3 border-t border-slate-100">
                    {/* Admins */}
                    <div className="flex items-center gap-1.5 px-1.5 first:pl-0">
                        <ShieldCheck className="w-4 h-4 text-[#0066FF] shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs font-bold text-slate-800">42</span>
                            <span className="text-[10px] text-slate-400 font-medium">Admins</span>
                        </div>
                    </div>

                    {/* Docentes */}
                    <div className="flex items-center gap-1.5 px-1.5">
                        <GraduationCap className="w-4 h-4 text-[#0066FF] shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs font-bold text-slate-800">382</span>
                            <span className="text-[10px] text-slate-400 font-medium">Docentes</span>
                        </div>
                    </div>

                    {/* Estudiantes */}
                    <div className="flex items-center gap-1.5 px-1.5">
                        <UserCheck className="w-4 h-4 text-[#0066FF] shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs font-bold text-slate-800">756</span>
                            <span className="text-[10px] text-slate-400 font-medium">Estudiantes</span>
                        </div>
                    </div>

                    {/* Operadores */}
                    <div className="flex items-center gap-1.5 px-1.5 last:pr-0">
                        <UserCog className="w-4 h-4 text-[#0066FF] shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-xs font-bold text-slate-800">60</span>
                            <span className="text-[10px] text-slate-400 font-medium">Operadores</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta 2 (Ejemplo) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-bold text-[#021B3B]">Ya ingresaron</span>
                        <div className="text-3xl font-black text-[#021B3B] tracking-tight leading-none mt-1">
                            892
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full w-[72%]" />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">72% del total registrado</span>
                </div>
            </div>

            {/* Tarjeta 3 (Ejemplo) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-bold text-[#021B3B]">Próximo Examen</span>
                        <div className="text-xl font-bold text-[#021B3B] mt-1">
                            Álgebra Lineal
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-4">
                    <Clock className="w-4 h-4 text-[#0066FF]" />
                    <span>Hoy, 14:00 - Aula 691B</span>
                </div>
            </div>
        </div>
    );
}