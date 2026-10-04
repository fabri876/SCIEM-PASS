import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "../../components/layout/Header";
import VentanaEmergente from "../../components/common/VentanaEmergente";
import ExamenForm from "../../components/examenes/ExamenForm";
import BulkUploadCard from "../admin/components/BulkUploadCard";
import UsuarioFormFields from "../admin/components/UsuarioFormFields";
import { obtenerUsuarioActual } from "../../services/authService";
import { cargarUsuariosMasivo, registrarUsuarioIndividual } from "../../services/usuarioService";
import { obtenerMisExamenes, obtenerAsignaturasPorDocente } from "../../services/examenService";

// Un docente no puede registrar a otro docente, solo Ayudante o Estudiante
// (el backend ya lo valida igual en UsuarioService.validarPermisosRegistro).
const ROLES_REGISTRABLES_POR_DOCENTE = [
    { valor: "OPERADOR", etiqueta: "Ayudante" },
    { valor: "ESTUDIANTE", etiqueta: "Estudiante" },
];

export default function HomeDocente() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    const [examenes, setExamenes] = useState([]);
    const [boolCargando, setBoolCargando] = useState(true);

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
                        const strAula = ex.ambientes && ex.ambientes.length > 0
                            ? ex.ambientes.map(a => `${a.nombreAula || 'Aula'} · ${a.bloque || ''}`.trim()).join(' + ')
                            : 'Aula por definir';
                        const strHorario = ex.horaInicio && ex.horaFin
                            ? `${ex.horaInicio.substring(0, 5)} – ${ex.horaFin.substring(0, 5)}`
                            : (ex.duracionExamen ? `${ex.duracionExamen}` : 'Horario programado');

                        const total = ex.totalInscritos || ex.totalEstudiantes || 0;
                        const ing = ex.ingresados || 0;
                        const inhab = ex.inhabilitados || 0;
                        const faltan = ex.noLlegan !== undefined ? ex.noLlegan : Math.max(0, total - ing - inhab);

                        return {
                            idExamen: ex.idExamen,
                            idAsignatura: ex.idAsignatura,
                            nombreExamen: ex.nombreAsignatura || ex.nombreTipoExamen || 'Examen Programado',
                            siglaAsignatura: ex.siglaAsignatura || '',
                            aula: strAula,
                            horario: strHorario,
                            ingresados: ing,
                            noLlegan: faltan,
                            inhabilitados: inhab,
                            totalInscritos: total,
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
    }, [usuario]);

    const strNombre = usuario?.nombre || "Docente";
    const strApellido = usuario?.apellido || "";
    const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

    const [boolModalAbierto, setBoolModalAbierto] = useState(false);
    const [boolModalRegistroAbierto, setBoolModalRegistroAbierto] = useState(false);
    const [strSeccionRegistro, setStrSeccionRegistro] = useState("individual");

    const fnCargarMasiva = async (file) => {
        return cargarUsuariosMasivo(file, "ESTUDIANTE");
    };

    const fnRegistrarIndividual = async (datos) => {
        await registrarUsuarioIndividual(datos);
        setBoolModalRegistroAbierto(false);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-nunito pb-16">

            {/* HEADER FIJO (incluye el menú de cuenta: cambiar contraseña /
                cerrar sesión, ver Header.jsx) */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
                <Header strRutaActiva="Inicio" />
            </div>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="flex pt-[115px] max-w-[1440px] mx-auto px-6 gap-6">

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
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A365D] text-white rounded-xl font-bold text-xs shadow-xs">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                            Inicio
                        </button>
                        <button onClick={() => setBoolModalAbierto(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                            Registrar Examen
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Mis Exámenes
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            Reportes y Asistencia
                        </button>
                        <button onClick={() => { setStrSeccionRegistro("individual"); setBoolModalRegistroAbierto(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-7a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                            Registrar Estudiante/Ayudante
                        </button>
                    </div>
                </aside>

                {/* CONTENIDO CENTRAL */}
                <main className="flex-1 min-w-0 space-y-6">

                    {/* BANNER DE BIENVENIDA CON EL AZUL OSCURO INSTITUCIONAL EXACTO DEL HOME ESTUDIANTE */}
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

                        {/* SECCIÓN DE EXÁMENES */}
                        <div className="xl:col-span-2 space-y-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                                    <div>
                                        <h3 className="text-base font-black text-[#1A365D]">
                                            Mis Exámenes / Asignaturas
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Docente Activo – <span className="font-bold text-[#1A365D]">{examenes.length} registradas</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setBoolModalAbierto(true)}
                                        className="bg-[#1A365D] hover:bg-[#132743] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer"
                                    >
                                        + Registrar examen
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {boolCargando ? (
                                        <div className="text-center py-8 text-slate-500 text-xs font-semibold animate-pulse">
                                            Cargando asignaturas y exámenes del docente...
                                        </div>
                                    ) : examenes.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 text-xs font-semibold bg-[#F8FAFC] rounded-2xl border border-slate-200">
                                            No tienes exámenes ni asignaturas asignadas en el sistema.
                                        </div>
                                    ) : (
                                        examenes.map((examen) => {
                                            const porcentaje = examen.totalInscritos > 0
                                                ? Math.round((examen.ingresados / examen.totalInscritos) * 100)
                                                : 0;
                                            return (
                                                <div key={examen.idExamen} className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200 space-y-3">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-[#1A365D] text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0">
                                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-black text-sm text-[#1A365D]">{examen.nombreExamen}</h4>
                                                                    {examen.siglaAsignatura && (
                                                                        <span className="bg-blue-100 text-[#2563EB] font-extrabold px-2 py-0.5 rounded text-[10px]">
                                                                            {examen.siglaAsignatura}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-600 font-bold mt-0.5">
                                                                    {examen.aula} · <span className="text-[#1A365D]">{examen.horario}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/habilitaciones`)}
                                                            className="bg-[#1A365D] hover:bg-[#132743] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer self-start sm:self-center"
                                                        >
                                                            Gestionar Habilitaciones
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                            ✓ {examen.ingresados} Ingresaron
                                                        </span>
                                                        <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                            ⏱ {examen.noLlegan} Faltan
                                                        </span>
                                                        <span className="bg-red-50 border border-red-200 text-rose-600 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                            ✕ {examen.inhabilitados} Inhabilitados
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                                                            <span>Progreso de acceso</span>
                                                            <span className="font-mono">{examen.ingresados} / {examen.totalInscritos}</span>
                                                        </div>
                                                        <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-slate-200">
                                                            <div className="bg-[#1A365D] h-full rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* PANEL DERECHO */}
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                                <h4 className="font-black text-xs text-[#1A365D] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#1A365D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    Calendario Académico
                                </h4>
                                <div className="text-center bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200">
                                    <p className="text-xs font-bold text-[#1A365D]">Septiembre 2026</p>
                                    <div className="grid grid-cols-7 gap-1 mt-3 text-[11px] font-bold text-slate-600">
                                        <span className="text-slate-400">Lu</span>
                                        <span className="text-slate-400">Ma</span>
                                        <span className="text-slate-400">Mi</span>
                                        <span className="text-slate-400">Ju</span>
                                        <span className="text-slate-400">Vi</span>
                                        <span className="text-slate-400">Sá</span>
                                        <span className="text-slate-400">Do</span>
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => (
                                            <span
                                                key={dia}
                                                className={`py-1 rounded-lg ${dia === 5 ? 'bg-[#1A365D] text-white font-black' : 'hover:bg-slate-200'}`}
                                            >
                                                {dia}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                                <h4 className="font-black text-xs text-[#1A365D] uppercase tracking-wider mb-2">
                                    Próximo Examen
                                </h4>
                                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <p className="font-extrabold text-xs text-[#1A365D]">Inteligencia Artificial</p>
                                    <p className="text-[11px] text-slate-600 mt-0.5">Viernes, 5 de Septiembre · 09:00</p>
                                    <p className="text-[10px] text-[#1A365D] font-bold mt-2">Aula 612 · Bloque F</p>
                                </div>

                            </div>

                        </div>



                    </div>
                </main>
            </div>


            <VentanaEmergente
                boolAbierto={boolModalAbierto}
                onCerrar={() => setBoolModalAbierto(false)}
            >
                <ExamenForm onCancelar={() => setBoolModalAbierto(false)} />
            </VentanaEmergente>


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
                            boolActivo={boolModalRegistroAbierto && strSeccionRegistro === "individual"}
                        />
                    ) : (
                        <BulkUploadCard onProcesar={fnCargarMasiva} />
                    )}
                </div>
            </VentanaEmergente>

        </div>
    );
}