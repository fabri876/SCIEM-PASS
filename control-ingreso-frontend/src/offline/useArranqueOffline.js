import { useEffect } from "react";
import { iniciarSincronizacionAutomatica, detenerSincronizacionAutomatica } from "./syncScheduler.js";
import { programarPurgaPeriodica } from "./purgeJob.js";

/**
 * Arranca el motor offline (conectividad + scheduler + purga) una sola vez por
 * montaje y lo detiene al desmontar. Pensado para montarse en el punto de
 * entrada de las pantallas de control (OperadorProvider), que cubre Operador,
 * Docente y Administrador.
 *
 * iniciarSincronizacionAutomatica es idempotente y tolera el doble montaje de
 * React StrictMode (guardado por contador de generacion en syncScheduler).
 */
export function useArranqueOffline() {
  useEffect(() => {
    let vivo = true;
    let cancelarPurga = null;

    (async () => {
      try {
        await iniciarSincronizacionAutomatica({
          intervaloMs: 30000,
          tamanoLote: 100,
          tamanoLoteLento: 25,
        });
      } catch (err) {
        console.warn("[useArranqueOffline] Error al iniciar la sincronizacion automatica:", err);
      }
      if (!vivo) return;
      try {
        // ejecutarAlInicio: false para evitar que la purga corra al arrancar y
      // potencialmente interfiera con el motor offline mientras se estabiliza la DB
      cancelarPurga = programarPurgaPeriodica({ intervaloHoras: 6, ejecutarAlInicio: false });
      } catch (err) {
        console.warn("[useArranqueOffline] Error al programar la purga periodica:", err);
      }
    })();

    return () => {
      vivo = false;
      try {
        if (cancelarPurga) cancelarPurga();
      } catch (err) {
        console.warn("[useArranqueOffline] Error al cancelar la purga periodica:", err);
      }
      try {
        detenerSincronizacionAutomatica();
      } catch (err) {
        console.warn("[useArranqueOffline] Error al detener la sincronizacion automatica:", err);
      }
    };
  }, []);
}
