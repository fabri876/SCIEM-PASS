import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/layout/Header";
import HistorialSemestres from "./components/HistorialSemestres";
import AdminSidebar from "./components/AdminSidebar";
import AdminMetricsCards from "./components/AdminMetricsCards";
import BulkUploadCard from "./components/BulkUploadCard";
import GestionGruposAsignaturaCard from "./components/GestionAcademicaCard";
import CatalogoAcademicoTable from "./components/CatalogoAcademicoTable";
import UserTableCard from "./components/UserTableCard";
import HistorialInmodificable from "./components/HistorialInmodificable";
import RolesTable from "./components/RolesTable";
import SeccionRegistroExamenes from "./components/SeccionRegistroExamenes";
import SeccionGestionHabilitacionesAdmin from "./components/SeccionGestionHabilitacionesAdmin";
import CargaExamenesPasados from "./components/CargaExamenesPasados";
import SeccionIncidencias from "../../components/incidencias/SeccionIncidencias";
import SeccionMonitoreo from "../../components/monitoreo/SeccionMonitoreo";
import SeccionReportesAsistencia from "../../components/reportes/SeccionReportesAsistencia";
import SeccionReporteIntentosIncorrectos from "../../components/reportes/SeccionReporteIntentosIncorrectos";
import GestionEnrolamientosAdmin from "./GestionEnrolamientosAdmin";
import AuditoriaFacialAdmin from "./AuditoriaFacialAdmin";
import BackupsPanel from "./components/BackupsPanel";
import { obtenerUsuarioActual } from "../../services/authService";
import {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    cambiarRolUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario,
    listarRoles,
    cargarUsuariosMasivo
} from "../../services/adminService";

