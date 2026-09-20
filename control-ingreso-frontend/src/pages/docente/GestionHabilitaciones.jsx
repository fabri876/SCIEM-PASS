import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from "../../components/common/Logo";
import { obtenerHabilitaciones, actualizarHabilitacion } from "../../services/habilitacionService";


// ---------------------------------------------------------------------------
// Header propio de esta pantalla
// ---------------------------------------------------------------------------
const arrNavItemsPagina = [
    {
        strTexto: "Inicio",
        svgIcono: (
            <>
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10.5V20h14v-9.5" />
                <path d="M9 20v-6h6v6" />
            </>
        ),
    },
    {
        strTexto: "Mis exámenes",
        svgIcono: (
            <>
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 3v4M16 3v4M4 10h16" />
            </>
        ),
    },
    {
        strTexto: "Resultados",
        svgIcono: (
            <>
                <circle cx="12" cy="8" r="3" />
                <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
            </>
        ),
    },
    {
        strTexto: "Reportes",
        svgIcono: <path d="M5 20V10M12 20V4M19 20v-7" />,
    },
];

const objUsuarioPagina = {
    strIniciales: "PR",
    strNombre: "Patricia Rodríguez",
    strRol: "Docente",
    boolTieneNotificacion: true,
};

function NavItemPagina({ strTexto, svgIcono, boolActivo = false }) {
    return (
        <div
            className={`relative flex items-center gap-2.5 h-full text-sm whitespace-nowrap ${boolActivo ? "font-extrabold text-[#123F7B]" : "text-[#294B7C]"
                }`}
        >
            <svg className="w-5 h-5 stroke-[#123F7B] fill-none stroke-[1.8]" viewBox="0 0 24 24">
                {svgIcono}
            </svg>
            {strTexto}
            {boolActivo && (
                <span className="absolute bottom-[26px] left-0 right-0 h-1 rounded-[5px] bg-[linear-gradient(90deg,#2563EB,#D93856)]" />
            )}
        </div>
    );
}

function NotificationBellPagina({ boolTieneNotificacion }) {
    return (
        <button
            type="button"
            aria-label="Notificaciones"
            className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F0F6FC] transition cursor-pointer"
        >
            <svg className="w-5 h-5 stroke-[#123F7B] fill-none stroke-[1.8]" viewBox="0 0 24 24">
                <path d="M6 16v-4.5a6 6 0 0 1 12 0V16l1.5 2h-15z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {boolTieneNotificacion && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D93856]" />
            )}
        </button>
    );
}

function UserProfilePagina({ strIniciales, strNombre, strRol }) {
    return (
        <button
            type="button"
            className="flex items-center gap-2.5 pl-1 pr-1 py-1 rounded-full hover:bg-[#F0F6FC] transition cursor-pointer"
        >
            <span className="w-9 h-9 rounded-full bg-[#123F7B] text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                {strIniciales}
            </span>
            <span className="flex flex-col items-start leading-tight">
                <span className="text-sm font-extrabold text-[#123F7B]">{strNombre}</span>
                <span className="text-xs font-semibold text-[#7A8BA0]">{strRol}</span>
            </span>
            <svg className="w-4 h-4 stroke-[#7A8BA0] fill-none stroke-[2] ml-0.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
        </button>
    );
}

function HeaderPagina() {
    return (
        <header className="h-[98px] flex items-center px-[55px] bg-white/72 border-b border-[#E2E8F0]/75">
            <Logo />
            <nav className="ml-auto flex items-center gap-[38px] h-full" aria-label="Navegación principal">
                {arrNavItemsPagina.map((item) => (
                    <NavItemPagina key={item.strTexto} {...item} boolActivo={item.strTexto === "Mis exámenes"} />
                ))}
                <div className="h-[30px] border-l border-[#CBD5E1]" />
                <NotificationBellPagina boolTieneNotificacion={objUsuarioPagina.boolTieneNotificacion} />
                <UserProfilePagina
                    strIniciales={objUsuarioPagina.strIniciales}
                    strNombre={objUsuarioPagina.strNombre}
                    strRol={objUsuarioPagina.strRol}
                />
            </nav>
        </header>
    );
}

