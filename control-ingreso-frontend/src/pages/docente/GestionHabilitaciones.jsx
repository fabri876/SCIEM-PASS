import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from "../../components/layout/Header";
import Logo from "../../components/common/Logo";

// Catálogo de motivos, fijo mientras maquetas.
const MOTIVOS_CATALOGO = [
    { idMotivo: 1, nombreMotivo: 'No cumple requisitos académicos' },
    { idMotivo: 2, nombreMotivo: 'Documentación pendiente' },
    { idMotivo: 3, nombreMotivo: 'Deuda administrativa' },
];

// Estudiantes de ejemplo, agrupados por examen.
const ESTUDIANTES_POR_EXAMEN = {
    1: {
        nombreExamen: 'Inteligencia Artificial',
        estudiantes: [
            { idHabilitacion: 1, nombreEstudiante: 'María José', apellidoEstudiante: 'Flores', codSisEstudiante: '12345678', ciEstudiante: '12345678', estadoHabilitacion: true, motivoId: null, nombreMotivo: null, observacion: '' },
            { idHabilitacion: 2, nombreEstudiante: 'Carlos Andrés', apellidoEstudiante: 'Díaz', codSisEstudiante: '87654321', ciEstudiante: '87654321', estadoHabilitacion: true, motivoId: null, nombreMotivo: null, observacion: '' },
            { idHabilitacion: 3, nombreEstudiante: 'Valeria', apellidoEstudiante: 'Quispe', codSisEstudiante: '11223344', ciEstudiante: '11223344', estadoHabilitacion: false, motivoId: 1, nombreMotivo: 'No cumple requisitos académicos', observacion: '' },
            { idHabilitacion: 4, nombreEstudiante: 'Jhonny', apellidoEstudiante: 'Mamani', codSisEstudiante: '98765432', ciEstudiante: '98765432', estadoHabilitacion: true, motivoId: null, nombreMotivo: null, observacion: '' },
        ],
    },
    2: {
        nombreExamen: 'Machine Learning',
        estudiantes: [
            { idHabilitacion: 5, nombreEstudiante: 'Esteban', apellidoEstudiante: 'Vargas', codSisEstudiante: '55667788', ciEstudiante: '55667788', estadoHabilitacion: true, motivoId: null, nombreMotivo: null, observacion: '' },
            { idHabilitacion: 6, nombreEstudiante: 'Lucía', apellidoEstudiante: 'Beltrán', codSisEstudiante: '44556677', ciEstudiante: '44556677', estadoHabilitacion: false, motivoId: 2, nombreMotivo: 'Documentación pendiente', observacion: '' },
        ],
    },
};

