import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from "../../components/layout/Header";
import UserAccountMenu from "../../components/common/UserAccountMenu";
import { obtenerUsuarioActual } from "../../services/authService";
import { obtenerHabilitaciones, actualizarHabilitacion } from "../../services/habilitacionService";

// Iconos SVG centralizados: clave -> {viewBox?, circulo?.paths?, paths[]}
const ICONOS = {
    graduacion: { paths: ["M12 14L20 9.5L12 5L4 9.5L12 14Z", "M19 13.5V17.5C19 18.5 17.5 19.5 12 19.5C6.5 19.5 5 18.5 5 17.5V13.5"] },
    exportar: { paths: ["M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15", "M7 10L12 15L17 10", "M12 15V3"] },
    documento: { paths: ["M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z", "M14 2V8H20"] },
    calendario: { paths: ["M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z", "M16 2V6", "M8 2V6", "M3 10H21"] },
    horario: { circulo: { cx: 12, cy: 12, r: 9 }, paths: ["M12 6V12L16 14"] },
    ubicacion: { circulo: { cx: 12, cy: 10, r: 3 }, paths: ["M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"] },
    estudiantes: { circulo: { cx: 9, cy: 7, r: 4 }, paths: ["M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21", "M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13", "M16 3.13C16.8604 3.3529 17.6231 3.8549 18.1673 4.5574C18.7115 5.2599 19.0075 6.1227 19.0075 7.01C19.0075 7.8973 18.7115 8.7601 18.1673 9.4626C17.6231 10.1651 16.8604 10.6671 16 10.89"] },
    habilitado: { paths: ["M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.03 2.86", "M22 4L12 14.01L9 11.01"] },
    inhabilitado: { circulo: { cx: 12, cy: 12, r: 9 }, paths: ["M15 9L9 15", "M9 9L15 15"] },
    lapiz: { viewBox: "0 0 15 15", strokeWidth: 0, fill: "white", paths: ["M11.1465 1.85355C10.959 1.66609 10.7051 1.56097 10.4395 1.56097C10.1738 1.56097 9.91993 1.66609 9.73242 1.85355L2.56097 9.02501C2.50393 9.08206 2.46097 9.15026 2.43515 9.22501L1.57373 11.8086C1.54839 11.8847 1.55161 11.9675 1.58301 12.0416C1.61442 12.1158 1.67208 12.1766 1.74558 12.2146C1.81909 12.2526 1.90408 12.2652 1.98438 12.2509L4.6172 11.7632C4.69483 11.7491 4.76562 11.7092 4.82228 11.6484L12.1465 4.32424C12.334 4.13673 12.4391 3.88287 12.4391 3.61724C12.4391 3.35161 12.334 3.09775 12.1465 2.91024L11.1465 1.85355ZM10.4395 2.26809L11.4395 3.32473L10.3828 4.38138L9.3828 3.32473L10.4395 2.26809ZM3.26809 9.73215L9.85355 3.14669L10.8536 4.14669L4.2681 10.7321L3.26809 9.73215ZM3.9922 11.1771L4.8086 11.0291L3.96094 10.1814L3.9922 11.1771Z"] },
    pregunta: { paths: ["M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4037 7.40913C11.0182 7.05016 11.7451 6.91963 12.4467 7.03875C13.1484 7.15787 13.7816 7.51883 14.2255 8.06373C14.6694 8.60862 14.8967 9.30396 14.86 10.01C14.86 12 11.86 13 11.86 14M12 18H12.01"] },
};