// ---------------------------------------------------------------------------
// Datos iniciales de estudiantes
// ---------------------------------------------------------------------------
const ESTUDIANTES_INICIALES = [
    {
        idHabilitacion: 1,
        nombreEstudiante: 'Alejandro',
        apellidoEstudiante: 'Morales Quispe',
        emailEstudiante: 'a.morales.q@univalle.edu.bo',
        carreraEstudiante: 'Ingeniería de Sistemas',
        codSisEstudiante: 202104812,
        ciEstudiante: '8472910 LP',
        estadoHabilitacion: false,
        nombreMotivo: '-',
    },
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
// Notificación Toast flotante
// ---------------------------------------------------------------------------
function Toast({ toast, onClose }) {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div
            className={`fixed bottom-6 right-6 z-[120] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-bold
        ${isError ? 'bg-red-50 border-red-200 text-accent-red' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
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

    // Estados para la edición del motivo dentro del drawer
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

    // Carga de la lista real desde el Backend en Spring Boot
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
        <div className="min-h-screen bg-bg-app text-text-body font-nunito pb-12 relative overflow-x-hidden">
            <HeaderPagina />

            <main className="px-8 pt-6 max-w-7xl mx-auto">
                {/* Métricas Superiores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-bg-card p-5 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-text-body uppercase block mb-1">TOTAL ESTUDIANTES</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-primary-navy">{totalEstudiantes}</span>
                                <span className="text-xs text-text-body font-medium">registrados</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-bg-card p-5 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-text-body uppercase block mb-1">HABILITADOS</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-emerald-600">{totalHabilitados}</span>
                                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                                    {Math.round((totalHabilitados / (totalEstudiantes || 1)) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-bg-card p-5 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-text-body uppercase block mb-1">INHABILITADOS</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-accent-red">{totalInhabilitados}</span>
                                <span className="text-xs text-accent-red font-bold bg-red-50 px-2 py-0.5 rounded-md">
                                    {Math.round((totalInhabilitados / (totalEstudiantes || 1)) * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros de búsqueda */}
                <div className="bg-bg-card p-6 rounded-2xl shadow-xs border border-border mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="relative flex-1 min-w-[280px]">
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                            placeholder="Buscar por Nombre, Cédula (CI) o Código SIS..."
                            className="w-full bg-bg-app border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-primary-navy focus:outline-none focus:border-primary-blue"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-bg-app border border-border rounded-xl p-1">
                        {[
                            { key: 'todos', label: `Todos (${totalEstudiantes})` },
                            { key: 'habilitado', label: `Habilitados (${totalHabilitados})` },
                            { key: 'inhabilitado', label: `Inhabilitados (${totalInhabilitados})` },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => { setFiltroEstado(f.key); setPaginaActual(1); }}
                                className={`text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer ${filtroEstado === f.key ? 'bg-primary-navy text-white shadow-xs' : 'text-text-body hover:bg-bg-card'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabla de Estudiantes */}
                <div className="bg-bg-card rounded-2xl shadow-xs border border-border overflow-hidden">
                    {estudiantesFiltrados.length === 0 ? (
                        <div className="p-12 text-center text-xs font-bold text-text-body">
                            No se encontraron estudiantes con ese criterio de búsqueda o filtro.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="text-text-body border-b border-border font-bold uppercase text-[10px] tracking-wider bg-bg-app">
                                            <th className="py-3.5 px-6">N°</th>
                                            <th className="py-3.5 px-6">Estudiante</th>
                                            <th className="py-3.5 px-6">CI</th>
                                            <th className="py-3.5 px-6">Código SIS</th>
                                            <th className="py-3.5 px-6">Estado de habilitación</th>
                                            <th className="py-3.5 px-6">Motivo</th>
                                            <th className="py-3.5 px-6 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border font-medium">
                                        {estudiantesPaginados.map((est, index) => {
                                            const numeroFila = (paginaActual - 1) * elementosPorPagina + index + 1;
                                            const iniciales = `${est.nombreEstudiante?.[0] || ''}${est.apellidoEstudiante?.[0] || ''}`.toUpperCase();

                                            return (
                                                <tr key={est.idHabilitacion} className="hover:bg-bg-app transition">
                                                    <td className="py-4 px-6 font-bold text-text-body">{numeroFila}</td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-8 h-8 rounded-full bg-blue-100 text-primary-blue flex items-center justify-center font-black text-xs flex-shrink-0">
                                                                {iniciales || 'US'}
                                                            </span>
                                                            <div>
                                                                <p className="font-extrabold text-primary-navy">
                                                                    {`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}
                                                                </p>
                                                                <p className="text-[11px] text-text-body font-normal">{est.emailEstudiante}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-text-body font-medium">{est.ciEstudiante}</td>
                                                    <td className="py-4 px-6 text-text-body font-mono font-semibold">{est.codSisEstudiante}</td>
                                                    <td className="py-4 px-6">
                                                        {est.estadoHabilitacion ? (
                                                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1 rounded-full text-[11px]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Habilitado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-accent-red border border-red-200 font-bold px-3 py-1 rounded-full text-[11px]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-accent-red"></span> Inhabilitado
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-text-body max-w-xs truncate" title={est.nombreMotivo}>
                                                        {est.nombreMotivo}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={() => abrirDrawer(est)}
                                                            className="bg-primary-blue hover:opacity-90 text-white font-bold text-xs py-2 px-4 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
                            <div className="p-4 border-t border-border flex items-center justify-between bg-bg-app">
                                <span className="text-xs text-text-body font-semibold">
                                    Mostrando página <span className="font-bold text-primary-navy">{paginaActual}</span> de <span className="font-bold text-primary-navy">{totalPaginas}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                                        disabled={paginaActual === 1}
                                        className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-xs font-bold text-primary-navy disabled:opacity-40 cursor-pointer transition hover:bg-bg-app"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                                        disabled={paginaActual === totalPaginas}
                                        className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-xs font-bold text-primary-navy disabled:opacity-40 cursor-pointer transition hover:bg-bg-app"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* DRAWER LATERAL DE GESTIÓN */}
            <div className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`w-full max-w-md bg-bg-card h-full shadow-2xl flex flex-col justify-between border-l border-border p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado ? 'translate-x-0' : 'translate-x-full'}`}>
                    {estudianteSeleccionado && (
                        <div>
                            {/* Cabecera del Drawer */}
                            <div className="flex items-center justify-between pb-3 border-b border-border mb-5">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-primary-blue tracking-wider block">GESTIÓN INDIVIDUAL</span>
                                    <h3 className="font-black text-sm text-primary-navy">Detalle de habilitación</h3>
                                </div>
                                <button
                                    onClick={() => setEstudianteSeleccionado(null)}
                                    className="text-text-body hover:text-primary-navy font-bold p-1.5 rounded-lg hover:bg-bg-app transition cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tarjeta de Datos del Estudiante */}
                            <div className="bg-bg-app border border-border p-3.5 rounded-2xl mb-5 flex items-start gap-3">
                                <span className="w-9 h-9 rounded-xl bg-primary-blue text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                                    {`${estudianteSeleccionado.nombreEstudiante?.[0] || ''}${estudianteSeleccionado.apellidoEstudiante?.[0] || ''}`.toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h4 className="font-extrabold text-xs text-primary-navy truncate">
                                        {`${estudianteSeleccionado.nombreEstudiante} ${estudianteSeleccionado.apellidoEstudiante}`}
                                    </h4>
                                    <p className="text-[11px] text-primary-blue font-semibold">{estudianteSeleccionado.carreraEstudiante}</p>
                                    <p className="text-[10px] text-text-body font-medium mt-0.5">
                                        {estudianteSeleccionado.codSisEstudiante} &bull; {estudianteSeleccionado.ciEstudiante}
                                    </p>
                                </div>
                            </div>

                            {/* Estado de Habilitación */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-text-body uppercase tracking-wider mb-2">
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
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold'
                                                : 'border-border bg-bg-card text-text-body font-bold'
                                            }`}
                                    >
                                        Habilitado
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setEstudianteSeleccionado({
                                            ...estudianteSeleccionado,
                                            estadoHabilitacion: false
                                        })}
                                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs transition cursor-pointer ${!estudianteSeleccionado.estadoHabilitacion
                                                ? 'border-accent-red bg-red-50 text-accent-red font-extrabold'
                                                : 'border-border bg-bg-card text-text-body font-bold'
                                            }`}
                                    >
                                        Inhabilitado
                                    </button>
                                </div>
                            </div>

                            {/* Condicional: Si está INHABILITADO se muestra el motivo */}
                            {!estudianteSeleccionado.estadoHabilitacion ? (
                                <div className="mb-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[10px] font-bold text-text-body uppercase tracking-wider">
                                            MOTIVO DE INHABILITACIÓN
                                        </label>
                                        <span className="text-[10px] font-bold text-accent-red">Requerido</span>
                                    </div>

                                    {editandoMotivo ? (
                                        <div className="bg-bg-app border border-primary-blue p-3.5 rounded-2xl shadow-xs space-y-3">
                                            <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-xs text-primary-navy font-medium">
                                                <span className="font-bold">Motivo actual:</span> {estudianteSeleccionado.nombreMotivo}
                                            </div>
                                            <textarea
                                                rows="3"
                                                value={textoMotivoBorrador}
                                                onChange={(e) => setTextoMotivoBorrador(e.target.value)}
                                                placeholder="Escribe el motivo detallado..."
                                                className="w-full bg-bg-card border border-border rounded-xl p-2.5 text-xs font-medium text-primary-navy focus:outline-none focus:border-primary-blue"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditandoMotivo(false)}
                                                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-text-body bg-bg-card hover:bg-bg-app transition cursor-pointer"
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
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary-blue hover:opacity-90 transition cursor-pointer"
                                                >
                                                    Aplicar texto
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-bg-app border border-border p-3.5 rounded-2xl space-y-3">
                                            <p className="text-xs font-medium text-primary-navy leading-relaxed">
                                                {estudianteSeleccionado.nombreMotivo || 'Sin motivo especificado'}
                                            </p>
                                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEstudianteSeleccionado({ ...estudianteSeleccionado, nombreMotivo: '-' });
                                                        mostrarToast('success', 'Motivo eliminado.');
                                                    }}
                                                    className="text-xs font-bold text-accent-red hover:underline cursor-pointer"
                                                >
                                                    Eliminar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTextoMotivoBorrador(estudianteSeleccionado.nombreMotivo);
                                                        setEditandoMotivo(true);
                                                    }}
                                                    className="text-xs font-bold text-primary-blue hover:underline cursor-pointer"
                                                >
                                                    Modificar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Si está HABILITADO muestra la tarjeta de Auditoría Institucional */
                                <div className="mb-5 bg-blue-50/60 border border-blue-200/80 p-3.5 rounded-2xl">
                                    <h4 className="text-xs font-extrabold text-primary-navy mb-0.5">Auditoría Institucional Automática</h4>
                                    <p className="text-[11px] text-text-body font-medium leading-relaxed">
                                        Cualquier cambio de estado generará un registro con firma digital y marca temporal visible en el historial del estudiante.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botones inferiores del Drawer */}
                    {estudianteSeleccionado && (
                        <div className="pt-3 border-t border-border space-y-2.5">
                            <button
                                type="button"
                                onClick={handleGuardarCambiosGenerales}
                                disabled={guardando}
                                className="w-full bg-[image:var(--gradient-button)] text-white font-bold text-xs py-2.5 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEstudianteSeleccionado(null)}
                                disabled={guardando}
                                className="w-full text-center text-xs font-bold text-text-body hover:text-primary-navy py-1 cursor-pointer transition disabled:opacity-50"
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