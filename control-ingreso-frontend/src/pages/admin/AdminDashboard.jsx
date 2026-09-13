import React, { useState } from "react";
// 1. Importamos TU componente Header tal cual lo tienes
import Header from "../../components/layout/Header";
import AdminSidebar from "./components/AdminSidebar";
import AdminMetricsCards from "./components/AdminMetricsCards";
import BulkUploadCard from "./components/BulkUploadCard";
import UserTableCard from "./components/UserTableCard";

const MOCK_USERS = [
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

export default function AdminDashboard({ onNavigateToLogin }) {
    const [activeMenu, setActiveMenu] = useState("Gestión de Usuarios");

    return (
        <div className="h-screen w-screen bg-[#EBF1F8] font-sans text-slate-800 overflow-hidden flex flex-col">
            {/* 2. Header Superior Fijo envolviendo TU Header sin modificarlo */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between pr-6 h-24">
                {/* Desplazamiento más marcado a la izquierda (-translate-x-6 / -ml-2) */}
                <div className="flex-1 origin-left [&_img]:scale-105 [&_img]:-translate-x-6 [&_img]:-ml-2 [&_img]:transition-transform">
                    <Header strRutaActiva="Inicio" />
                </div>

                {/* Bloque del perfil de usuario (Patricia) alineado a la derecha fuera de tu Header */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#021B3B] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        PR
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                            Patricia Rodríguez
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                            Administrador
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Estructura principal con el Sidebar y Contenido empujados por pt-24 */}
            <div className="flex pt-24 h-full w-full overflow-hidden">
                {/* Sidebar Fijo de la izquierda con top-24 para alinearse perfectamente */}
                <div className="top-24 h-[calc(100vh-96px)]">
                    <AdminSidebar
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        onNavigateToLogin={onNavigateToLogin}
                    />
                </div>

                {/* Área del Dashboard con scroll independiente ajustado a la nueva altura */}
                <main className="flex-1 ml-64 h-[calc(100vh-96px)] overflow-y-auto p-6 space-y-5">
                    <div className="flex justify-between items-start pt-2">
                        <div>
                            <h1 className="text-3xl font-extrabold text-[#021B3B] tracking-tight">
                                Hola, Patricia
                            </h1>
                            <p className="text-xs text-[#0066FF] font-semibold mt-1">
                                Viernes, 5 de septiembre de 2026 &nbsp;•&nbsp; 2 exámenes programados hoy
                            </p>
                        </div>
                        <div className="text-right hidden md:block">
                            <span className="text-xs italic font-semibold text-[#0066FF]/80 leading-relaxed block">
                                Juntos por una<br />educación más segura
                            </span>
                        </div>
                    </div>

                    <AdminMetricsCards />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-6">
                        <div className="lg:col-span-5 xl:col-span-4">
                            <BulkUploadCard />
                        </div>
                        <div className="lg:col-span-7 xl:col-span-8 overflow-hidden">
                            <UserTableCard />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}