import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "../../components/layout/Header";
import VentanaEmergente from "../../components/common/VentanaEmergente";
import ExamenForm from "../../components/examenes/ExamenForm";
import BulkUploadCard from "../admin/components/BulkUploadCard";
import UsuarioFormFields from "../admin/components/UsuarioFormFields";
import { obtenerUsuarioActual } from "../../services/authService";
import { cargarUsuariosMasivo, registrarUsuarioIndividual } from "../../services/usuarioService";


const ROLES_REGISTRABLES_POR_DOCENTE = [
    { valor: "OPERADOR", etiqueta: "Ayudante" },
    { valor: "ESTUDIANTE", etiqueta: "Estudiante" },
];

export default function HomeDocente() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);

    useEffect(() => {
        const user = obtenerUsuarioActual();
        if (user) {
            setUsuario(user);
        } else {
            setUsuario({
                idUsuario: 45892,
                nombre: "Patricia",
                apellido: "Pérez",
                correo: "patricia.perez@umss.edu",
                rol: "DOCENTE",
                codigoSis: 45892,
            });
        }
    }, []);

    const strNombre = usuario?.nombre || "Docente";
    const strApellido = usuario?.apellido || "";
    const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

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

        }
    ]);

    const [boolModalAbierto, setBoolModalAbierto] = useState(false);
    const [boolModalRegistroAbierto, setBoolModalRegistroAbierto] = useState(false);
    const [strSeccionRegistro, setStrSeccionRegistro] = useState("individual");

    const fnCargarMasiva = async (file) => {
        return cargarUsuariosMasivo(file, "ESTUDIANTE");
    };

    const fnRegistrarIndividual = async (datos) => {
        await registrarUsuarioIndividual(datos);
        setBoolModalRegistroAbierto(false);
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-app)] text-[var(--color-text-body)] font-[var(--font-nunito)] pb-16">

            {/* HEADER FIJO RESPONSIVO */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)] flex items-center justify-between shadow-xs px-3 sm:px-6">
                <div className="flex-1 overflow-hidden">
                    <Header />
                </div>
                <div className="flex items-center px-2 sm:px-[35px] shrink-0">
                    <UserAccountMenu
                        usuario={usuario}
                        onCerrarSesion={fnCerrarSesion}
                        strClaseAvatar="bg-[var(--color-primary-navy)]"
                    />
                </div>
            </header>

            {/* CONTENEDOR PRINCIPAL */}
            <main className="max-w-[1400px] w-full mx-auto pt-[110px] sm:pt-[124px] px-3 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SIDEBAR IZQUIERDA */}
                <aside className="lg:col-span-3 space-y-6">
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-5 shadow-xs flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-navy)] text-white font-black text-xl flex items-center justify-center shadow-md mb-3">
                            {strIniciales}
                        </div>
                        <h3 className="font-extrabold text-[var(--color-text-title)] text-sm">{strNombre} {strApellido}</h3>
                        <span className="text-[11px] text-[var(--color-primary-navy)] font-bold mt-0.5 uppercase tracking-wider">DOCENTE UMSS</span>

                        <div className="w-full mt-4 pt-4 border-t border-[var(--color-border)] text-left space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[var(--color-text-body)] font-medium">Facultad:</span>
                                <span className="font-bold text-[var(--color-text-title)]">Cs. y Tecnología</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--color-text-body)] font-medium">Código Docente:</span>
                                <span className="font-bold text-[var(--color-secondary-data)]">{usuario?.codigoSis || "-"}</span>
                            </div>
                        </div>
                    </div>

                    <nav className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-3 shadow-xs space-y-1.5">
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--color-primary-navy)] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-950/20 cursor-pointer">
                            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                            Inicio
                        </button>
                        <button onClick={() => setBoolModalAbierto(true)} className="w-full flex items-center gap-3 px-4 py-3 text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)] rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[var(--color-primary-navy)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                            Registrar Examen
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)] rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[var(--color-primary-navy)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Mis Exámenes
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)] rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[var(--color-primary-navy)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            Reportes y Asistencia
                        </button>
                        <button onClick={() => { setStrSeccionRegistro("individual"); setBoolModalRegistroAbierto(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)] rounded-xl font-bold text-xs transition cursor-pointer">
                            <svg className="w-4 h-4 text-[var(--color-primary-navy)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-7a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                            Registrar Estudiante/Ayudante
                        </button>
                    </nav>
                </aside>

                {/* CONTENIDO CENTRAL */}
                <div className="lg:col-span-9 space-y-6">

                    {/* BANNER DE BIENVENIDA */}
                    <div className="relative bg-[image:var(--gradient-banner)] rounded-3xl p-6 md:p-8 text-white shadow-lg overflow-hidden border border-blue-900/20 flex flex-col justify-center min-h-[130px]">
                        <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="relative z-10">
                            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/30 inline-block mb-2">
                                ¡HOLA, {strNombre.toUpperCase()}!
                            </span>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 text-white">
                                Bienvenida a SCIEM-PASS
                            </h1>
                            <p className="text-xs md:text-sm text-blue-100/90 max-w-2xl font-medium">
                                Aquí podrás supervisar tus exámenes programados hoy, llevar el control de ingresos y gestionar las habilitaciones de tus estudiantes.
                            </p>
                        </div>
                    </div>

                    {/* GRILLA PRINCIPAL */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* SECCIÓN DE EXÁMENES */}
                        <div className="xl:col-span-2 space-y-4">
                            <div className="bg-[var(--color-bg-card)] p-4 sm:p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)] mb-4">
                                    <div>
                                        <h3 className="text-base font-black text-[var(--color-text-title)]">
                                            Mis Exámenes de Hoy
                                        </h3>
                                        <p className="text-xs text-[var(--color-secondary-data)] font-medium mt-0.5">
                                            Viernes, 5 de septiembre de 2026 – <span className="font-bold text-[var(--color-primary-navy)]">2 programados</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setBoolModalAbierto(true)}
                                        className="bg-[var(--color-primary-navy)] hover:bg-blue-900 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer w-full sm:w-auto text-center"
                                    >
                                        + Registrar examen
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {examenesHoy.map((examen) => {
                                        const porcentaje = Math.round((examen.ingresados / examen.totalInscritos) * 100);
                                        return (
                                            <div key={examen.idExamen} className="bg-[var(--color-bg-app)] p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-navy)] text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0">
                                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-black text-sm text-[var(--color-text-title)] truncate">{examen.nombreExamen}</h4>
                                                            <p className="text-xs text-[var(--color-secondary-data)] font-bold mt-0.5">
                                                                {examen.aula} · <span className="text-[var(--color-primary-navy)]">{examen.horario}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/habilitaciones`)}
                                                        className="bg-[var(--color-primary-navy)] hover:bg-blue-900 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer w-full sm:w-auto text-center"
                                                    >
                                                        Gestionar Habilitaciones
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                        ✓ {examen.ingresados} Ingresaron
                                                    </span>
                                                    <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                        ⏱ {examen.noLlegan} Faltan
                                                    </span>
                                                    <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                        ✕ {examen.inhabilitados} Inhabilitados
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-[11px] font-bold text-[var(--color-secondary-data)] mb-1">
                                                        <span>Progreso de acceso</span>
                                                        <span className="font-mono">{examen.ingresados} / {examen.totalInscritos}</span>
                                                    </div>
                                                    <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                                                        <div className="bg-[var(--color-primary-navy)] h-full rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* PANEL DERECHO */}
                        <div className="space-y-6">
                            <div className="bg-[var(--color-bg-card)] p-5 rounded-3xl border border-[var(--color-border)] shadow-xs">
                                <h4 className="font-black text-xs text-[var(--color-text-title)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--color-primary-navy)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    Calendario Académico
                                </h4>
                                <div className="text-center bg-[var(--color-bg-app)] p-4 rounded-2xl border border-[var(--color-border)]">
                                    <p className="text-xs font-bold text-[var(--color-text-title)]">Septiembre 2026</p>
                                    <div className="grid grid-cols-7 gap-1 mt-3 text-[11px] font-bold text-[var(--color-secondary-data)]">
                                        <span className="text-slate-400">Lu</span>
                                        <span className="text-slate-400">Ma</span>
                                        <span className="text-slate-400">Mi</span>
                                        <span className="text-slate-400">Ju</span>
                                        <span className="text-slate-400">Vi</span>
                                        <span className="text-slate-400">Sá</span>
                                        <span className="text-slate-400">Do</span>
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => (
                                            <span
                                                key={dia}
                                                className={`py-1 rounded-lg ${dia === 5 ? 'bg-[var(--color-primary-navy)] text-white font-black' : 'hover:bg-slate-200'}`}
                                            >
                                                {dia}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--color-bg-card)] p-5 rounded-3xl border border-[var(--color-border)] shadow-xs">
                                <h4 className="font-black text-xs text-[var(--color-text-title)] uppercase tracking-wider mb-2">
                                    Próximo Examen
                                </h4>
                                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <p className="font-extrabold text-xs text-[var(--color-text-title)]">Inteligencia Artificial</p>
                                    <p className="text-[11px] text-[var(--color-secondary-data)] mt-0.5">Viernes, 5 de Septiembre · 09:00</p>
                                    <p className="text-[10px] text-[var(--color-primary-navy)] font-bold mt-2">Aula 612 · Bloque F</p>
                                </div>

                            </div>

                        </div>

                    </div>
                </div>
            </main>

            {/* MODALES */}
            <VentanaEmergente
                boolAbierto={boolModalAbierto}
                onCerrar={() => setBoolModalAbierto(false)}
            >
                <ExamenForm onCancelar={() => setBoolModalAbierto(false)} />
            </VentanaEmergente>


            <VentanaEmergente
                boolAbierto={boolModalRegistroAbierto}
                onCerrar={() => setBoolModalRegistroAbierto(false)}
            >
                <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                    <h2 className="text-base font-black text-[var(--color-text-title)] mb-1">Registrar Estudiante o Ayudante</h2>
                    <p className="text-xs text-[var(--color-secondary-data)] font-medium mb-4">
                        La carga masiva solo admite Estudiantes. Para registrar un Ayudante, usa el registro individual.
                    </p>

                    <div className="flex gap-2 mb-5 bg-[var(--color-bg-app)] p-1 rounded-xl w-fit border border-[var(--color-border)]">
                        <button
                            onClick={() => setStrSeccionRegistro("individual")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${strSeccionRegistro === "individual"
                                ? "bg-white text-[var(--color-text-title)] shadow-xs"
                                : "text-[var(--color-secondary-data)] hover:text-[var(--color-text-title)]"
                                }`}
                        >
                            Registro individual
                        </button>
                        <button
                            onClick={() => setStrSeccionRegistro("masivo")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${strSeccionRegistro === "media" || strSeccionRegistro === "masivo"
                                ? "bg-white text-[var(--color-text-title)] shadow-xs"
                                : "text-[var(--color-secondary-data)] hover:text-[var(--color-text-title)]"
                                }`}
                        >
                            Carga masiva
                        </button>
                    </div>

                    {strSeccionRegistro === "individual" ? (
                        <UsuarioFormFields
                            modo="crear"
                            usuarioInicial={null}
                            rolesDisponibles={ROLES_REGISTRABLES_POR_DOCENTE}
                            onCerrar={() => setBoolModalRegistroAbierto(false)}
                            onGuardar={fnRegistrarIndividual}
                            boolActivo={boolModalRegistroAbierto && strSeccionRegistro === "individual"}
                        />
                    ) : (
                        <BulkUploadCard onProcesar={fnCargarMasiva} />
                    )}
                </div>
            </VentanaEmergente>

        </div>
    );
}