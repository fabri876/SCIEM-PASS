import { useRegisterBackHandler } from "../../../hooks/useAndroidBackButton";
export default function ModalCierreSesion({
  visibleConfirm, mensajeConfirm, visibleCerrada, resumen,
  onConfirmar, onCancelar, onReiniciar,
}) {
  useRegisterBackHandler(Boolean(visibleConfirm || visibleCerrada), onCancelar);

  if (!visibleConfirm && !visibleCerrada) return null;

  return (
    <>
      {visibleConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[#003770]">Cerrar sesión</h3>
            <p className="text-xs font-bold text-[#B91C1C]">{mensajeConfirm}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancelar}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmar}
                className="flex-1 h-11 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Cerrar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {visibleCerrada && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <h3 className="text-lg font-black text-[#003770]">Sesión cerrada</h3>
            <p className="text-xs font-semibold text-slate-500">{resumen}</p>
            <button
              type="button"
              onClick={onReiniciar || (() => { window.location.href = "/login"; })}
              className="w-full h-11 rounded-xl bg-[#003770] hover:bg-[#124B83] text-white font-extrabold text-xs transition-colors cursor-pointer"
            >
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}