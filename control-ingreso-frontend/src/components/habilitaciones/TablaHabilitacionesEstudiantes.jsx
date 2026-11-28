import { textoNombre } from '../common/textoNombre.js';
import { textoAsignatura } from '../../utils/textoInterfaz.js';
import { TablaConReporte } from '../common/ReporteLista.jsx';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
// Habilitaciones del ADMINISTRADOR (por materia), con el mismo diseño que la pantalla del docente:
// "Volver a Materias", cabecera con Exportar, fila de datos del examen, métricas, búsqueda,
// filtros en píldora, tabla (tarjetas en móvil) y cajón lateral para modificar el estado.
// El admin elige la materia y, dentro de ella, el examen: ve la misma lista que el docente de ese examen.
// Cuando el examen ya terminó, las habilitaciones ya no se pueden modificar.
import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, X } from "lucide-react";
import { obtenerHabilitaciones, actualizarHabilitacion } from "../../services/habilitacionService";
import { obtenerExamenPorAsignatura } from "../../services/asignaturaService";
import { obtenerExamenes } from "../../services/examenService";
import { estadoExamen, marcaTiempo } from "../../pages/docente/utilidadesExamenDocente";
import { textoGrupoExamen } from "../examenes/textoGrupoExamen";
import Toast from "../../pages/docente/components/Toast";
import CabeceraModulo from "../../pages/docente/components/CabeceraModulo";
import DocenteMetricsCards from "../../pages/docente/components/DocenteMetricsCards";
import FilaEstudiante from "../../pages/docente/components/FilaEstudiante";
import TarjetaEstudiante from "../../pages/docente/components/TarjetaEstudiante";
import Paginacion from "../../pages/docente/components/Paginacion";
import SelectorEstado from "../../pages/docente/components/SelectorEstado";
import SeccionMotivo from "../../pages/docente/components/SeccionMotivo";
import ModalConfirmacion from "../../pages/docente/components/ModalConfirmacion";

const MOTIVOS_PREDEFINIDOS = [
    "Incompatibilidad de prerrequisitos curriculares reglamentarios",
    "Trámite de convalidación académica pendiente de resolución",
    "Pendiente de regularización de matrícula institucional",
    "Porcentaje de inasistencias superior al límite reglamentario (Art. 42)",
    "Medida disciplinaria académica vigente por Consejo Facultativo"
];

const ELEMENTOS_POR_PAGINA = 10;

// "09:45 - 11:15" o "1:30" → "1 h 30 min"
function calcularDuracion(dur, hor) {
    let totalMins = 0;
    if (hor && hor.includes('-')) {
        const partes = hor.split('-').map((s) => s.trim());
        if (partes.length === 2) {
            const [h1, m1] = partes[0].split(':').map(Number);
            const [h2, m2] = partes[1].split(':').map(Number);
            if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
        }
    }
    if (totalMins <= 0 && dur && dur !== '---') {
        if (String(dur).includes(':')) {
            const [h, m] = String(dur).split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) totalMins = h * 60 + m;
        } else {
            const parsed = parseInt(dur, 10);
            if (!isNaN(parsed)) totalMins = parsed;
        }
    }
    if (totalMins <= 0) return '---';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0 && mins > 0) return `${hrs} h ${mins} min`;
    if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
    return `${mins} min`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const hhmm = (v) => (v ? String(v).slice(0, 5) : "");

// Datos de un examen de la lista (GET /api/examenes) en el formato de la pantalla
function datosExamen(ex) {
    const a0 = ex?.ambientes?.[0] || {};
    const strTipo = ex?.nombreTipoExamen ? `${ex.nombreTipoExamen}${ex.detalleTipoExamen ? ` (${ex.detalleTipoExamen})` : ""}` : "Examen";
    return {
        nombreExamen: strTipo,
        fecha: ex?.fechaExamen || "---",
        hora: a0.horaInicio && a0.horaFin ? `${hhmm(a0.horaInicio)} - ${hhmm(a0.horaFin)}` : "---",
        duracion: ex?.duracionExamen ? hhmm(ex.duracionExamen) : "---",
        ambiente: (ex?.ambientes || []).map((a) => a.nombreAmbiente).filter(Boolean).join(" + ") || "---",
        objRango: { fechaExamen: ex?.fechaExamen, horaInicio: hhmm(a0.horaInicio), horaFin: hhmm(a0.horaFin) },
    };
}

