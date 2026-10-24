import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { obtenerHabilitaciones, actualizarHabilitacion, exportarListaOficial, asociarEstudianteAExamen, eliminarAsociacionExamen } from "../../services/habilitacionService";
import { obtenerExamenPorId } from "../../services/examenService";
import { obtenerExamenPorAsignatura } from "../../services/asignaturaService";
import { listarUsuarios } from "../../services/adminService";
import Icono from "./components/Icono";
import Toast from "./components/Toast";
import DocenteHeader from "./components/DocenteHeader";
import CabeceraModulo from "./components/CabeceraModulo";
import DocenteMetricsCards from "./components/DocenteMetricsCards";
import FilaEstudiante from "./components/FilaEstudiante";
import TarjetaEstudiante from "./components/TarjetaEstudiante";
import Paginacion from "./components/Paginacion";
import SelectorEstado from "./components/SelectorEstado";
import SeccionMotivo from "./components/SeccionMotivo";
import ModalConfirmacion from "./components/ModalConfirmacion";

const MOTIVOS_PREDEFINIDOS = [
    "Incompatibilidad de prerrequisitos curriculares reglamentarios",
    "Trámite de convalidación académica pendiente de resolución",
    "Pendiente de regularización de matrícula institucional",
    "Porcentaje de inasistencias superior al límite reglamentario (Art. 42)",
    "Medida disciplinaria académica vigente por Consejo Facultativo"
];

const ELEMENTOS_POR_PAGINA = 10;

function normalizarHabilitaciones(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map((item) => {
        const estaHabilitado = Boolean(item.estadoHabilitacion ?? (item.estado === 'HABILITADO'));
        const motivoBackend = item.observacionHabilitacion || item.nombreMotivo || item.observacion;
        return {
            idHabilitacion: item.idHabilitacion,
            nombreEstudiante: item.nombreEstudiante || 'Estudiante',
            apellidoEstudiante: item.apellidoEstudiante || '',
            emailEstudiante: item.correoEstudiante || item.emailEstudiante || (item.nombreEstudiante ? `${item.nombreEstudiante.toLowerCase().charAt(0)}.${(item.apellidoEstudiante || 'apellido').toLowerCase().split(' ')[0]}@est.umss.edu` : '---'),
            codSisEstudiante: item.codSisEstudiante || '---',
            ciEstudiante: item.ciEstudiante || '---',
            carreraEstudiante: item.carreraEstudiante || item.carrera || item.nombreCarrera || '',
            estadoHabilitacion: estaHabilitado,
            nombreMotivo: estaHabilitado ? '-' : (motivoBackend || 'Sin motivo especificado')
        };
    });
}

