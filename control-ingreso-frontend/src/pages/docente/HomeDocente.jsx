import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from "../../components/layout/Header";
import VentanaEmergente from "../../components/common/VentanaEmergente";
import BulkUploadCard from "../admin/components/BulkUploadCard";
import UsuarioFormFields from "../admin/components/UsuarioFormFields";
import { obtenerUsuarioActual } from "../../services/authService";
import { cargarUsuariosMasivo, registrarUsuarioIndividual } from "../../services/usuarioService";
import { obtenerMisExamenes } from "../../services/examenService";
import SeccionIncidencias from "../../components/incidencias/SeccionIncidencias";
import SeccionMonitoreo from "../../components/monitoreo/SeccionMonitoreo";
import SeccionReportesAsistencia from "../../components/reportes/SeccionReportesAsistencia";
import SeccionReporteIntentosIncorrectos from "../../components/reportes/SeccionReporteIntentosIncorrectos";
import SeccionControlIngresosDocente from "./components/SeccionControlIngresosDocente";
import { obtenerTotalIncidenciasAbiertas } from "../../services/incidenciaService";
import { AlertTriangle, ScanLine, Activity } from "lucide-react";
import CalendarioExamenes from "../credencial/componentes/CalendarioExamenes";
import SeccionMisExamenes from "./components/SeccionMisExamenes";
import TarjetaExamenDocente from "./components/TarjetaExamenDocente";
import SeccionRegistrarExamen from "./components/SeccionRegistrarExamen";
import TarjetaExamenInicio from "./components/TarjetaExamenInicio";
import ProximoExamenDocente from "./components/ProximoExamenDocente";
import AsignarOperadoresDocente from "./operadores/AsignarOperadoresDocente";
import { estadoExamen, marcaTiempo, esHoy } from "./utilidadesExamenDocente";
import Expulsiones from "./expulsiones/Expulsiones";
import { UserMinus } from "lucide-react";