// "Primer parcial · 27 oct · Grupo C1"
function textoOpcionExamen(ex) {
    const m = String(ex?.fechaExamen || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    const strFecha = m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : "";
    return [ex?.nombreTipoExamen || "Examen", strFecha, textoGrupoExamen(ex?.nombreGrupo)].filter(Boolean).join(" · ");
}

export default function TablaHabilitacionesEstudiantes({ materia, onVolver }) {
    const [estudiantes, setEstudiantes] = useState([]);
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [infoExamen, setInfoExamen] = useState({ nombreExamen: '---', fecha: '---', hora: '---', duracion: '---', ambiente: '---' });
    // Exámenes de la materia y el elegido (null = la materia completa, como antes)
    const [listExamenes, setListExamenes] = useState([]);
    const [idExamenSel, setIdExamenSel] = useState(null);
    const [boolExamenesListos, setBoolExamenesListos] = useState(false);
    const [strDocente, setStrDocente] = useState(materia?.docente || '');
    const [motivoSelectValue, setMotivoSelectValue] = useState('');
    const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    const idAsigMateria = materia?.idAsignatura || materia?.id;

    // Exámenes de la materia: se elige el próximo (o el más reciente si todos terminaron)
    useEffect(() => {
        let cancel = false;
        setBoolExamenesListos(false);
        (async () => {
            try {
                const lista = await obtenerExamenes();
                const deLaMateria = (Array.isArray(lista) ? lista : [])
                    .filter((e) => String(e.idAsignatura) === String(idAsigMateria))
                    .sort((a, b) => marcaTiempo(datosExamen(a).objRango) - marcaTiempo(datosExamen(b).objRango));
                if (cancel) return;
                setListExamenes(deLaMateria);
                const proximo = deLaMateria.find((e) => estadoExamen(datosExamen(e).objRango) !== 'FINALIZADO');
                const elegido = proximo || deLaMateria[deLaMateria.length - 1] || null;
                setIdExamenSel(elegido ? elegido.idExamen : null);
            } catch (err) {
                console.warn("No se pudieron obtener los exámenes de la materia:", err);
                if (!cancel) { setListExamenes([]); setIdExamenSel(null); }
            } finally {
                if (!cancel) setBoolExamenesListos(true);
            }
        })();
        return () => { cancel = true; };
    }, [idAsigMateria]);

    const objExamenSel = listExamenes.find((e) => String(e.idExamen) === String(idExamenSel)) || null;

    // Datos del examen elegido; si la materia no tiene exámenes en la lista, se usa el de la materia (como antes)
    useEffect(() => {
        let cancel = false;
        if (!boolExamenesListos) return undefined;
        if (objExamenSel) {
            setInfoExamen(datosExamen(objExamenSel));
            if (objExamenSel.nombreDocente) setStrDocente(objExamenSel.nombreDocente);
            return undefined;
        }
        (async () => {
            if (!idAsigMateria) return;
            try {
                const data = await obtenerExamenPorAsignatura(idAsigMateria);
                if (!cancel && data) {
                    setInfoExamen({
                        nombreExamen: data.nombreExamen || '---',
                        fecha: data.fecha || '---',
                        hora: data.hora || '---',
                        duracion: data.duracion || '---',
                        // Solo el aula, sin la ubicación (facultad)
                        ambiente: data.ambiente ? String(data.ambiente).split(' · ')[0] : '---',
                    });
                    if (data.nombreDocente) setStrDocente(data.nombreDocente);
                }
            } catch (err) {
                console.warn("No se pudo obtener el examen de la materia:", err);
            }
        })();
        return () => { cancel = true; };
    }, [boolExamenesListos, objExamenSel, idAsigMateria]);

    const mostrarToast = (type, message) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (mostrarModalConfirmacion) setMostrarModalConfirmacion(false);
                else if (estudianteSeleccionado) setEstudianteSeleccionado(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [estudianteSeleccionado, mostrarModalConfirmacion]);

    // Habilitaciones del examen elegido (la misma lista que ve el docente de ese examen)
    useEffect(() => {
        let cancel = false;
        if (!boolExamenesListos) return undefined;
        async function cargar() {
            try {
                setCargando(true);
                setPaginaActual(1);
                const data = await obtenerHabilitaciones(idAsigMateria, idExamenSel || null);
                if (!cancel) {
                    if (Array.isArray(data)) {
                        setEstudiantes(data.map((item) => {
                            const estaHabilitado = Boolean(item.estadoHabilitacion ?? (item.estado === 'HABILITADO'));
                            const motivoBackend = item.observacionHabilitacion || item.nombreMotivo || item.observacion;
                            return {
                                idHabilitacion: item.idHabilitacion,
                                nombreEstudiante: item.nombreEstudiante || 'Estudiante',
                                apellidoEstudiante: item.apellidoEstudiante || '',
                                emailEstudiante: item.correoEstudiante || item.emailEstudiante || `${(item.nombreEstudiante || 'estudiante').toLowerCase().charAt(0)}.${(item.apellidoEstudiante || 'apellido').toLowerCase().split(' ')[0]}@est.umss.edu`,
                                carreraEstudiante: item.carreraEstudiante || item.carrera || '',
                                codSisEstudiante: item.codSisEstudiante || '---',
                                ciEstudiante: item.ciEstudiante || '---',
                                estadoHabilitacion: estaHabilitado,
                                nombreMotivo: estaHabilitado ? '-' : (motivoBackend || 'Sin motivo especificado')
                            };
                        }));
                    } else {
                        setEstudiantes([]);
                    }
                }
            } catch (err) {
                console.error("Error al obtener habilitaciones desde el backend:", err);
                if (!cancel) setEstudiantes([]);
            } finally {
                if (!cancel) setCargando(false);
            }
        }
        cargar();
        return () => { cancel = true; };
    }, [boolExamenesListos, idAsigMateria, idExamenSel]);

    const estudiantesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return estudiantes.filter((e) => {
            const nombreCompleto = `${e.nombreEstudiante || ''} ${e.apellidoEstudiante || ''}`.toLowerCase();
            const coincideBusqueda = !q || nombreCompleto.includes(q) || String(e.codSisEstudiante || '').toLowerCase().includes(q) || String(e.ciEstudiante || '').toLowerCase().includes(q);
            const coincideFiltro = filtroEstado === 'todos' || (filtroEstado === 'habilitado' && e.estadoHabilitacion) || (filtroEstado === 'inhabilitado' && !e.estadoHabilitacion);
            return coincideBusqueda && coincideFiltro;
        });
    }, [estudiantes, busqueda, filtroEstado]);

    const totalPaginas = Math.ceil(estudiantesFiltrados.length / ELEMENTOS_POR_PAGINA) || 1;
    const estudiantesPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
        return estudiantesFiltrados.slice(inicio, inicio + ELEMENTOS_POR_PAGINA);
    }, [estudiantesFiltrados, paginaActual]);

    const abrirDrawer = (est) => {
        setEstudianteSeleccionado({ ...est });
        const t = est.nombreMotivo || '';
        if (!est.estadoHabilitacion && t && t !== '-') {
            if (MOTIVOS_PREDEFINIDOS.includes(t)) { setMotivoSelectValue(t); setMotivoPersonalizado(''); }
            else { setMotivoSelectValue('__personalizado__'); setMotivoPersonalizado(t); }
        } else { setMotivoSelectValue(''); setMotivoPersonalizado(''); }
    };

    const prepararGuardado = () => { if (estudianteSeleccionado) setMostrarModalConfirmacion(true); };

    // Guardado: igual que antes (si el servidor falla, se actualiza en pantalla de todos modos)
    const ejecutarGuardadoFinal = async () => {
        if (!estudianteSeleccionado) return;
        try {
            setGuardando(true);
            const estaHabilitado = estudianteSeleccionado.estadoHabilitacion;
            let textoMotivoFinal = null;
            let motivoSeleccionadoEspecifico = false;

            if (!estaHabilitado) {
                if (motivoSelectValue === '__personalizado__') {
                    const pers = motivoPersonalizado.trim();
                    textoMotivoFinal = pers || null;
                    if (pers) motivoSeleccionadoEspecifico = true;
                } else if (motivoSelectValue && motivoSelectValue !== '-' && motivoSelectValue !== 'Sin motivo especificado') {
                    textoMotivoFinal = motivoSelectValue;
                    motivoSeleccionadoEspecifico = true;
                }
            }
            try {
                const respuestaBackend = await actualizarHabilitacion(estudianteSeleccionado.idHabilitacion, {
                    estadoHabilitacion: estaHabilitado,
                    observacionHabilitacion: textoMotivoFinal
                });
                setEstudiantes((prev) => prev.map((e) => {
                    if (e.idHabilitacion === estudianteSeleccionado.idHabilitacion) {
                        const estadoFinal = Boolean(respuestaBackend?.estadoHabilitacion ?? (respuestaBackend?.estado === 'HABILITADO' ?? estaHabilitado));
                        return { ...e, estadoHabilitacion: estadoFinal, nombreMotivo: estadoFinal ? '-' : (respuestaBackend?.observacionHabilitacion || textoMotivoFinal || 'Sin motivo especificado') };
                    }
                    return e;
                }));
            } catch (backendErr) {
                console.warn("Actualizando localmente debido a respuesta del servidor:", backendErr);
                setEstudiantes((prev) => prev.map((e) => {
                    if (e.idHabilitacion === estudianteSeleccionado.idHabilitacion) {
                        return { ...e, estadoHabilitacion: estaHabilitado, nombreMotivo: estaHabilitado ? '-' : (textoMotivoFinal || 'Sin motivo especificado') };
                    }
                    return e;
                }));
            }
            const mensajeToast = estaHabilitado
                ? 'Estudiante registrado como Habilitado exitosamente.'
                : motivoSeleccionadoEspecifico
                    ? 'Estudiante inhabilitado exitosamente con el motivo especificado.'
                    : 'Estudiante registrado como Inhabilitado exitosamente.';
            mostrarToast('success', mensajeToast);
            setMostrarModalConfirmacion(false);
            setEstudianteSeleccionado(null);
        } catch (err) {
            console.error("Error al guardar cambios:", err);
            mostrarToast('error', err.message || 'Error al guardar cambios.');
        } finally {
            setGuardando(false);
        }
    };

    // Cuando el examen ya terminó, las habilitaciones ya no se pueden modificar
    const boolFinalizado = Boolean(infoExamen.objRango?.fechaExamen) && estadoExamen(infoExamen.objRango) === 'FINALIZADO';

    const totalEstudiantes = estudiantes.length;
    const totalHabilitados = estudiantes.filter((e) => e.estadoHabilitacion).length;
    const totalInhabilitados = estudiantes.filter((e) => !e.estadoHabilitacion).length;
    const boolCargandoDatos = !boolExamenesListos || cargando;
    const porcentaje = (n) => (totalEstudiantes > 0 ? Math.round((n / totalEstudiantes) * 100) : 0);

    const metricas = [
        { titulo: 'TOTAL ESTUDIANTES', valor: boolCargandoDatos ? '—' : totalEstudiantes, detalle: boolCargandoDatos ? 'Cargando...' : 'registrados', claseNumero: 'text-[#003770]' },
        { titulo: 'HABILITADOS', valor: boolCargandoDatos ? '—' : totalHabilitados, detalle: 'estudiantes', porcentaje: boolCargandoDatos ? '—' : `${porcentaje(totalHabilitados)} % del total`, claseNumero: 'text-[#003770]', clasePorcentaje: 'bg-[#E8F1FB] text-[#003770]' },
        { titulo: 'INHABILITADOS', valor: boolCargandoDatos ? '—' : totalInhabilitados, detalle: 'estudiantes', porcentaje: boolCargandoDatos ? '—' : `${porcentaje(totalInhabilitados)} % del total`, claseNumero: 'text-[#B91C1C]', clasePorcentaje: 'bg-[#FEF2F2] text-[#B91C1C]' },
    ];

    // Fila de datos: igual que en el docente, más el docente de la materia
    const strMateria = [materia?.codigo, textoAsignatura(materia?.nombre)].filter(Boolean).join(' · ');
    const filasExamen = [
        { etiqueta: 'EXAMEN', valor: [textoAsignatura(materia?.nombre), infoExamen.nombreExamen !== '---' ? textoAsignatura(infoExamen.nombreExamen) : ''].filter(Boolean).join(' · ') || '---', boolSelector: listExamenes.length > 0 },
        { etiqueta: 'DOCENTE', valor: textoNombre(strDocente) || '---' },
        { etiqueta: 'FECHA', valor: boolCargandoDatos ? 'Cargando...' : infoExamen.fecha },
        { etiqueta: 'HORA', valor: boolCargandoDatos ? 'Cargando...' : infoExamen.hora },
        { etiqueta: 'DURACIÓN', valor: boolCargandoDatos ? 'Cargando...' : calcularDuracion(infoExamen.duracion, infoExamen.hora) },
        { etiqueta: 'AMBIENTE', valor: boolCargandoDatos ? 'Cargando...' : infoExamen.ambiente },
    ];

    const textoMotivoConfirmacion = useMemo(() => {
        if (estudianteSeleccionado?.estadoHabilitacion) return '';
        if (motivoSelectValue === '__personalizado__') return motivoPersonalizado.trim();
        if (motivoSelectValue) return motivoSelectValue;
        if (estudianteSeleccionado?.nombreMotivo && estudianteSeleccionado.nombreMotivo !== '-') return estudianteSeleccionado.nombreMotivo;
        return '';
    }, [estudianteSeleccionado, motivoSelectValue, motivoPersonalizado]);

    const filtros = [
        { key: 'todos', label: `Todos (${boolCargandoDatos ? '—' : totalEstudiantes})` },
        { key: 'habilitado', label: `Habilitados (${boolCargandoDatos ? '—' : totalHabilitados})` },
        { key: 'inhabilitado', label: `Inhabilitados (${boolCargandoDatos ? '—' : totalInhabilitados})` },
    ];

    const cambiarPagina = (p) => setPaginaActual(Math.min(Math.max(p, 1), totalPaginas));

    return (
        <div className="space-y-4 sm:space-y-5 font-nunito text-slate-800">
            {/* Volver: solo texto con flecha, arriba a la izquierda (como en el docente) */}
            {onVolver && (
                <button
                    type="button"
                    onClick={onVolver}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#1860A3] hover:underline cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a Materias
                </button>
            )}

            {/* Mismo botón que antes: solo muestra el aviso */}
            <CabeceraModulo
                strDescripcion={strMateria ? `Administra la habilitación de los estudiantes de ${strMateria}.` : "Administra la habilitación de los estudiantes de la materia seleccionada."}
                onExportar={() => mostrarToast('success', 'Exportando lista oficial de estudiantes habilitados...')}
            />

            <div className="bg-white p-4 sm:px-6 rounded-2xl shadow-xs border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2.6fr_1.4fr_1fr_1fr_1fr_0.8fr] gap-4">
                {filasExamen.map((f) => (
                    <div key={f.etiqueta} className="min-w-0 sm:px-4 first:pl-0 lg:border-l lg:border-[#E2E8F0] first:lg:border-l-0">
                        {f.boolSelector ? (
                            <>
                                <label htmlFor="adm-hab-examen" className="text-[11px] font-extrabold tracking-[.6px] text-[#64748B] block mb-1">{textoInterfaz(f.etiqueta)}</label>
                                <select
                                    id="adm-hab-examen"
                                    value={idExamenSel ?? ''}
                                    onChange={(e) => setIdExamenSel(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] font-extrabold text-[#08264A] outline-none focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15 cursor-pointer"
                                >
                                    {listExamenes.map((ex) => (
                                        <option key={ex.idExamen} value={ex.idExamen}>{textoOpcionExamen(ex)}</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <>
                                <span className="text-[11px] font-extrabold tracking-[.6px] text-[#64748B] block">{textoInterfaz(f.etiqueta)}</span>
                                <p className="mt-0.5 text-[14.5px] font-extrabold text-[#08264A] break-words line-clamp-2" title={f.valor}>{f.valor || '---'}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {boolFinalizado && (
                <div className="px-4 py-3 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-[13.5px] text-[#475569]">
                    <b className="font-bold text-[#08264A]">Este examen ya terminó.</b> Las habilitaciones ya no se pueden modificar.
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {metricas.map((m) => <DocenteMetricsCards key={m.titulo} {...m} />)}
            </div>

            <div className="bg-white rounded-2xl shadow-xs border border-[#CBD5E1] overflow-hidden">
                <div className="p-4 sm:px-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:flex-1 sm:min-w-[280px]">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                            placeholder="Buscar por nombre, C.I. o código SIS"
                            aria-label="Buscar estudiante"
                            className="w-full h-11 bg-white border border-[#CBD5E1] rounded-[10px] pl-3.5 pr-11 text-[14.5px] text-[#08264A] outline-none focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => { setBusqueda(''); setPaginaActual(1); }}
                                aria-label="Borrar búsqueda"
                                title="Borrar búsqueda"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] flex items-center justify-center cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {filtros.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => { setFiltroEstado(f.key); setPaginaActual(1); }}
                                aria-pressed={filtroEstado === f.key}
                                className={`px-4 h-9 rounded-full text-[13px] font-bold border whitespace-nowrap transition cursor-pointer ${filtroEstado === f.key
                                    ? 'bg-[#003770] text-white border-[#003770]'
                                    : 'bg-white text-[#1A365D] border-[#CBD5E1] hover:bg-slate-50'}`}
                            >
                                {textoInterfaz(f.label)}
                            </button>
                        ))}
                    </div>
                </div>

                {boolCargandoDatos ? (
                    <div className="p-12 text-center text-[13.5px] font-semibold text-slate-500 border-t border-[#E2E8F0]">Cargando estudiantes...</div>
                ) : estudiantesFiltrados.length === 0 ? (
                    <div className="p-12 text-center text-[13.5px] font-semibold text-slate-500 border-t border-[#E2E8F0]">No se encontraron estudiantes con ese criterio de búsqueda.</div>
                ) : (
                    <>
                        {/* Tabla: visible desde md hacia arriba */}
                        <div className="hidden md:block overflow-x-auto">
                            <TablaConReporte filtros={[busqueda, filtroEstado]} titulo="Habilitaciones de estudiantes">{(paraReporte) => (<table className="w-full min-w-[760px] text-left text-[14px]">
                                <thead>
                                    <tr className="text-[#124B83] border-y border-[#CBD5E1] font-extrabold text-[11px] tracking-[.6px] bg-[#E8F1FB]">
                                        <th className="py-3.5 px-3 sm:px-6">N°</th>
                                        <th className="py-3.5 px-3 sm:px-6">Estudiante</th>
                                        <th className="py-3.5 px-3 sm:px-6">C.I.</th>
                                        <th className="py-3.5 px-3 sm:px-6">Código SIS</th>
                                        <th className="py-3.5 px-3 sm:px-6">Estado</th>
                                        <th className="py-3.5 px-3 sm:px-6">Motivo</th>
                                        <th className="py-3.5 px-3 sm:px-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {(paraReporte ? estudiantesFiltrados : estudiantesPaginados).map((est, index) => (
                                        <FilaEstudiante
                                            key={est.idHabilitacion}
                                            est={est}
                                            numeroFila={(paginaActual - 1) * ELEMENTOS_POR_PAGINA + index + 1}
                                            onGestionar={boolFinalizado ? null : abrirDrawer}
                                        />
                                    ))}
                                </tbody>
                            </table>)}</TablaConReporte>
                        </div>

                        {/* Tarjetas: visibles solo en móvil (menos de md) */}
                        <div className="md:hidden divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                            {estudiantesPaginados.map((est, index) => (
                                <TarjetaEstudiante
                                    key={est.idHabilitacion}
                                    est={est}
                                    numeroFila={(paginaActual - 1) * ELEMENTOS_POR_PAGINA + index + 1}
                                    onGestionar={boolFinalizado ? null : abrirDrawer}
                                />
                            ))}
                        </div>

                        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onPagina={cambiarPagina} />
                    </>
                )}
            </div>

            {/* Cajón lateral para modificar el estado (igual que el docente) */}
            <div
                onClick={(e) => { if (e.target === e.currentTarget) setEstudianteSeleccionado(null); }}
                className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <div className={`w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 p-4 sm:p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado ? 'translate-x-0' : 'translate-x-full'}`}>
                    {estudianteSeleccionado && (
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                                <div>
                                    <span className="text-[11px] font-extrabold text-[#64748B] tracking-[.6px] block">Modificar estado</span>
                                    <h3 className="font-black text-[17px] text-[#1A365D]">Detalle de habilitación</h3>
                                </div>
                                <button onClick={() => setEstudianteSeleccionado(null)} className="text-slate-400 hover:text-[#003770] font-bold p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">✕</button>
                            </div>

                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl mb-5 flex items-start gap-3">
                                <span className="w-9 h-9 rounded-xl bg-[#003770] text-white flex items-center justify-center font-black text-[13px] flex-shrink-0">
                                    {`${estudianteSeleccionado.nombreEstudiante?.[0] || ''}${estudianteSeleccionado.apellidoEstudiante?.[0] || ''}`.toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h4 className="font-extrabold text-[14px] text-[#08264A] truncate">{`${estudianteSeleccionado.nombreEstudiante} ${estudianteSeleccionado.apellidoEstudiante}`}</h4>
                                    {estudianteSeleccionado.carreraEstudiante && (
                                        <p className="text-[13px] text-[#003770] font-semibold">{estudianteSeleccionado.carreraEstudiante}</p>
                                    )}
                                    <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">SIS {estudianteSeleccionado.codSisEstudiante} · C.i. {estudianteSeleccionado.ciEstudiante}</p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-[11px] font-extrabold text-[#64748B] tracking-[.6px] mb-2">Estado de habilitación</label>
                                <SelectorEstado
                                    habilitado={estudianteSeleccionado.estadoHabilitacion}
                                    onHabilitar={() => { setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: true, nombreMotivo: '-' }); setMotivoSelectValue(''); setMotivoPersonalizado(''); }}
                                    onInhabilitar={() => setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: false })}
                                />
                            </div>

                            {estudianteSeleccionado.estadoHabilitacion ? (
                                <div className="mb-5 bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-2xl">
                                    <h4 className="text-[13px] font-extrabold text-[#003770] mb-0.5">Auditoría Institucional Automática</h4>
                                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Cualquier cambio de estado generará un registro con firma digital y marca temporal visible en el historial del estudiante.</p>
                                </div>
                            ) : (
                                <SeccionMotivo
                                    nombreMotivo={estudianteSeleccionado.nombreMotivo}
                                    motivoSelectValue={motivoSelectValue}
                                    motivoPersonalizado={motivoPersonalizado}
                                    motivos={MOTIVOS_PREDEFINIDOS}
                                    onSelect={(v) => { setMotivoSelectValue(v); if (v !== '__personalizado__') setMotivoPersonalizado(''); }}
                                    onPersonalizado={setMotivoPersonalizado}
                                    onCerrar={() => setMotivoSelectValue('')}
                                    onModificar={() => { setMotivoSelectValue(''); setMotivoPersonalizado(''); }}
                                    onEliminar={() => { setMotivoSelectValue(''); setMotivoPersonalizado(''); setEstudianteSeleccionado({ ...estudianteSeleccionado, nombreMotivo: '-' }); }}
                                />
                            )}
                        </div>
                    )}

                    {estudianteSeleccionado && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                            <button type="button" onClick={prepararGuardado} disabled={guardando} className="w-full h-11 bg-[#003770] hover:bg-[#124B83] text-white font-bold text-[14px] rounded-[10px] transition shadow-xs cursor-pointer flex items-center justify-center disabled:opacity-50">
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button type="button" onClick={() => setEstudianteSeleccionado(null)} disabled={guardando} className="w-full text-center text-[13px] font-bold text-slate-500 hover:text-[#003770] py-1 cursor-pointer transition disabled:opacity-50">
                                Cerrar sin guardar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ModalConfirmacion
                mostrar={mostrarModalConfirmacion && !!estudianteSeleccionado}
                estudiante={estudianteSeleccionado}
                motivoTexto={textoMotivoConfirmacion}
                guardando={guardando}
                onCancelar={() => setMostrarModalConfirmacion(false)}
                onConfirmar={ejecutarGuardadoFinal}
            />

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}
