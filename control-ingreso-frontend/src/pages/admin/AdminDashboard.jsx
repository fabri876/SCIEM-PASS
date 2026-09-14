import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/layout/Header";
import AdminSidebar from "./components/AdminSidebar";
import AdminMetricsCards from "./components/AdminMetricsCards";
import BulkUploadCard from "./components/BulkUploadCard";
import UserTableCard from "./components/UserTableCard";
import AuditoriaTable from "./components/AuditoriaTable";
import { obtenerUsuarioActual } from "../../services/authService";
import { listarUsuarios, crearUsuario, actualizarUsuario, cambiarEstadoUsuario, listarAuditoria } from "../../services/adminService";

export default function AdminDashboard() {
    const [activeMenu, setActiveMenu] = useState("Gestión de Usuarios");
    const usuarioSesion = obtenerUsuarioActual();

    const [usuarios, setUsuarios] = useState([]);
    const [boolCargandoUsuarios, setBoolCargandoUsuarios] = useState(true);
    const [strErrorUsuarios, setStrErrorUsuarios] = useState("");

    const [auditoria, setAuditoria] = useState([]);
    const [boolCargandoAuditoria, setBoolCargandoAuditoria] = useState(false);
    const [strErrorAuditoria, setStrErrorAuditoria] = useState("");

    const fnCargarUsuarios = useCallback(async () => {
        setBoolCargandoUsuarios(true);
        setStrErrorUsuarios("");
        try {
            const data = await listarUsuarios();
            setUsuarios(data || []);
        } catch (error) {
            setStrErrorUsuarios(error.message);
        } finally {
            setBoolCargandoUsuarios(false);
        }
    }, []);

    useEffect(() => {
        fnCargarUsuarios();
    }, [fnCargarUsuarios]);

    useEffect(() => {
        if (activeMenu !== "Historial de Auditoría") return;
        let cancelado = false;
        setBoolCargandoAuditoria(true);
        setStrErrorAuditoria("");
        listarAuditoria()
            .then((data) => {
                if (!cancelado) setAuditoria(data || []);
            })
            .catch((error) => {
                if (!cancelado) setStrErrorAuditoria(error.message);
            })
            .finally(() => {
                if (!cancelado) setBoolCargandoAuditoria(false);
            });
        return () => {
            cancelado = true;
        };
    }, [activeMenu]);

    const fnCrearUsuario = async (datos) => {
        await crearUsuario(datos);
        await fnCargarUsuarios();
    };

    const fnEditarUsuario = async (idUsuario, datos) => {
        await actualizarUsuario(idUsuario, datos);
        await fnCargarUsuarios();
    };

    const fnCambiarEstadoUsuario = async (idUsuario, nuevoEstado) => {
        await cambiarEstadoUsuario(idUsuario, nuevoEstado);
        await fnCargarUsuarios();
    };

    const strNombreSesion = usuarioSesion ? `${usuarioSesion.nombre} ${usuarioSesion.apellido || ""}`.trim() : "Administrador";
    const strIniciales = usuarioSesion
        ? `${usuarioSesion.nombre?.charAt(0) || ""}${usuarioSesion.apellido?.charAt(0) || ""}`
        : "AD";

    return (
        <div className="h-screen w-screen bg-[#EBF1F8] font-sans text-slate-800 overflow-hidden flex flex-col">
            <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between pr-6 h-24">
                <div className="flex-1 origin-left [&_img]:scale-105 [&_img]:-translate-x-6 [&_img]:-ml-2 [&_img]:transition-transform">
                    <Header strRutaActiva="Inicio" />
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#021B3B] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {strIniciales}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                            {strNombreSesion}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                            Administrador
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex pt-24 h-full w-full overflow-hidden">
                <div className="top-24 h-[calc(100vh-96px)]">
                    <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
                </div>

                <main className="flex-1 ml-64 h-[calc(100vh-96px)] overflow-y-auto p-6 space-y-5">
                    <div className="flex justify-between items-start pt-2">
                        <div>
                            <h1 className="text-3xl font-extrabold text-[#021B3B] tracking-tight">
                                Hola, {usuarioSesion?.nombre || "Administrador"}
                            </h1>
                            <p className="text-xs text-[#0066FF] font-semibold mt-1">
                                {activeMenu}
                            </p>
                        </div>
                    </div>

                    {activeMenu === "Gestión de Usuarios" && (
                        <>
                            <AdminMetricsCards usuarios={usuarios} />

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-6">
                                <div className="lg:col-span-5 xl:col-span-4">
                                    <BulkUploadCard />
                                </div>
                                <div className="lg:col-span-7 xl:col-span-8 overflow-hidden">
                                    <UserTableCard
                                        usuarios={usuarios}
                                        boolCargando={boolCargandoUsuarios}
                                        strError={strErrorUsuarios}
                                        onCrear={fnCrearUsuario}
                                        onEditar={fnEditarUsuario}
                                        onCambiarEstado={fnCambiarEstadoUsuario}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeMenu === "Historial de Auditoría" && (
                        <AuditoriaTable
                            registros={auditoria}
                            boolCargando={boolCargandoAuditoria}
                            strError={strErrorAuditoria}
                        />
                    )}

                    {(activeMenu === "Registro de Exámenes" || activeMenu === "Habilitación de Estudiantes") && (
                        <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-sm text-center text-sm text-slate-400">
                            Esta sección todavía no está conectada al backend.
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