function Icono({ nombre, className = 'w-5 h-5' }) {
    const i = ICONOS[nombre];
    if (!i) return null;
    const comunes = { stroke: 'currentColor', strokeWidth: i.strokeWidth ?? 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
    return (
        <svg viewBox={i.viewBox ?? '0 0 24 24'} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {i.circulo && <circle cx={i.circulo.cx} cy={i.circulo.cy} r={i.circulo.r} {...comunes} />}
            {(i.paths || []).map((d, idx) => <path key={idx} d={d} fill={i.fill ?? 'none'} {...comunes} />)}
        </svg>
    );
}

function Toast({ toast, onClose }) {
    if (!toast) return null;
    const cls = toast.type === 'error'
        ? 'bg-red-50 border-red-200 text-rose-600'
        : 'bg-emerald-50 border-emerald-200 text-emerald-800';
    return (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[120] flex items-center justify-between sm:justify-start gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-bold font-nunito ${cls}`} role="status">
            <span className="break-words">{toast.message}</span>
            <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100 font-black cursor-pointer flex-shrink-0">✕</button>
        </div>
    );
}

function CabeceraPagina({ usuario, onCerrarSesion }) {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 overflow-hidden"><Header strRutaActiva="Exámenes" /></div>
                <div className="h-[64px] sm:h-[98px] flex items-center pr-2 sm:pr-[55px] pl-2 sm:pl-4 bg-white shrink-0">
                    <UserAccountMenu usuario={usuario} onCerrarSesion={onCerrarSesion} strClaseAvatar="bg-[#1A365D]" />
                </div>
            </div>
        </div>
    );
}

function CabeceraModulo({ onExportar }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100 flex-shrink-0">
                    <Icono nombre="graduacion" className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-xl font-black text-[#1A365D] leading-snug">Gestión de habilitación de estudiantes</h1>
                    <p className="text-xs text-slate-500 font-medium">Administra la habilitación de los estudiantes para el examen seleccionado.</p>
                </div>
            </div>
            <button type="button" onClick={onExportar} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-2 justify-center">
                <Icono nombre="exportar" className="w-4 h-4" /> Exportar lista
            </button>
        </div>
    );
}

function MetricCard({ titulo, valor, detalle, claseNumero, claseIcono, icono }) {
    return (
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div>
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">{titulo}</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${claseNumero}`}>{valor}</span>
                    {detalle}
                </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${claseIcono}`}>
                <Icono nombre={icono} />
            </div>
        </div>
    );
}

function BadgeEstado({ habilitado }) {
    return habilitado ? (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1 rounded-full text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Habilitado</span>
    ) : (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-rose-600 border border-red-200 font-bold px-3 py-1 rounded-full text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inhabilitado</span>
    );
}

function FilaEstudiante({ est, numeroFila, onGestionar }) {
    const iniciales = `${est.nombreEstudiante?.[0] || ''}${est.apellidoEstudiante?.[0] || ''}`.toUpperCase();
    return (
        <tr className="hover:bg-[#F8FAFC] transition">
            <td className="py-4 px-3 sm:px-6 font-bold text-slate-500">{numeroFila}</td>
            <td className="py-4 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-black text-xs flex-shrink-0">{iniciales || 'US'}</span>
                    <div>
                        <p className="font-extrabold text-[#1A365D]">{`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}</p>
                        <p className="text-[11px] text-slate-400 font-normal">{est.emailEstudiante}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 px-3 sm:px-6 text-slate-600 font-medium">{est.ciEstudiante}</td>
            <td className="py-4 px-3 sm:px-6 text-slate-600 font-mono font-semibold">{est.codSisEstudiante}</td>
            <td className="py-4 px-3 sm:px-6"><BadgeEstado habilitado={est.estadoHabilitacion} /></td>
            <td className="py-4 px-3 sm:px-6 text-slate-600 max-w-xs truncate" title={est.nombreMotivo}>{est.nombreMotivo}</td>
            <td className="py-4 px-3 sm:px-6 text-right">
                <button onClick={() => onGestionar(est)} className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5">
                    <Icono nombre="lapiz" className="w-[15px] h-[15px]" /> Modificar estado
                </button>
            </td>
        </tr>
    );
}

