import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  useEstadoSync,
  usePendientesCount,
  asistenciaRepo
} from '../../../offline';

/**
 * Panel de sincronización forzada con contadores detallados.
 * Muestra pendientes, sincronizados y errores, y permite reintentar solo los errores.
 */
export default function PanelSincronizacion() {
  const {
    estadoSync,
    pendientesRestantes,
    ultimoResultado,
    sincronizarAhora: fnSincronizarAhora
  } = useEstadoSync();

  // Incluye la cola facial cifrada, que Dexie no puede observar.
  const pendientesTotales = usePendientesCount();

  const [conteo, setConteo] = useState({
    pendiente: 0,
    syncing: 0,
    sincronizado: 0,
    error: 0,
    duplicado: 0
  });
  const [forzando, setForzando] = useState(false);

  // Cargar conteo detallado desde IndexedDB
  const cargarConteo = useCallback(async () => {
    try {
      const c = await asistenciaRepo.contarPorEstado();
      setConteo(c);
    } catch (err) {
      console.warn('[PanelSincronizacion] Error al leer conteo:', err.message);
    }
  }, []);

  useEffect(() => {
    cargarConteo();
  }, [cargarConteo, pendientesRestantes, ultimoResultado]);

  const hayPendientes = pendientesTotales > 0;
  const hayErrores = conteo.error > 0;
  const estaEnviando = estadoSync === 'enviando';

  const handleSincronizar = async () => {
    if (forzando || !hayPendientes) return;
    setForzando(true);
    try {
      await fnSincronizarAhora();
    } catch (err) {
      console.warn('[PanelSincronizacion] Error al sincronizar:', err.message);
    } finally {
      setForzando(false);
      await cargarConteo();
    }
  };

  const handleReintentarErrores = async () => {
    if (forzando || !hayErrores) return;
    setForzando(true);
    try {
      await asistenciaRepo.recuperarErrores();
      await fnSincronizarAhora();
    } catch (err) {
      console.warn('[PanelSincronizacion] Error al reintentar errores:', err.message);
    } finally {
      setForzando(false);
      await cargarConteo();
    }
  };

  const ultimo = ultimoResultado || {};
  const enviados = ultimo.enviados ?? 0;
  const procesados = ultimo.procesados ?? 0;
  const erroresUltimo = ultimo.errores ?? 0;
  const duplicados = ultimo.duplicados ?? 0;

  return (
    <section className="ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
      {/* Contadores */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
          <Clock className="w-3 h-3" />
          <span>
            <b>{pendientesTotales}</b> pendientes
          </span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#D9E8F7] text-[#124B83] border border-[#BFD7F2]">
          <CheckCircle className="w-3 h-3" />
          <span>
            <b>{conteo.sincronizado}</b> sincronizados
          </span>
        </div>
        {conteo.duplicado > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
            <AlertCircle className="w-3 h-3" />
            <span>
              <b>{conteo.duplicado}</b> duplicados
            </span>
          </div>
        )}
        {hayErrores && (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
            <AlertCircle className="w-3 h-3" />
            <span>
              <b>{conteo.error}</b> errores
            </span>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSincronizar}
          disabled={forzando || !hayPendientes}
          className={`inline-flex items-center gap-1.5 min-h-7 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer disabled:cursor-not-allowed ${
            forzando || !hayPendientes
              ? 'bg-[#9AA8BA] text-white disabled:hover:bg-[#9AA8BA]'
              : 'bg-[#003770] hover:bg-[#124B83] text-white'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${forzando ? 'animate-spin' : ''}`} />
          {forzando ? 'Sincronizando…' : hayPendientes ? 'Sincronizar ahora' : 'Sin pendientes'}
        </button>

        {hayErrores && (
          <button
            type="button"
            onClick={handleReintentarErrores}
            disabled={forzando}
            className={`inline-flex items-center gap-1.5 min-h-7 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer disabled:cursor-not-allowed ${
              forzando
                ? 'bg-[#9AA8BA] text-white disabled:hover:bg-[#9AA8BA]'
                : 'bg-[#B91C1C] hover:bg-[#B91C1C] text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {forzando ? 'Reintentando…' : 'Reintentar errores'}
          </button>
        )}
      </div>

      {/* Resumen del último intento */}
      {ultimoResultado && !ultimoResultado.omitido && !ultimoResultado.sinConexion && (procesados + enviados + duplicados + erroresUltimo) > 0 && (
        <div className="basis-full flex justify-end items-center gap-2 px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B]">
          {procesados > 0 && (
            <span>
              <CheckCircle className="w-2.5 h-2.5 text-[#124B83]" /> {procesados} procesado(s)
            </span>
          )}
          {enviados > 0 && (
            <>
              <span className="mx-1">·</span>
              <span>{enviados} enviado(s)</span>
            </>
          )}
          {duplicados > 0 && (
            <>
              <span className="mx-1">·</span>
              <span className="text-[#92400E]">{duplicados} duplicado(s)</span>
            </>
          )}
          {erroresUltimo > 0 && (
            <>
              <span className="mx-1">·</span>
              <span className="text-[#B91C1C]">{erroresUltimo} error(es)</span>
            </>
          )}
        </div>
      )}

      {/* Estado del scheduler */}
      {estaEnviando && (
        <div className="basis-full flex justify-end items-center gap-2 px-3 py-1 rounded-lg bg-[#D9E8F7] text-[#124B83] text-[11px]">
          <Clock className="w-3 h-3 animate-spin" />
          Sincronizando en segundo plano…
        </div>
      )}
    </section>
  );
}
