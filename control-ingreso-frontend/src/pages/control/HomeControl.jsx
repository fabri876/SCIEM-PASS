import { Outlet } from "react-router-dom";
import Header from "../../components/layout/Header";
import OperadorProvider from "./OperadorProvider";
import { useOperador } from "./operadorContexto";
import ModalCierreSesion from "./components/ModalCierreSesion";
import ToastOperador from "./components/ToastOperador";
import ToastSyncConfirmacion from "./components/ToastSyncConfirmacion";
import BarraLateralAyudante, { PestanasAyudante } from "./components/BarraLateralAyudante";

// Panel del ayudante: perfil y menú a la izquierda (como el docente) y la sección elegida a la derecha.
// El conmutador Online / Offline (HU07) ahora lo pone cada pantalla en su lugar:
// en el banner de Inicio y arriba de la pantalla de registro (ver SelectorConexion).
function ContenidoOperador() {
  const {
    fnCerrarSesion,
    logoutConfirmVisible, logoutMensaje, fnCancelarLogout,
    sesionCerradaVisible, resumenSesion,
  } = useOperador();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-nunito">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
        <Header strRutaActiva="Inicio" />
      </div>

      <div className="flex-1 w-full">
        <div className="flex pt-[115px] pb-10 max-w-[1440px] mx-auto px-4 sm:px-6 gap-6">
          <BarraLateralAyudante />
          <main className="flex-1 min-w-0 space-y-5">
            <PestanasAyudante />
            <Outlet />
          </main>
        </div>
      </div>

      <ModalCierreSesion
        visibleConfirm={logoutConfirmVisible}
        mensajeConfirm={logoutMensaje}
        visibleCerrada={sesionCerradaVisible}
        resumen={resumenSesion}
        onConfirmar={fnCerrarSesion}
        onCancelar={fnCancelarLogout}
      />
      <ToastOperador />
      <ToastSyncConfirmacion />
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
