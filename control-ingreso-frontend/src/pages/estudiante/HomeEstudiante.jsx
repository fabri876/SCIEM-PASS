import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Header from "../../components/layout/Header";
import { obtenerUsuarioActual } from "../../services/authService";
import { obtenerMisExamenesEstudiante } from "../../services/credencialService";
import ProximoExamen from "../credencial/componentes/ProximoExamen";
import TarjetaExamenEstudiante from "../credencial/componentes/TarjetaExamenEstudiante";
import VistaCredencialQr from "../credencial/componentes/VistaCredencialQr";
import CalendarioExamenes from "../credencial/componentes/CalendarioExamenes";
import { diasHasta } from "../credencial/componentes/formato";

// Próximos (el más cercano primero) y pasados (el más reciente primero)
function ordenarExamenes(list) {
  const clave = (e) => `${e.fecha}T${e.horaInicio}`;
  const proximos = list.filter((e) => (diasHasta(e.fecha) ?? 0) >= 0).sort((a, b) => clave(a).localeCompare(clave(b)));
  const pasados = list.filter((e) => (diasHasta(e.fecha) ?? 0) < 0).sort((a, b) => clave(b).localeCompare(clave(a)));
  return { proximos, pasados };
}

export default function HomeEstudiante() {
  const [usuario, setUsuario] = useState(null);
  const [activeMenu, setActiveMenu] = useState("Inicio");

  // Exámenes del estudiante y su credencial QR
  const [listExamenes, setListExamenes] = useState([]);
  const [cargandoExamenes, setCargandoExamenes] = useState(true);
  const [strErrorExamenes, setStrErrorExamenes] = useState("");
  const [idExamenQr, setIdExamenQr] = useState(null);
  const [boolVerPasados, setBoolVerPasados] = useState(false);
  const refMain = useRef(null);

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

    obtenerMisExamenesEstudiante()
      .then(setListExamenes)
      .catch(() => setStrErrorExamenes("No pudimos cargar tus exámenes. Intenta de nuevo en unos minutos."))
      .finally(() => setCargandoExamenes(false));
  }, []);

  const strNombre = usuario?.nombre || "Estudiante";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`;

  const { proximos, pasados } = useMemo(() => ordenarExamenes(listExamenes), [listExamenes]);
  const examenDestacado = proximos.find((e) => e.habilitado !== false) || null;
  const listResto = proximos.filter((e) => e !== examenDestacado);
  const examenQr = listExamenes.find((e) => e.id === idExamenQr) || null;

  const fnVerQr = (id) => {
    setIdExamenQr(id);
    refMain.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="h-screen w-screen bg-[var(--color-bg-app)] font-[var(--font-nunito)] text-[var(--color-text-body)] overflow-hidden flex flex-col">

      {/* Header Fijo Superior (incluye el menú de cuenta: cambiar
          contraseña / cerrar sesión, ver Header.jsx). Altura en 98px para
          coincidir con la altura fija que ya trae Header.jsx — antes este
          wrapper forzaba 80px (h-20) y el header interno de 98px quedaba
          recortado (BUG-003 QA de "backdrop-blur-md": ver commit anterior,
          ya corregido; esto es el ajuste de altura que faltaba al mover
          UserAccountMenu adentro de Header.jsx). */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 border-b border-[var(--color-border)] h-[98px] shadow-xs">
        <Header strRutaActiva="Inicio" />
      </header>

      {/* Contenedor Principal con Layout Sidebar + Workspace */}
      <div className="flex pt-[98px] h-full w-full overflow-hidden">

        {/* Sidebar Estilo Dashboard */}
        <aside className="w-72 shrink-0 h-[calc(100vh-98px)] bg-[var(--color-bg-card)] border-r border-[var(--color-border)] p-6 flex flex-col justify-between overflow-y-auto hidden lg:flex">
          <div className="space-y-6">

            {/* Tarjeta de perfil en el sidebar */}
            <div className="flex flex-col items-center text-center p-4 bg-[var(--color-bg-app)] rounded-2xl border border-[var(--color-border)]">
              <div className="w-16 h-16 rounded-2xl bg-[image:var(--gradient-banner)] text-white font-black text-2xl flex items-center justify-center shadow-md mb-3">
                {strIniciales}
              </div>
              <h2 className="text-base font-bold text-[var(--color-text-title)]">{`${strNombre} ${strApellido}`}</h2>
              <span className="text-[11px] font-bold text-primary-navy uppercase tracking-wider mt-0.5">Estudiante</span>

              <div className="w-full mt-4 pt-3 border-t border-[var(--color-border)] text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-body)] font-medium">C.I.:</span>
                  <span className="font-bold text-[var(--color-secondary-data)]">{usuario?.ci || "8765432"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-body)] font-medium">Código SIS:</span>
                  <span className="font-bold text-primary-navy">{usuario?.codigoSis || "202308123"}</span>
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
                    ? "bg-primary-navy text-white shadow-md shadow-slate-950/20"
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
        <main ref={refMain} className="flex-1 h-[calc(100vh-98px)] overflow-y-auto px-6 lg:px-10 py-8">
          <div className="max-w-[1100px] flex flex-col gap-6 text-[#08264A]">
            {/* El saludo solo va en la pantalla principal, no en el detalle del QR */}
            {!examenQr && (
              <div>
                <h1 className="m-0 text-[22px] max-md:text-xl font-bold text-[#08264A]">Hola, {strNombre.split(" ")[0]}</h1>
                <p className="mt-1 text-[13px] text-[#64748B]">Consulta tus exámenes y tu credencial QR de ingreso.</p>
              </div>
            )}

            {examenQr ? (
              <VistaCredencialQr examen={examenQr} usuario={usuario} onVolver={() => setIdExamenQr(null)} />
            ) : (
              <>
                {strErrorExamenes && (
                  <div role="alert" className="px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strErrorExamenes}</div>
                )}

                {cargandoExamenes && <div className="h-[150px] rounded-xl bg-[#D9E8F7] animate-pulse" aria-label="Cargando" />}

                {examenDestacado && <ProximoExamen examen={examenDestacado} onVerDetalle={fnVerQr} />}

                <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6 items-start max-xl:grid-cols-1">
                  {/* Mis exámenes */}
                  <section aria-labelledby="he-t-examenes" className="flex flex-col gap-3 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 id="he-t-examenes" className="m-0 text-base font-bold text-[#08264A]">Mis exámenes</h2>
                      {!cargandoExamenes && <span className="text-xs text-[#64748B]">El QR se habilita desde el día anterior a cada examen</span>}
                    </div>

                    {cargandoExamenes && [0, 1].map((i) => <div key={i} className="h-[78px] rounded-xl bg-white border border-[#CBD5E1] animate-pulse" />)}

                    {!cargandoExamenes && !strErrorExamenes && listExamenes.length === 0 && (
                      <div className="bg-white border border-dashed border-[#CBD5E1] rounded-xl px-5 py-10 text-center">
                        <p className="m-0 text-[15px] font-semibold text-[#08264A]">No tienes exámenes inscritos</p>
                        <p className="mt-1 text-[13px] text-[#64748B]">Cuando te inscriban en un examen, aparecerá aquí con su QR.</p>
                      </div>
                    )}

                    {listResto.map((ex) => <TarjetaExamenEstudiante key={ex.id} examen={ex} onVerQr={fnVerQr} />)}

                    {pasados.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setBoolVerPasados((v) => !v)}
                          aria-expanded={boolVerPasados}
                          className="self-start mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-[#1860A3] hover:underline cursor-pointer"
                        >
                          {boolVerPasados
                            ? <>Ocultar exámenes pasados <ChevronUp className="w-4 h-4" /></>
                            : <>Ver exámenes pasados ({pasados.length}) <ChevronDown className="w-4 h-4" /></>}
                        </button>
                        {boolVerPasados && pasados.map((ex) => <TarjetaExamenEstudiante key={ex.id} examen={ex} onVerQr={fnVerQr} />)}
                      </>
                    )}
                  </section>

                  {/* Calendario: días con examen marcados */}
                  <aside>
                    <CalendarioExamenes listExamenes={listExamenes} onVerQr={fnVerQr} />
                  </aside>
                </div>
              </>
            )}
          </div>

        </main>
      </div>

    </div>
  );
}
