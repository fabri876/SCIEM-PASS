import React, { useState, useEffect, useMemo } from 'react';
import { obtenerTodasAsignaturas } from '../../../services/asignaturaService';

// Materias de prueba sincronizadas con el diseño oficial de la imagen
const MATERIAS_INICIALES = [
    {
        id: 1,
        codigo: "INF-412",
        nombre: "Sistemas Distribuidos",
        docente: "Ing. Carlos Montellano",
        estado: "Activa",
        estudiantesInscritos: 8,
        habilitados: 6,
        inhabilitados: 2,
    },
    {
        id: 2,
        codigo: "INF-420",
        nombre: "Informática Forense",
        docente: "Lic. Marcela Arispe",
        estado: "Activa",
        estudiantesInscritos: 62,
        habilitados: 62,
        inhabilitados: 0,
    },
    {
        id: 3,
        codigo: "INF-310",
        nombre: "Bases de Datos Avanzadas",
        docente: "Ing. Walter Claros",
        estado: "Activa",
        estudiantesInscritos: 95,
        habilitados: 90,
        inhabilitados: 5,
    },
    {
        id: 4,
        codigo: "IND-220",
        nombre: "Planificación y Control",
        docente: "Ing. Ramiro Torrico",
        estado: "Activa",
        estudiantesInscritos: 70,
        habilitados: 69,
        inhabilitados: 1,
    }
];
// Paleta de temas visuales basados estrictamente en la paleta institucional (Azul Marino, Azul Primario, Celeste, Índigo)
const TEMAS_PALETA = [
    {
        bg: "bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30",
        border: "border-blue-200/90",
        accentIconBg: "bg-[#2563EB]",
        accentIconText: "text-white",
        btnBg: "bg-[#2563EB] hover:bg-blue-700 text-white",
    },
    {
        bg: "bg-gradient-to-br from-slate-50 via-white to-blue-50/20",
        border: "border-slate-200",
        accentIconBg: "bg-[#1A365D]",
        accentIconText: "text-white",
        btnBg: "bg-[#1A365D] hover:bg-slate-900 text-white",
    },
    {
        bg: "bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30",
        border: "border-sky-200/90",
        accentIconBg: "bg-sky-600",
        accentIconText: "text-white",
        btnBg: "bg-sky-600 hover:bg-sky-700 text-white",
    },
    {
        bg: "bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30",
        border: "border-indigo-200/90",
        accentIconBg: "bg-indigo-600",
        accentIconText: "text-white",
        btnBg: "bg-indigo-600 hover:bg-indigo-700 text-white",
    }
];