function TarjetaEstudianteMobile({ est, numeroFila, onGestionar }) {
    const iniciales = `${est.nombreEstudiante?.[0] || ''}${est.apellidoEstudiante?.[0] || ''}`.toUpperCase();
    return (
        <div className="p-4 border-b border-slate-100 last:border-0">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-black text-xs flex-shrink-0">{iniciales || 'US'}</span>
                    <div className="min-w-0">
                        <p className="font-extrabold text-[#1A365D] text-xs truncate">{`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}</p>
                        <p className="text-[11px] text-slate-400 font-normal truncate">{est.emailEstudiante}</p>
                    </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 mt-1">#{numeroFila}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                <div className="min-w-0">
                    <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">CI</span>
                    <span className="text-slate-600 font-medium">{est.ciEstudiante}</span>
                </div>
                <div className="min-w-0">
                    <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider">Código SIS</span>
                    <span className="text-slate-600 font-mono font-semibold">{est.codSisEstudiante}</span>
                </div>
            </div>
            <div className="mb-3">
                <BadgeEstado habilitado={est.estadoHabilitacion} />
            </div>
            {est.nombreMotivo && est.nombreMotivo !== '-' && (
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                    <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Motivo</span>
                    {est.nombreMotivo}
                </p>
            )}
            <button onClick={() => onGestionar(est)} className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5">
                <Icono nombre="lapiz" className="w-[15px] h-[15px]" /> Modificar estado
            </button>
        </div>
    );
}

function Paginacion({ paginaActual, totalPaginas, onPagina }) {
    const clsBtn = "px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#1A365D] disabled:opacity-40 cursor-pointer transition hover:bg-slate-50";
    return (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FAFC]">
            <span className="text-xs text-slate-500 font-semibold">Mostrando página <span className="font-bold text-[#1A365D]">{paginaActual}</span> de <span className="font-bold text-[#1A365D]">{totalPaginas}</span></span>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button onClick={() => onPagina(paginaActual - 1)} disabled={paginaActual === 1} className={`${clsBtn} flex-1 sm:flex-none`}>Anterior</button>
                <button onClick={() => onPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} className={`${clsBtn} flex-1 sm:flex-none`}>Siguiente</button>
            </div>
        </div>
    );
}

function SelectorEstado({ habilitado, onHabilitar, onInhabilitar }) {
    const base = "p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs transition cursor-pointer";
    return (
        <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onHabilitar} className={`${base} ${habilitado ? 'border-[#2563EB] bg-blue-50 text-[#1A365D] font-extrabold shadow-xs ring-1 ring-[#2563EB]' : 'border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50'}`}>
                <span className={`w-2 h-2 rounded-full ${habilitado ? 'bg-emerald-600' : 'bg-slate-300'}`}></span> Habilitado
            </button>
            <button type="button" onClick={onInhabilitar} className={`${base} ${!habilitado ? 'border-rose-600 bg-rose-50 text-rose-600 font-extrabold shadow-xs ring-1 ring-rose-600' : 'border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50'}`}>
                <span className={`w-2 h-2 rounded-full ${!habilitado ? 'bg-rose-600' : 'bg-slate-300'}`}></span> Inhabilitado
            </button>
        </div>
    );
}

function SeccionMotivo({ nombreMotivo, motivoSelectValue, motivoPersonalizado, motivos, onSelect, onPersonalizado, onCerrar, onModificar, onEliminar }) {
    const existeMotivo = nombreMotivo && nombreMotivo !== '-';
    return (
        <div className="mb-5 space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MOTIVO DE INHABILITACIÓN</label>
                {existeMotivo && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Opcional</span>
                        <button type="button" onClick={onModificar} className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer">Modificar</button>
                        <span className="text-slate-300 font-bold">|</span>
                        <button type="button" onClick={onEliminar} className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer">Eliminar</button>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Seleccionar causal o motivo institucional:</label>
                <select value={motivoSelectValue} onChange={(e) => onSelect(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]">
                    <option value="">Seleccionar motivo de inhabilitación...</option>
                    {motivos.map((mot, idx) => <option key={idx} value={mot}>{mot}</option>)}
                    <option value="__personalizado__">+ Registrar nuevo motivo personalizado...</option>
                </select>
            </div>

            {motivoSelectValue === '__personalizado__' && (
                <div className="bg-[#F8FAFC] border border-blue-200 p-3.5 rounded-2xl shadow-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5"><span>➕</span> Registrar nuevo motivo personalizado</span>
                        <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">✕</button>
                    </div>
                    <textarea rows="3" value={motivoPersonalizado} onChange={(e) => onPersonalizado(e.target.value)} placeholder="Escribir justificación o motivo institucional personalizado..." className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]" />
                </div>
            )}
        </div>
    );
}

function ModalConfirmacion({ mostrar, estudiante, motivoTexto, guardando, onCancelar, onConfirmar }) {
    if (!mostrar || !estudiante) return null;
    const nombre = `${estudiante.nombreEstudiante} ${estudiante.apellidoEstudiante}`;
    const habilitado = estudiante.estadoHabilitacion;
    const mensaje = habilitado
        ? `${nombre} quedará habilitado para rendir el examen y se generará el respectivo pase de ingreso.`
        : motivoTexto
            ? `${nombre} figurará como Inhabilitado con el motivo "${motivoTexto}". Quedará registro en la auditoría oficial institucional.`
            : `${nombre} figurará como Inhabilitado. Quedará registro en la auditoría oficial institucional.`;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Icono nombre="pregunta" className="w-[22px] h-[22px]" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-black text-base text-[#1A365D]">¿Está seguro de realizar los cambios?</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{mensaje}</p>
                    </div>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">ESTUDIANTE</span>
                        <span className="font-extrabold text-[#1A365D]">{nombre}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">NUEVO ESTADO</span>
                        <span className={`font-black ${habilitado ? 'text-emerald-600' : 'text-rose-600'}`}>{habilitado ? 'Habilitado' : 'Inhabilitado'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={onCancelar} disabled={guardando} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={onConfirmar} disabled={guardando} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                        <span>✔</span> {guardando ? 'Guardando...' : 'Sí, confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GestionHabilitaciones({ examenId: propExamenId }) {
    const navigate = useNavigate();
    const { idExamen: paramIdExamen } = useParams();
    const examenIdActivo = propExamenId || paramIdExamen;

    const [usuario, setUsuario] = useState(null);
    const [infoExamen] = useState({ nombreExamen: '', fecha: '', hora: '', ambiente: '' });
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

    const MOTIVOS_PREDEFINIDOS = [
        "Incompatibilidad de prerrequisitos curriculares reglamentarios",
        "Trámite de convalidación académica pendiente de resolución",
        "Pendiente de regularización de matrícula institucional",
        "Porcentaje de inasistencias superior al límite reglamentario (Art. 42)",
        "Medida disciplinaria académica vigente por Consejo Facultativo"
    ];
    const elementosPorPagina = 4;

    const mostrarToast = (type, message) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    const fnCerrarSesion = () => { localStorage.removeItem("usuario"); navigate("/login"); };

    useEffect(() => {
        const user = obtenerUsuarioActual();
        setUsuario(user || { idUsuario: 45892, nombre: "Patricia", apellido: "Pérez", correo: "patricia.perez@umss.edu", rol: "DOCENTE", codigoSis: 45892 });
    }, []);

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
                    setEstudiantes(data.map((item) => {
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
                    }));
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

    const totalPaginas = Math.ceil(estudiantesFiltrados.length / elementosPorPagina) || 1;
    const estudiantesPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * elementosPorPagina;
        return estudiantesFiltrados.slice(inicio, inicio + elementosPorPagina);
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
            mostrarToast('success', 'Habilitación actualizada exitosamente.');
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

    const filasExamen = [
        { etiqueta: 'EXAMEN', valor: infoExamen.nombreExamen, icono: 'documento' },
        { etiqueta: 'FECHA', valor: infoExamen.fecha, icono: 'calendario' },
        { etiqueta: 'HORA', valor: infoExamen.hora, icono: 'horario' },
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

            <CabeceraPagina usuario={usuario} onCerrarSesion={fnCerrarSesion} />

            <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-[76px] sm:pt-[130px]">
                <main className="w-full space-y-4 sm:space-y-6">

                    <CabeceraModulo onExportar={() => mostrarToast('success', 'Exportando lista de estudiantes...')} />

                    <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                        {filasExamen.map((f) => (
                            <div key={f.etiqueta} className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3 first:pl-0">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                                    <Icono nombre={f.icono} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">{f.etiqueta}</span>
                                    <p className="text-xs font-extrabold text-[#1A365D] truncate">{f.valor || '---'}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {metricas.map((m) => <MetricCard key={m.titulo} {...m} />)}
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
                                                numeroFila={(paginaActual - 1) * elementosPorPagina + index + 1}
                                                onGestionar={abrirDrawer}
                                            />
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Tarjetas: visibles solo en móvil (menos de md) */}
                                <div className="md:hidden divide-y divide-slate-100">
                                    {estudiantesPaginados.map((est, index) => (
                                        <TarjetaEstudianteMobile
                                            key={est.idHabilitacion}
                                            est={est}
                                            numeroFila={(paginaActual - 1) * elementosPorPagina + index + 1}
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
                                    <p className="text-[11px] text-[#2563EB] font-semibold">{estudianteSeleccionado.carreraEstudiante}</p>
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