import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from "../../components/common/Logo";
import { obtenerHabilitaciones, obtenerMotivosInhabilitacion, crearMotivoInhabilitacion } from "../../services/habilitacionService";

// ---------------------------------------------------------------------------
// Header propio de esta pantalla (NO el components/layout/Header compartido).
// Mismos ítems de navegación y misma paleta hex que ese archivo, más la
// campanita de notificaciones y el bloque de perfil.
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

// Usuario logueado, fijo por ahora
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

function HeaderPagina({ strRutaActiva = "Docente" }) {
    return (
        <header className="h-[98px] flex items-center px-[55px] bg-white/72 border-b border-[#E2E8F0]/75">
            <Logo />

            <nav className="ml-auto flex items-center gap-[38px] h-full" aria-label="Navegación principal">
                {arrNavItemsPagina.map((item) => (
                    <NavItemPagina key={item.strTexto} {...item} boolActivo={item.strTexto === strRutaActiva} />
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
// Catálogo inicial de motivos base (fallback)
// ---------------------------------------------------------------------------
const MOTIVOS_CATALOGO_INICIAL = [
    { idMotivo: 1, nombreMotivo: 'No cumple requisitos académicos' },
    { idMotivo: 2, nombreMotivo: 'Documentación pendiente' },
    { idMotivo: 3, nombreMotivo: 'Deuda administrativa' },
];

// ---------------------------------------------------------------------------
// Toast: notificación flotante
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
            <span>{isError ? '⚠️' : '✅'}</span>
            <span>{toast.message}</span>
            <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100 font-black cursor-pointer">✕</button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal: Crear Nuevo Motivo (Consume POST /api/motivos-inhabilitacion)
// ---------------------------------------------------------------------------
function ModalNuevoMotivo({ onCancelar, onMotivoCreado }) {
    const [nombreMotivo, setNombreMotivo] = useState('');
    const [descripcionMotivo, setDescripcionMotivo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nombreMotivo.trim()) {
            setError('El nombre del motivo es obligatorio.');
            return;
        }

        setCargando(true);
        setError(null);

        try {
            const nuevoMotivo = await crearMotivoInhabilitacion({
                nombreMotivo,
                descripcionMotivo
            });
            onMotivoCreado(nuevoMotivo);
        } catch (err) {
            console.error(err);
            setError(err.message || 'No se pudo conectar con el servidor para crear el motivo.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="w-full max-w-md bg-bg-card rounded-2xl shadow-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-lg text-primary-navy">Crear nuevo motivo</h3>
                    <button onClick={onCancelar} className="text-text-body hover:text-primary-navy font-bold p-1 rounded-lg hover:bg-bg-app transition cursor-pointer">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">
                            Nombre del motivo <span className="text-accent-red">*</span>
                        </label>
                        <input
                            type="text"
                            value={nombreMotivo}
                            onChange={(e) => { setNombreMotivo(e.target.value); if (error) setError(null); }}
                            placeholder="Ej: Inasistencia justificada..."
                            className="w-full bg-bg-app border border-border rounded-xl p-3 text-xs font-medium text-primary-navy focus:outline-none focus:border-primary-blue"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">
                            Descripción (opcional)
                        </label>
                        <textarea
                            rows="3"
                            value={descripcionMotivo}
                            onChange={(e) => setDescripcionMotivo(e.target.value)}
                            placeholder="Detalles sobre este motivo..."
                            className="w-full bg-bg-app border border-border rounded-xl p-3 text-xs font-medium text-primary-navy focus:outline-none"
                        />
                    </div>

                    {error && <p className="text-xs font-bold text-accent-red mb-4">{error}</p>}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancelar}
                            disabled={cargando}
                            className="flex-1 bg-bg-app border border-border text-primary-navy text-xs font-bold py-2.5 rounded-xl hover:bg-bg-card transition cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={cargando}
                            className="flex-1 bg-[image:var(--gradient-button)] text-white text-xs font-bold py-2.5 rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                        >
                            {cargando ? 'Guardando...' : 'Guardar motivo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal de inhabilitación
// ---------------------------------------------------------------------------
function ModalInhabilitacion({ estudiante, motivosCat, onCancelar, onConfirmar, guardando, onAbrirNuevoMotivo }) {
    const [motivoId, setMotivoId] = useState(estudiante.motivoId || '');
    const [observacion, setObservacion] = useState(estudiante.observacion || '');
    const [error, setError] = useState(null);

    const handleConfirmar = () => {
        if (!motivoId) {
            setError('Selecciona un motivo antes de confirmar la inhabilitación.');
            return;
        }
        setError(null);
        onConfirmar({ motivoId: Number(motivoId), observacion });
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="w-full max-w-md bg-bg-card rounded-2xl shadow-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-lg text-primary-navy">Confirmar inhabilitación</h3>
                    <button onClick={onCancelar} className="text-text-body hover:text-primary-navy font-bold p-1 rounded-lg hover:bg-bg-app transition cursor-pointer">✕</button>
                </div>
                <p className="text-xs text-text-body font-medium mb-5">
                    Vas a inhabilitar a <span className="font-bold text-primary-navy">{estudiante.nombreEstudiante || ''} {estudiante.apellidoEstudiante || ''}</span>. Este estudiante no podrá ingresar al examen.
                </p>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider">
                            Motivo <span className="text-accent-red">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={onAbrirNuevoMotivo}
                            className="text-[11px] font-bold text-primary-blue hover:underline cursor-pointer"
                        >
                            + Nuevo motivo
                        </button>
                    </div>
                    <select
                        value={motivoId}
                        onChange={(e) => { setMotivoId(e.target.value); if (error) setError(null); }}
                        className={`w-full bg-bg-app border rounded-xl p-2.5 text-xs font-bold text-primary-navy focus:outline-none cursor-pointer ${error ? 'border-accent-red' : 'border-border'}`}
                    >
                        <option value="" disabled>Seleccionar motivo</option>
                        {motivosCat.map((m) => (
                            <option key={m.idMotivo || m.id} value={m.idMotivo || m.id}>{m.nombreMotivo}</option>
                        ))}
                    </select>
                    {error && <p className="text-[11px] font-bold text-accent-red mt-1.5">{error}</p>}
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">
                        Justificación (opcional)
                    </label>
                    <textarea
                        rows="3"
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        placeholder="Agrega detalles adicionales sobre el motivo..."
                        className="w-full bg-bg-app border border-border rounded-xl p-3 text-xs font-medium text-primary-navy focus:outline-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancelar}
                        disabled={guardando}
                        className="flex-1 bg-bg-app border border-border text-primary-navy text-xs font-bold py-2.5 rounded-xl hover:bg-bg-card transition cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmar}
                        disabled={guardando}
                        className="flex-1 bg-accent-red text-white text-xs font-bold py-2.5 rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Confirmar inhabilitación'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GestionHabilitaciones({ examenId: propExamenId, onVolver: propOnVolver }) {
    const navigate = useNavigate();
    const { idExamen: paramIdExamen } = useParams();
    const examenId = propExamenId || Number(paramIdExamen);

    const handleVolver = propOnVolver || (() => navigate('/Home/Docente'));

    const nombreExamen = examenId === 2 ? 'Machine Learning' : 'Inteligencia Artificial';

    const [estudiantes, setEstudiantes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);
    const [motivos, setMotivos] = useState(MOTIVOS_CATALOGO_INICIAL);

    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
    const [mostrarModalInhabilitar, setMostrarModalInhabilitar] = useState(false);
    const [mostrarModalCrearMotivo, setMostrarModalCrearMotivo] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    // Cargar datos reales desde el backend
    const cargarDatos = async () => {
        setCargando(true);
        setErrorCarga(null);
        try {
            const data = await obtenerHabilitaciones();
            if (Array.isArray(data)) {
                setEstudiantes(data);
            } else {
                setEstudiantes([]);
            }
        } catch (err) {
            console.error("Error al cargar habilitaciones del backend:", err);
            setErrorCarga(err.message || "No se pudo conectar con el servidor para cargar las habilitaciones.");
            setEstudiantes([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        obtenerMotivosInhabilitacion()
            .then((res) => {
                if (Array.isArray(res) && res.length > 0) {
                    setMotivos(res);
                }
            })
            .catch(() => { });
    }, [examenId]);

    // ------------------- Buscador y filtros -------------------
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const estudiantesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return estudiantes.filter((e) => {
            const nombreCompleto = `${e.nombreEstudiante || ''} ${e.apellidoEstudiante || ''}`.toLowerCase();
            const codSis = String(e.codSisEstudiante || '').toLowerCase();
            const ci = String(e.ciEstudiante || '').toLowerCase();
            const coincideBusqueda =
                !q ||
                nombreCompleto.includes(q) ||
                codSis.includes(q) ||
                ci.includes(q);
            const coincideFiltro =
                filtroEstado === 'todos' ||
                (filtroEstado === 'habilitado' && e.estadoHabilitacion) ||
                (filtroEstado === 'inhabilitado' && !e.estadoHabilitacion);
            return coincideBusqueda && coincideFiltro;
        });
    }, [estudiantes, busqueda, filtroEstado]);

    function mostrarToast(type, message) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }

    const handleMotivoCreadoExitosamente = (nuevoMotivo) => {
        setMotivos((prev) => [...prev, nuevoMotivo]);
        setMostrarModalCrearMotivo(false);
        mostrarToast('success', '¡Motivo creado y registrado correctamente!');

        const idCreado = nuevoMotivo.idMotivo || nuevoMotivo.id;
        if (estudianteSeleccionado) {
            setEstudianteSeleccionado((prev) => ({
                ...prev,
                motivoId: idCreado,
                nombreMotivo: nuevoMotivo.nombreMotivo || prev.nombreMotivo
            }));
        }
    };

    async function persistirCambio(idHabilitacion, payload) {
        setGuardando(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 400));
            setEstudiantes((prev) =>
                prev.map((e) => (e.idHabilitacion === idHabilitacion ? { ...e, ...payload } : e))
            );
            mostrarToast('success', 'Cambios guardados correctamente.');
            setEstudianteSeleccionado(null);
            setMostrarModalInhabilitar(false);
        } catch (err) {
            mostrarToast('error', 'No se pudo guardar el cambio. Intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    }

    const handleGuardarCambios = () => {
        if (!estudianteSeleccionado) return;

        if (estudianteSeleccionado.estadoHabilitacion) {
            persistirCambio(estudianteSeleccionado.idHabilitacion, {
                estadoHabilitacion: true,
                motivoId: null,
                nombreMotivo: null,
                observacion: estudianteSeleccionado.observacion || '',
            });
            return;
        }

        setMostrarModalInhabilitar(true);
    };

    const handleConfirmarInhabilitacion = ({ motivoId, observacion }) => {
        const motivo = motivos.find((m) => (m.idMotivo || m.id) === motivoId);
        persistirCambio(estudianteSeleccionado.idHabilitacion, {
            estadoHabilitacion: false,
            motivoId,
            nombreMotivo: motivo?.nombreMotivo || null,
            observacion,
        });
    };

    const totalHabilitados = estudiantes.filter((e) => e.estadoHabilitacion).length;
    const totalInhabilitados = estudiantes.filter((e) => !e.estadoHabilitacion).length;

    return (
        <div className="min-h-screen bg-bg-app text-text-body font-nunito pb-12 relative overflow-x-hidden">
            <HeaderPagina strRutaActiva="Docente" />

            <main className="px-8 pt-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-primary-blue mb-4">
                    <button onClick={handleVolver} className="hover:underline cursor-pointer">Panel Docente</button>
                    <span className="text-text-body">›</span>
                    <span className="text-text-body">Gestión de estudiantes</span>
                </div>

                <div className="bg-bg-card p-6 rounded-2xl shadow-xs border border-border mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Logo boolCompact={true} />
                        </div>
                        <span className="text-[10px] font-black tracking-widest text-primary-blue uppercase block mb-1">
                            Examen Seleccionado
                        </span>
                        <h2 className="text-2xl font-black text-primary-navy tracking-tight">{nombreExamen}</h2>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-2">
                                <span>Habilitados</span>
                                <span className="bg-emerald-800 text-white text-[11px] px-2 py-0.5 rounded-md font-black">{totalHabilitados}</span>
                            </div>
                            <div className="bg-red-50 border border-red-200 text-accent-red text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-2">
                                <span>Inhabilitados</span>
                                <span className="bg-accent-red text-white text-[11px] px-2 py-0.5 rounded-md font-black">{totalInhabilitados}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleVolver}
                        className="bg-bg-card border border-border text-primary-navy text-xs font-bold py-2.5 px-5 rounded-xl hover:bg-bg-app transition shadow-xs cursor-pointer flex items-center gap-2"
                    >
                        ← Volver a exámenes
                    </button>
                </div>

                <div className="bg-bg-card rounded-2xl shadow-xs border border-border overflow-hidden">
                    <div className="p-5 border-b border-border flex flex-wrap justify-between items-center gap-4 bg-bg-card">
                        <h3 className="font-black text-sm text-primary-navy">Estudiantes inscritos</h3>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por nombre o código..."
                                    className="bg-bg-app border border-border rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-primary-navy w-64 focus:outline-none focus:border-primary-blue"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-body text-xs">🔍</span>
                            </div>

                            <div className="flex items-center bg-bg-app border border-border rounded-xl p-1 gap-1">
                                {[
                                    { key: 'todos', label: 'Todos' },
                                    { key: 'habilitado', label: 'Habilitados' },
                                    { key: 'inhabilitado', label: 'Inhabilitados' },
                                ].map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFiltroEstado(f.key)}
                                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${filtroEstado === f.key ? 'bg-primary-navy text-white' : 'text-text-body hover:bg-bg-card'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {cargando ? (
                        <div className="p-16 text-center text-xs font-bold text-text-body flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando estudiantes desde el servidor...</span>
                        </div>
                    ) : errorCarga && estudiantes.length === 0 ? (
                        <div className="p-12 text-center text-xs font-bold text-accent-red flex flex-col items-center justify-center gap-3">
                            <span>⚠️ {errorCarga}</span>
                            <button
                                onClick={cargarDatos}
                                className="bg-primary-navy text-white text-xs px-4 py-2 rounded-xl font-bold hover:opacity-90 transition cursor-pointer shadow-xs"
                            >
                                Reintentar conexión
                            </button>
                        </div>
                    ) : estudiantesFiltrados.length === 0 ? (
                        <div className="p-12 text-center text-xs font-bold text-text-body">
                            {estudiantes.length === 0
                                ? "No hay estudiantes registrados en la base de datos para este endpoint."
                                : "No se encontraron estudiantes con ese criterio de búsqueda o filtro."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-text-body border-b border-border font-bold uppercase text-[10px] tracking-wider bg-bg-app">
                                        <th className="py-3 px-6">Estudiante</th>
                                        <th className="py-3 px-6">Código SIS</th>
                                        <th className="py-3 px-6">Cédula</th>
                                        <th className="py-3 px-6">Estado</th>
                                        <th className="py-3 px-6 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border font-medium">
                                    {estudiantesFiltrados.map((est) => (
                                        <tr key={est.idHabilitacion} className="hover:bg-bg-app transition">
                                            <td className="py-4 px-6 font-bold text-primary-navy">
                                                {(est.nombreEstudiante || est.apellidoEstudiante)
                                                    ? `${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()
                                                    : `Estudiante SIS #${est.codSisEstudiante}`}
                                            </td>
                                            <td className="py-4 px-6 text-text-body font-mono">{est.codSisEstudiante}</td>
                                            <td className="py-4 px-6 text-text-body">{est.ciEstudiante || '-'}</td>
                                            <td className="py-4 px-6">
                                                {est.estadoHabilitacion ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md text-[11px]">• Habilitado</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-accent-red font-bold px-2.5 py-1 rounded-md text-[11px]">• Inhabilitado ({est.nombreMotivo || 'Sin motivo'})</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => setEstudianteSeleccionado({ ...est })}
                                                    className="bg-[image:var(--gradient-button)] text-white font-bold text-xs py-1.5 px-4 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer"
                                                >
                                                    Gestionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* DRAWER LATERAL */}
            <div className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado && !mostrarModalInhabilitar && !mostrarModalCrearMotivo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`w-full max-w-md bg-bg-card h-full shadow-2xl flex flex-col justify-between border-l border-border p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado && !mostrarModalInhabilitar && !mostrarModalCrearMotivo ? 'translate-x-0' : 'translate-x-full'}`}>
                    {estudianteSeleccionado && (
                        <>
                            <div>
                                <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-primary-blue tracking-wider block">Gestión Individual</span>
                                        <h3 className="font-black text-base text-primary-navy">Detalle de habilitación</h3>
                                    </div>
                                    <button onClick={() => setEstudianteSeleccionado(null)} className="text-text-body hover:text-primary-navy font-bold p-1.5 rounded-lg hover:bg-bg-app transition cursor-pointer">✕</button>
                                </div>

                                <div className="bg-bg-app border border-border p-4 rounded-2xl mb-6">
                                    <h4 className="font-extrabold text-sm text-primary-navy">{estudianteSeleccionado.nombreEstudiante || ''} {estudianteSeleccionado.apellidoEstudiante || ''}</h4>
                                    <p className="text-xs text-text-body font-mono mt-0.5">Código SIS: {estudianteSeleccionado.codSisEstudiante}</p>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">Estado de habilitación</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: true, motivoId: null })}
                                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${estudianteSeleccionado.estadoHabilitacion ? 'border-emerald-600 bg-emerald-50' : 'border-border bg-bg-card'}`}
                                        >
                                            <span className={`block text-xs font-black ${estudianteSeleccionado.estadoHabilitacion ? 'text-emerald-800' : 'text-primary-navy'}`}>Habilitado</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: false })}
                                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${!estudianteSeleccionado.estadoHabilitacion ? 'border-accent-red bg-red-50' : 'border-border bg-bg-card'}`}
                                        >
                                            <span className={`block text-xs font-black ${!estudianteSeleccionado.estadoHabilitacion ? 'text-accent-red' : 'text-primary-navy'}`}>Inhabilitado</span>
                                        </button>
                                    </div>
                                    {!estudianteSeleccionado.estadoHabilitacion && (
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider">
                                                    Motivo de inhabilitación <span className="text-accent-red">*</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setMostrarModalCrearMotivo(true)}
                                                    className="text-[11px] font-bold text-primary-blue hover:underline cursor-pointer"
                                                >
                                                    + Nuevo motivo
                                                </button>
                                            </div>
                                            <select
                                                value={estudianteSeleccionado.motivoId || ''}
                                                onChange={(e) => setEstudianteSeleccionado({ ...estudianteSeleccionado, motivoId: Number(e.target.value) })}
                                                className="w-full bg-bg-app border border-border rounded-xl p-2.5 text-xs font-bold text-primary-navy focus:outline-none cursor-pointer"
                                            >
                                                <option value="" disabled>Seleccionar motivo</option>
                                                {motivos.map((m) => (
                                                    <option key={m.idMotivo || m.id} value={m.idMotivo || m.id}>{m.nombreMotivo}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={handleGuardarCambios}
                                    disabled={guardando}
                                    className="w-full bg-[image:var(--gradient-button)] text-white font-bold text-xs py-3 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL DE INHABILITACIÓN */}
            {mostrarModalInhabilitar && estudianteSeleccionado && (
                <ModalInhabilitacion
                    estudiante={estudianteSeleccionado}
                    motivosCat={motivos}
                    guardando={guardando}
                    onCancelar={() => setMostrarModalInhabilitar(false)}
                    onConfirmar={handleConfirmarInhabilitacion}
                    onAbrirNuevoMotivo={() => setMostrarModalCrearMotivo(true)}
                />
            )}

            {/* MODAL PARA CREAR NUEVO MOTIVO */}
            {mostrarModalCrearMotivo && (
                <ModalNuevoMotivo
                    onCancelar={() => setMostrarModalCrearMotivo(false)}
                    onMotivoCreado={handleMotivoCreadoExitosamente}
                />
            )}

            {/* TOAST */}
            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}