export default function GestionMateriasAdmin({ onSeleccionarMateria }) {
    const [materias, setMaterias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modoVista, setModoVista] = useState('grid'); // 'grid' | 'list'
    const [materiaDestacada, setMateriaDestacada] = useState(null);

    useEffect(() => {
        let cancelado = false;
        async function cargarAsignaturas() {
            try {
                setCargando(true);
                const data = await obtenerTodasAsignaturas();
                if (!cancelado && Array.isArray(data)) {
                    const materiasMapeadas = data.map((item, idx) => ({
                        id: item.idAsignatura || idx + 1,
                        idAsignatura: item.idAsignatura,
                        codigo: item.siglaAsignatura || `MAT-${item.idAsignatura}`,
                        nombre: item.nombreAsignatura || 'Asignatura',
                        docente: item.nombreDocente || 'Docente Asignado',
                        estado: 'Activa',
                        estudiantesInscritos: item.estudiantesInscritos ?? 0,
                        habilitados: item.habilitados ?? 0,
                        inhabilitados: item.inhabilitados ?? 0,
                    }));
                    setMaterias(materiasMapeadas);
                    if (materiasMapeadas.length > 0) {
                        setMateriaDestacada(materiasMapeadas[0].id);
                    }
                }
            } catch (err) {
                console.error("Error al obtener asignaturas desde la BD:", err);
                if (!cancelado) setMaterias([]);
            } finally {
                if (!cancelado) setCargando(false);
            }
        }
        cargarAsignaturas();
        return () => { cancelado = true; };
    }, []);

    const materiasFiltradas = useMemo(() => {
        const query = busqueda.trim().toLowerCase();
        if (!query) return materias;
        return materias.filter(m =>
            (m.nombre && m.nombre.toLowerCase().includes(query)) ||
            (m.codigo && m.codigo.toLowerCase().includes(query)) ||
            (m.docente && m.docente.toLowerCase().includes(query))
        );
    }, [materias, busqueda]);

    return (
        <div className="space-y-6 font-nunito">
            {/* ENCABEZADO DE GESTIÓN ACADÉMICA OFICIAL */}
            <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-primary-blue text-sm">🎓</span>
                        <span className="text-[11px] font-black tracking-wider text-primary-blue uppercase">
                            GESTIÓN ACADÉMICA OFICIAL
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-[#1A365D] tracking-tight">
                        Habilitación de Estudiantes
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Seleccione una asignatura para gestionar la habilitación de estudiantes a exámenes oficiales.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-100 px-4 py-2.5 rounded-2xl text-primary-blue font-bold text-xs self-start md:self-center">
                    <svg className="w-4 h-4 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>Gestión II-2026</span>
                </div>
            </div>

            {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y VISTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por materia o docente..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-[#1A365D] placeholder-slate-400 focus:outline-none focus:border-primary-blue shadow-xs"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-center">
                    <span>Vista:</span>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setModoVista('grid')}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${modoVista === 'grid' ? 'bg-blue-50 text-primary-blue' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista en Grilla"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => setModoVista('list')}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${modoVista === 'list' ? 'bg-blue-50 text-primary-blue' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista en Lista"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* LISTA / GRILLA DE TARJETAS DE MATERIAS */}
            {cargando ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs animate-pulse space-y-4 min-h-[220px] flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="w-8 h-8 rounded-xl bg-slate-200"></div>
                                    <div className="w-14 h-5 rounded-full bg-slate-100"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                </div>
                                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                                <div className="flex gap-2 pt-1">
                                    <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
                                    <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <div className="h-9 bg-slate-200 rounded-xl w-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : materiasFiltradas.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-xs">
                    No se encontraron asignaturas que coincidan con la búsqueda.
                </div>
            ) : modoVista === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {materiasFiltradas.map((mat, index) => {
                        const esDestacada = materiaDestacada === mat.id;
                        const tema = TEMAS_PALETA[index % TEMAS_PALETA.length];
                        const inicial = (mat.nombre || 'A').charAt(0).toUpperCase();

                        return (
                            <div
                                key={mat.id}
                                onClick={() => setMateriaDestacada(mat.id)}
                                className={`${tema.bg} ${tema.border} rounded-3xl p-5 shadow-xs transition duration-200 flex flex-col justify-between border cursor-pointer min-h-[220px] ${esDestacada
                                    ? 'ring-2 ring-blue-500/30 shadow-md scale-[1.01]'
                                    : 'hover:shadow-md hover:scale-[1.005]'
                                    }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-3 py-1 rounded-xl ${tema.accentIconBg} ${tema.accentIconText} text-xs font-black tracking-wider uppercase shadow-xs`}>
                                            {mat.codigo}
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-600 font-bold px-3 py-0.5 rounded-full text-[11px] border border-emerald-200/60">
                                            {mat.estado}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="font-extrabold text-sm text-[#1A365D] leading-snug line-clamp-2">
                                            {mat.nombre}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                                            Docente: <span className="font-semibold text-slate-700">{mat.docente}</span>
                                        </p>
                                    </div>

                                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-1">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                        <span>{mat.estudiantesInscritos} estudiantes registrados</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                            {mat.habilitados} Habilitados
                                        </span>
                                        <span className="bg-rose-50 text-rose-600 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-rose-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                            {mat.inhabilitados} Inhabilitados
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100/80">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSeleccionarMateria(mat);
                                        }}
                                        className={`w-full ${tema.btnBg} font-bold text-xs py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-between cursor-pointer group shadow-xs`}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            Gestionar Habilitacion
                                        </span>
                                        <span className="transform group-hover:translate-x-1 transition duration-200">→</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {materiasFiltradas.map((mat) => (
                            <div
                                key={mat.id}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-primary-blue bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                {mat.codigo}
                                            </span>
                                            <h3 className="font-extrabold text-sm text-[#1A365D]">{mat.nombre}</h3>
                                            <span className="bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200">
                                                {mat.estado}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Docente: {mat.docente} &bull; {mat.estudiantesInscritos} estudiantes registrados
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-center">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                                            {mat.habilitados} Hab.
                                        </span>
                                        <span className="bg-rose-50 text-rose-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-rose-100">
                                            {mat.inhabilitados} Inhab.
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onSeleccionarMateria(mat)}
                                        className="bg-primary-blue hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>Gestionar Habilitacion</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BANNER INFERIOR DE REGISTRO DE AUDITORÍA INSTITUCIONAL */}
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-primary-blue flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
                <div>
                    <h4 className="font-extrabold text-xs text-[#1A365D]">
                        Registro de Auditoría Institucional
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                        La lista de asignaturas y sus evaluaciones está sincronizada con el Sistema Central de la Universidad Mayor de San Simón.
                    </p>
                </div>
            </div>
        </div>
    );
}
