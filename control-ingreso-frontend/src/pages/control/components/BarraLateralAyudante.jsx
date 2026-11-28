import { textoNombre } from '../../../components/common/textoNombre.js';
import MenuSeccionesResponsive from "../../../components/layout/MenuSeccionesResponsive";
import { textoInterfaz } from '../../../utils/textoInterfaz.js';
// Perfil y menú del ayudante (mismo estilo que el panel del docente).
// En escritorio va a la izquierda; en móvil y tablet se despliega debajo del encabezado.
import { NavLink } from "react-router-dom";
import { Home, CalendarDays, History } from "lucide-react";
import { obtenerUsuarioActual } from "../../../services/authService";

const OPCIONES = [
  { strRuta: "/control/conectado", strTexto: "Inicio", Icono: Home },
  { strRuta: "/control/examenes", strTexto: "Mis exámenes", Icono: CalendarDays },
  { strRuta: "/control/registros", strTexto: "Mis registros", Icono: History },
];

const claseOpcion = ({ isActive }) =>
  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer " +
  (isActive ? "bg-[#1A365D] text-white shadow-xs" : "text-slate-700 hover:bg-slate-50");

export default function BarraLateralAyudante({ boolMovilAbierto = false, onCambiarMovil }) {
  const usuario = obtenerUsuarioActual();
  const strNombre = usuario?.nombre || "Ayudante";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`.toUpperCase();

  return (
    <MenuSeccionesResponsive id="menu-ayudante-secciones" etiqueta="Menú del ayudante" abierto={boolMovilAbierto} onCambiar={onCambiarMovil}>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1A365D] text-white font-black text-xl flex items-center justify-center shadow-md mb-3">
          {strIniciales}
        </div>
        <h3 className="font-extrabold text-[#1A365D] text-sm ">{textoNombre([strNombre, strApellido].filter(Boolean).join(" "))}</h3>
        <span className="text-[11px] text-[#1A365D] font-bold mb-4">Ayudante</span>
        <div className="w-full border-t border-slate-100 pt-3 text-left text-xs">
          <p className="text-slate-600"><span className="font-bold text-[#1A365D]">C.i.:</span> {usuario?.ci || "-"}</p>
        </div>
      </div>

      <nav aria-label="Menú del ayudante" className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
        {OPCIONES.map(({ strRuta, strTexto, Icono }) => (
          <NavLink key={strRuta} to={strRuta} className={claseOpcion}>
            {({ isActive }) => (
              <>
                <Icono className={`w-4 h-4 ${isActive ? "text-white" : "text-[#1A365D]"}`} />
                {textoInterfaz(strTexto)}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </MenuSeccionesResponsive>
  );
}
