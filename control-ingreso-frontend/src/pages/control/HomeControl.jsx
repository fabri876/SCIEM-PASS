import { NavLink, Outlet } from "react-router-dom";
import { Wifi, WifiOff, Upload } from "lucide-react";
import Header from "../../components/layout/Header";
import OperadorProvider from "./OperadorProvider";
import { useOperador } from "./operadorContexto";
import ModalPin from "./components/ModalPin";
import ModalCierreSesion from "./components/ModalCierreSesion";
import ToastOperador from "./components/ToastOperador";

const LISTA_MODOS = [
  { to: "/control/conectado", etiqueta: "Conectado", descripcion: "Modo en línea", icono: Wifi },
  { to: "/control/offline", etiqueta: "Offline", descripcion: "Sin conexión", icono: WifiOff },
  { to: "/control/forzar", etiqueta: "Forzar", descripcion: "Sincronización", icono: Upload },
];

function MapaModos() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex flex-wrap items-center gap-1.5">
      {LISTA_MODOS.map((m) => {
        const Icono = m.icono;
        return (
          <NavLink key={m.to} to={m.to}>
            {({ isActive }) => (
              <span
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors " +
                  (isActive ? "bg-[#0B2545] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100")
                }
              >
                <Icono className="w-4 h-4" />
                {m.etiqueta}
                <span className={"hidden sm:inline text-[10px] font-bold " + (isActive ? "text-white/70" : "text-slate-400")}>
                  {m.descripcion}
                </span>
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}

function ContenidoOperador() {
  const {
    pinVisible, pinMensaje, pinApertura, fnConfirmarPin, fnCerrarSesion,
    logoutConfirmVisible, logoutMensaje, fnLogoutDefinitivo, fnCancelarLogout,
    sesionCerradaVisible, resumenSesion, fnResetDemo,
  } = useOperador();

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-nunito pb-16">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <Header strRutaActiva="Inicio" />
      </div>

      <main className="max-w-[1200px] w-full mx-auto pt-[115px] px-4 sm:px-6 space-y-5">
        <MapaModos />
        <Outlet />
      </main>

      <ModalPin key={pinApertura} visible={pinVisible} mensaje={pinMensaje} fnConfirmar={fnConfirmarPin} fnCancelar={() => fnCerrarSesion("")} />
      <ModalCierreSesion
        visibleConfirm={logoutConfirmVisible}
        mensajeConfirm={logoutMensaje}
        visibleCerrada={sesionCerradaVisible}
        resumen={resumenSesion}
        onConfirmar={fnLogoutDefinitivo}
        onCancelar={fnCancelarLogout}
        onReiniciar={fnResetDemo}
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