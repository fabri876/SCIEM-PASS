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

export default function AdminMetricsCards({ usuarios }) {
    const listaSegura = Array.isArray(usuarios) ? usuarios : [];
    const contarPorRol = (rol) => listaSegura.filter((u) => u.rol === rol).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Tarjeta Total Usuarios (datos reales de GET /api/admin/usuarios) */}
            <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between">
                {/* Parte Superior: Ícono circular a la izquierda + Título y Número */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-navy flex items-center justify-center shrink-0 shadow-sm">
                        <Users className="w-7 h-7 text-bg-card" />
                    </div>
                    <div>
                        <span className="text-secondary font-bold text-primary-navy">Total Usuarios</span>
                        <div className="text-h1 font-black text-primary-navy tracking-tight leading-none mt-1">
                            {listaSegura.length}
                        </div>
                    </div>
                </div>

                {/* Parte Inferior: Sub-métricas divididas verticalmente */}
                <div className="grid grid-cols-4 divide-x divide-border mt-5 pt-3 border-t border-border">
                    {/* Admins */}
                    <div className="flex items-center gap-1.5 px-1.5 first:pl-0">
                        <ShieldCheck className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{contarPorRol("ADMINISTRADOR")}</span>
                            <span className="text-badge text-text-body/60 font-medium">Admins</span>
                        </div>
                    </div>

                    {/* Docentes */}
                    <div className="flex items-center gap-1.5 px-1.5">
                        <GraduationCap className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{contarPorRol("DOCENTE")}</span>
                            <span className="text-badge text-text-body/60 font-medium">Docentes</span>
                        </div>
                    </div>

                    {/* Estudiantes */}
                    <div className="flex items-center gap-1.5 px-1.5">
                        <UserCheck className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{contarPorRol("ESTUDIANTE")}</span>
                            <span className="text-badge text-text-body/60 font-medium">Estudiantes</span>
                        </div>
                    </div>

                    {/* Operadores */}
                    <div className="flex items-center gap-1.5 px-1.5 last:pr-0">
                        <UserCog className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{contarPorRol("OPERADOR")}</span>
                            <span className="text-badge text-text-body/60 font-medium">Operadores</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-secondary font-bold text-primary-navy">Ya ingresaron</span>
                        <div className="text-h1 font-black text-primary-navy tracking-tight leading-none mt-1">
                            892
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-full bg-bg-app rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full w-[72%]" />
                    </div>
                    <span className="text-badge text-text-body/60 mt-1 block">72% del total registrado</span>
                </div>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-secondary font-bold text-primary-navy">Próximo Examen</span>
                        <div className="text-sub font-bold text-primary-navy mt-1">
                            Álgebra Lineal
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-secondary text-text-body/70 mt-4">
                    <Clock className="w-4 h-4 text-primary-blue" />
                    <span>Hoy, 14:00 - Aula 691B</span>
                </div>
            </div>
        </div>
    );
}