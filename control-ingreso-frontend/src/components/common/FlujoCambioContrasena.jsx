import { useState } from "react";
import AvisoCambioContrasena from "./AvisoCambioContrasena";
import CambiarContrasenaModal from "./CambiarContrasenaModal";
import { fnDebeCambiarContrasena, fnLimpiarPrimerIngreso } from "../../utils/primerIngreso";
import { cerrarSesion } from "../../services/authService";

/** Una sola instancia para los menús de escritorio y móvil. */
export default function FlujoCambioContrasena({ usuario, abierto, onAbrir, onCerrar, onCerrarSesion }) {
  const [pendiente, setPendiente] = useState(() => fnDebeCambiarContrasena());
  const alGuardar = () => {
    fnLimpiarPrimerIngreso();
    setPendiente(false);
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Contraseña actualizada. Inicia sesión nuevamente.");
    window.location.href = "/login";
  };
  return <>
    <AvisoCambioContrasena boolAbierto={pendiente && !abierto} onCambiar={onAbrir} onCerrarSesion={onCerrarSesion} />
    <CambiarContrasenaModal boolAbierto={abierto} usuario={usuario} onCerrar={onCerrar} onExito={alGuardar} />
  </>;
}
