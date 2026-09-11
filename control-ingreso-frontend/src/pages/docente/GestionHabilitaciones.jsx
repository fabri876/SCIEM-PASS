import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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

export default function GestionHabilitaciones({ examenId: propExamenId, onVolver: propOnVolver }) {
    const navigate = useNavigate();
    const { idExamen: paramIdExamen } = useParams();
    const examenId = propExamenId || Number(paramIdExamen);

    const handleVolver = propOnVolver || (() => navigate('/Home/Docente'));

    const examenData = ESTUDIANTES_POR_EXAMEN[examenId] || { nombreExamen: 'Examen no encontrado', estudiantes: [] };

    const [estudiantes, setEstudiantes] = useState(examenData.estudiantes);
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);

    const handleGuardarCambios = () => {
        if (!estudianteSeleccionado) return;

        const motivo = MOTIVOS_CATALOGO.find((m) => m.idMotivo === estudianteSeleccionado.motivoId);

        setEstudiantes(
            estudiantes.map((e) =>
                e.idHabilitacion === estudianteSeleccionado.idHabilitacion
                    ? {
                        ...estudianteSeleccionado,
                        nombreMotivo: estudianteSeleccionado.estadoHabilitacion ? null : motivo?.nombreMotivo || null,
                    }
                    : e
            )
        );
        setEstudianteSeleccionado(null);
    };

    const totalHabilitados = estudiantes.filter((e) => e.estadoHabilitacion).length;
    const totalInhabilitados = estudiantes.filter((e) => !e.estadoHabilitacion).length;

    return (
        <div className="min-h-screen bg-bg-app text-text-body font-nunito pb-12 relative overflow-x-hidden">
            <header className="flex items-center justify-between px-8 py-4 bg-bg-card border-b border-border shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                        <h1 className="text-xl font-black tracking-wider text-primary-navy">SCIEM-PASS</h1>
                        <p className="text-[9px] text-text-body font-extrabold tracking-tight">Sistema de Control de Ingreso a Exámenes Masivos</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-bg-app py-1.5 px-3 rounded-full border border-border">
                    <div className="w-7 h-7 rounded-full bg-primary-navy text-white flex items-center justify-center text-[10px] font-black">
                        PR
                    </div>
                    <div className="text-xs leading-tight">
                        <span className="font-extrabold text-primary-navy block">Patricia Rodríguez</span>
                        <span className="text-text-body font-bold block text-[9px]">Docente</span>
                    </div>
                </div>
            </header>

            <main className="px-8 pt-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-primary-blue mb-4">
                    <button onClick={handleVolver} className="hover:underline cursor-pointer">Panel Docente</button>
                    <span className="text-text-body">›</span>
                    <span className="text-text-body">Gestión de estudiantes</span>
                </div>

                <div className="bg-bg-card p-6 rounded-2xl shadow-xs border border-border mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
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
                    <div className="p-5 border-b border-border flex justify-between items-center bg-bg-card">
                        <h3 className="font-black text-sm text-primary-navy">Estudiantes inscritos</h3>
                        <span className="text-xs font-bold text-text-body">{estudiantes.length} estudiantes</span>
                    </div>

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
                            {estudiantes.map((est) => (
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
                </div>
            </main>

            {/* DRAWER LATERAL */}
            <div className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${estudianteSeleccionado ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`w-full max-w-md bg-bg-card h-full shadow-2xl flex flex-col justify-between border-l border-border p-6 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${estudianteSeleccionado ? 'translate-x-0' : 'translate-x-full'}`}>
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
                                            onClick={() => setEstudianteSeleccionado({ ...estudianteSeleccionado, estadoHabilitacion: false, motivoId: MOTIVOS_CATALOGO[0]?.idMotivo || null })}
                                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${!estudianteSeleccionado.estadoHabilitacion ? 'border-accent-red bg-red-50' : 'border-border bg-bg-card'}`}
                                        >
                                            <span className={`block text-xs font-black ${!estudianteSeleccionado.estadoHabilitacion ? 'text-accent-red' : 'text-primary-navy'}`}>Inhabilitado</span>
                                        </button>
                                    </div>
                                </div>

                                {!estudianteSeleccionado.estadoHabilitacion && (
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">Motivo *</label>
                                        <select
                                            value={estudianteSeleccionado.motivoId || ''}
                                            onChange={(e) => setEstudianteSeleccionado({ ...estudianteSeleccionado, motivoId: Number(e.target.value) })}
                                            className="w-full bg-bg-app border border-border rounded-xl p-2.5 text-xs font-bold text-primary-navy focus:outline-none cursor-pointer"
                                        >
                                            <option value="" disabled>Seleccionar motivo</option>
                                            {MOTIVOS_CATALOGO.map((m) => (
                                                <option key={m.idMotivo} value={m.idMotivo}>{m.nombreMotivo}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">Observaciones</label>
                                    <textarea
                                        rows="3"
                                        value={estudianteSeleccionado.observacion || ''}
                                        onChange={(e) => setEstudianteSeleccionado({ ...estudianteSeleccionado, observacion: e.target.value })}
                                        className="w-full bg-bg-app border border-border rounded-xl p-3 text-xs font-medium text-primary-navy focus:outline-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={handleGuardarCambios}
                                    className="w-full bg-[image:var(--gradient-button)] text-white font-bold text-xs py-3 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer"
                                >
                                    Guardar cambios
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
