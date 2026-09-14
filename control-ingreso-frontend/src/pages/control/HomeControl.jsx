import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import { obtenerUsuarioActual, cerrarSesion } from "../../services/authService";
import { useNavigate } from "react-router-dom";

export default function HomeControl() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [strBusqueda, setStrBusqueda] = useState("");
  const [objResultadoVerificacion, setObjResultadoVerificacion] = useState(null);
  const [intContadorIngresados, setIntContadorIngresados] = useState(42);

  useEffect(() => {
    const user = obtenerUsuarioActual();
    if (user) {
      setUsuario(user);
    } else {
      setUsuario({
        idUsuario: 20,
        nombre: "Roberto",
        apellido: "Vargas Siles",
        ci: "4567890 CB",
        correo: "roberto.operador@umss.edu",
        rol: "OPERADOR",
      });
    }
  }, []);

  const fnCerrarSesion = () => {
    cerrarSesion();
    navigate("/login");
  };

  const listEstudiantesMock = [
    {
      ci: "8765432 CB",
      codigoSis: "202308123",
      nombre: "María López Gómez",
      materia: "Cálculo I",
      aula: "Aula 601",
      estado: "HABILITADO",
      fotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    },
    {
      ci: "1234567 CB",
      codigoSis: "202201994",
      nombre: "Juan Pérez García",
      materia: "Cálculo I",
      aula: "Aula 601",
      estado: "DUPLICADO",
      horaIngreso: "08:05 AM",
      fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
    {
      ci: "9988776 CB",
      codigoSis: "202409112",
      nombre: "Carlos Ramos Mamani",
      materia: "Cálculo I",
      aula: "Aula 601",
      estado: "INHABILITADO",
      motivo: "Falta de pago o sin prerrequisitos aprobados",
      fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    },
  ];

  const fnVerificarIngreso = (e) => {
    e.preventDefault();
    if (!strBusqueda.trim()) return;

    const coincidencia = listEstudiantesMock.find(
      (item) =>
        item.ci.toLowerCase().includes(strBusqueda.toLowerCase()) ||
        item.codigoSis.includes(strBusqueda)
    );

    if (coincidencia) {
      setObjResultadoVerificacion(coincidencia);
      if (coincidencia.estado === "HABILITADO") {
        setIntContadorIngresados((prev) => prev + 1);
      }
    } else {
      setObjResultadoVerificacion({
        ci: strBusqueda,
        codigoSis: strBusqueda,
        nombre: "Estudiante Desconocido",
        materia: "Cálculo I",
        aula: "Aula 601",
        estado: "NO_ENCONTRADO",
        motivo: "El CI o Código SIS no figura en la lista oficial del examen.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] font-sans text-slate-800 flex flex-col">
      {/* Header Fijo Superior */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between pr-6 h-20 shadow-sm">
        <div className="flex-1 origin-left [&_img]:scale-105 [&_img]:-translate-x-4">
          <Header strRutaActiva="Inicio" />
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-bold text-sm flex items-center justify-center shadow">
            {usuario ? usuario.nombre.charAt(0) + (usuario.apellido ? usuario.apellido.charAt(0) : "") : "OP"}
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {usuario ? `${usuario.nombre} ${usuario.apellido}` : "Operador de Control"}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold leading-tight">
              Personal de Control
            </span>
          </div>
          <button
            onClick={fnCerrarSesion}
            title="Cerrar sesión"
            className="ml-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Contenido de Control Mobile-First */}
      <main className="flex-1 max-w-4xl w-full mx-auto pt-28 pb-12 px-4 sm:px-6 space-y-6">
        {/* Banner de Estado de Examen */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-amber-500/30">
              Punto de Control Activo
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-2">Examen de Admisión / Cálculo I</h1>
            <p className="text-xs text-slate-400 mt-1">Ambiente: **Aula 601** • Edificio Multidisciplinario</p>
          </div>
          <div className="flex gap-3 text-center self-stretch sm:self-auto">
            <div className="bg-white/10 p-3 rounded-xl flex-1">
              <span className="text-[10px] text-slate-300 block">Ingresados</span>
              <span className="text-xl font-bold text-emerald-400">{intContadorIngresados}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl flex-1">
              <span className="text-[10px] text-slate-300 block">Capacidad</span>
              <span className="text-xl font-bold text-white">60</span>
            </div>
          </div>
        </div>

        {/* Buscador / Escáner QR de Ingreso */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#021B3B]">Verificación de Ingreso de Estudiante</h2>
          <form onSubmit={fnVerificarIngreso} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Escanea el QR o ingresa CI / Código SIS..."
                value={strBusqueda}
                onChange={(e) => setStrBusqueda(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 focus:border-[#1763C6] focus:ring-2 focus:ring-[#1763C6]/20 text-sm outline-none transition-all"
              />
              <span className="absolute left-3.5 top-3 text-slate-400 text-lg">🔍</span>
            </div>
            <button
              type="submit"
              className="h-12 px-6 bg-[#1763C6] hover:bg-[#124FA3] text-white font-extrabold text-xs rounded-xl shadow transition-colors shrink-0"
            >
              Verificar Habilitación
            </button>
          </form>

          {/* Muestras rápidas de prueba */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">Pruebas rápidas:</span>
            <button
              type="button"
              onClick={() => setStrBusqueda("8765432 CB")}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            >
              8765432 CB (Habilitado)
            </button>
            <button
              type="button"
              onClick={() => setStrBusqueda("1234567 CB")}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            >
              1234567 CB (Duplicado)
            </button>
            <button
              type="button"
              onClick={() => setStrBusqueda("9988776 CB")}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            >
              9988776 CB (Inhabilitado)
            </button>
          </div>
        </div>

        {/* Tarjeta de Resultado de Verificación Instantánea */}
        {objResultadoVerificacion && (
          <div
            className={`border rounded-2xl p-6 shadow-md transition-all animate-in fade-in duration-200 ${
              objResultadoVerificacion.estado === "HABILITADO"
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : objResultadoVerificacion.estado === "DUPLICADO"
                ? "bg-amber-50/90 border-amber-300 text-amber-950"
                : "bg-rose-50/90 border-rose-300 text-rose-950"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={objResultadoVerificacion.fotoUrl || "https://via.placeholder.com/80"}
                  alt={objResultadoVerificacion.nombre}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold">{objResultadoVerificacion.nombre}</h3>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        objResultadoVerificacion.estado === "HABILITADO"
                          ? "bg-emerald-600 text-white"
                          : objResultadoVerificacion.estado === "DUPLICADO"
                          ? "bg-amber-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {objResultadoVerificacion.estado === "HABILITADO"
                        ? "✅ PERMITIDO"
                        : objResultadoVerificacion.estado === "DUPLICADO"
                        ? "⚠️ INGRESO DUPLICADO"
                        : "❌ DENEGADO"}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">
                    CI: <span className="font-bold">{objResultadoVerificacion.ci}</span> • SIS:{" "}
                    <span className="font-bold">{objResultadoVerificacion.codigoSis}</span>
                  </p>
                </div>
              </div>

              {objResultadoVerificacion.estado === "HABILITADO" && (
                <div className="bg-emerald-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow self-stretch sm:self-auto text-center">
                  REGISTRADO HORA ACTUAL
                </div>
              )}
            </div>

            {objResultadoVerificacion.motivo && (
              <div className="mt-4 pt-3 border-t border-rose-200 text-xs font-semibold text-rose-800">
                Motivo: {objResultadoVerificacion.motivo}
              </div>
            )}

            {objResultadoVerificacion.horaIngreso && (
              <div className="mt-4 pt-3 border-t border-amber-200 text-xs font-semibold text-amber-900">
                Atención: El estudiante ya registró su ingreso a las {objResultadoVerificacion.horaIngreso}.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
