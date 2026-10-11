import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from "../../components/layout/Header";
import VentanaEmergente from "../../components/common/VentanaEmergente";
import BulkUploadCard from "../admin/components/BulkUploadCard";
import UsuarioFormFields from "../admin/components/UsuarioFormFields";
import { obtenerUsuarioActual } from "../../services/authService";
import { cargarUsuariosMasivo, registrarUsuarioIndividual } from "../../services/usuarioService";
import { obtenerMisExamenes, obtenerAsignaturasPorDocente } from "../../services/examenService";
import SeccionIncidencias from "../../components/incidencias/SeccionIncidencias";
import SeccionMonitoreo from "../../components/monitoreo/SeccionMonitoreo";
import SeccionControlIngresosDocente from "./components/SeccionControlIngresosDocente";
import { obtenerTotalIncidenciasAbiertas } from "../../services/incidenciaService";
import { AlertTriangle, ScanLine, Activity } from "lucide-react";
import { GraduationCap } from "lucide-react";
import CalendarioExamenes from "../credencial/componentes/CalendarioExamenes";
import { fechaCorta } from "../credencial/componentes/formato";
import SeccionMisExamenes from "./components/SeccionMisExamenes";
import SeccionRegistrarExamen from "./components/SeccionRegistrarExamen";
import TarjetaExamenInicio from "./components/TarjetaExamenInicio";
import ProximoExamenDocente from "./components/ProximoExamenDocente";
import AsignarOperadoresDocente from "./operadores/AsignarOperadoresDocente";
import { estadoExamen, marcaTiempo } from "./utilidadesExamenDocente";

// Un docente no puede registrar a otro docente, solo Operador o Estudiante
// (el backend ya lo valida igual en UsuarioService.validarPermisosRegistro).
const ROLES_REGISTRABLES_POR_DOCENTE = [
    { valor: "OPERADOR", etiqueta: "Operador" },
    { valor: "ESTUDIANTE", etiqueta: "Estudiante" },
];

