import React, { useState, useEffect, useCallback } from "react";
import Header from "../../components/layout/Header";
import AdminSidebar from "./components/AdminSidebar";
import AdminMetricsCards from "./components/AdminMetricsCards";
import BulkUploadCard from "./components/BulkUploadCard";
import UserTableCard from "./components/UserTableCard";
import AuditoriaTable from "./components/AuditoriaTable";
import RolesTable from "./components/RolesTable";
import UserAccountMenu from "../../components/common/UserAccountMenu";
import SeccionRegistroExamenes from "./components/SeccionRegistroExamenes";
import SeccionGestionHabilitacionesAdmin from "./components/SeccionGestionHabilitacionesAdmin";
import { obtenerUsuarioActual, cerrarSesion } from "../../services/authService";
import {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    cambiarRolUsuario,
    cambiarEstadoUsuario,
    listarAuditoria,
    listarRoles,
    cargarUsuariosMasivo
} from "../../services/adminService";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard({ onNavigateToLogin }) {
    const navigate = useNavigate();

    const [activeMenu, setActiveMenu] = useState("Gestión de Usuarios");
    const usuarioSesion = obtenerUsuarioActual();

    const [usuarios, setUsuarios] = useState([]);
    const [boolCargandoUsuarios, setBoolCargandoUsuarios] = useState(true);
    const [strErrorUsuarios, setStrErrorUsuarios] = useState("");

    const [auditoria, setAuditoria] = useState([]);
    const [boolCargandoAuditoria, setBoolCargandoAuditoria] = useState(false);
    const [strErrorAuditoria, setStrErrorAuditoria] = useState("");

    const [roles, setRoles] = useState([]);
    const [boolCargandoRoles, setBoolCargandoRoles] = useState(false);
    const [strErrorRoles, setStrErrorRoles] = useState("");

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
                if (!cancelado) {
                    setAuditoria(data || []);
                }
            })
            .catch((error) => {
                if (!cancelado) {
                    setStrErrorAuditoria(error.message);
                }
            })
            .finally(() => {
                if (!cancelado) {
                    setBoolCargandoAuditoria(false);
                }
            });

        return () => {
            cancelado = true;
        };
    }, [activeMenu]);

    useEffect(() => {
        if (activeMenu !== "Roles y Permisos") return;

        let cancelado = false;

        setBoolCargandoRoles(true);
        setStrErrorRoles("");

        listarRoles()
            .then((data) => {
                if (!cancelado) {
                    setRoles(data || []);
                }
            })
            .catch((error) => {
                if (!cancelado) {
                    setStrErrorRoles(error.message);
                }
            })
            .finally(() => {
                if (!cancelado) {
                    setBoolCargandoRoles(false);
                }
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

    const fnCambiarRolUsuario = async (idUsuario, nuevoRol, codigoSis) => {
        await cambiarRolUsuario(idUsuario, nuevoRol, codigoSis);
        await fnCargarUsuarios();
    };

    const fnCambiarEstadoUsuario = async (idUsuario, nuevoEstado) => {
        await cambiarEstadoUsuario(idUsuario, nuevoEstado);
        await fnCargarUsuarios();
    };

    const fnCargarMasiva = async (file, materia) => {
        const resultado = await cargarUsuariosMasivo(file, "ESTUDIANTE");
        await fnCargarUsuarios();
        return resultado;
    };

    // Cerrar sesión igual que en el portal del estudiante
    const fnCerrarSesion = () => {
        cerrarSesion();
        navigate("/login");
    };

    return (
        <div className="h-screen w-screen bg-bg-app font-sans text-text-body overflow-hidden flex flex-col">

            {/* =========================================================
                HEADER SUPERIOR
                ========================================================= */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between pr-6 h-[98px] shadow-sm">

                {/* Header principal */}
                <div className="flex-1 min-w-0">
                    <Header strRutaActiva="Inicio" />
                </div>

                {/* =====================================================
                    CUENTA DEL ADMINISTRADOR
                    ===================================================== */}
                <div className="flex items-center pl-4 border-l border-slate-200 shrink-0">
                    <UserAccountMenu
                        usuario={usuarioSesion || { nombre: "Administrador", rol: "ADMINISTRADOR" }}
                        onCerrarSesion={fnCerrarSesion}
                        strClaseAvatar="bg-[#1763C6]"
                    />
                </div>
            </div>

            {/* =========================================================
                LAYOUT PRINCIPAL
                ========================================================= */}
            <div className="flex pt-[98px] h-full w-full overflow-hidden">

                {/* =====================================================
                    SIDEBAR ADMINISTRADOR
                    ===================================================== */}
                <aside className="w-64 shrink-0 h-[calc(100vh-98px)] bg-primary-navy z-30">
                    <AdminSidebar
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        onNavigateToLogin={onNavigateToLogin}
                    />
                </aside>

                {/* =====================================================
                    ÁREA DE CONTENIDO PRINCIPAL
                    ===================================================== */}
                <main className="flex-1 h-[calc(100vh-98px)] overflow-y-auto px-8 py-6 space-y-6">

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-h2 font-extrabold text-primary-navy tracking-tight leading-none">
                                Hola, {usuarioSesion?.nombre || "Administrador"}
                            </h1>

                            <p className="text-secondary text-primary-blue font-semibold mt-1">
                                {activeMenu}
                            </p>
                        </div>
                    </div>

                    {/* =================================================
                        GESTIÓN DE USUARIOS
                        ================================================= */}
                    {activeMenu === "Gestión de Usuarios" && (
                        <>
                            <AdminMetricsCards usuarios={usuarios} />

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-6">

                                <div className="lg:col-span-5 xl:col-span-4">
                                    <BulkUploadCard onProcesar={fnCargarMasiva} />
                                </div>

                                <div className="lg:col-span-7 xl:col-span-8 overflow-hidden">
                                    <UserTableCard
                                        usuarios={usuarios}
                                        boolCargando={boolCargandoUsuarios}
                                        strError={strErrorUsuarios}
                                        onCrear={fnCrearUsuario}
                                        onEditar={fnEditarUsuario}
                                        onCambiarRol={fnCambiarRolUsuario}
                                        onCambiarEstado={fnCambiarEstadoUsuario}
                                    />
                                </div>

                            </div>
                        </>
                    )}

                    {/* =================================================
                        HISTORIAL DE AUDITORÍA
                        ================================================= */}
                    {activeMenu === "Historial de Auditoría" && (
                        <AuditoriaTable
                            registros={auditoria}
                            boolCargando={boolCargandoAuditoria}
                            strError={strErrorAuditoria}
                        />
                    )}

                    {/* =================================================
                        ROLES Y PERMISOS
                        ================================================= */}
                    {activeMenu === "Roles y Permisos" && (
                        <RolesTable
                            roles={roles}
                            boolCargando={boolCargandoRoles}
                            strError={strErrorRoles}
                        />
                    )}

                    {/* =================================================
                        REGISTRO DE EXÁMENES
                        ================================================= */}
                    {activeMenu === "Registro de Exámenes" && <SeccionRegistroExamenes />}

                    {/* =================================================
                        HABILITACIÓN DE ESTUDIANTES / GESTIÓN DE MATERIAS
                        ================================================= */}
                    {activeMenu === "Habilitación de Estudiantes" && (
                        <SeccionGestionHabilitacionesAdmin />
                    )}
                </main>
            </div>
        </div>
    );
}
