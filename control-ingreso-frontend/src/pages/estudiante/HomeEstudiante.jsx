import { textoInterfaz } from '../../utils/textoInterfaz.js';
// Panel del estudiante (mismas medidas que los paneles de docente y ayudante):
// - Izquierda (280 px): perfil (C.I., SIS, carrera) y menú Inicio / Mis exámenes.
// - Inicio: banner, "Mis exámenes de hoy" y a la derecha (256 px) el calendario y el próximo examen.
// - Mis exámenes: lista completa con filtros.
// - "Ver mi QR" / "Ver motivo" abre la credencial QR del examen (VistaCredencialQr, sin cambios).
import { useState, useEffect, useMemo } from "react";
import { Home, CalendarDays } from "lucide-react";
import Header from "../../components/layout/Header";
import AvatarConFoto from "../../components/common/AvatarConFoto";
import { obtenerUsuarioActual } from "../../services/authService";
import { obtenerMisExamenesEstudiante } from "../../services/credencialService";
import VistaCredencialQr from "../credencial/componentes/VistaCredencialQr";
import CalendarioExamenes from "../credencial/componentes/CalendarioExamenes";
import ProximoExamenDocente from "../docente/components/ProximoExamenDocente";
import TarjetaHoyEstudiante from "./components/TarjetaHoyEstudiante";
import SeccionMisExamenesEstudiante from "./components/SeccionMisExamenesEstudiante";
import { ordenarExamenesEstudiante, esHoyEstudiante, textoAula, fechaDeHoy } from "./utilidadesEstudiante";

const OPCIONES = [
  { strClave: "inicio", strTexto: "Inicio", Icono: Home },
  { strClave: "mis-examenes", strTexto: "Mis exámenes", Icono: CalendarDays },
];

