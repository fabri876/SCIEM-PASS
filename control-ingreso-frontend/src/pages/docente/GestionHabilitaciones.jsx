import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from "../../components/layout/Header";
import { obtenerHabilitaciones, actualizarHabilitacion } from "../../services/habilitacionService";

// ---------------------------------------------------------------------------
// Datos iniciales de estudiantes
// ---------------------------------------------------------------------------
const ESTUDIANTES_INICIALES = [
    {
        idHabilitacion: 2,
        nombreEstudiante: 'Valeria Sofía',
        apellidoEstudiante: 'Claros Rojas',
        emailEstudiante: 'v.claros.r@univalle.edu.bo',
        carreraEstudiante: 'Ingeniería Comercial',
        codSisEstudiante: 202201944,
        ciEstudiante: '9123841 CB',
        estadoHabilitacion: true,
        nombreMotivo: '-',
    },
    {
        idHabilitacion: 3,
        nombreEstudiante: 'Mateo Fernando',
        apellidoEstudiante: 'Condori Mamani',
        emailEstudiante: 'm.condori.m@univalle.edu.bo',
        carreraEstudiante: 'Ingeniería Civil',
        codSisEstudiante: 201903120,
        ciEstudiante: '7481923 SC',
        estadoHabilitacion: false,
        nombreMotivo: 'No cumple requisitos académicos previos.',
    },
    {
        idHabilitacion: 4,
        nombreEstudiante: 'Camila Luciana',
        apellidoEstudiante: 'Torrico Vargas',
        emailEstudiante: 'c.torrico.v@univalle.edu.bo',
        carreraEstudiante: 'Medicina',
        codSisEstudiante: 202302811,
        ciEstudiante: '6839201 LP',
        estadoHabilitacion: false,
        nombreMotivo: 'Bloqueo por Dirección de Carrera: Convalidación pendiente.',
    },
    {
        idHabilitacion: 5,
        nombreEstudiante: 'Rodrigo Hernán',
        apellidoEstudiante: 'Choque Flores',
        emailEstudiante: 'r.choque.f@univalle.edu.bo',
        carreraEstudiante: 'Derecho',
        codSisEstudiante: 202004122,
        ciEstudiante: '5481290 PT',
        estadoHabilitacion: true,
        nombreMotivo: '-',
    }
];

// ---------------------------------------------------------------------------
// Header unificado idéntico al de HomeDocente
// ---------------------------------------------------------------------------
const objUsuarioPagina = {
    strIniciales: "PP",
    strNombre: "Patricia Pérez",
    strRol: "DOCENTE UMSS",
};

