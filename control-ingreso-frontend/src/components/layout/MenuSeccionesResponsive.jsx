import { useRef } from 'react';
import { Menu, ChevronDown } from 'lucide-react';

// Una sola navegación por rol: desplegable en móvil/tablet y lateral en escritorio.
export default function MenuSeccionesResponsive({ id, etiqueta, abierto, onCambiar, children }) {
  const boton = useRef(null);
  const cerrar = () => {
    onCambiar(false);
    if (boton.current?.getClientRects().length) boton.current.focus({ preventScroll: true });
  };

  return <div className="w-full min-w-0 shrink-0 lg:w-[280px]">
    <button
      ref={boton}
      type="button"
      aria-expanded={abierto}
      aria-controls={id}
      onClick={() => onCambiar(!abierto)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-left text-sm font-bold text-[#003770] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
    >
      <span className="inline-flex min-w-0 items-center gap-2"><Menu size={18} aria-hidden="true" />{etiqueta}</span>
      <ChevronDown size={18} aria-hidden="true" className={abierto ? 'shrink-0 rotate-180' : 'shrink-0'} />
    </button>
    <aside
      id={id}
      aria-label={etiqueta}
      className={`${abierto ? 'block' : 'hidden'} mt-3 space-y-6 lg:mt-0 lg:block`}
      onKeyDown={event => {
        if (abierto && event.key === 'Escape') { event.stopPropagation(); cerrar(); }
      }}
      onClick={event => {
        if (abierto && event.target.closest('nav a, nav button')) cerrar();
      }}
    >
      {children}
    </aside>
  </div>;
}
