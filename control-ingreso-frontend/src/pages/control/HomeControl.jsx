import { Outlet } from "react-router-dom";
import Header from "../../components/layout/Header";
import OperadorProvider from "./OperadorProvider";
import { useOperador } from "./operadorContexto";
import ModalCierreSesion from "./components/ModalCierreSesion";
import ToastOperador from "./components/ToastOperador";

function ContenidoOperador() {
  const {
    fnCerrarSesion,
    logoutConfirmVisible, logoutMensaje, fnCancelarLogout,
    sesionCerradaVisible, resumenSesion,
    estadoRed, fnCambiarRed,
  } = useOperador();

  const boolEnLinea = estadoRed.net !== "offline";

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-nunito pb-16">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <Header strRutaActiva="Inicio" />
      </div>

      <main className="max-w-[1200px] w-full mx-auto pt-[115px] px-4 sm:px-6 space-y-5">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Conmutador Online / Offline de la demo (la red real también actualiza el estado) */}
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <button
              type="button"
              onClick={() => fnCambiarRed("online")}
              aria-pressed={boolEnLinea}
              className={
                "px-4 h-9 rounded-xl text-xs font-extrabold transition-colors cursor-pointer " +
                (boolEnLinea ? "bg-[#003770] text-white shadow-xs" : "text-[#64748B] hover:bg-[#F1F5F9]")
              }
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => fnCambiarRed("offline")}
              aria-pressed={!boolEnLinea}
              className={
                "px-4 h-9 rounded-xl text-xs font-extrabold transition-colors cursor-pointer " +
                (!boolEnLinea ? "bg-[#B91C1C] text-white shadow-xs" : "text-[#64748B] hover:bg-[#F1F5F9]")
              }
            >
              Offline
            </button>
          </div>
          <p className="text-xs font-bold text-[#64748B]">
            Estado actual:{" "}
            <span className={boolEnLinea ? "text-[#1860A3]" : "text-[#B91C1C]"}>
              {boolEnLinea ? "Con red" : "Sin red"}
            </span>
          </p>
        </div>
        <Outlet />
      </main>

      <ModalCierreSesion
        visibleConfirm={logoutConfirmVisible}
        mensajeConfirm={logoutMensaje}
        visibleCerrada={sesionCerradaVisible}
        resumen={resumenSesion}
        onConfirmar={fnCerrarSesion}
        onCancelar={fnCancelarLogout}
      />
      <ToastOperador />
    </div>
  );
}

export default function HomeControl() {
  return (
    <OperadorProvider>
      <ContenidoOperador />
    </OperadorProvider>
  );
}