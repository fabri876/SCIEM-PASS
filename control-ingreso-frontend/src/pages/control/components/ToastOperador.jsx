import { useOperador } from "../operadorContexto";

export default function ToastOperador() {
  const { objToast } = useOperador();
  if (!objToast) return null;
  return (
    <div
      key={objToast.clave}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] rounded-2xl bg-slate-900/95 text-white text-xs font-bold px-4 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="status"
      aria-live="polite"
    >
      {objToast.mensaje}
    </div>
  );
}