function TarjetaExamenDocente({ examen, boolResaltado = false }) {
    const navigate = useNavigate();
    const porcentaje = examen.totalInscritos > 0
        ? Math.round((examen.ingresados / examen.totalInscritos) * 100)
        : 0;
    // El botón siempre se ve en exámenes reales; la pantalla de control avisa si aún no es la hora
    const boolPuedeIngreso = examen.esExamenReal !== false;

    return (
        <div id={`examen-${examen.idExamen}`} className={`bg-white border rounded-xl p-5 space-y-3 transition ${boolResaltado ? "border-[#1A365D] ring-2 ring-[#1A365D]/20" : "border-[#CBD5E1]"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#003770] text-white flex items-center justify-center shadow-xs shrink-0">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-[#08264A]">{examen.nombreExamen}</h4>
                            {examen.siglaAsignatura && (
                                <span className="bg-[#F0F6FC] text-[#1860A3] font-extrabold px-2 py-0.5 rounded text-[10px]">
                                    {examen.siglaAsignatura}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#64748B] font-bold mt-0.5">
                            {examen.fechaExamen ? `${fechaCorta(String(examen.fechaExamen).slice(0, 10))} · ` : ""}{examen.aula} · <span className="text-[#124B83]">{examen.horario}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 self-start sm:self-center">
                    {boolPuedeIngreso && (
                        <button
                            onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`)}
                            className="bg-[#003770] hover:bg-[#124B83] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
                        >
                            Control de ingreso →
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/habilitaciones`)}
                        className="bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1A365D] font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
                    >
                        Gestionar Habilitaciones
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
                <span className="bg-[#F0F6FC] border border-[#D9E8F7] text-[#1860A3] text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                    ✓ {examen.ingresados} Ingresaron
                </span>
                <span className="bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                    ⏱ {examen.noLlegan} Faltan
                </span>
                <span className="bg-[#FEF2F2] border border-[#FCD9D9] text-[#B91C1C] text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                    ✕ {examen.inhabilitados} Inhabilitados
                </span>
            </div>

            <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Progreso de acceso</span>
                    <span className="font-mono">{examen.ingresados} / {examen.totalInscritos}</span>
                </div>
                <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden border border-[#CBD5E1]">
                    <div className="bg-[#003770] h-full rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
                </div>
            </div>
        </div>
    );
}

export default function HomeDocente() {
    const [usuario, setUsuario] = useState(null);
    const [examenes, setExamenes] = useState([]);
    const [boolCargando, setBoolCargando] = useState(true);
    // Permite volver desde otra pantalla (p. ej. Gestionar Habilitaciones) a una sección concreta:
    // navigate("/home/docente", { state: { menu: "mis-examenes" } })
    const objUbicacion = useLocation();
    const strMenuInicial = ["inicio", "mis-examenes", "control-ingresos", "incidencias"].includes(objUbicacion.state?.menu)
        ? objUbicacion.state.menu
        : "inicio";
    const [strMenuActivo, setStrMenuActivo] = useState(strMenuInicial);
    const [totalIncidenciasAbiertas, setTotalIncidenciasAbiertas] = useState(0);
    // Sección desde la que se abrió "Registrar examen" (para que Cancelar vuelva ahí)
    const [strMenuAntesRegistro, setStrMenuAntesRegistro] = useState("mis-examenes");
    // Examen que se resalta al entrar a "Mis Exámenes" desde "Ver detalle"
    const [idExamenResaltado, setIdExamenResaltado] = useState(null);
    // Se incrementa al registrar un examen para volver a cargar la lista
    const [numRecarga, setNumRecarga] = useState(0);
    // Asignación de operadores por aula: examen abierto y recarga de la lista de operadores
    const [idExamenOperadores, setIdExamenOperadores] = useState(null);
    const [numRecargaOperadores, setNumRecargaOperadores] = useState(0);

    useEffect(() => {
        let cancel = false;
        async function fnCargarContadorIncidencias() {
            try {
                const res = await obtenerTotalIncidenciasAbiertas();
                if (!cancel && res && typeof res.total === "number") {
                    setTotalIncidenciasAbiertas(res.total);
                }
            } catch (err) {
                // Silencioso
            }
        }
        fnCargarContadorIncidencias();
        // Se actualiza cuando la sección Incidencias registra, revisa o cierra algo.
        window.addEventListener("incidencias:actualizadas", fnCargarContadorIncidencias);
        return () => {
            cancel = true;
            window.removeEventListener("incidencias:actualizadas", fnCargarContadorIncidencias);
        };
    }, [strMenuActivo]);

    useEffect(() => {
        const user = obtenerUsuarioActual();
        if (user) {
            setUsuario(user);
        } else {
            setUsuario({
                idUsuario: 45892,
                nombre: "Patricia",
                apellido: "Pérez",
                correo: "patricia.perez@umss.edu",
                rol: "DOCENTE",
                codigoSis: 45892,
            });
        }
    }, []);

    useEffect(() => {
        let cancel = false;
        async function cargarExamenesDocente() {
            setBoolCargando(true);
            try {
                const dataExamenes = await obtenerMisExamenes();
                if (!cancel && Array.isArray(dataExamenes) && dataExamenes.length > 0) {
                    const mapeados = dataExamenes.map((ex) => {
                        const primerAmb = ex.ambientes && ex.ambientes.length > 0 ? ex.ambientes[0] : null;
                        const horaInicio = (ex.horaInicio || primerAmb?.horaInicio || "").toString().substring(0, 5);
                        const horaFin = (ex.horaFin || primerAmb?.horaFin || "").toString().substring(0, 5);
                        const aulaNombre = primerAmb?.nombreAmbiente || primerAmb?.nombreAula || "";
                        const bloque = primerAmb?.ubicacionAmbiente || primerAmb?.bloque || "";
                        const strAula = ex.ambientes && ex.ambientes.length > 0
                            ? ex.ambientes.map((a) => {
                                const nombre = a.nombreAmbiente || a.nombreAula || "Aula";
                                const ubi = a.ubicacionAmbiente || a.bloque || "";
                                return `${nombre}${ubi ? ` · ${ubi}` : ""}`;
                            }).join(" + ")
                            : "Aula por definir";
                        const strHorario = horaInicio && horaFin
                            ? `${horaInicio} – ${horaFin}`
                            : (ex.duracionExamen ? `${ex.duracionExamen}` : "Horario programado");

                        const total = ex.totalInscritos || ex.totalEstudiantes || 0;
                        const ing = ex.ingresados || 0;
                        const inhab = ex.inhabilitados || 0;
                        const faltan = ex.noLlegan !== undefined ? ex.noLlegan : Math.max(0, total - ing - inhab);

                        return {
                            idExamen: ex.idExamen,
                            idAsignatura: ex.idAsignatura,
                            nombreExamen: ex.nombreAsignatura || ex.nombreTipoExamen || "Examen Programado",
                            siglaAsignatura: ex.siglaAsignatura || "",
                            aula: strAula,
                            aulaNombre: aulaNombre || "Aula por definir",
                            bloque,
                            horario: strHorario,
                            fechaExamen: ex.fechaExamen,
                            horaInicio,
                            horaFin,
                            tipoExamen: ex.nombreTipoExamen || "",
                            ingresados: ing,
                            noLlegan: faltan,
                            inhabilitados: inhab,
                            totalInscritos: total,
                            esExamenReal: true,
                            ambientes: ex.ambientes || [],
                        };
                    });
                    setExamenes(mapeados);
                    setBoolCargando(false);
                    return;
                }
            } catch (err) {
                console.warn("No se pudieron cargar exámenes desde /mis-examenes:", err);
            }

            // Fallback: Si no hay exámenes aún, cargar las asignaturas reales asociadas a este docente
            try {
                const current = usuario || obtenerUsuarioActual();
                if (current?.idUsuario && current?.codigoSis) {
                    const asigs = await obtenerAsignaturasPorDocente(current.idUsuario, current.codigoSis);
                    if (!cancel && Array.isArray(asigs) && asigs.length > 0) {
                        const mapeadosAsig = asigs.map((a, idx) => {
                            const total = a.totalEstudiantes || (a.cantidadHabilitados || 0) + (a.cantidadInhabilitados || 0);
                            const hab = a.cantidadHabilitados || 0;
                            const inhab = a.cantidadInhabilitados || 0;
                            return {
                                idExamen: a.idAsignatura || idx + 1,
                                idAsignatura: a.idAsignatura,
                                nombreExamen: a.nombreAsignatura || a.nombre,
                                siglaAsignatura: a.siglaAsignatura || a.codigo || '',
                                aula: 'Asignatura Asignada · UMSS',
                                horario: 'Gestión Oficial',
                                ingresados: hab,
                                noLlegan: Math.max(0, total - hab - inhab),
                                inhabilitados: inhab,
                                totalInscritos: total,
                                esExamenReal: false,
                            };
                        });
                        setExamenes(mapeadosAsig);
                    }
                }
            } catch (errAsig) {
                console.warn("No se pudieron cargar asignaturas del docente:", errAsig);
            } finally {
                if (!cancel) setBoolCargando(false);
            }
        }

        cargarExamenesDocente();
        return () => { cancel = true; };
    }, [usuario, numRecarga]);

    const strNombre = usuario?.nombre || "Docente";
    const strApellido = usuario?.apellido || "";
    const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

    const [boolModalRegistroAbierto, setBoolModalRegistroAbierto] = useState(false);
    const [strSeccionRegistro, setStrSeccionRegistro] = useState("individual");

    const fnIrARegistrarExamen = () => {
        if (strMenuActivo !== "registrar-examen") setStrMenuAntesRegistro(strMenuActivo);
        setStrMenuActivo("registrar-examen");
    };

    const fnAbrirOperadores = (idExamen) => {
        setIdExamenOperadores(idExamen);
        setStrMenuActivo("asignar-operadores");
    };

    const fnRegistrarOperador = () => {
        setStrSeccionRegistro("individual");
        setBoolModalRegistroAbierto(true);
    };

    const fnVerDetalleExamen = (idExamen) => {
        setIdExamenResaltado(idExamen);
        setStrMenuActivo("mis-examenes");
    };

    const fnExamenRegistrado = () => {
        setNumRecarga((n) => n + 1);
        setIdExamenResaltado(null);
        setStrMenuActivo("mis-examenes");
    };

    // Exámenes que aún no terminaron, del más cercano al más lejano (Inicio y "Próximo examen")
    const listExamenesVigentes = examenes
        .filter((e) => e.esExamenReal !== false && ["EN_CURSO", "PROXIMO"].includes(estadoExamen(e)))
        .sort((a, b) => marcaTiempo(a) - marcaTiempo(b));

    const listExamenesCalendario = examenes
        .filter((e) => e.esExamenReal !== false && e.fechaExamen)
        .map((e) => ({
            id: e.idExamen,
            fecha: String(e.fechaExamen).slice(0, 10),
            materia: e.nombreExamen,
            horaInicio: e.horaInicio,
            horaFin: e.horaFin,
            aula: e.aulaNombre,
        }));

    const boolMenuControl = strMenuActivo === "control-ingresos" || strMenuActivo === "asignar-operadores";

    const fnCargarMasiva = async (file, materia, tipoCarga, docente, grupo) => {
        return cargarUsuariosMasivo(file, "ESTUDIANTE", grupo ? Number(grupo) : null);
    };

    const fnRegistrarIndividual = async (datos) => {
        await registrarUsuarioIndividual(datos);
        setBoolModalRegistroAbierto(false);
        // Si se registró un operador, la pantalla de asignación vuelve a pedir la lista
        setNumRecargaOperadores((n) => n + 1);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-nunito">

            {/* HEADER FIJO (incluye el menú de cuenta: cambiar contraseña /
                cerrar sesión, ver Header.jsx) */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
                <Header strRutaActiva="Inicio" />
            </div>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="flex-1 w-full">
                <div className="flex pt-[115px] pb-10 max-w-[1440px] mx-auto px-6 gap-6">

                    {/* SIDEBAR IZQUIERDA */}
                    <aside className="w-72 shrink-0 hidden lg:block space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#1A365D] text-white font-black text-xl flex items-center justify-center shadow-md mb-3">
                                {strIniciales}
                            </div>
                            <h3 className="font-extrabold text-[#1A365D] text-sm">{strNombre} {strApellido}</h3>
                            <span className="text-[11px] text-[#1A365D] font-bold mb-4">DOCENTE UMSS</span>
                            <div className="w-full border-t border-slate-100 pt-3 text-left space-y-2 text-xs">
                                <p className="text-slate-600"><span className="font-bold text-[#1A365D]">Facultad:</span> Cs. y Tecnología</p>
                                <p className="text-slate-600"><span className="font-bold text-[#1A365D]">Código Docente:</span> {usuario?.codigoSis || "-"}</p>
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <button
                                onClick={() => setStrMenuActivo("inicio")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "inicio"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                Inicio
                            </button>
                            <button
                                onClick={() => { setIdExamenResaltado(null); setStrMenuActivo("mis-examenes"); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "mis-examenes"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <svg className={`w-4 h-4 ${strMenuActivo === "mis-examenes" ? "text-white" : "text-[#1A365D]"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                Mis Exámenes
                            </button>
                            <button
                                onClick={fnIrARegistrarExamen}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "registrar-examen"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <svg className={`w-4 h-4 ${strMenuActivo === "registrar-examen" ? "text-white" : "text-[#1A365D]"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                                Registrar Examen
                            </button>
                            <button
                                onClick={() => setStrMenuActivo("control-ingresos")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${boolMenuControl
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <ScanLine className={`w-4 h-4 ${boolMenuControl ? "text-white" : "text-[#1A365D]"}`} />
                                Control de ingresos
                            </button>
                            <button
                                onClick={() => setStrMenuActivo("monitoreo")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "monitoreo"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <Activity className={`w-4 h-4 ${strMenuActivo === "monitoreo" ? "text-white" : "text-[#1A365D]"}`} />
                                Monitoreo de Asistencia
                            </button>
                            <button onClick={() => setStrMenuActivo("inicio")} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer">
                                <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                Reportes y Asistencia
                            </button>
                            <button
                                onClick={() => setStrMenuActivo("incidencias")}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "incidencias"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className={`w-4 h-4 ${strMenuActivo === "incidencias" ? "text-white" : "text-[#1A365D]"}`} />
                                    <span>Incidencias</span>
                                </div>
                                {totalIncidenciasAbiertas > 0 && (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${strMenuActivo === "incidencias"
                                        ? "bg-white text-rose-600"
                                        : "bg-rose-100 text-rose-700"
                                        }`}>
                                        {totalIncidenciasAbiertas}
                                    </span>
                                )}
                            </button>
                            <button onClick={() => { setStrSeccionRegistro("individual"); setBoolModalRegistroAbierto(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer">
                                <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-7a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                Registrar Estudiante/Operador
                            </button>
                        </div>
                    </aside>

                    {/* CONTENIDO CENTRAL */}
                    <main className="flex-1 min-w-0 space-y-6">
                            {strMenuActivo === "incidencias" ? (
                                <SeccionIncidencias rol="DOCENTE" />
                            ) : strMenuActivo === "monitoreo" ? (
                                <SeccionMonitoreo rol="DOCENTE" />
                            ) : strMenuActivo === "mis-examenes" ? (
                                <SeccionMisExamenes
                                    examenes={examenes}
                                    boolCargando={boolCargando}
                                    TarjetaExamen={TarjetaExamenDocente}
                                    onRegistrar={fnIrARegistrarExamen}
                                    idResaltado={idExamenResaltado}
                                />
                            ) : strMenuActivo === "registrar-examen" ? (
                                <SeccionRegistrarExamen
                                    onCancelar={() => setStrMenuActivo(strMenuAntesRegistro)}
                                    onRegistrado={fnExamenRegistrado}
                                />
                            ) : strMenuActivo === "asignar-operadores" ? (
                                (() => {
                                    const examenOp = examenes.find((e) => e.idExamen === idExamenOperadores);
                                    if (!examenOp) {
                                        return (
                                            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">
                                                {boolCargando ? "Cargando examen..." : "No se encontró el examen."}{" "}
                                                <button type="button" onClick={() => setStrMenuActivo("control-ingresos")} className="text-[#003770] font-bold hover:underline cursor-pointer">Volver</button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <AsignarOperadoresDocente
                                            key={examenOp.idExamen}
                                            examen={examenOp}
                                            usuario={usuario}
                                            soloLectura={["EN_CURSO", "FINALIZADO"].includes(estadoExamen(examenOp))}
                                            onVolver={() => setStrMenuActivo("control-ingresos")}
                                            onRegistrarOperador={fnRegistrarOperador}
                                            numRecargaOperadores={numRecargaOperadores}
                                        />
                                    );
                                })()
                            ) : strMenuActivo === "control-ingresos" ? (
                                <SeccionControlIngresosDocente examenes={examenes} boolCargando={boolCargando} onAsignarOperadores={fnAbrirOperadores} />
                            ) : (
                                <>
                                    <div className="w-full bg-[image:var(--gradient-button)] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[130px]" style={{ backgroundImage: 'linear-gradient(to right, #1A365D, #2563EB, #DC2626)' }}>
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
                                            ¡HOLA, {strNombre.toUpperCase()}!
                                        </span>
                                        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                                            Bienvenida a SCIEM-PASS
                                        </h1>
                                        <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
                                            Aquí podrás supervisar tus exámenes programados hoy, llevar el control de ingresos y gestionar las habilitaciones de tus estudiantes.
                                        </p>
                                    </div>

                                    {/* GRILLA PRINCIPAL */}
                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                                        {/* SECCIÓN DE EXÁMENES (resumen: lo demás está en "Mis Exámenes") */}
                                        <div className="xl:col-span-2 space-y-4">
                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
                                                    <h3 className="text-base font-black text-[#1A365D]">
                                                        Exámenes próximos
                                                    </h3>
                                                    <span className="text-[11px] font-extrabold text-[#1A365D] bg-slate-100 px-3 py-1 rounded-full">
                                                        {listExamenesVigentes.length} {listExamenesVigentes.length === 1 ? "examen" : "exámenes"}
                                                    </span>
                                                </div>

                                                {boolCargando ? (
                                                    <div className="text-center py-8 text-slate-500 text-xs font-semibold animate-pulse">
                                                        Cargando exámenes del docente...
                                                    </div>
                                                ) : listExamenesVigentes.length === 0 ? (
                                                    <div className="text-center py-8 text-slate-500 text-xs font-semibold bg-[#F8FAFC] rounded-2xl border border-slate-200 mt-4">
                                                        No tienes exámenes próximos.
                                                    </div>
                                                ) : (
                                                    listExamenesVigentes.slice(0, 3).map((examen) => (
                                                        <TarjetaExamenInicio
                                                            key={examen.idExamen}
                                                            examen={examen}
                                                            onVerDetalle={fnVerDetalleExamen}
                                                        />
                                                    ))
                                                )}

                                                <div className="border-t border-slate-100 pt-4 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIdExamenResaltado(null); setStrMenuActivo("mis-examenes"); }}
                                                        className="text-xs font-bold text-[#003770] hover:underline cursor-pointer"
                                                    >
                                                        Ver todos mis exámenes →
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PANEL DERECHO */}
                                        <div className="space-y-6">
                                            <CalendarioExamenes
                                                listExamenes={listExamenesCalendario}
                                                onVerQr={fnVerDetalleExamen}
                                            />
                                            <ProximoExamenDocente
                                                examen={listExamenesVigentes[0] || null}
                                                onVerDetalle={fnVerDetalleExamen}
                                            />
                                        </div>

                                    </div>

                                </>
                            )}
                        </main>
                </div>
            </div>


            <VentanaEmergente
                boolAbierto={boolModalRegistroAbierto}
                onCerrar={() => setBoolModalRegistroAbierto(false)}
            >
                <div className="p-6">
                    <h2 className="text-base font-black text-[#1A365D] mb-1">Registrar Estudiante u Operador</h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                        La carga masiva solo admite Estudiantes. Para registrar un Operador, usa el registro individual.
                    </p>

                    <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setStrSeccionRegistro("individual")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${strSeccionRegistro === "individual"
                                ? "bg-white text-[#1A365D] shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Registro individual
                        </button>
                        <button
                            onClick={() => setStrSeccionRegistro("masivo")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${strSeccionRegistro === "masivo"
                                ? "bg-white text-[#1A365D] shadow-xs"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Carga masiva
                        </button>
                    </div>

                    {strSeccionRegistro === "individual" ? (
                        <UsuarioFormFields
                            modo="crear"
                            usuarioInicial={null}
                            rolesDisponibles={ROLES_REGISTRABLES_POR_DOCENTE}
                            onCerrar={() => setBoolModalRegistroAbierto(false)}
                            onGuardar={fnRegistrarIndividual}
                            boolActivo={boolModalRegistroAbierto && strSeccionRegistro === "individual"}
                        />
                    ) : (
                        <BulkUploadCard onProcesar={fnCargarMasiva} soloEstudiantes />
                    )}
                </div>
            </VentanaEmergente>

        </div>
    );
}
