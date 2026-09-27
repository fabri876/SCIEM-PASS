import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { obtenerHabilitaciones, actualizarHabilitacion } from "../../services/habilitacionService";
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

const ELEMENTOS_POR_PAGINA = 4;

function normalizarHabilitaciones(lista) {
    return lista.map((item) => {
        const estaHabilitado = Boolean(item.estadoHabilitacion ?? (item.estado === 'HABILITADO'));
        const motivoBackend = item.observacionHabilitacion || item.nombreMotivo || item.observacion;
        return {
            idHabilitacion: item.idHabilitacion,
            nombreEstudiante: item.nombreEstudiante || 'Estudiante',
            apellidoEstudiante: item.apellidoEstudiante || '',
            emailEstudiante: item.correoEstudiante || item.emailEstudiante || `${(item.nombreEstudiante || 'estudiante').toLowerCase().charAt(0)}.${(item.apellidoEstudiante || 'apellido').toLowerCase().split(' ')[0]}@univalle.edu.bo`,

            codSisEstudiante: item.codSisEstudiante || '---',
            ciEstudiante: item.ciEstudiante || '---',
            estadoHabilitacion: estaHabilitado,
            nombreMotivo: estaHabilitado ? '-' : (motivoBackend || 'Sin motivo especificado')
        };
    });
}