// Un docente no puede registrar a otro docente, solo Operador o Estudiante
// (el backend ya lo valida igual en UsuarioService.validarPermisosRegistro).
const ROLES_REGISTRABLES_POR_DOCENTE = [
    { valor: "OPERADOR", etiqueta: "Ayudante" },
    { valor: "ESTUDIANTE", etiqueta: "Estudiante" },
];

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
                if (!cancel && Array.isArray(dataExamenes)) {
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
                            grupo: ex.grupo || ex.nombreGrupo || "",
                            ingresados: ing,
                            noLlegan: faltan,
                            inhabilitados: inhab,
                            totalInscritos: total,
                            esExamenReal: true,
                            ambientes: ex.ambientes || [],
                        };
                    });
                    setExamenes(mapeados);
                }
            } catch (err) {
                console.warn("No se pudieron cargar exámenes desde /mis-examenes:", err);
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

    // Inicio: solo los exámenes de HOY que están en curso o por empezar
    const listExamenesHoy = listExamenesVigentes.filter((e) => esHoy(e));
    const strFechaHoy = (() => {
        const str = new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
        return str.charAt(0).toUpperCase() + str.slice(1);
    })();

    const listExamenesCalendario = examenes
        .filter((e) => e.esExamenReal !== false && e.fechaExamen)
        .map((e) => ({
            id: e.idExamen,
            fecha: String(e.fechaExamen).slice(0, 10),
            materia: e.nombreExamen,
            horaInicio: e.horaInicio,
            horaFin: e.horaFin,
            // El calendario ya antepone "Aula": se quita del nombre para no mostrar "Aula Aula 691A"
            aula: String(e.aulaNombre || "").replace(/^aula\s*/i, "").trim(),
        }));

    const boolMenuControl = strMenuActivo === "control-ingresos" || strMenuActivo === "asignar-operadores";

    const fnCargarMasiva = async (file, materia, tipoCarga, docente, grupo) => {
        return cargarUsuariosMasivo(file, "ESTUDIANTE", grupo ? Number(grupo) : null);
    };

    const [mensajeRegistro, setMensajeRegistro] = useState("");
    const fnRegistrarIndividual = async (datos) => {
        await registrarUsuarioIndividual(datos);
        setMensajeRegistro("Usuario registrado correctamente.");
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
                    <aside className="w-[280px] shrink-0 hidden lg:block space-y-6">
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
                                Control de Ingresos
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
                            <button
                                onClick={() => setStrMenuActivo("reportes")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "reportes"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <svg className={`w-4 h-4 ${strMenuActivo === "reportes" ? "text-white" : "text-[#1A365D]"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                Reportes y Asistencia
                            </button>
                            <button
                                onClick={() => setStrMenuActivo("intentos-incorrectos")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "intentos-incorrectos"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <svg className={`w-4 h-4 ${strMenuActivo === "intentos-incorrectos" ? "text-white" : "text-[#1A365D]"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path></svg>
                                Intentos Incorrectos
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

                            {/* Módulo Expulsiones */}
                            <button
                                onClick={() => setStrMenuActivo("expulsiones")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${strMenuActivo === "expulsiones"
                                    ? "bg-[#1A365D] text-white shadow-xs"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <UserMinus className={`w-4 h-4 ${strMenuActivo === "expulsiones" ? "text-white" : "text-[#1A365D]"}`} />
                                    <span>Expulsiones</span>
                                </div>
                            </button>
                            <button onClick={() => { setStrSeccionRegistro("individual"); setBoolModalRegistroAbierto(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs text-left whitespace-nowrap transition cursor-pointer">
                                <svg className="w-4 h-4 shrink-0 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-7a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                Registrar Estudiante/Ayudante
                            </button>
                        </div>
                    </aside>

                    {/* CONTENIDO CENTRAL */}
                    <main className="flex-1 min-w-0 space-y-6">
                        {strMenuActivo === "reportes" ? (
                            <SeccionReportesAsistencia strRol="DOCENTE" />
                        ) : strMenuActivo === "intentos-incorrectos" ? (
                            <SeccionReporteIntentosIncorrectos strRol="DOCENTE" />
                        ) : strMenuActivo === "incidencias" ? (
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
                        ) : strMenuActivo === "expulsiones" ? (
                            <Expulsiones />
                        ) : (
                            <>
                                <div className="w-full bg-[image:var(--gradient-button)] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[130px]" style={{ backgroundImage: 'linear-gradient(to right, #1A365D, #2563EB, #DC2626)' }}>
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
                                        ¡HOLA, {strNombre.toUpperCase()}!
                                    </span>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                                        Te damos la bienvenida a SCIEM-PASS
                                    </h1>
                                    <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
                                        Aquí podrás supervisar tus exámenes programados hoy, llevar el control de ingresos y gestionar las habilitaciones de tus estudiantes.
                                    </p>
                                </div>

                                {/* GRILLA PRINCIPAL: exámenes de hoy (ancho) + calendario (angosto) */}
                                <div className="flex flex-col xl:flex-row gap-6 items-start">

                                    {/* MIS EXÁMENES DE HOY (lo demás está en "Mis Exámenes") */}
                                    <div className="w-full xl:flex-1 min-w-0">
                                        <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
                                            <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0]">
                                                <h3 className="text-base font-black text-[#08264A]">Mis exámenes de hoy</h3>
                                                <p className="text-xs font-bold text-slate-500 mt-0.5">{strFechaHoy}</p>
                                            </div>
                                            <div className="px-5 py-4 space-y-2.5">
                                                {boolCargando ? (
                                                    <div className="text-center py-6 text-slate-500 text-xs font-semibold animate-pulse">
                                                        Cargando exámenes del docente...
                                                    </div>
                                                ) : listExamenesHoy.length === 0 ? (
                                                    <div className="text-center py-6 text-slate-500 text-xs font-semibold">
                                                        No tienes exámenes hoy.
                                                    </div>
                                                ) : (
                                                    listExamenesHoy.map((examen) => (
                                                        <TarjetaExamenInicio key={examen.idExamen} examen={examen} />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* PANEL DERECHO (más angosto) */}
                                    <div className="w-full xl:w-64 shrink-0 space-y-6">
                                        <CalendarioExamenes
                                            listExamenes={listExamenesCalendario}
                                            onVerQr={fnVerDetalleExamen}
                                        />
                                        <ProximoExamenDocente
                                            examen={listExamenesVigentes.find((e) => !esHoy(e)) || null}
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
                    <h2 className="text-base font-black text-[#1A365D] mb-1">Registrar Estudiante o Ayudante</h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                        La carga masiva solo admite Estudiantes. Para registrar un Ayudante, usa el registro individual.
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
                            mensajeExito={mensajeRegistro}
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