// ---------------------------------------------------------------------------
// Toast: notificación flotante de éxito/error, se auto-cierra sola.
// ---------------------------------------------------------------------------
function Toast({ toast, onClose }) {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-bold
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
// Modal de inhabilitación: pide motivo (obligatorio) + justificación.
// ---------------------------------------------------------------------------
function ModalInhabilitacion({ estudiante, onCancelar, onConfirmar, guardando }) {
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
                    Vas a inhabilitar a <span className="font-bold text-primary-navy">{estudiante.nombreEstudiante} {estudiante.apellidoEstudiante}</span>. Este estudiante no podrá ingresar al examen.
                </p>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">
                        Motivo <span className="text-accent-red">*</span>
                    </label>
                    <select
                        value={motivoId}
                        onChange={(e) => { setMotivoId(e.target.value); if (error) setError(null); }}
                        className={`w-full bg-bg-app border rounded-xl p-2.5 text-xs font-bold text-primary-navy focus:outline-none cursor-pointer ${error ? 'border-accent-red' : 'border-border'}`}
                    >
                        <option value="" disabled>Seleccionar motivo</option>
                        {MOTIVOS_CATALOGO.map((m) => (
                            <option key={m.idMotivo} value={m.idMotivo}>{m.nombreMotivo}</option>
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

    const examenData = ESTUDIANTES_POR_EXAMEN[examenId] || { nombreExamen: 'Examen no encontrado', estudiantes: [] };

    const [estudiantes, setEstudiantes] = useState(examenData.estudiantes);
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
    const [mostrarModalInhabilitar, setMostrarModalInhabilitar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    // ------------------- Buscador y filtros -------------------
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'habilitado' | 'inhabilitado'

    const estudiantesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return estudiantes.filter((e) => {
            const coincideBusqueda =
                !q ||
                `${e.nombreEstudiante} ${e.apellidoEstudiante}`.toLowerCase().includes(q) ||
                e.codSisEstudiante.toLowerCase().includes(q);
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

    // ------------------- Guardar cambios -------------------
    // Simula la llamada al backend. Cuando conectes la API real, reemplaza
    // el setTimeout por el fetch/axios correspondiente dentro del try.
    async function persistirCambio(idHabilitacion, payload) {
        setGuardando(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Aquí iría: await actualizarHabilitacion(idHabilitacion, payload)

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

        // Si va a quedar Habilitado, se guarda directo (no requiere motivo).
        if (estudianteSeleccionado.estadoHabilitacion) {
            persistirCambio(estudianteSeleccionado.idHabilitacion, {
                estadoHabilitacion: true,
                motivoId: null,
                nombreMotivo: null,
                observacion: estudianteSeleccionado.observacion || '',
            });
            return;
        }

        // Si va a quedar Inhabilitado, primero se pide confirmación + motivo en el modal.
        setMostrarModalInhabilitar(true);
    };

    const handleConfirmarInhabilitacion = ({ motivoId, observacion }) => {
        const motivo = MOTIVOS_CATALOGO.find((m) => m.idMotivo === motivoId);
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
            {/* Header unificado del equipo */}
            <Header strRutaActiva="Docente" />

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
                        <h2 className="text-2xl font-black text-primary-navy tracking-tight">{examenData.nombreExamen}</h2>
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
                            {/* Buscador */}
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

                            {/* Filtros rápidos */}
                            <div className="flex items-center bg-bg-app border border-border rounded-xl p-1 gap-1">
                                {[
                                    { key: 'todos', label: 'Todos' },
                                    { key: 'habilitado', label: 'Habilitados' },
                                    { key: 'inhabilitado', label: 'Inhabilitados' },
                                ].map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFiltroEstado(f.key)}
                                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                            filtroEstado === f.key
                                                ? 'bg-primary-navy text-white'
                                                : 'text-text-body hover:bg-bg-card'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {estudiantesFiltrados.length === 0 ? (
                        <div className="p-12 text-center text-xs font-bold text-text-body">
                            No se encontraron estudiantes con ese criterio.
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
                                        <td className="py-4 px-6 font-bold text-primary-navy">{est.nombreEstudiante} {est.apellidoEstudiante}</td>
                                        <td className="py-4 px-6 text-text-body font-mono">{est.codSisEstudiante}</td>
                                        <td className="py-4 px-6 text-text-body">{est.ciEstudiante}</td>
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
            <div className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado && !mostrarModalInhabilitar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`w-full max-w-md bg-bg-card h-full shadow-2xl flex flex-col justify-between border-l border-border p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado && !mostrarModalInhabilitar ? 'translate-x-0' : 'translate-x-full'}`}>
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
                                    <h4 className="font-extrabold text-sm text-primary-navy">{estudianteSeleccionado.nombreEstudiante} {estudianteSeleccionado.apellidoEstudiante}</h4>
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
                                        <p className="text-[11px] text-text-body font-medium mt-2">
                                            Al guardar, se te pedirá confirmar el motivo de la inhabilitación.
                                        </p>
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
                    guardando={guardando}
                    onCancelar={() => setMostrarModalInhabilitar(false)}
                    onConfirmar={handleConfirmarInhabilitacion}
                />
            )}

            {/* TOAST */}
            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}