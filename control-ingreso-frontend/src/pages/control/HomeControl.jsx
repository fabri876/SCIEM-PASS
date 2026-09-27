import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import { obtenerUsuarioActual } from "../../services/authService";

export default function HomeControl() {
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
        nombre: "Cristian",
        apellido: "Rodrigues Gonzales",
        ci: "456565748",
        correo: "cristian.operador@umss.edu",
        rol: "PERSONAL DE CONTROL",
      });
    }
  }, []);

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

  const strNombre = usuario?.nombre || "Cristian";
  const strApellido = usuario?.apellido || "Rodrigues Gonzales";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] text-[var(--color-text-body)] font-[var(--font-nunito)] pb-16">

      {/* HEADER SUPERIOR FIJO CON ALTURA EXACTA DE 98px */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between pr-6 h-[98px] shadow-sm">
        <div className="flex-1 min-w-0">
          <Header strRutaActiva="Inicio" />
        </div>

        <div className="flex items-center pl-4 border-l border-slate-200 shrink-0">
          <UserAccountMenu
            usuario={usuario || { nombre: "Cristian", rol: "PERSONAL DE CONTROL" }}
            onCerrarSesion={fnCerrarSesion}
            strClaseAvatar="bg-[#1763C6]"
          />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL CON PADDING TOP AJUSTADO A LOS 98px DEL HEADER */}
      <main className="max-w-[1400px] w-full mx-auto pt-[122px] px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMNA IZQUIERDA: PERFIL Y MENÚ DE NAVEGACIÓN LATERAL */}
        <aside className="lg:col-span-3 space-y-6">
          {/* Tarjeta de Perfil Usuario */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-5 shadow-xs flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[image:var(--gradient-banner)] text-white font-black text-xl flex items-center justify-center shadow-md mb-3">
              {strIniciales}
            </div>
            <h2 className="text-sm font-black text-[var(--color-text-title)]">
              {`${strNombre} ${strApellido}`}
            </h2>
            <span className="text-[11px] text-[var(--color-primary-navy)] font-bold mt-0.5 uppercase tracking-wider">PERSONAL DE CONTROL</span>

            <div className="w-full mt-4 pt-4 border-t border-[var(--color-border)] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-body)] font-medium">C.I.:</span>
                <span className="font-bold text-[var(--color-secondary-data)]">{usuario?.ci || "456565748"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-body)] font-medium">Rol:</span>
                <span className="font-bold text-[var(--color-primary-navy)]">Control de Acceso</span>
              </div>
            </div>
          </div>

          {/* Menú de Navegación Lateral */}
          <nav className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-3 shadow-xs space-y-1.5">
            {[
              {
                name: "Inicio",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              },
              {
                name: "Escáner Activo",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              },
              {
                name: "Reporte de Ingresos",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              },
            ].map((item, index) => (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${index === 0
                  ? "bg-[var(--color-primary-navy)] text-white shadow-md shadow-blue-950/20"
                  : "text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)]"
                  }`}
              >
                <svg className={`w-4 h-4 shrink-0 ${index === 0 ? "text-white" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* COLUMNA CENTRAL Y DERECHA */}
        <section className="lg:col-span-9 space-y-6">

          {/* BANNER PRINCIPAL */}
          <div className="relative bg-[image:var(--gradient-banner)] rounded-3xl p-6 md:p-8 text-white shadow-lg overflow-hidden border border-blue-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="bg-white/25 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/30 inline-flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]"></span>
                PUNTO DE CONTROL ACTIVO
              </span>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Examen de Admisión / Cálculo I
              </h1>
              <p className="text-xs md:text-sm text-blue-100/90 font-medium mt-1">
                Ambiente: <span className="font-bold underline decoration-white/40">Aula 601</span> · Edificio Multidisciplinario
              </p>
            </div>

            <div className="flex gap-3 text-center self-stretch md:self-auto shrink-0 relative z-10">
              <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex-1 md:w-28">
                <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wide">Ingresados</span>
                <span className="text-2xl font-black text-emerald-300">{intContadorIngresados}</span>
              </div>
              <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex-1 md:w-28">
                <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wide">Capacidad</span>
                <span className="text-2xl font-black text-white">60</span>
              </div>
            </div>
          </div>

          {/* MÓDULO DE VERIFICACIÓN / BUSCADOR */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-black text-[var(--color-text-title)]">Verificación de Ingreso de Estudiante</h2>
              <p className="text-xs text-[var(--color-secondary-data)] font-medium mt-0.5">Escanea el código QR del carnet universitario o escribe el CI / Código SIS.</p>
            </div>

            <form onSubmit={fnVerificarIngreso} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Escanea el QR o ingresa CI / Código SIS..."
                  value={strBusqueda}
                  onChange={(e) => setStrBusqueda(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-app)] focus:bg-white focus:border-[var(--color-primary-navy)] focus:ring-2 focus:ring-[var(--color-primary-navy)]/20 text-xs font-bold outline-none transition-all text-[var(--color-text-title)]"
                />
                <span className="absolute left-3.5 top-3.5 text-[var(--color-secondary-data)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </span>
              </div>
              <button
                type="submit"
                className="h-12 px-6 bg-[var(--color-primary-navy)] hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                Verificar Habilitación
              </button>
            </form>

            <div className="flex items-center gap-2 pt-2 flex-wrap border-t border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-secondary-data)] font-bold">Pruebas rápidas:</span>
              <button
                type="button"
                onClick={() => setStrBusqueda("8765432 CB")}
                className="text-[11px] bg-[var(--color-bg-app)] hover:bg-blue-50 text-[var(--color-text-title)] font-bold px-2.5 py-1 rounded-lg border border-[var(--color-border)] transition-colors cursor-pointer"
              >
                8765432 CB (Habilitado)
              </button>
              <button
                type="button"
                onClick={() => setStrBusqueda("1234567 CB")}
                className="text-[11px] bg-[var(--color-bg-app)] hover:bg-blue-50 text-[var(--color-text-title)] font-bold px-2.5 py-1 rounded-lg border border-[var(--color-border)] transition-colors cursor-pointer"
              >
                1234567 CB (Duplicado)
              </button>
              <button
                type="button"
                onClick={() => setStrBusqueda("9988776 CB")}
                className="text-[11px] bg-[var(--color-bg-app)] hover:bg-blue-50 text-[var(--color-text-title)] font-bold px-2.5 py-1 rounded-lg border border-[var(--color-border)] transition-colors cursor-pointer"
              >
                9988776 CB (Inhabilitado)
              </button>
            </div>
          </div>

          {/* RESULTADO DE LA VERIFICACIÓN */}
          {objResultadoVerificacion && (
            <div
              className={`border rounded-3xl p-6 shadow-xs transition-all animate-in fade-in duration-200 ${objResultadoVerificacion.estado === "HABILITADO"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                : objResultadoVerificacion.estado === "DUPLICADO"
                  ? "bg-amber-50/90 border-amber-200 text-amber-950"
                  : "bg-rose-50/90 border-rose-200 text-rose-950"
                }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={objResultadoVerificacion.fotoUrl || "https://via.placeholder.com/80"}
                    alt={objResultadoVerificacion.nombre}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg font-black text-[var(--color-primary-navy)]">{objResultadoVerificacion.nombre}</h3>
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${objResultadoVerificacion.estado === "HABILITADO"
                          ? "bg-emerald-600 text-white"
                          : objResultadoVerificacion.estado === "DUPLICADO"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-600 text-white"
                          }`}
                      >
                        {objResultadoVerificacion.estado === "HABILITADO" && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                        )}
                        {objResultadoVerificacion.estado === "DUPLICADO" && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        )}
                        {objResultadoVerificacion.estado === "INHABILITADO" && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                        )}
                        {objResultadoVerificacion.estado === "HABILITADO"
                          ? "PERMITIDO"
                          : objResultadoVerificacion.estado === "DUPLICADO"
                            ? "INGRESO DUPLICADO"
                            : "DENEGADO"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[var(--color-secondary-data)] mt-1">
                      CI: <span className="font-extrabold text-[var(--color-text-title)]">{objResultadoVerificacion.ci}</span> · SIS:{" "}
                      <span className="font-extrabold text-[var(--color-text-title)]">{objResultadoVerificacion.codigoSis}</span>
                    </p>
                  </div>
                </div>

                {objResultadoVerificacion.estado === "HABILITADO" && (
                  <div className="bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs self-stretch sm:self-auto text-center shrink-0">
                    REGISTRADO HORA ACTUAL
                  </div>
                )}
              </div>

              {objResultadoVerificacion.motivo && (
                <div className="mt-4 pt-3 border-t border-rose-200 text-xs font-bold text-rose-700">
                  Motivo: {objResultadoVerificacion.motivo}
                </div>
              )}

              {objResultadoVerificacion.horaIngreso && (
                <div className="mt-4 pt-3 border-t border-amber-200 text-xs font-bold text-amber-800">
                  Atención: El estudiante ya registró su ingreso previo a las {objResultadoVerificacion.horaIngreso}.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