export default function GestionHabilitaciones({ examenId: propExamenId }) {
    const { idExamen: paramIdExamen } = useParams();
    const examenIdActivo = propExamenId || paramIdExamen;

    // BUG-008 (QA): este estado arrancaba con datos de examen inventados y
    // nunca se actualizaba con datos reales (no hay ningún endpoint que
    // devuelva horario/ambiente a partir de solo el idExamen todavía) — se
    // deja vacío para no mostrar información falsa como si fuera real.
    const [infoExamen, setInfoExamen] = useState({});
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
                const data = await obtenerHabilitaciones(examenIdActivo);
                if (!cancel && Array.isArray(data)) {
                    setEstudiantes(normalizarHabilitaciones(data));
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
            if (!estaHabilitado) {
                if (motivoSelectValue === '__personalizado__') textoMotivoFinal = motivoPersonalizado.trim() || 'Sin motivo especificado';
                else textoMotivoFinal = motivoSelectValue || estudianteSeleccionado.nombreMotivo || 'Sin motivo especificado';
            }
            const respuestaBackend = await actualizarHabilitacion(estudianteSeleccionado.idHabilitacion, {
                estadoHabilitacion: estaHabilitado,
                observacionHabilitacion: textoMotivoFinal
            });
            setEstudiantes((prev) => prev.map((e) => {
                if (e.idHabilitacion === estudianteSeleccionado.idHabilitacion) {
                    const estadoFinal = Boolean(respuestaBackend?.estadoHabilitacion ?? (respuestaBackend?.estado === 'HABILITADO' ?? estaHabilitado));
                    return { ...e, estadoHabilitacion: estadoFinal, nombreMotivo: estadoFinal ? '-' : (respuestaBackend?.observacionHabilitacion || textoMotivoFinal) };
                }
                return e;
            }));
            const mensajeToast = estaHabilitado
                ? 'Estudiante registrado como Habilitado exitosamente.'
                : (textoMotivoFinal && textoMotivoFinal !== 'Sin motivo especificado')
                    ? 'Estudiante inhabilitado exitosamente con el motivo especificado.'
                    : 'Estudiante registrado como Inhabilitado sin motivo especificado.';
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

    const totalEstudiantes = estudiantes.length;
    const totalHabilitados = estudiantes.filter((e) => e.estadoHabilitacion).length;
    const totalInhabilitados = estudiantes.filter((e) => !e.estadoHabilitacion).length;
    const porcentaje = (n) => (totalEstudiantes > 0 ? Math.round((n / totalEstudiantes) * 100) : 0);

    const metricas = [
        { titulo: 'TOTAL ESTUDIANTES', valor: totalEstudiantes, icono: 'estudiantes', detalle: <span className="text-xs text-slate-500 font-medium">registrados</span>, claseNumero: 'text-[#1A365D]', claseIcono: 'bg-blue-50 text-[#2563EB]' },
        { titulo: 'HABILITADOS', valor: totalHabilitados, icono: 'habilitado', detalle: <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">{porcentaje(totalHabilitados)}%</span>, claseNumero: 'text-emerald-600', claseIcono: 'bg-emerald-50 text-emerald-600' },
        { titulo: 'INHABILITADOS', valor: totalInhabilitados, icono: 'inhabilitado', detalle: <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">{porcentaje(totalInhabilitados)}%</span>, claseNumero: 'text-rose-600', claseIcono: 'bg-rose-50 text-rose-600' },
    ];

    const obtenerDuracionCalculada = (dur, hor) => {
        if (dur && dur !== '---') return dur;
        if (hor && hor.includes('-')) {
            const partes = hor.split('-').map((s) => s.trim());
            if (partes.length === 2) {
                const [h1, m1] = partes[0].split(':').map(Number);
                const [h2, m2] = partes[1].split(':').map(Number);
                if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
                    const diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                    if (diffMins > 0) {
                        const hrs = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                    }
                }
            }
        }
        return '---';
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

            {/* pt-[106px]: DocenteHeader ya no es responsive (64px en mobile /
                98px en desktop) desde que el menú de cuenta se movió adentro
                de Header.jsx — ahora mide 98px siempre, así que el padding
                deja de variar por breakpoint. */}
            <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-[106px]">
                <main className="w-full space-y-4 sm:space-y-5">

                    <CabeceraModulo onExportar={() => mostrarToast('success', 'Exportando lista de estudiantes...')} />

                    <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                        {filasExamen.map((f) => (
                            <div key={f.etiqueta} className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3 first:pl-0">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                                    <Icono nombre={f.icono} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">{f.etiqueta}</span>
                                    <p className="text-xs font-extrabold text-[#1A365D] break-words line-clamp-2" title={f.valor}>{f.valor || '---'}</p>
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
                                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-slate-200 rounded-xl p-1 w-full sm:w-auto overflow-x-auto">
                            {filtros.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => { setFiltroEstado(f.key); setPaginaActual(1); }}
                                    className={`text-xs font-bold px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${filtroEstado === f.key ? 'bg-[#1A365D] text-white shadow-xs' : 'text-slate-600 hover:bg-white'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
                        {cargando ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-500">Cargando estudiantes desde el servidor...</div>
                        ) : estudiantesFiltrados.length === 0 ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-500">No se encontraron estudiantes registrados o con ese criterio de búsqueda.</div>
                        ) : (
                            <>
                                {/* Tabla: visible desde md hacia arriba */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase text-[10px] tracking-wider bg-[#F8FAFC]">
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
                onClick={(e) => { if (e.target === e.currentTarget) setEstudianteSeleccionado(null); }}
                className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <div className={`w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 p-4 sm:p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado ? 'translate-x-0' : 'translate-x-full'}`}>
                    {estudianteSeleccionado && (
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-[#2563EB] tracking-wider block">GESTIÓN INDIVIDUAL</span>
                                    <h3 className="font-black text-sm text-[#1A365D]">Detalle de habilitación</h3>
                                </div>
                                <button onClick={() => setEstudianteSeleccionado(null)} className="text-slate-400 hover:text-[#1A365D] font-bold p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">✕</button>
                            </div>

                            <div className="bg-[#F8FAFC] border border-slate-200 p-3.5 rounded-2xl mb-5 flex items-start gap-3">
                                <span className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                                    {`${estudianteSeleccionado.nombreEstudiante?.[0] || ''}${estudianteSeleccionado.apellidoEstudiante?.[0] || ''}`.toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h4 className="font-extrabold text-xs text-[#1A365D] truncate">{`${estudianteSeleccionado.nombreEstudiante} ${estudianteSeleccionado.apellidoEstudiante}`}</h4>
                                    <p className="text-[11px] text-[#2563EB] font-semibold">{estudianteSeleccionado.carreraEstudiante || estudianteSeleccionado.carrera || 'Ingeniería de Sistemas'}</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{estudianteSeleccionado.codSisEstudiante} &bull; {estudianteSeleccionado.ciEstudiante}</p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ESTADO DE HABILITACIÓN</label>
                                <SelectorEstado
                                    habilitado={estudianteSeleccionado.estadoHabilitacion}
                                    onHabilitar={() => { setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: true, nombreMotivo: '-' }); setMotivoSelectValue(''); setMotivoPersonalizado(''); }}
                                    onInhabilitar={() => setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: false })}
                                />
                            </div>

                            {estudianteSeleccionado.estadoHabilitacion ? (
                                <div className="mb-5 bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-2xl">
                                    <h4 className="text-xs font-extrabold text-[#1A365D] mb-0.5">Auditoría Institucional Automática</h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Cualquier cambio de estado generará un registro con firma digital y marca temporal visible en el historial del estudiante.</p>
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
                            <button type="button" onClick={prepararGuardado} disabled={guardando} className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center disabled:opacity-50">
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button type="button" onClick={() => setEstudianteSeleccionado(null)} disabled={guardando} className="w-full text-center text-xs font-bold text-slate-500 hover:text-[#1A365D] py-1 cursor-pointer transition disabled:opacity-50">
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