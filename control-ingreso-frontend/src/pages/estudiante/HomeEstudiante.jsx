import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import { obtenerUsuarioActual, cerrarSesion } from "../../services/authService";
import { useNavigate } from "react-router-dom";

export default function HomeEstudiante() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [mostrarQrGrande, setMostrarQrGrande] = useState(false);

  useEffect(() => {
    const user = obtenerUsuarioActual();
    if (user) {
      setUsuario(user);
    } else {
      // Mock para vista previa si se ingresa directamente
      setUsuario({
        idUsuario: 15,
        nombre: "María",
        apellido: "López Gómez",
        ci: "8765432 CB",
        correo: "202308123@est.umss.edu",
        rol: "ESTUDIANTE",
        codigoSis: 202308123,
      });
    }
  }, []);

  const fnCerrarSesion = () => {
    cerrarSesion();
    navigate("/login");
  };

  // Mock de código QR en base64 SVG/PNG para demostración en pantalla
  const strMockQr =
    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=EST:8765432:202308123";

  const listExamenes = [
    {
      id: 101,
      materia: "Cálculo I (Grupo 1)",
      fecha: "15 de Septiembre, 2026",
      hora: "08:00 AM - 10:00 AM",
      ambiente: "Aula 601 (Edificio Multidisciplinario)",
      estado: "HABILITADO",
      docente: "Ing. Carlos Flores",
    },
    {
      id: 102,
      materia: "Álgebra Lineal (Grupo 3)",
      fecha: "18 de Septiembre, 2026",
      hora: "10:00 AM - 12:00 PM",
      ambiente: "Laboratorio DIS #2",
      estado: "HABILITADO",
      docente: "Dra. Ana Rodríguez",
    },
    {
      id: 103,
      materia: "Física General (Grupo 2)",
      fecha: "22 de Septiembre, 2026",
      hora: "14:00 PM - 16:00 PM",
      ambiente: "Por Asignar",
      estado: "PENDIENTE",
      docente: "Lic. Roberto Vargas",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FC] font-sans text-slate-800 flex flex-col">
      {/* Header Superior Fijo */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between pr-6 h-20 shadow-sm">
        <div className="flex-1 origin-left [&_img]:scale-105 [&_img]:-translate-x-4">
          <Header strRutaActiva="Inicio" />
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#1763C6] text-white font-bold text-sm flex items-center justify-center shadow">
            {usuario ? usuario.nombre.charAt(0) + (usuario.apellido ? usuario.apellido.charAt(0) : "") : "ES"}
          </div>
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {usuario ? `${usuario.nombre} ${usuario.apellido}` : "Estudiante UMSS"}
            </span>
            <span className="text-[11px] text-[#1763C6] font-semibold leading-tight">
              Código SIS: {usuario?.codigoSis || "202308123"}
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

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto pt-28 pb-12 px-4 sm:px-6 space-y-6">
        {/* Banner de Bienvenida */}
        <div className="bg-gradient-to-r from-[#021B3B] via-[#0A3D7D] to-[#1763C6] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="bg-white/20 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white/90">
                Portal del Estudiante
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
                ¡Hola, {usuario?.nombre || "Estudiante"}!
              </h1>
              <p className="text-sm text-blue-100 mt-1 max-w-xl">
                Presenta tu código QR institucional en el acceso del examen masivo para registrar tu ingreso rápido y seguro.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 text-center self-stretch sm:self-auto">
              <span className="text-xs text-blue-200 block">Carnet de Identidad</span>
              <span className="text-base font-mono font-bold text-white">{usuario?.ci || "8765432 CB"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tarjeta de Código QR de Acceso */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-full flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-[#021B3B]">Tu Código QR Institucional</h2>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Válido
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-inner relative group my-2">
              <img
                src={strMockQr}
                alt="Código QR del estudiante"
                className="w-48 h-48 object-contain rounded-lg transition-transform group-hover:scale-105"
              />
              <button
                onClick={() => setMostrarQrGrande(true)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-bold text-xs gap-2"
              >
                🔍 Ampliar QR
              </button>
            </div>

            <div className="mt-3 space-y-1 w-full">
              <p className="text-xs font-semibold text-slate-600">
                SIS: <span className="font-mono text-slate-800">{usuario?.codigoSis || "202308123"}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Muestra esta pantalla al personal de control en la puerta del aula.
              </p>
            </div>

            <button
              onClick={() => setMostrarQrGrande(true)}
              className="mt-5 w-full py-2.5 px-4 bg-[#1763C6] hover:bg-[#124FA3] text-white text-xs font-extrabold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              Ver QR en Pantalla Completa
            </button>
          </div>

          {/* Estado de Exámenes e Inscripciones */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg font-bold text-[#021B3B]">Exámenes Programados</h2>
                  <p className="text-xs text-slate-500">Mapeo de tu habilitación y aula asignada</p>
                </div>
                <span className="bg-blue-50 text-[#1763C6] text-xs font-bold px-3 py-1 rounded-lg">
                  3 Exámenes
                </span>
              </div>

              <div className="space-y-3">
                {listExamenes.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#021B3B]">{item.materia}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            item.estado === "HABILITADO"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-3">
                        <span>📅 {item.fecha}</span>
                        <span>⏰ {item.hora}</span>
                      </p>
                      <p className="text-xs font-semibold text-[#1763C6]">📍 {item.ambiente}</p>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="text-[11px] text-slate-400 block">{item.docente}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recomendaciones para el Día del Examen */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm text-amber-900">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-2 mb-2">
                ⚠️ Instrucciones Importantes para el Ingreso
              </h3>
              <ul className="text-xs space-y-1.5 text-amber-800 list-disc list-inside">
                <li>Presenta tu **Carnet de Identidad físico original** junto con tu código QR.</li>
                <li>Llega al menos **15 minutos antes** de la hora fijada para el examen.</li>
                <li>El código QR registra la hora exacta de entrada para evitar ingresos duplicados.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal para ampliar Código QR */}
      {mostrarQrGrande && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-[#021B3B]">QR de Ingreso - Estudiante</h3>
            <p className="text-xs text-slate-500">{usuario?.nombre} {usuario?.apellido}</p>
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 inline-block">
              <img src={strMockQr} alt="QR ampliado" className="w-64 h-64 mx-auto" />
            </div>
            <p className="text-xs font-mono font-bold text-[#1763C6]">SIS: {usuario?.codigoSis || "202308123"}</p>
            <button
              onClick={() => setMostrarQrGrande(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