export default function GestionHabilitaciones({ examenId: propExamenId }) {
    const { idExamen: paramIdExamen } = useParams();
    const examenIdActivo = propExamenId || paramIdExamen;
    const navegar = useNavigate();

    const [infoExamen, setInfoExamen] = useState({
        nombreExamen: 'Cargando...',
        fecha: '---',
        hora: '---',
        duracion: '---',
        ambiente: '---',
    });

    const [estudiantes, setEstudiantes] = useState([]);
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [motivoSelectValue, setMotivoSelectValue] = useState('');
    const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);
    const [toast, setToast] = useState(null);
    const [codigoNuevo, setCodigoNuevo] = useState('');
    const [asociando, setAsociando] = useState(false);
    const [mostrarPanelAsociar, setMostrarPanelAsociar] = useState(false);
    const [codigosMasivos, setCodigosMasivos] = useState('');
    const [estudiantesDisponibles, setEstudiantesDisponibles] = useState([]);
    const [seleccionados, setSeleccionados] = useState([]);
    const [cargandoDisponibles, setCargandoDisponibles] = useState(false);
    const toastTimer = useRef(null);

    const mostrarToast = (type, message) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (mostrarModalConfirmacion) setMostrarModalConfirmacion(false);
                else if (mostrarPanelAsociar) setMostrarPanelAsociar(false);
                else if (estudianteSeleccionado) setEstudianteSeleccionado(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [estudianteSeleccionado, mostrarModalConfirmacion]);

    useEffect(() => {
        let cancel = false;
        async function cargar() {
            try {
                setCargando(true);
                let targetIdAsignatura = examenIdActivo;
                let exData = null;
                let asigData = null;

                try {
                    exData = await obtenerExamenPorId(examenIdActivo);
                    if (exData && exData.idAsignatura) {
                        targetIdAsignatura = exData.idAsignatura;
                    }
                } catch (errEx) {
                    // Si el parámetro no es un idExamen directo, es targetIdAsignatura
                }

                try {
                    asigData = await obtenerExamenPorAsignatura(targetIdAsignatura);
                } catch (errAsig) {
                    // Silencioso si no hay examen por asignatura aún
                }

                if (!cancel) {
                    let nombreExamen = 'Examen Oficial';
                    let fecha = '---';
                    let hora = '---';
                    let duracionTexto = '---';
                    let ambiente = 'Aula por definir';

                    if (exData) {
                        nombreExamen = exData.nombreTipoExamen
                            ? `${exData.nombreTipoExamen}${exData.detalleTipoExamen ? ' (' + exData.detalleTipoExamen + ')' : ''}`
                            : (exData.nombreAsignatura || 'Examen Oficial');
                        fecha = exData.fechaExamen || '---';

                        if (exData.ambientes && exData.ambientes.length > 0) {
                            const a0 = exData.ambientes[0];
                            if (a0.horaInicio && a0.horaFin) {
                                hora = `${a0.horaInicio.substring(0, 5)} - ${a0.horaFin.substring(0, 5)}`;
                            }
                            ambiente = exData.ambientes.map(a => {
                                const nom = a.nombreAmbiente || a.nombreAula || 'Aula';
                                const ubi = a.ubicacionAmbiente || a.bloque || a.ubicacionAula || '';
                                return ubi ? `${nom} · ${ubi}` : nom;
                            }).join(' + ');
                        }

                        if (exData.duracionExamen) {
                            const durStr = String(exData.duracionExamen);
                            if (durStr.includes(':')) {
                                const [hrs, mins] = durStr.split(':').map(Number);
                                if (hrs > 0 && mins > 0) duracionTexto = `${hrs} h ${mins} min`;
                                else if (hrs > 0) duracionTexto = `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
                                else if (mins > 0) duracionTexto = `${mins} min`;
                            } else {
                                duracionTexto = `${durStr} min`;
                            }
                        }
                    }

                    if (asigData) {
                        if (nombreExamen === 'Examen Oficial' && asigData.nombreExamen) {
                            nombreExamen = asigData.nombreExamen;
                        }
                        if (fecha === '---' && asigData.fecha && asigData.fecha !== '---') {
                            fecha = asigData.fecha;
                        }
                        if (hora === '---' && asigData.hora && asigData.hora !== '---') {
                            hora = asigData.hora;
                        }
                        if ((ambiente === 'Aula por definir' || ambiente === 'Aula') && asigData.ambiente && asigData.ambiente !== '---') {
                            ambiente = asigData.ambiente;
                        }
                        if (duracionTexto === '---' && asigData.duracion && asigData.duracion !== '---') {
                            const durStr = String(asigData.duracion);
                            if (durStr.includes(':')) {
                                const [hrs, mins] = durStr.split(':').map(Number);
                                if (hrs > 0 && mins > 0) duracionTexto = `${hrs} h ${mins} min`;
                                else if (hrs > 0) duracionTexto = `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
                                else if (mins > 0) duracionTexto = `${mins} min`;
                            } else {
                                duracionTexto = `${durStr} min`;
                            }
                        }
                    }

                    setInfoExamen({
                        idAsignatura: targetIdAsignatura,
                        nombreExamen,
                        fecha,
                        hora,
                        duracion: duracionTexto,
                        ambiente,
                    });
                }

                const data = await obtenerHabilitaciones(targetIdAsignatura, Number(examenIdActivo)).catch(() => []);
                if (!cancel) {
                    setEstudiantes(normalizarHabilitaciones(Array.isArray(data) ? data : []));
                }
            } catch (err) {
                console.error("Error al obtener habilitaciones desde el backend:", err);
                mostrarToast('error', 'Error al cargar los datos del servidor.');
            } finally {
                if (!cancel) setCargando(false);
            }
        }
        cargar();
        return () => { cancel = true; };
    }, [examenIdActivo]);

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
            mostrarToast('error', err.message || 'Error al guardar cambios en el servidor.');
        } finally {
            setGuardando(false);
        }
    };

    const asociarNuevoEstudiante = async (e) => {
        e.preventDefault();
        if (!/^\d+$/.test(codigoNuevo.trim())) {
            mostrarToast('error', 'Ingresa un Código SIS válido.');
            return;
        }
        try {
            setAsociando(true);
            const nuevo = await asociarEstudianteAExamen({
                codigoSis: codigoNuevo.trim(),
                idAsignatura: infoExamen.idAsignatura,
                idExamen: Number(examenIdActivo),
            });
            setEstudiantes((prev) => [...prev, normalizarHabilitaciones([nuevo])[0]]);
            setCodigoNuevo('');
            mostrarToast('success', 'Estudiante asociado al examen.');
        } catch (err) {
            mostrarToast('error', err.message || 'No se pudo asociar el estudiante.');
        } finally { setAsociando(false); }
    };

    const asociarEstudiantesMasivos = async (e, codigosEntrada = codigosMasivos) => {
        e.preventDefault();
        const codigos = [...new Set(codigosEntrada.split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean))];
        if (!codigos.length || codigos.some((codigo) => !/^\d+$/.test(codigo))) {
            mostrarToast('error', 'Ingresa únicamente Códigos SIS numéricos, separados por espacios, comas o saltos de línea.');
            return;
        }
        try {
            setAsociando(true);
            const resultados = await Promise.allSettled(codigos.map((codigoSis) => asociarEstudianteAExamen({
                codigoSis,
                idAsignatura: infoExamen.idAsignatura,
                idExamen: Number(examenIdActivo),
            })));
            const nuevos = resultados.filter((r) => r.status === 'fulfilled').map((r) => normalizarHabilitaciones([r.value])[0]);
            if (nuevos.length) setEstudiantes((prev) => [...prev, ...nuevos]);
            const fallidos = resultados.length - nuevos.length;
            setCodigosMasivos('');
            mostrarToast(fallidos ? 'info' : 'success', fallidos
                ? `${nuevos.length} estudiante(s) asociado(s); ${fallidos} no se pudieron asociar.`
                : `${nuevos.length} estudiante(s) asociado(s) al examen.`);
        } finally {
            setAsociando(false);
        }
    };

    const asociarSeleccionados = async (e) => {
        e.preventDefault();
        if (!seleccionados.length) { mostrarToast('error', 'Selecciona al menos un estudiante.'); return; }
        await asociarEstudiantesMasivos({ preventDefault: () => {} }, seleccionados.join('\n'));
        setSeleccionados([]);
    };

    const eliminarEstudiante = async (est) => {
        if (!window.confirm(`¿Quitar a ${est.nombreEstudiante} ${est.apellidoEstudiante} de este examen?`)) return;
        try {
            await eliminarAsociacionExamen(est.idHabilitacion);
            setEstudiantes((prev) => prev.filter((item) => item.idHabilitacion !== est.idHabilitacion));
            mostrarToast('success', 'Estudiante quitado de la lista del examen.');
        } catch (err) { mostrarToast('error', err.message || 'No se pudo quitar la asociación.'); }
    };

    useEffect(() => {
        if (!mostrarPanelAsociar) return;
        let vivo = true;
        setCargandoDisponibles(true);
        listarUsuarios({ rol: 'ESTUDIANTE', estado: true })
            .then((usuarios) => vivo && setEstudiantesDisponibles(Array.isArray(usuarios) ? usuarios : []))
            .catch((err) => vivo && mostrarToast('error', err.message || 'No se pudo cargar la tabla de estudiantes.'))
            .finally(() => vivo && setCargandoDisponibles(false));
        return () => { vivo = false; };
    }, [mostrarPanelAsociar]);

    const codigosAsociados = new Set(estudiantes.map((e) => String(e.codSisEstudiante)));
    const disponiblesSeleccionables = estudiantesDisponibles.filter((e) => e.codigoSis != null && !codigosAsociados.has(String(e.codigoSis)));

    const totalEstudiantes = estudiantes.length;
    const totalHabilitados = estudiantes.filter((e) => e.estadoHabilitacion).length;
    const totalInhabilitados = estudiantes.filter((e) => !e.estadoHabilitacion).length;
    const porcentaje = (n) => (totalEstudiantes > 0 ? Math.round((n / totalEstudiantes) * 100) : 0);

    const metricas = [
        { titulo: 'TOTAL ESTUDIANTES', valor: totalEstudiantes, icono: 'estudiantes', detalle: <span className="text-[13px] text-slate-500 font-medium">registrados</span>, claseNumero: 'text-[#003770]', claseIcono: 'bg-blue-50 text-[#003770]' },
        { titulo: 'HABILITADOS', valor: totalHabilitados, icono: 'habilitado', detalle: <span className="text-[13px] text-[#003770] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded-md">{porcentaje(totalHabilitados)}%</span>, claseNumero: 'text-[#003770]', claseIcono: 'bg-[#EFF6FF] text-[#003770]' },
        { titulo: 'INHABILITADOS', valor: totalInhabilitados, icono: 'inhabilitado', detalle: <span className="text-[13px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">{porcentaje(totalInhabilitados)}%</span>, claseNumero: 'text-rose-600', claseIcono: 'bg-rose-50 text-rose-600' },
    ];

    const obtenerDuracionCalculada = (dur, hor) => {
        let totalMins = 0;
        if (hor && hor.includes('-')) {
            const partes = hor.split('-').map((s) => s.trim());
            if (partes.length === 2) {
                const [h1, m1] = partes[0].split(':').map(Number);
                const [h2, m2] = partes[1].split(':').map(Number);
                if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
                    totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                }
            }
        }
        if (totalMins <= 0 && dur && dur !== '---') {
            if (dur.includes(':')) {
                const [h, m] = dur.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) totalMins = h * 60 + m;
            } else {
                const parsed = parseInt(dur, 10);
                if (!isNaN(parsed)) totalMins = parsed;
            }
        }
        if (totalMins <= 0) totalMins = 90;

        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;

        if (hrs > 0 && mins > 0) return `${hrs} h ${mins} min`;
        if (hrs > 0 && mins === 0) return `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
        return `${mins} min`;
    };

    const filasExamen = [
        { etiqueta: 'EXAMEN', valor: infoExamen.nombreExamen, icono: 'documento' },
        { etiqueta: 'FECHA', valor: infoExamen.fecha, icono: 'calendario' },
        { etiqueta: 'HORA', valor: infoExamen.hora, icono: 'horario' },
        { etiqueta: 'DURACIÓN', valor: obtenerDuracionCalculada(infoExamen.duracion, infoExamen.hora), icono: 'reloj' },
        { etiqueta: 'AMBIENTE', valor: infoExamen.ambiente, icono: 'ubicacion' },
    ];

    const textoMotivoConfirmacion = useMemo(() => {
        if (estudianteSeleccionado?.estadoHabilitacion) return '';
        if (motivoSelectValue === '__personalizado__') return motivoPersonalizado.trim();
        if (motivoSelectValue) return motivoSelectValue;
        if (estudianteSeleccionado?.nombreMotivo && estudianteSeleccionado.nombreMotivo !== '-') return estudianteSeleccionado.nombreMotivo;
        return '';
    }, [estudianteSeleccionado, motivoSelectValue, motivoPersonalizado]);

    const filtros = [
        { key: 'todos', label: `Todos (${totalEstudiantes})` },
        { key: 'habilitado', label: `Habilitados (${totalHabilitados})` },
        { key: 'inhabilitado', label: `Inhabilitados (${totalInhabilitados})` },
    ];

    const cambiarPagina = (p) => setPaginaActual(Math.min(Math.max(p, 1), totalPaginas));

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-nunito pb-16">

            <DocenteHeader />

            {/* El padding superior sigue al alto real de DocenteHeader, que envuelve
                a Header.jsx y ese header mide 70px en movil (h-[70px]) y 98px desde
                "md" (md:h-[98px]). Con un valor fijo de 106px quedaban 36px de hueco
                muerto en telefono. */}
            <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-[78px] md:pt-[106px]">
                <main className="w-full space-y-4 sm:space-y-5">

                    {/* "Volver a Mis Examenes" replaces a "Volver a Materias"
                        del admin: el docente no tiene seccion de materias, su
                        pantalla de listado es la de examenes. */}
                    <CabeceraModulo
                        onVolver={() => navegar('/home/docente', { state: { menu: 'mis-examenes' } })}
                        textoVolver="Volver a Mis Exámenes"
                        onExportar={async () => {
                            try {
                                mostrarToast('info', 'Generando lista oficial...');
                                const blob = await exportarListaOficial(infoExamen.idAsignatura || examenIdActivo);
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Lista_Oficial_Habilitados_${(infoExamen.nombreExamen || 'Examen').replace(/\s+/g, '_')}.xlsx`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(url);
                                mostrarToast('success', 'Lista oficial descargada exitosamente.');
                            } catch (e) {
                                mostrarToast('error', e.message || 'Error al exportar la lista oficial.');
                            }
                        }}
                    />

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-extrabold text-[#003770]">Asociación de estudiantes</p>
                            <p className="text-xs text-slate-500">Agrega uno o varios estudiantes a este examen.</p>
                        </div>
                        <button type="button" onClick={() => setMostrarPanelAsociar(true)} className="bg-[#003770] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-blue-800 transition">Asociar estudiante</button>
                    </div>

                    {/* Los separadores van con border-l explicito en "lg" y no con
                        divide-x: las clases divide-* de Tailwind v4 no pintaban
                        nada aqui (medido: 0px en los 5 hijos). Ademas con
                        sm:grid-cols-2 el divide-x habria dibujado un borde
                        vertical fantasma al inicio de cada fila. En "lg" los 5
                        campos caen en una sola fila, que es donde el separador
                        tiene sentido. */}
                    <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {filasExamen.map((f) => (
                            <div key={f.etiqueta} className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3 first:pl-0 lg:border-l lg:border-slate-100 first:lg:border-l-0">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003770] flex items-center justify-center flex-shrink-0">
                                    <Icono nombre={f.icono} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[13px] font-black uppercase text-slate-400 tracking-wider block">{f.etiqueta}</span>
                                    <p className="text-[13px] font-extrabold text-[#003770] break-words line-clamp-2" title={f.valor}>{f.valor || '---'}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {metricas.map((m) => <DocenteMetricsCards key={m.titulo} {...m} />)}
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="relative w-full sm:flex-1 sm:min-w-[280px]">
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                                placeholder="Buscar por Nombre, Cédula (CI) o Código SIS..."
                                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#003770] focus:outline-none focus:border-[#003770]"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-slate-200 rounded-xl p-1 w-full sm:w-auto overflow-x-auto">
                            {filtros.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => { setFiltroEstado(f.key); setPaginaActual(1); }}
                                    className={`text-[13px] font-bold px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${filtroEstado === f.key ? 'bg-[#003770] text-white shadow-xs' : 'text-slate-600 hover:bg-white'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
                        {cargando ? (
                            <div className="p-12 text-center text-[13px] font-bold text-slate-500">Cargando estudiantes desde el servidor...</div>
                        ) : estudiantesFiltrados.length === 0 ? (
                            <div className="p-12 text-center text-[13px] font-bold text-slate-500">No se encontraron estudiantes registrados o con ese criterio de búsqueda.</div>
                        ) : (
                            <>
                                {/* Tabla: visible desde md hacia arriba */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left text-[13px]">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase text-[13px] tracking-wider bg-[#F8FAFC]">
                                                <th className="py-3.5 px-3 sm:px-6">N°</th>
                                                <th className="py-3.5 px-3 sm:px-6">Estudiante</th>

                                                <th className="py-3.5 px-3 sm:px-6">CI</th>
                                                <th className="py-3.5 px-3 sm:px-6">Código SIS</th>
                                                <th className="py-3.5 px-3 sm:px-6">Estado de habilitación</th>
                                                <th className="py-3.5 px-3 sm:px-6">Motivo</th>
                                                <th className="py-3.5 px-3 sm:px-6 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {estudiantesPaginados.map((est, index) => (
                                                <FilaEstudiante
                                                    key={est.idHabilitacion}
                                                    est={est}
                                                    numeroFila={(paginaActual - 1) * ELEMENTOS_POR_PAGINA + index + 1}
                                                    onGestionar={abrirDrawer}
                                                    onEliminar={eliminarEstudiante}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Tarjetas: visibles solo en móvil (menos de md) */}
                                <div className="md:hidden divide-y divide-slate-100">
                                    {estudiantesPaginados.map((est, index) => (
                                        <TarjetaEstudiante
                                            key={est.idHabilitacion}
                                            est={est}
                                            numeroFila={(paginaActual - 1) * ELEMENTOS_POR_PAGINA + index + 1}
                                            onGestionar={abrirDrawer}
                                            onEliminar={eliminarEstudiante}
                                        />
                                    ))}
                                </div>

                                <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onPagina={cambiarPagina} />
                            </>
                        )}
                    </div>
                </main>
            </div>

            <div
                onClick={(e) => { if (e.target === e.currentTarget) setMostrarPanelAsociar(false); }}
                className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${mostrarPanelAsociar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <aside className={`w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 p-5 overflow-y-auto transition-transform duration-300 ${mostrarPanelAsociar ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#003770]">GESTIÓN DE HABILITACIONES</span>
                            <h2 className="text-lg font-black text-[#003770] mt-1">Asociar estudiantes</h2>
                            <p className="text-xs text-slate-500 mt-1">Examen: {infoExamen.nombreExamen}</p>
                        </div>
                        <button type="button" onClick={() => setMostrarPanelAsociar(false)} className="text-slate-400 hover:text-[#003770] text-xl font-bold">✕</button>
                    </div>

                    <form onSubmit={asociarNuevoEstudiante} className="space-y-3 border-b border-slate-100 pb-6 mb-6">
                        <h3 className="text-sm font-extrabold text-[#003770]">Asociación individual</h3>
                        <p className="text-xs text-slate-500">Ingresa un Código SIS.</p>
                        <input value={codigoNuevo} onChange={(e) => setCodigoNuevo(e.target.value)} inputMode="numeric" placeholder="Código SIS" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                        <button disabled={asociando} className="w-full bg-[#003770] text-white rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50">{asociando ? 'Asociando…' : 'Asociar estudiante'}</button>
                    </form>

                    <form onSubmit={asociarSeleccionados} className="space-y-3">
                        <h3 className="text-sm font-extrabold text-[#003770]">Asociación masiva</h3>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{seleccionados.length} seleccionado(s)</span>
                            <button type="button" onClick={() => setSeleccionados(seleccionados.length === disponiblesSeleccionables.length ? [] : disponiblesSeleccionables.map((e) => String(e.codigoSis)))} className="font-bold text-[#003770]">{seleccionados.length === disponiblesSeleccionables.length && disponiblesSeleccionables.length ? 'Quitar todos' : 'Seleccionar todos'}</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {cargandoDisponibles ? <p className="p-4 text-xs text-slate-500">Cargando estudiantes…</p> : estudiantesDisponibles.map((est) => {
                                const codigo = String(est.codigoSis ?? '');
                                const bloqueado = !codigo || codigosAsociados.has(codigo);
                                return <label key={est.idUsuario} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${bloqueado ? 'opacity-50 bg-slate-50' : 'cursor-pointer hover:bg-blue-50'}`}>
                                    <input type="checkbox" disabled={bloqueado} checked={!bloqueado && seleccionados.includes(codigo)} onChange={() => setSeleccionados((prev) => prev.includes(codigo) ? prev.filter((v) => v !== codigo) : [...prev, codigo])} />
                                    <span className="min-w-0 flex-1"><b>{est.apellido}, {est.nombre}</b><small className="block text-xs text-slate-500">SIS {codigo}{bloqueado ? ' · Ya asociado' : ''}</small></span>
                                </label>;
                            })}
                        </div>
                        <button disabled={asociando || !seleccionados.length} className="w-full border border-[#003770] text-[#003770] rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-blue-50 disabled:opacity-50">{asociando ? 'Asociando…' : 'Asociar seleccionados'}</button>
                    </form>
                </aside>
            </div>

            <div
                onClick={(e) => { if (e.target === e.currentTarget) setEstudianteSeleccionado(null); }}
                className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <div className={`w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 p-4 sm:p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado ? 'translate-x-0' : 'translate-x-full'}`}>
                    {estudianteSeleccionado && (
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                                <div>
                                    <span className="text-[13px] font-black uppercase text-[#003770] tracking-wider block">GESTIÓN INDIVIDUAL</span>
                                    <h3 className="font-black text-sm text-[#003770]">Detalle de habilitación</h3>
                                </div>
                                <button onClick={() => setEstudianteSeleccionado(null)} className="text-slate-400 hover:text-[#003770] font-bold p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">✕</button>
                            </div>

                            <div className="bg-[#F8FAFC] border border-slate-200 p-3.5 rounded-2xl mb-5 flex items-start gap-3">
                                <span className="w-9 h-9 rounded-xl bg-[#003770] text-white flex items-center justify-center font-black text-[13px] flex-shrink-0">
                                    {`${estudianteSeleccionado.nombreEstudiante?.[0] || ''}${estudianteSeleccionado.apellidoEstudiante?.[0] || ''}`.toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h4 className="font-extrabold text-[13px] text-[#003770] truncate">{`${estudianteSeleccionado.nombreEstudiante} ${estudianteSeleccionado.apellidoEstudiante}`}</h4>
                                    {estudianteSeleccionado.carreraEstudiante && (
                                        <p className="text-[13px] text-[#003770] font-semibold">{estudianteSeleccionado.carreraEstudiante}</p>
                                    )}
                                    <p className="text-[13px] text-slate-500 font-medium mt-0.5">{estudianteSeleccionado.codSisEstudiante} &bull; {estudianteSeleccionado.ciEstudiante}</p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2">ESTADO DE HABILITACIÓN</label>
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
                            <button type="button" onClick={prepararGuardado} disabled={guardando} className="w-full bg-[#003770] hover:bg-blue-700 text-white font-bold text-[13px] py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center disabled:opacity-50">
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
