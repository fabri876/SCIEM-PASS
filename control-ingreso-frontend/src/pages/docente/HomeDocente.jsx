import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeDocente() {
    const navigate = useNavigate();

    // Datos de ejemplo basados en tu diseño exacto
    const [examenesHoy] = useState([
        {
            idExamen: 1,
            nombreExamen: 'Inteligencia Artificial',
            aula: 'Aula 612 · Bloque F',
            horario: '09:00 – 11:00',
            ingresados: 31,
            noLlegan: 13,
            inhabilitados: 3,
            totalInscritos: 47,
            colorIcono: 'bg-primary-blue text-white',
            icono: '🛡️'
        },
        {
            idExamen: 2,
            nombreExamen: 'Machine Learning',
            aula: 'Aula 305 + Aula 306',
            horario: '14:00 – 16:00',
            ingresados: 0,
            noLlegan: 134,
            inhabilitados: 6,
            totalInscritos: 140,
            colorIcono: 'bg-purple-600 text-white',
            icono: '⚛️'
        }
    ]);

    return (
        <div className="min-h-screen bg-bg-app text-text-body font-nunito pb-16">

            {/* ===== HEADER / NAVBAR SUPERIOR ===== */}
            <header className="flex items-center justify-between px-8 py-3.5 bg-bg-card border-b border-border shadow-xs sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🛡️</span>
                    <div>
                        <h1 className="text-lg font-black tracking-wider text-primary-navy leading-none">
                            SCIEM-PASS
                        </h1>
                        <p className="text-[9px] text-text-body font-extrabold tracking-tight mt-0.5">
                            Sistema de Control de Ingreso a Exámenes Masivos
                        </p>
                    </div>
                </div>

                {/* Navegación central del menú superior */}
                <nav className="hidden md:flex items-center gap-6 text-xs font-bold">
                    <button className="flex items-center gap-1.5 text-primary-blue border-b-2 border-primary-blue pb-1 cursor-pointer">
                        <span>🏠</span> Inicio
                    </button>
                    <button onClick={() => navigate('/Home/Docente/Examenes')} className="flex items-center gap-1.5 text-text-body hover:text-primary-navy pb-1 cursor-pointer">
                        <span>📋</span> Mis exámenes
                    </button>
                    <button className="flex items-center gap-1.5 text-text-body hover:text-primary-navy pb-1 cursor-pointer">
                        <span>👤</span> Habilitaciones
                    </button>
                    <button className="flex items-center gap-1.5 text-text-body hover:text-primary-navy pb-1 cursor-pointer">
                        <span>📊</span> Reportes
                    </button>
                </nav>

                {/* Perfil de usuario */}
                <div className="flex items-center gap-3 bg-bg-app py-1 px-3 rounded-full border border-border">
                    <div className="w-7 h-7 rounded-full bg-primary-navy text-white flex items-center justify-center text-[10px] font-black">
                        PR
                    </div>
                    <div className="text-xs leading-tight">
                        <span className="font-extrabold text-primary-navy block">Patricia Rodríguez</span>
                        <span className="text-text-body font-bold block text-[9px]">Docente</span>
                    </div>
                </div>
            </header>

            {/* ===== CONTENIDO PRINCIPAL ===== */}
            <main className="px-8 pt-8 max-w-7xl mx-auto">

                {/* Saludo y fecha */}
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-primary-navy tracking-tight">Hola, Patricia</h2>
                    <p className="text-xs text-text-body font-medium mt-0.5">
                        Viernes, 5 de septiembre de 2026 – <span className="font-bold text-primary-navy">2 exámenes programados hoy</span>
                    </p>
                </div>

                {/* ===== TARJETAS DE MÉTRICAS SUPERIORES ===== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                    {/* Tarjeta 1 */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-primary-blue bg-blue-50 px-2 py-1 rounded-lg">📅 Exámenes hoy</span>
                            </div>
                            <span className="text-3xl font-black text-primary-navy tracking-tight">2</span>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <button className="text-xs font-bold text-primary-blue hover:underline cursor-pointer">Ver calendario →</button>
                            <span className="text-xl opacity-20">📅</span>
                        </div>
                    </div>

                    {/* Tarjeta 2 */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-lg">👥 Inscritos (ambos exámenes)</span>
                            </div>
                            <span className="text-3xl font-black text-primary-navy tracking-tight">187</span>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <button className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer">Ver estudiantes →</button>
                            <span className="text-xl opacity-20">👤</span>
                        </div>
                    </div>

                    {/* Tarjeta 3 */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">✅ Ya ingresaron</span>
                            </div>
                            <span className="text-3xl font-black text-primary-navy tracking-tight">31</span>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <button className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">Ver lista →</button>
                            <span className="text-xl opacity-20">✅</span>
                        </div>
                    </div>

                    {/* Tarjeta 4 */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between relative overflow-hidden">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-accent-red bg-red-50 px-2 py-1 rounded-lg">🚫 Inhabilitados</span>
                            </div>
                            <span className="text-3xl font-black text-primary-navy tracking-tight">9</span>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <button className="text-xs font-bold text-accent-red hover:underline cursor-pointer">Ver detalle →</button>
                            <span className="text-xl opacity-20">🚫</span>
                        </div>
                    </div>

                </div>

                {/* ===== SECCIÓN: MIS EXÁMENES DE HOY ===== */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-primary-navy tracking-tight">Mis exámenes de hoy</h3>
                    <div className="flex items-center gap-2">
                        <button className="bg-bg-card border border-border text-primary-navy font-bold text-xs py-2 px-4 rounded-xl hover:bg-bg-app transition cursor-pointer">
                            Ver todos
                        </button>
                        <button className="bg-[image:var(--gradient-button)] text-white font-bold text-xs py-2 px-4 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer">
                            + Registrar examen
                        </button>
                    </div>
                </div>

                <div className="space-y-4 mb-10">
                    {examenesHoy.map((examen) => {
                        const porcentaje = Math.round((examen.ingresados / examen.totalInscritos) * 100);

                        return (
                            <div key={examen.idExamen} className="bg-bg-card p-6 rounded-2xl border border-border shadow-xs">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${examen.colorIcono} flex items-center justify-center text-lg font-bold shadow-xs shrink-0`}>
                                            {examen.icono}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-base text-primary-navy">{examen.nombreExamen}</h4>
                                            <p className="text-xs text-text-body font-bold mt-0.5">
                                                {examen.aula} · <span className="text-primary-blue">{examen.horario}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-xl">
                                            {examen.ingresados} Ingresaron
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold px-3 py-1 rounded-xl">
                                            {examen.noLlegan} Aún no llegan
                                        </div>
                                        <div className="bg-red-50 border border-red-200 text-accent-red text-[11px] font-extrabold px-3 py-1 rounded-xl">
                                            {examen.inhabilitados} Inhabilitados
                                        </div>
                                        <button
                                            onClick={() => navigate(`/Home/Docente/Examenes/${examen.idExamen}`)}
                                            className="bg-[image:var(--gradient-button)] text-white font-bold text-xs py-2 px-5 rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer"
                                        >
                                            Gestionar
                                        </button>
                                    </div>
                                </div>

                                {/* Barra de progreso de ingresos */}
                                <div className="pt-2">
                                    <div className="flex justify-between text-[11px] font-bold text-text-body mb-1.5">
                                        <span>Ingresos registrados</span>
                                        <span className="font-mono">{examen.ingresados} / {examen.totalInscritos} inscritos</span>
                                    </div>
                                    <div className="w-full bg-bg-app h-2 rounded-full overflow-hidden border border-border">
                                        <div
                                            className="bg-primary-blue h-full rounded-full transition-all duration-500"
                                            style={{ width: `${porcentaje}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ===== TRES TABLAS INFERIORES ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Tabla 1: Últimas verificaciones */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                                <h4 className="font-black text-xs text-primary-navy uppercase tracking-wider">Últimas verificaciones</h4>
                                <button className="text-[11px] font-bold text-primary-blue hover:underline cursor-pointer">Ver todas</button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { nombre: 'María José Flores', ci: 'CI 12345678', examen: 'Inteligencia Artificial', estado: 'Válido' },
                                    { nombre: 'Carlos Andrés Díaz', ci: 'CI 87654321', examen: 'Inteligencia Artificial', estado: 'Válido' },
                                    { nombre: 'Valeria Quispe', ci: 'CI 11223344', examen: 'Inteligencia Artificial', estado: 'Válido' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
                                        <div>
                                            <p className="font-extrabold text-primary-navy">{item.nombre}</p>
                                            <p className="text-[10px] text-text-body">{item.ci} · <span className="text-primary-blue">{item.examen}</span></p>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                            {item.estado}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-text-body font-bold mt-4 pt-2 border-t border-border">Tabla: ingresos</p>
                    </div>

                    {/* Tabla 2: Intentos no autorizados */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                                <h4 className="font-black text-xs text-primary-navy uppercase tracking-wider">Intentos no autorizados</h4>
                                <button className="text-[11px] font-bold text-primary-blue hover:underline cursor-pointer">Ver todas</button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { nombre: 'Jhonny Mamani', ci: 'CI sin registro', examen: 'Inteligencia Artificial', estado: 'No autorizado' },
                                    { nombre: 'Estudiante no inscrito', ci: 'CI 00000000', examen: 'Machine Learning', estado: 'No autorizado' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
                                        <div>
                                            <p className="font-extrabold text-primary-navy">{item.nombre}</p>
                                            <p className="text-[10px] text-text-body">{item.ci} · <span className="text-primary-blue">{item.examen}</span></p>
                                        </div>
                                        <span className="bg-red-100 text-accent-red text-[10px] font-black px-2 py-0.5 rounded-md">
                                            {item.estado}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-text-body font-bold mt-4 pt-2 border-t border-border">Tabla: intentos_no_autorizados</p>
                    </div>

                    {/* Tabla 3: Situaciones excepcionales */}
                    <div className="bg-bg-card p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                                <h4 className="font-black text-xs text-primary-navy uppercase tracking-wider">Situaciones excepcionales</h4>
                                <button className="text-[11px] font-bold text-primary-blue hover:underline cursor-pointer">Ver todas</button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { tipo: 'Documento vencido', estudiante: 'Marcos Fuentes', estado: 'Revisar' },
                                    { tipo: 'Problema ID', estudiante: 'Ana Rocha', estado: 'Revisar' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/50 text-xs">
                                        <div>
                                            <p className="font-extrabold text-primary-navy">{item.tipo}</p>
                                            <p className="text-[10px] text-text-body">Estudiante: <span className="font-bold text-primary-navy">{item.estudiante}</span></p>
                                        </div>
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-md cursor-pointer hover:bg-amber-200 transition">
                                            {item.estado}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-text-body font-bold mt-4 pt-2 border-t border-border">Tabla: situaciones_excepcionales</p>
                    </div>

                </div>

            </main>
        </div>
    );
}