export default function AdminDashboard({ onNavigateToLogin }) {
    // Al volver desde otra pantalla (p. ej. el control de ingreso) se puede indicar la sección:
    // navigate("/admin", { state: { menu: "Gestión de Exámenes" } })
    const objUbicacion = useLocation();
    const [activeMenu, setActiveMenu] = useState(objUbicacion.state?.menu || "Gestión de Usuarios");
    const [menuAdminMovilAbierto, setMenuAdminMovilAbierto] = useState(false);
    const [revisionAcademica, setRevisionAcademica] = useState(0);
    const usuarioSesion = obtenerUsuarioActual();

    const [usuarios, setUsuarios] = useState([]);
    const [boolCargandoUsuarios, setBoolCargandoUsuarios] = useState(true);
    const [strErrorUsuarios, setStrErrorUsuarios] = useState("");

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
        const respuesta = await crearUsuario(datos);
        await fnCargarUsuarios();
        return respuesta;
    };

    const fnEditarUsuario = async (idUsuario, datos) => {
        await actualizarUsuario(idUsuario, datos);
        await fnCargarUsuarios();
        setRevisionAcademica(v => v + 1);
    };

    const fnEliminarUsuario = async idUsuario => {
        await eliminarUsuario(idUsuario);
        await fnCargarUsuarios();
        setRevisionAcademica(v => v + 1);
    };

    const fnCambiarRolUsuario = async (idUsuario, nuevoRol, codigoSis) => {
        await cambiarRolUsuario(idUsuario, nuevoRol, codigoSis);
        await fnCargarUsuarios();
    };

    const fnCambiarEstadoUsuario = async (idUsuario, nuevoEstado) => {
        await cambiarEstadoUsuario(idUsuario, nuevoEstado);
        await fnCargarUsuarios();
    };

    const fnCargarMasiva = async (file, materia, tipoCarga, docente, grupo,carrera) => {
        const strRolTarget = tipoCarga === "docentes" ? "DOCENTE" : "ESTUDIANTE";
        const resultado = await cargarUsuariosMasivo(file, strRolTarget, grupo ? Number(grupo) : null,false,carrera);
        void fnCargarUsuarios();
        return resultado;
    };

    return (
        <div className="min-h-screen bg-bg-app font-sans text-text-body flex flex-col">

            {/* =========================================================
                HEADER SUPERIOR (Intacto, controlado por componente externo)
                ========================================================= */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 h-[98px] shadow-sm">
                <Header strRutaActiva="Inicio" />
            </div>

            {/* =========================================================
                LAYOUT PRINCIPAL RESPONSIVO
                ========================================================= */}
            <div className="flex pt-[98px] min-h-[calc(100vh-98px)] w-full">

                {/* =====================================================
                    SIDEBAR ADMINISTRADOR (Fijo en desktop, oculto/ajustable en móviles)
                    ==================================================== */}
                <aside className="w-64 shrink-0 bg-primary-navy hidden lg:block sticky top-[98px] h-[calc(100vh-98px)] overflow-y-auto z-30">
                    <AdminSidebar
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        onNavigateToLogin={onNavigateToLogin}
                    />
                </aside>

                {/* =====================================================
                    ÁREA DE CONTENIDO PRINCIPAL
                    ==================================================== */}
                <main className="flex-1 min-w-0 p-4 lg:p-8 space-y-6 overflow-x-hidden">

                    <div className="lg:hidden">
                        <button type="button" aria-expanded={menuAdminMovilAbierto}
                            aria-controls="menu-administracion-movil"
                            onClick={() => setMenuAdminMovilAbierto(abierto => !abierto)}
                            className="rounded-xl bg-primary-navy px-4 py-2 text-sm font-bold text-white">
                            {menuAdminMovilAbierto ? "Cerrar menú de administración" : "Menú de administración"}
                        </button>
                        {menuAdminMovilAbierto && (
                            <nav id="menu-administracion-movil" aria-label="Menú de administración" className="mt-2 rounded-xl overflow-hidden">
                                <AdminSidebar activeMenu={activeMenu} setActiveMenu={menu => {
                                    setActiveMenu(menu);
                                    setMenuAdminMovilAbierto(false);
                                }} />
                            </nav>
                        )}
                    </div>

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl lg:text-h2 font-extrabold text-primary-navy tracking-tight leading-none">
                                Hola, {textoInterfaz(usuarioSesion?.nombre || "Administrador")}
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

                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-blue/20 bg-primary-blue/5 p-4">
                                <p className="text-secondary text-primary-navy">Importar horario o crear materias y grupos. Las personas se vinculan al registrarlas.</p>
                                <button type="button" onClick={() => setActiveMenu("Gestión de Asignaturas y Grupos")} className="shrink-0 rounded-xl bg-primary-blue px-4 py-2.5 text-secondary font-bold text-white hover:bg-primary-navy transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue">
                                    Ir a asignaturas y grupos
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-6">

                                <div className="lg:col-span-5 xl:col-span-4 space-y-5">
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
                                        onEliminar={fnEliminarUsuario}
                                    />
                                </div>

                            </div>
                        </>
                    )}

                    {activeMenu === "Gestión de Asignaturas y Grupos" && <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                        <div className="xl:col-span-5"><GestionGruposAsignaturaCard docentes={usuarios.filter(u => u.rol === "DOCENTE")} onCatalogChange={() => setRevisionAcademica(v => v + 1)} /></div>
                        <div className="xl:col-span-7 min-w-0"><CatalogoAcademicoTable usuarios={usuarios} revision={revisionAcademica} docentes={usuarios.filter(u => u.rol === "DOCENTE")} /></div>
                    </div>}

                    {/* =================================================
                        HISTORIAL DE SEMESTRES
                        ================================================= */}
                    {activeMenu === "Historial de Semestres" && <HistorialSemestres onCambio={() => { setRevisionAcademica(v => v + 1); void fnCargarUsuarios(); }} />}
                    {activeMenu === "Enrolamientos Faciales" && <GestionEnrolamientosAdmin />}
                    {activeMenu === "Auditoría Facial" && <AuditoriaFacialAdmin />}

                    {/* =================================================
                        COPIAS DE SEGURIDAD (BACKUPS DE LA BASE DE DATOS)
                        ================================================= */}
                    {activeMenu === "Copias de Seguridad" && (
                        <BackupsPanel onRestaurado={() => { void fnCargarUsuarios(); setRevisionAcademica(v => v + 1); }} />
                    )}

                    {/* =================================================
                        HISTORIAL INMODIFICABLE (HU15)
                        ================================================= */}
                    {(activeMenu === "Historial Inmodificable" || activeMenu === "Historial de Auditoría") && (
                        <HistorialInmodificable />
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
                        GESTIÓN DE EXÁMENES
                        ================================================= */}
                    {activeMenu === "Gestión de Exámenes" && <SeccionRegistroExamenes />}

                    {/* =================================================
                        HABILITACIÓN DE ESTUDIANTES / GESTIÓN DE MATERIAS
                        ================================================= */}
                    {activeMenu === "Habilitación de Estudiantes" && (
                        <SeccionGestionHabilitacionesAdmin />
                    )}

                    {/* =================================================
                        CARGA DE EXÁMENES PASADOS
                        ================================================= */}
                    {activeMenu === "Carga de Exámenes Pasados" && <CargaExamenesPasados />}

                    {/* =================================================
                        INCIDENCIAS E INGRESO EXCEPCIONAL (HU06)
                        ================================================= */}
                    {activeMenu === "Incidencias" && (
                        <SeccionIncidencias rol="ADMINISTRADOR" />
                    )}

                    {/* =================================================
                        MONITOREO DE ASISTENCIA Y CONTROL DE AULAS (HU10)
                        ================================================= */}
                    {activeMenu === "Monitoreo de Asistencia" && (
                        <SeccionMonitoreo rol="ADMINISTRADOR" />
                    )}

                    {/* =================================================
                        REPORTES Y ASISTENCIA (HU12)
                        ================================================= */}
                    {activeMenu === "Reportes y Asistencia" && (
                        <SeccionReportesAsistencia strRol="ADMINISTRADOR" boolMostrarTitulo={false} />
                    )}

                    {/* =================================================
                        REPORTE DE INTENTOS INCORRECTOS (HU13)
                        ================================================= */}
                    {activeMenu === "Reporte de Intentos Incorrectos" && (
                        <SeccionReporteIntentosIncorrectos strRol="ADMINISTRADOR" />
                    )}
                </main>
            </div>
        </div>
    );
}