export default function HomeEstudiante() {
  const [usuario, setUsuario] = useState(null);
  const [strMenuActivo, setStrMenuActivo] = useState("inicio");
  const [boolMenuLateralMovil, setBoolMenuLateralMovil] = useState(false);

  useEffect(() => {
    setBoolMenuLateralMovil(false);
  }, [strMenuActivo]);

  // Exámenes del estudiante y su credencial QR
  const [listExamenes, setListExamenes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [idExamenQr, setIdExamenQr] = useState(null);

  // Hora actual: cada 30 s, para que los estados (en curso, QR disponible) cambien solos
  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Reserva siempre el espacio de la barra de desplazamiento: así el menú no se mueve
  // al pasar de una sección corta (Inicio) a una larga (Mis exámenes)
  useEffect(() => {
    const elHtml = document.documentElement;
    const strAntes = elHtml.style.scrollbarGutter;
    elHtml.style.scrollbarGutter = "stable";
    return () => { elHtml.style.scrollbarGutter = strAntes; };
  }, []);

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
      .catch(() => setStrError("No pudimos cargar tus exámenes. Intenta de nuevo en unos minutos."))
      .finally(() => setBoolCargando(false));
  }, []);

  const strNombre = usuario?.nombre || "Estudiante";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`.toUpperCase();

  const listOrdenados = useMemo(() => ordenarExamenesEstudiante(listExamenes, dateAhora), [listExamenes, dateAhora]);
  // Inicio: solo los exámenes de HOY en curso o por empezar
  const listHoy = listOrdenados.filter(({ e, strEstado }) => strEstado !== "FINALIZADO" && esHoyEstudiante(e, dateAhora)).map(({ e }) => e);
  const objProximo = listOrdenados.find(({ e, strEstado }) => strEstado === "PROXIMO" && !esHoyEstudiante(e, dateAhora))?.e || null;
  const listCalendario = listExamenes
    .filter((e) => e.fecha)
    // El calendario ya antepone "Aula"
    .map((e) => ({ ...e, aula: textoAula(e.aula).replace(/^Aula\s*/, "") }));

  const examenQr = listExamenes.find((e) => e.id === idExamenQr) || null;

  const fnVerQr = (id) => {
    setIdExamenQr(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fnSeleccionarMenu = (strClave) => {
    setIdExamenQr(null);
    setStrMenuActivo(strClave);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-nunito">

      {/* Header fijo (incluye el menú de cuenta: cambiar contraseña / cerrar sesión, ver Header.jsx) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
        <Header strRutaActiva="Inicio" />
      </div>

      <div className="flex-1 w-full">
        <div className="flex pt-[115px] pb-10 max-w-[1440px] mx-auto px-4 sm:px-6 gap-6">

          {!boolMenuLateralMovil && (
            <button
              type="button"
              onClick={() => setBoolMenuLateralMovil(true)}
              aria-label="Abrir menú lateral"
              className="fixed top-[88px] left-4 z-[60] inline-flex items-center gap-2 rounded-xl bg-[#003770] px-3.5 py-2 text-xs font-extrabold text-white shadow-md lg:hidden"
            >
              <span aria-hidden="true">☰</span> Menú
            </button>
          )}

          {boolMenuLateralMovil && (
            <button
              type="button"
              aria-label="Cerrar menú lateral"
              onClick={() => setBoolMenuLateralMovil(false)}
              className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden cursor-default"
            />
          )}

          {/* BARRA IZQUIERDA */}
          <aside className={`w-[280px] shrink-0 space-y-6 lg:block lg:static lg:z-auto lg:translate-x-0 ${boolMenuLateralMovil ? "fixed left-0 top-0 bottom-0 z-50 overflow-y-auto translate-x-0 bg-[#F8FAFC] p-4 pt-6 shadow-2xl" : "fixed left-0 top-0 bottom-0 z-50 overflow-y-auto -translate-x-full bg-[#F8FAFC] p-4 pt-6 shadow-2xl lg:translate-x-0"}`}>
            <div className="flex justify-end lg:hidden mb-1">
              <button type="button" onClick={() => setBoolMenuLateralMovil(false)} aria-label="Cerrar menú" className="text-slate-500 text-xl px-2 cursor-pointer">×</button>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
              <AvatarConFoto
                idUsuario={usuario?.idUsuario}
                codigoSis={usuario?.codigoSis}
                className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1A365D] shadow-md mb-3 flex items-center justify-center shrink-0"
                fallback={<span className="text-white font-black text-xl">{strIniciales}</span>}
              />
              <h3 className="font-extrabold text-[#1A365D] text-sm ">{textoInterfaz(strNombre)} {strApellido}</h3>
              <span className="text-[11px] text-[#1A365D] font-bold mb-4">Estudiante</span>
              <div className="w-full border-t border-slate-100 pt-3 text-left space-y-2 text-xs">
                <p className="flex justify-between text-slate-600"><span className="font-bold text-[#1A365D]">C.i.:</span> {usuario?.ci || "-"}</p>
                <p className="flex justify-between text-slate-600"><span className="font-bold text-[#1A365D]">Código SIS:</span> {usuario?.codigoSis || "-"}</p>
                <p className="text-slate-600"><span className="font-bold text-[#1A365D]">Carrera:</span> {textoInterfaz(usuario?.carrera || "-")}</p>
              </div>
            </div>

            <nav aria-label="Menú del estudiante" className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              {OPCIONES.map(({ strClave, strTexto, Icono }) => {
                const boolActivo = strMenuActivo === strClave;
                return (
                  <button
                    key={strClave}
                    type="button"
                    onClick={() => fnSeleccionarMenu(strClave)}
                    aria-current={boolActivo ? "page" : undefined}
                    className={"w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer " +
                      (boolActivo ? "bg-[#1A365D] text-white shadow-xs" : "text-slate-700 hover:bg-slate-50")}
                  >
                    <Icono className={`w-4 h-4 ${boolActivo ? "text-white" : "text-[#1A365D]"}`} />
                    {textoInterfaz(strTexto)}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* CONTENIDO */}
          <main className="flex-1 min-w-0 space-y-6">
            {examenQr ? (
              <VistaCredencialQr examen={examenQr} usuario={usuario} onVolver={() => setIdExamenQr(null)} />
            ) : strMenuActivo === "mis-examenes" ? (
              <SeccionMisExamenesEstudiante
                examenes={listExamenes}
                boolCargando={boolCargando}
                strError={strError}
                dateAhora={dateAhora}
                onVerQr={fnVerQr}
              />
            ) : (
              <>
                {/* Banner de bienvenida */}
                <div
                  className="w-full text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[130px]"
                  style={{ backgroundImage: "linear-gradient(to right, #1A365D, #2563EB, #DC2626)" }}
                >
                  <span className="text-xs font-bold tracking-wider opacity-90 mb-1">
                    ¡Hola, {textoInterfaz(strNombre.split(" ")[0])}!
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Te damos la bienvenida a SCIEM-PASS</h1>
                  <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
                    Aquí consultas tus exámenes y muestras tu credencial QR para ingresar.
                  </p>
                </div>

                {strError && (
                  <div role="alert" className="px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{textoInterfaz(strError)}</div>
                )}

                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  {/* MIS EXÁMENES DE HOY */}
                  <div className="w-full xl:flex-1 min-w-0">
                    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
                      <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0]">
                        <h3 className="text-base font-black text-[#08264A]">Mis exámenes de hoy</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">{fechaDeHoy()}</p>
                      </div>
                      <div className="px-5 py-4 space-y-2.5">
                        {boolCargando ? (
                          <div className="text-center py-6 text-slate-500 text-xs font-semibold animate-pulse">Cargando exámenes…</div>
                        ) : listHoy.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs font-semibold">No tienes exámenes hoy.</div>
                        ) : (
                          listHoy.map((examen) => (
                            <TarjetaHoyEstudiante key={examen.id} examen={examen} dateAhora={dateAhora} onVerQr={fnVerQr} />
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PANEL DERECHO */}
                  <div className="w-full xl:w-64 shrink-0 space-y-6">
                    <CalendarioExamenes listExamenes={listCalendario} onVerQr={fnVerQr} />
                    <ProximoExamenDocente
                      examen={objProximo ? {
                        idExamen: objProximo.id,
                        nombreExamen: objProximo.materia,
                        fechaExamen: objProximo.fecha,
                        horaInicio: objProximo.horaInicio,
                        horaFin: objProximo.horaFin,
                        horario: [objProximo.horaInicio, objProximo.horaFin].filter(Boolean).join(" – "),
                        aulaNombre: textoAula(objProximo.aula).replace(/^Aula\s*/, ""),
                      } : null}
                      onVerDetalle={fnVerQr}
                    />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
