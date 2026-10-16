import { useRef, useEffect } from "react";
import { useOperador } from "../operadorContexto";
import { useEstadoSync } from "../../../offline/useEstadoSync.js";

/**
 * Muestra un toast de confirmación cuando el motor de sincronización
 * confirma que se enviaron marca(s) al servidor.
 * Se monta tanto en la vista del Operador como en la del Docente/Admin.
 */
export default function ToastSyncConfirmacion() {
  const { fnMostrarToast } = useOperador();
  const { ultimoResultado } = useEstadoSync();
  const refUltimoUuid = useRef(null);

  useEffect(() => {
    if (!ultimoResultado) return;
    if (ultimoResultado.omitido || ultimoResultado.sinConexion) return;
    if (ultimoResultado.clientUuid === refUltimoUuid.current) return;

    refUltimoUuid.current = ultimoResultado.clientUuid;

    if (ultimoResultado.enviados > 0) {
      fnMostrarToast(`Sincronizadas ${ultimoResultado.enviados} marca(s)`);
    } else if (ultimoResultado.errores > 0) {
      fnMostrarToast(`Errores al sincronizar: ${ultimoResultado.errores}`);
    }
  }, [ultimoResultado, fnMostrarToast]);

  return null;
}