function HeaderPagina({ onCerrarSesion }) {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <Header strRutaActiva="Exámenes" />
                </div>

                <div className="h-[98px] flex items-center gap-3 pr-[55px] pl-4 bg-white shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#1A365D] text-white font-extrabold text-sm flex items-center justify-center shadow-sm shrink-0">
                        {objUsuarioPagina.strIniciales}
                    </div>

                    <div className="flex flex-col text-left">
                        <span className="text-xs font-extrabold text-slate-800 leading-tight whitespace-nowrap">
                            {objUsuarioPagina.strNombre}
                        </span>
                        <span className="text-[11px] text-[#2563EB] font-semibold leading-tight whitespace-nowrap">
                            {objUsuarioPagina.strRol}
                        </span>
                    </div>

                    <button
                        onClick={onCerrarSesion}
                        title="Cerrar sesión"
                        className="ml-2 text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                        Salir
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Notificación Toast flotante
// ---------------------------------------------------------------------------
function Toast({ toast, onClose }) {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div
            className={`fixed bottom-6 right-6 z-[120] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-bold font-nunito
        ${isError ? 'bg-red-50 border-red-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
            role="status"
        >
            <span>{toast.message}</span>
            <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100 font-black cursor-pointer">✕</button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export default function GestionHabilitaciones({ examenId: propExamenId, onVolver: propOnVolver }) {
    const navigate = useNavigate();
    const { idExamen: paramIdExamen } = useParams();

    const [estudiantes, setEstudiantes] = useState(ESTUDIANTES_INICIALES);
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [editandoMotivo, setEditandoMotivo] = useState(false);
    const [textoMotivoBorrador, setTextoMotivoBorrador] = useState('');

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 4;

    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    function mostrarToast(type, message) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }

    const fnCerrarSesion = () => {
        localStorage.removeItem("usuario");
        navigate("/login");
    };

    useEffect(() => {
        let cancel = false;
        async function cargar() {
            try {
                setCargando(true);
                const data = await obtenerHabilitaciones();
                if (!cancel && Array.isArray(data) && data.length > 0) {
                    const formateados = data.map((item) => {
                        const estaHabilitado = Boolean(item.estadoHabilitacion ?? (item.estado === 'HABILITADO'));
                        const motivoBackend = item.observacionHabilitacion || item.nombreMotivo || item.observacion;
                        return {
                            idHabilitacion: item.idHabilitacion,
                            nombreEstudiante: item.nombreEstudiante || 'Estudiante',
                            apellidoEstudiante: item.apellidoEstudiante || '',
                            emailEstudiante: item.correoEstudiante || item.emailEstudiante || `${(item.nombreEstudiante || 'estudiante').toLowerCase().charAt(0)}.${(item.apellidoEstudiante || 'apellido').toLowerCase().split(' ')[0]}@univalle.edu.bo`,
                            carreraEstudiante: item.carreraEstudiante || 'Ingeniería de Sistemas',
                            codSisEstudiante: item.codSisEstudiante || '---',
                            ciEstudiante: item.ciEstudiante || '---',
                            estadoHabilitacion: estaHabilitado,
                            nombreMotivo: estaHabilitado ? '-' : (motivoBackend || 'Sin motivo especificado')
                        };
                    });
                    setEstudiantes(formateados);
                }
            } catch (err) {
                console.error("Error al obtener habilitaciones desde el backend:", err);
            } finally {
                if (!cancel) setCargando(false);
            }
        }
        cargar();
        return () => { cancel = true; };
    }, []);

    const estudiantesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return estudiantes.filter((e) => {
            const nombreCompleto = `${e.nombreEstudiante || ''} ${e.apellidoEstudiante || ''}`.toLowerCase();
            const codSis = String(e.codSisEstudiante || '').toLowerCase();
            const ci = String(e.ciEstudiante || '').toLowerCase();
            const coincideBusqueda = !q || nombreCompleto.includes(q) || codSis.includes(q) || ci.includes(q);
            const coincideFiltro =
                filtroEstado === 'todos' ||
                (filtroEstado === 'habilitado' && e.estadoHabilitacion) ||
                (filtroEstado === 'inhabilitado' && !e.estadoHabilitacion);
            return coincideBusqueda && coincideFiltro;
        });
    }, [estudiantes, busqueda, filtroEstado]);

    const totalPaginas = Math.ceil(estudiantesFiltrados.length / elementosPorPagina) || 1;
    const estudiantesPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * elementosPorPagina;
        return estudiantesFiltrados.slice(inicio, inicio + elementosPorPagina);
    }, [estudiantesFiltrados, paginaActual]);

    const abrirDrawer = (est) => {
        setEstudianteSeleccionado({ ...est });
        setEditandoMotivo(false);
        setTextoMotivoBorrador(est.nombreMotivo || '');
    };

    const handleGuardarCambiosGenerales = async () => {
        if (!estudianteSeleccionado) return;
        try {
            setGuardando(true);
            const estaHabilitado = estudianteSeleccionado.estadoHabilitacion;
            const textoMotivo = estaHabilitado ? null : (estudianteSeleccionado.nombreMotivo === '-' ? null : estudianteSeleccionado.nombreMotivo);

            const respuestaBackend = await actualizarHabilitacion(estudianteSeleccionado.idHabilitacion, {
                estadoHabilitacion: estaHabilitado,
                observacionHabilitacion: textoMotivo
            });

            setEstudiantes((prev) =>
                prev.map((e) => {
                    if (e.idHabilitacion === estudianteSeleccionado.idHabilitacion) {
                        const estadoFinal = Boolean(respuestaBackend.estadoHabilitacion ?? (respuestaBackend.estado === 'HABILITADO'));
                        return {
                            ...e,
                            estadoHabilitacion: estadoFinal,
                            nombreMotivo: estadoFinal ? '-' : (respuestaBackend.observacionHabilitacion || estudianteSeleccionado.nombreMotivo)
                        };
                    }
                    return e;
                })
            );

            mostrarToast('success', 'Habilitación actualizada exitosamente.');
            setEstudianteSeleccionado(null);
            setEditandoMotivo(false);
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

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-nunito pb-16">

            {/* HEADER UNIFICADO */}
            <HeaderPagina onCerrarSesion={fnCerrarSesion} />

            {/* CONTENEDOR PRINCIPAL */}
            <div className="max-w-[1440px] mx-auto px-6 pt-[130px]">
                <main className="w-full space-y-6">

                    {/* Métricas Superiores */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">TOTAL ESTUDIANTES</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-[#1A365D]">{totalEstudiantes}</span>
                                    <span className="text-xs text-slate-500 font-medium">registrados</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">HABILITADOS</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-emerald-600">{totalHabilitados}</span>
                                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                                        {Math.round((totalHabilitados / (totalEstudiantes || 1)) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">INHABILITADOS</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-rose-600">{totalInhabilitados}</span>
                                    <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                                        {Math.round((totalInhabilitados / (totalEstudiantes || 1)) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filtros de búsqueda y pestañas con color de Gestionar (#1A365D) */}
                    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="relative flex-1 min-w-[280px]">
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                                placeholder="Buscar por Nombre, Cédula (CI) o Código SIS..."
                                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-slate-200 rounded-xl p-1">
                            {[
                                { key: 'todos', label: `Todos (${totalEstudiantes})` },
                                { key: 'habilitado', label: `Habilitados (${totalHabilitados})` },
                                { key: 'inhabilitado', label: `Inhabilitados (${totalInhabilitados})` },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => { setFiltroEstado(f.key); setPaginaActual(1); }}
                                    className={`text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer ${filtroEstado === f.key
                                        ? 'bg-[#1A365D] text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-white'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabla de Estudiantes */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                        {estudiantesFiltrados.length === 0 ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-500">
                                No se encontraron estudiantes con ese criterio de búsqueda o filtro.
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase text-[10px] tracking-wider bg-[#F8FAFC]">
                                                <th className="py-3.5 px-6">N°</th>
                                                <th className="py-3.5 px-6">Estudiante</th>
                                                <th className="py-3.5 px-6">CI</th>
                                                <th className="py-3.5 px-6">Código SIS</th>
                                                <th className="py-3.5 px-6">Estado de habilitación</th>
                                                <th className="py-3.5 px-6">Motivo</th>
                                                <th className="py-3.5 px-6 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {estudiantesPaginados.map((est, index) => {
                                                const numeroFila = (paginaActual - 1) * elementosPorPagina + index + 1;
                                                const iniciales = `${est.nombreEstudiante?.[0] || ''}${est.apellidoEstudiante?.[0] || ''}`.toUpperCase();

                                                return (
                                                    <tr key={est.idHabilitacion} className="hover:bg-[#F8FAFC] transition">
                                                        <td className="py-4 px-6 font-bold text-slate-500">{numeroFila}</td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-black text-xs flex-shrink-0">
                                                                    {iniciales || 'US'}
                                                                </span>
                                                                <div>
                                                                    <p className="font-extrabold text-[#1A365D]">
                                                                        {`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-400 font-normal">{est.emailEstudiante}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-600 font-medium">{est.ciEstudiante}</td>
                                                        <td className="py-4 px-6 text-slate-600 font-mono font-semibold">{est.codSisEstudiante}</td>
                                                        <td className="py-4 px-6">
                                                            {est.estadoHabilitacion ? (
                                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1 rounded-full text-[11px]">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Habilitado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 bg-red-50 text-rose-600 border border-red-200 font-bold px-3 py-1 rounded-full text-[11px]">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inhabilitado
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-600 max-w-xs truncate" title={est.nombreMotivo}>
                                                            {est.nombreMotivo}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <button
                                                                onClick={() => abrirDrawer(est)}
                                                                className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                                            >
                                                                Gestionar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación */}
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-[#F8FAFC]">
                                    <span className="text-xs text-slate-500 font-semibold">
                                        Mostrando página <span className="font-bold text-[#1A365D]">{paginaActual}</span> de <span className="font-bold text-[#1A365D]">{totalPaginas}</span>
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                                            disabled={paginaActual === 1}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#1A365D] disabled:opacity-40 cursor-pointer transition hover:bg-slate-50"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                                            disabled={paginaActual === totalPaginas}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#1A365D] disabled:opacity-40 cursor-pointer transition hover:bg-slate-50"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* DRAWER LATERAL DERECHO DE GESTIÓN */}
            <div className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado ? 'translate-x-0' : 'translate-x-full'}`}>
                    {estudianteSeleccionado && (
                        <div>
                            {/* Cabecera del Drawer */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-[#2563EB] tracking-wider block">GESTIÓN INDIVIDUAL</span>
                                    <h3 className="font-black text-sm text-[#1A365D]">Detalle de habilitación</h3>
                                </div>
                                <button
                                    onClick={() => setEstudianteSeleccionado(null)}
                                    className="text-slate-400 hover:text-[#1A365D] font-bold p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tarjeta de Datos del Estudiante */}
                            <div className="bg-[#F8FAFC] border border-slate-200 p-3.5 rounded-2xl mb-5 flex items-start gap-3">
                                <span className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                                    {`${estudianteSeleccionado.nombreEstudiante?.[0] || ''}${estudianteSeleccionado.apellidoEstudiante?.[0] || ''}`.toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h4 className="font-extrabold text-xs text-[#1A365D] truncate">
                                        {`${estudianteSeleccionado.nombreEstudiante} ${estudianteSeleccionado.apellidoEstudiante}`}
                                    </h4>
                                    <p className="text-[11px] text-[#2563EB] font-semibold">{estudianteSeleccionado.carreraEstudiante}</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                        {estudianteSeleccionado.codSisEstudiante} &bull; {estudianteSeleccionado.ciEstudiante}
                                    </p>
                                </div>
                            </div>

                            {/* ESTADO DE HABILITACIÓN */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    ESTADO DE HABILITACIÓN
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEstudianteSeleccionado({
                                                ...estudianteSeleccionado,
                                                estadoHabilitacion: true,
                                                nombreMotivo: '-'
                                            });
                                            setEditandoMotivo(false);
                                        }}
                                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs transition cursor-pointer ${estudianteSeleccionado.estadoHabilitacion
                                            ? 'border-[#2563EB] bg-blue-50 text-[#1A365D] font-extrabold shadow-xs ring-1 ring-[#2563EB]'
                                            : 'border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${estudianteSeleccionado.estadoHabilitacion ? 'bg-emerald-600' : 'bg-slate-300'}`}></span>
                                        Habilitado
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setEstudianteSeleccionado({
                                            ...estudianteSeleccionado,
                                            estadoHabilitacion: false
                                        })}
                                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs transition cursor-pointer ${!estudianteSeleccionado.estadoHabilitacion
                                            ? 'border-rose-600 bg-rose-50 text-rose-600 font-extrabold shadow-xs ring-1 ring-rose-600'
                                            : 'border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${!estudianteSeleccionado.estadoHabilitacion ? 'bg-rose-600' : 'bg-slate-300'}`}></span>
                                        Inhabilitado
                                    </button>
                                </div>
                            </div>

                            {/* Condicional: Si está INHABILITADO se muestra el motivo */}
                            {!estudianteSeleccionado.estadoHabilitacion ? (
                                <div className="mb-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            MOTIVO DE INHABILITACIÓN
                                        </label>
                                        <span className="text-[10px] font-bold text-rose-600">Requerido</span>
                                    </div>

                                    {editandoMotivo ? (
                                        <div className="bg-[#F8FAFC] border border-[#2563EB] p-3.5 rounded-2xl shadow-xs space-y-3">
                                            <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-xs text-[#1A365D] font-medium">
                                                <span className="font-bold">Motivo actual:</span> {estudianteSeleccionado.nombreMotivo}
                                            </div>
                                            <textarea
                                                rows="3"
                                                value={textoMotivoBorrador}
                                                onChange={(e) => setTextoMotivoBorrador(e.target.value)}
                                                placeholder="Escribe el motivo detallado..."
                                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditandoMotivo(false)}
                                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition cursor-pointer"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEstudianteSeleccionado({
                                                            ...estudianteSeleccionado,
                                                            nombreMotivo: textoMotivoBorrador.trim() || 'Sin motivo especificado'
                                                        });
                                                        setEditandoMotivo(false);
                                                        mostrarToast('success', 'Texto de motivo actualizado.');
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2563EB] hover:opacity-90 transition cursor-pointer"
                                                >
                                                    Aplicar texto
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-[#F8FAFC] border border-slate-200 p-3.5 rounded-2xl space-y-3">
                                            <p className="text-xs font-medium text-[#1A365D] leading-relaxed">
                                                {estudianteSeleccionado.nombreMotivo || 'Sin motivo especificado'}
                                            </p>
                                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEstudianteSeleccionado({ ...estudianteSeleccionado, nombreMotivo: '-' });
                                                        mostrarToast('success', 'Motivo eliminado.');
                                                    }}
                                                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                                                >
                                                    Eliminar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTextoMotivoBorrador(estudianteSeleccionado.nombreMotivo);
                                                        setEditandoMotivo(true);
                                                    }}
                                                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                                                >
                                                    Modificar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-5 bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-2xl">
                                    <h4 className="text-xs font-extrabold text-[#1A365D] mb-0.5">Auditoría Institucional Automática</h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Cualquier cambio de estado generará un registro con firma digital y marca temporal visible en el historial del estudiante.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botones inferiores del Drawer */}
                    {estudianteSeleccionado && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                            <button
                                type="button"
                                onClick={handleGuardarCambiosGenerales}
                                disabled={guardando}
                                className="w-full bg-[#2563EB] text-white font-bold text-xs py-2.5 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEstudianteSeleccionado(null)}
                                disabled={guardando}
                                className="w-full text-center text-xs font-bold text-slate-500 hover:text-[#1A365D] py-1 cursor-pointer transition disabled:opacity-50"
                            >
                                Cerrar sin guardar
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}