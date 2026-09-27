import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import { obtenerUsuarioActual } from "../../services/authService";
import StudentExamList from "./components/StudentExamList";

export default function HomeEstudiante() {
  const [usuario, setUsuario] = useState(null);
  const [activeMenu, setActiveMenu] = useState("Inicio");
  const [listExamenes, setListExamenes] = useState([]);
  const [cargandoExamenes, setCargandoExamenes] = useState(true);

  // Estados para el Calendario Funcional
  const [fechaActualCalendario, setFechaActualCalendario] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());

  useEffect(() => {
    const user = obtenerUsuarioActual();
    if (user) {
      setUsuario(user);
    } else {

      setUsuario({
        idUsuario: 15,
        nombre: "María",
        apellido: "López",
        ci: "8765432",
        correo: "202308123@est.umss.edu",
        rol: "ESTUDIANTE",
        codigoSis: 202308123,
        carrera: "Ingeniería de Sistemas",
        facultad: "Facultad de Ingeniería"
      });
    }

    const cargarExamenesEstudiante = async () => {
      try {
        setTimeout(() => {
          setListExamenes([
            {
              id: 101,
              materia: "Programación II - Grupo A",
              fecha: "20 de septiembre, 2026",
              hora: "08:00 - 11:00",
              ambiente: "Aula 612 - Bloque F",
              estado: "HABILITADO",
              docente: "Facultad de Ingeniería",
            },
            {
              id: 102,
              materia: "Física II - Grupo B",
              fecha: "20 de septiembre, 2026",
              hora: "14:00 - 17:00",
              ambiente: "Aula 305 - Bloque C",
              estado: "INHABILITADO",
              docente: "Facultad de Ingeniería",
            },
          ]);
          setCargandoExamenes(false);
        }, 500);
      } catch (error) {
        console.error("Error al cargar exámenes:", error);
        setCargandoExamenes(false);
      }
    };

    cargarExamenesEstudiante();
  }, []);

  const strNombre = usuario?.nombre || "Estudiante";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

  // --- Lógica del Calendario Funcional ---
  const diasSemana = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const anioActual = fechaActualCalendario.getFullYear();
  const mesActualIndex = fechaActualCalendario.getMonth();

  const cambiarMes = (direccion) => {
    const nuevaFecha = new Date(anioActual, mesActualIndex + direccion, 1);
    setFechaActualCalendario(nuevaFecha);
  };


  const obtenerMatrizCalendario = () => {
    const primerDiaDelMes = new Date(anioActual, mesActualIndex, 1);
    const ultimoDiaDelMes = new Date(anioActual, mesActualIndex + 1, 0);

    let primerDiaSemana = primerDiaDelMes.getDay() - 1;
    if (primerDiaSemana === -1) primerDiaSemana = 6;

    const totalDias = ultimoDiaDelMes.getDate();
    const matriz = [];
    let semana = [];


    for (let i = 0; i < primerDiaSemana; i++) {
      semana.push(null);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      semana.push(dia);
      if (semana.length === 7) {
        matriz.push(semana);
        semana = [];
      }
    }


    if (semana.length > 0) {
      while (semana.length < 7) {
        semana.push(null);
      }
      matriz.push(semana);
    }

    return matriz;
  };

  const matrizDias = obtenerMatrizCalendario();
  const fechaHoyReal = new Date();

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] font-[var(--font-nunito)] text-[var(--color-text-body)] flex flex-col">

      {/* Header Fijo Superior con altura exacta de 98px */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-[var(--color-border)] flex items-center justify-between pr-6 h-[98px] shadow-xs">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Header strRutaActiva="Inicio" />
        </div>


        <div className="flex items-center pl-4 border-l border-[var(--color-border)] shrink-0">
          <UserAccountMenu
            usuario={usuario}
            onCerrarSesion={fnCerrarSesion}
            strClaseAvatar="bg-[var(--color-primary-navy)]"
          />
        </div>
      </header>

      {/* Contenedor Principal con pt-[122px] para compensar exactamente el header */}
      <main className="max-w-[1400px] w-full mx-auto pt-[122px] px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16">

        {/* Sidebar Izquierda */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-5 shadow-xs flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[image:var(--gradient-banner)] text-white font-black text-xl flex items-center justify-center shadow-md mb-3">
              {strIniciales}
            </div>
            <h2 className="text-sm font-black text-[var(--color-text-title)]">{`${strNombre} ${strApellido}`}</h2>
            <span className="text-[11px] font-bold text-[var(--color-primary-navy)] uppercase tracking-wider mt-0.5">Estudiante</span>

            <div className="w-full mt-4 pt-4 border-t border-[var(--color-border)] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-body)] font-medium">C.I.:</span>
                <span className="font-bold text-[var(--color-secondary-data)]">{usuario?.ci || "8765432"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-body)] font-medium">Código SIS:</span>
                <span className="font-bold text-[var(--color-primary-navy)]">{usuario?.codigoSis || "202308123"}</span>
              </div>
              <div className="flex flex-col pt-1">
                <span className="text-[var(--color-text-body)] font-medium">Carrera:</span>
                <span className="font-bold text-[var(--color-secondary-data)] text-xs truncate">{usuario?.carrera || "Ingeniería de Sistemas"}</span>
              </div>
            </div>
          </div>

          <nav className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-3 shadow-xs space-y-1.5">
            {[
              {
                name: "Inicio",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              },
              {
                name: "Mis exámenes",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              },
              {
                name: "Mi Información",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              },
              {
                name: "Mi QR",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveMenu(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeMenu === item.name
                  ? "bg-[var(--color-primary-navy)] text-white shadow-md shadow-blue-950/20"
                  : "text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)]"
                  }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Sección Central y Derecha */}
        <section className="lg:col-span-9 space-y-6">

          {/* Banner de Bienvenida */}
          <div className="relative bg-[image:var(--gradient-banner)] rounded-3xl p-6 md:p-8 text-white shadow-lg overflow-hidden border border-blue-900/20 flex flex-col justify-center min-h-[130px]">
            <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/30 inline-block mb-2">
                ¡HOLA, {strNombre.toUpperCase()}!
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 text-white">
                Bienvenida a SCIEM-PASS
              </h1>
              <p className="text-xs md:text-sm text-blue-100/90 font-medium">
                Aquí podrás consultar tus exámenes, ver tu información académica y gestionar tu ingreso de forma digital.
              </p>
            </div>
          </div>

          {/* Grilla Principal */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Listado de Exámenes */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-[var(--color-bg-card)] p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
                <StudentExamList listExamenes={listExamenes} cargando={cargandoExamenes} />
              </div>
            </div>

            {/* Panel Derecho (Calendario e Información) */}
            <div className="space-y-6">

              {/* Calendario Académico */}
              <div className="bg-[var(--color-bg-card)] p-5 rounded-3xl border border-[var(--color-border)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-[var(--color-text-title)] uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--color-primary-navy)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Calendario Académico
                  </h4>
                </div>

                <div className="flex items-center justify-between bg-[var(--color-bg-app)] px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-title)]">
                  <button onClick={() => cambiarMes(-1)} className="p-1 hover:text-[var(--color-primary-navy)] cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span>{nombresMeses[mesActualIndex]} {anioActual}</span>
                  <button onClick={() => cambiarMes(1)} className="p-1 hover:text-[var(--color-primary-navy)] cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                <div className="text-center bg-[var(--color-bg-app)] p-3 rounded-2xl border border-[var(--color-border)]">
                  <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-[var(--color-secondary-data)] mb-1">
                    {diasSemana.map((dia, idx) => (<span key={idx}>{dia}</span>))}
                  </div>


                  <div className="space-y-1">
                    {matrizDias.map((semana, idxS) => (
                      <div key={idxS} className="grid grid-cols-7 text-center text-xs">
                        {semana.map((dia, idxD) => {
                          if (dia === null) return <span key={idxD} />;
                          const esHoy = dia === fechaHoyReal.getDate() && mesActualIndex === fechaHoyReal.getMonth() && anioActual === fechaHoyReal.getFullYear();
                          const esSeleccionado = dia === diaSeleccionado;

                          return (
                            <div key={idxD} className="flex flex-col items-center justify-center h-7">
                              <button
                                onClick={() => setDiaSeleccionado(dia)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer ${esHoy
                                  ? "bg-[var(--color-primary-navy)] text-white shadow-xs"
                                  : esSeleccionado
                                    ? "bg-blue-100 text-[var(--color-primary-navy)] border border-blue-300"
                                    : "text-[var(--color-text-title)] hover:bg-slate-200"
                                  }`}
                              >
                                {dia}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Próximo Examen */}
              <div className="bg-[var(--color-bg-card)] p-5 rounded-3xl border border-[var(--color-border)] shadow-xs">
                <h4 className="font-black text-xs text-[var(--color-text-title)] uppercase tracking-wider mb-2">
                  Próximo Examen
                </h4>
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                  <p className="font-extrabold text-xs text-[var(--color-text-title)]">Programación II - Grupo A</p>
                  <p className="text-[11px] text-[var(--color-secondary-data)]">20 de septiembre, 2026 · 08:00 - 11:00</p>
                  <p className="text-[10px] text-[var(--color-primary-navy)] font-bold pt-1">Aula 612 - Bloque F</p>
                </div>

              </div>

              {/* Información Académica */}
              <div className="bg-[var(--color-bg-card)] p-5 rounded-3xl border border-[var(--color-border)] shadow-xs space-y-3">
                <h4 className="font-black text-xs text-[var(--color-text-title)] uppercase tracking-wider">
                  Información Académica
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-[var(--color-bg-app)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-body)] font-semibold block text-[10px] uppercase">Carrera</span>
                    <span className="font-bold text-[var(--color-text-title)] text-xs">Ingeniería de Sistemas</span>
                  </div>
                  <div className="p-2.5 bg-[var(--color-bg-app)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-body)] font-semibold block text-[10px] uppercase">Facultad</span>
                    <span className="font-bold text-[var(--color-text-title)] text-xs">Facultad de Ingeniería</span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </section>
      </main>

    </div>
  );
}
