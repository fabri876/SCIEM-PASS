/**
 * FormField.jsx
 *
 * Input reutilizable con label + ícono opcional a la izquierda + botón
 * opcional a la derecha (lo usamos para el ojito de "mostrar contraseña").
 *
 * La idea es no repetir el mismo bloque de <label> + <input> + ícono seis
 * veces dentro de RegistroForm. Cualquier otra pantalla del sistema que
 * necesite un input con ícono (por ejemplo el Login) puede reutilizar este
 * mismo componente.
 *
 * No usamos TypeScript ni una interfaz de props formal: son solo los
 * props estándar de un <input> de HTML (value, onChange, type, etc.) más
 * "label", "icon" y "endAdornment".
 */
export default function FormField({ label, icon, endAdornment, className = "", ...inputProps }) {
  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={inputProps.id}
          className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-[15px] top-[14px] w-5 h-5 text-primary-navy pointer-events-none">
            {icon}
          </span>
        )}

        <input
          className={`h-12 w-full border border-[#C8D6E8] rounded-md bg-white
            font-nunito text-[15px] text-text-body outline-none
            focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10
            ${icon ? "pl-[46px]" : "pl-[15px]"}
            ${endAdornment ? "pr-11" : "pr-[15px]"}`}
          {...inputProps}
        />

        {endAdornment && (
          <span className="absolute right-[13px] top-[13px]">{endAdornment}</span>
        )}
      </div>
    </div>
  );
}
