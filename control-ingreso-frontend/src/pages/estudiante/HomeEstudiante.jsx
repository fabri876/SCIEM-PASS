import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import { obtenerUsuarioActual, cerrarSesion } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import StudentExamList from "./components/StudentExamList";

export default function HomeEstudiante() {
  const navigate = useNavigate();
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

  const fnCerrarSesion = () => {
    cerrarSesion();
    navigate("/login");
  };

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

  // Obtener la estructura de días del mes actual
  const obtenerMatrizCalendario = () => {
    const primerDiaDelMes = new Date(anioActual, mesActualIndex, 1);
    const ultimoDiaDelMes = new Date(anioActual, mesActualIndex + 1, 0);

    let primerDiaSemana = primerDiaDelMes.getDay() - 1; // Ajustar para que Lunes sea 0
    if (primerDiaSemana === -1) primerDiaSemana = 6; // Si es domingo

    const totalDias = ultimoDiaDelMes.getDate();
    const matriz = [];
    let semana = [];

    // Espacios vacíos antes del primer día del mes
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

    // Rellenar los espacios restantes de la última semana
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
    <div className="h-screen w-screen bg-[var(--color-bg-app)] font-[var(--font-nunito)] text-[var(--color-text-body)] overflow-hidden flex flex-col">

      {/* Header Fijo Superior */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)] flex items-center justify-between pr-6 h-20 shadow-xs">
        <div className="flex-1 origin-left overflow-hidden">
          <Header strRutaActiva="Inicio" />
        </div>

        {/* Perfil Header + Botón Salir Global */}
        <div className="flex items-center gap-4 pl-4 border-l border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-navy)] text-white font-bold text-xs flex items-center justify-center shadow-md">
              {strIniciales}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[var(--color-text-title)] leading-tight">
                {`${strNombre} ${strApellido}`}
              </span>
              <span className="text-[11px] text-[var(--color-primary-blue)] font-bold uppercase tracking-wide">
                ESTUDIANTE
              </span>
            </div>
          </div>

          <button
            onClick={fnCerrarSesion}
            className="text-xs font-bold text-[var(--color-accent-red)] hover:text-white bg-rose-50 hover:bg-[var(--color-accent-red)] px-3 py-2 rounded-xl transition-colors border border-rose-200/60 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Cerrar Sesión"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal con Layout Sidebar + Workspace */}
      <div className="flex pt-20 h-full w-full overflow-hidden">

        {/* Sidebar Estilo Dashboard */}
        <aside className="w-72 shrink-0 h-[calc(100vh-80px)] bg-[var(--color-bg-card)] border-r border-[var(--color-border)] p-6 flex flex-col justify-between overflow-y-auto hidden lg:flex">
          <div className="space-y-6">

            {/* Tarjeta de perfil en el sidebar */}
            <div className="flex flex-col items-center text-center p-4 bg-[var(--color-bg-app)] rounded-2xl border border-[var(--color-border)]">
              <div className="w-16 h-16 rounded-2xl bg-[image:var(--gradient-banner)] text-white font-black text-2xl flex items-center justify-center shadow-md mb-3">
                {strIniciales}
              </div>
              <h2 className="text-base font-bold text-[var(--color-text-title)]">{`${strNombre} ${strApellido}`}</h2>
              <span className="text-[11px] font-bold text-[var(--color-primary-blue)] uppercase tracking-wider mt-0.5">Estudiante</span>

              <div className="w-full mt-4 pt-3 border-t border-[var(--color-border)] text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-body)] font-medium">C.I.:</span>
                  <span className="font-bold text-[var(--color-secondary-data)]">{usuario?.ci || "8765432"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-body)] font-medium">Código SIS:</span>
                  <span className="font-bold text-[var(--color-primary-blue)]">{usuario?.codigoSis || "202308123"}</span>
                </div>
                <div className="flex flex-col pt-1">
                  <span className="text-[var(--color-text-body)] font-medium">Carrera:</span>
                  <span className="font-bold text-[var(--color-secondary-data)] text-xs truncate">{usuario?.carrera || "Ingeniería de Sistemas"}</span>
                </div>
              </div>
            </div>

            {/* Menú de navegación */}
            <nav className="space-y-1.5">
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
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1 z" />
                },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActiveMenu(item.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${activeMenu === item.name
                      ? "bg-[var(--color-primary-blue)] text-white shadow-md shadow-blue-600/20"
                      : "text-[var(--color-secondary-data)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-title)]"
                    }`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Área Central de Contenido */}
        <main className="flex-1 h-[calc(100vh-80px)] overflow-y-auto px-6 lg:px-10 py-8 space-y-8">

          {/* Banner de Bienvenida Estilo Corporativo */}
          <section className="relative bg-[image:var(--gradient-banner)] rounded-3xl p-8 text-white shadow-lg overflow-hidden border border-blue-900/20">
            <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">¡Hola, {strNombre}!</span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Bienvenida a SCIEM-PASS
              </h1>
              <p className="text-sm text-blue-100/90 font-normal leading-relaxed">
                Aquí podrás consultar tus exámenes, ver tu información académica y gestionar tu ingreso de forma digital.
              </p>
            </div>
          </section>

          {/* Grid Principal de Módulos (Central y Derecho) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pb-12">

            {/* Columna Izquierda / Central (Listados y Exámenes) */}
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-[var(--color-bg-card)] rounded-3xl p-6 shadow-xs border border-[var(--color-border)]">
                <StudentExamList listExamenes={listExamenes} cargando={cargandoExamenes} />
              </div>
            </div>

            {/* Columna Derecha (Calendario Funcional y Accesos) */}
            <div className="xl:col-span-4 space-y-6">

              {/* Tarjeta de Calendario Académico Funcional */}
              <div className="bg-[var(--color-bg-card)] rounded-3xl p-6 shadow-xs border border-[var(--color-border)] space-y-4">

                {/* Cabecera del Calendario */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--color-primary-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Calendario Académico</span>
                  </h3>
                </div>

                {/* Selector de Mes Funcional */}
                <div className="flex items-center justify-between bg-[var(--color-bg-app)] px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-title)]">
                  <button
                    onClick={() => cambiarMes(-1)}
                    className="p-1 hover:text-[var(--color-primary-blue)] transition-colors cursor-pointer"
                    title="Mes Anterior"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span>{nombresMeses[mesActualIndex]} {anioActual}</span>
                  <button
                    onClick={() => cambiarMes(1)}
                    className="p-1 hover:text-[var(--color-primary-blue)] transition-colors cursor-pointer"
                    title="Mes Siguiente"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Cuadrícula del Calendario */}
                <div className="pt-1">
                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[var(--color-secondary-data)] mb-2">
                    {diasSemana.map((dia, index) => (
                      <span key={index}>{dia}</span>
                    ))}
                  </div>

                  {/* Números de los días generados dinámicamente */}
                  <div className="space-y-1">
                    {matrizDias.map((semana, idxS) => (
                      <div key={idxS} className="grid grid-cols-7 text-center text-xs">
                        {semana.map((dia, idxD) => {
                          if (dia === null) {
                            return <span key={idxD} />;
                          }

                          const esHoy =
                            dia === fechaHoyReal.getDate() &&
                            mesActualIndex === fechaHoyReal.getMonth() &&
                            anioActual === fechaHoyReal.getFullYear();

                          const esSeleccionado = dia === diaSeleccionado;

                          return (
                            <div key={idxD} className="flex flex-col items-center justify-center h-8 relative">
                              <button
                                onClick={() => setDiaSeleccionado(dia)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-medium transition-all cursor-pointer ${esHoy
                                    ? "bg-[var(--color-primary-blue)] text-white font-bold shadow-md shadow-blue-500/30"
                                    : esSeleccionado
                                      ? "bg-blue-100 text-[var(--color-primary-blue)] font-bold border border-blue-300"
                                      : "text-[var(--color-text-title)] hover:bg-blue-50 hover:text-[var(--color-primary-blue)]"
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

                {/* Tarjeta de Próximo Examen inferior */}
                <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary-data)] block">
                    Próximo Examen
                  </span>
                  <div className="p-3 bg-[var(--color-bg-app)] rounded-2xl border border-[var(--color-border)] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                      <span>Programación II - Grupo A</span>
                      <svg className="w-3.5 h-3.5 text-[var(--color-secondary-data)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="text-[11px] text-[var(--color-secondary-data)] space-y-0.5">
                      <p>20 de septiembre, 2026</p>
                      <p>08:00 - 11:00 • Aula 612 - Bloque F</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Tarjeta de Información Académica */}
              <div className="bg-[var(--color-bg-card)] rounded-3xl p-6 shadow-xs border border-[var(--color-border)] space-y-4">
                <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-primary-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Información Académica</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[var(--color-bg-app)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-body)] font-semibold block text-[11px] uppercase">Carrera</span>
                    <span className="font-bold text-[var(--color-text-title)] text-xs">Ingeniería de Sistemas</span>
                  </div>
                  <div className="p-3 bg-[var(--color-bg-app)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-body)] font-semibold block text-[11px] uppercase">Facultad</span>
                    <span className="font-bold text-[var(--color-text-title)] text-xs">Facultad de Ingeniería</span>
                  </div>
                  <div className="p-3 bg-[var(--color-bg-app)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-body)] font-semibold block text-[11px] uppercase">Semestre Actual</span>
                    <span className="font-bold text-[var(--color-primary-blue)] text-xs">2/2026</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

    </div>
  );
}
