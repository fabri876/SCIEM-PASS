import { textoInterfaz } from '../../utils/textoInterfaz.js';
import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../common/Logo";
import FormField from "../common/FormField";
import usePasswordVisibility from "../../hooks/usePasswordVisibility";
import { registrarUsuario } from "../../services/authService";

// Valores iniciales de todos los campos de texto del formulario.
// Los checkboxes de rol se manejan aparte porque son de selección múltiple.
const objValoresInicialesForm = {
  primerNombre: "",
  segundoNombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  correo: "",
  contrasena: "",
  carnetIdentidad: "",
  codigoSis: "",
};

const arrOpcionesRol = [
  { strValor: "estudiante", strEtiqueta: "Estudiante" },
  { strValor: "docente", strEtiqueta: "Docente" },
  { strValor: "ayudante", strEtiqueta: "Ayudante" },
];

/**
 * RegistroForm.jsx
 *
 * Formulario de la tarjeta derecha de la pantalla de Registro. En el
 * mockup original todos los <input> eran no controlados (sin value) y el
 * submit solo hacía un alert(); acá cada campo ya es un input controlado
 * (objFormData) y el submit llama de verdad al servicio de registro.
 *
 * ⚠️ El backend todavía no expone el endpoint de registro (ver el TODO
 * en services/authService.js), así que por ahora esto va a fallar contra
 * un backend real hasta que ese endpoint exista — pero el componente ya
 * queda listo para conectarse el día que esté.
 */
export default function RegistroForm() {
  const [objFormData, setObjFormData] = useState(objValoresInicialesForm);
  const [strRolSeleccionado, setStrRolSeleccionado] = useState("");
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strErrorEnvio, setStrErrorEnvio] = useState("");

  const { boolShowPassword, fnToggleShowPassword, strInputType } =
    usePasswordVisibility();

  const fnActualizarCampo = (strCampo) => (e) => {
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
  };

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrErrorEnvio("");
    setBoolIsSubmitting(true);
    try {
      const strContrasenaFinal = strRolSeleccionado === "estudiante"
        ? objFormData.carnetIdentidad
        : (objFormData.contrasena || objFormData.carnetIdentidad);

      await registrarUsuario({
        ...objFormData,
        contrasena: strContrasenaFinal,
        roles: strRolSeleccionado ? [strRolSeleccionado] : [],
      });
      // TODO: reemplazar este alert por la redirección/confirmación real
      // que defina la Historia de Usuario correspondiente al registro.
      alert("Cuenta creada. Ya puedes iniciar sesión.");
    } catch (error) {
      setStrErrorEnvio(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[780px] bg-white/97 border border-border/75 rounded-[10px] shadow-[0_10px_35px_rgba(15,23,42,0.07)] px-[42px] pt-[30px] pb-7">

      <h2 className="text-[34px] font-extrabold text-primary-navy mt-0.5 mb-0">
        Crear una cuenta
      </h2>
      <p className="text-[17px] text-[#3F6CA9] mt-1 mb-[25px]">
        Completa tus datos para acceder al sistema.
      </p>

      {strErrorEnvio && (
        <p className="mb-4 text-sm font-semibold text-accent-red" role="alert">
          {textoInterfaz(strErrorEnvio)}
        </p>
      )}

      <form
        className="grid grid-cols-2 gap-x-[30px] gap-y-4"
        onSubmit={fnManejarEnvio}
      >
        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Nombres
          </label>
          <div className="grid grid-cols-2 gap-[30px]">
            <FormField
              placeholder="Primer nombre"
              aria-label="Primer nombre"
              value={objFormData.primerNombre}
              onChange={fnActualizarCampo("primerNombre")}
            />
            <FormField
              placeholder="Segundo nombre (Si tiene)"
              aria-label="Segundo nombre"
              value={objFormData.segundoNombre}
              onChange={fnActualizarCampo("segundoNombre")}
            />
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Apellidos
          </label>
          <div className="grid grid-cols-2 gap-[30px]">
            <FormField
              placeholder="Apellido paterno"
              aria-label="Apellido paterno"
              value={objFormData.apellidoPaterno}
              onChange={fnActualizarCampo("apellidoPaterno")}
            />
            <FormField
              placeholder="Apellido materno"
              aria-label="Apellido materno"
              value={objFormData.apellidoMaterno}
              onChange={fnActualizarCampo("apellidoMaterno")}
            />
          </div>
        </div>

        <FormField
          id="telefono"
          label="Teléfono"
          type="tel"
          placeholder="Ej. 71234567"
          value={objFormData.telefono}
          onChange={fnActualizarCampo("telefono")}
          icon={
            <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
              <path d="M6 3h4l2 5-3 2a13 13 0 0 0 5 5l2-3 5 2v4c0 1-1 2-2 2C10 20 4 14 4 5c0-1 1-2 2-2Z" />
            </svg>
          }
        />

        <FormField
          id="correo"
          label="Correo"
          type="email"
          placeholder="ejemplo@dominio.com"
          value={objFormData.correo}
          onChange={fnActualizarCampo("correo")}
          icon={
            <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
          }
        />

        <FormField
          id="carnet-identidad"
          label="Carnet de Identidad"
          placeholder="Ej. 12345678"
          value={objFormData.carnetIdentidad}
          onChange={fnActualizarCampo("carnetIdentidad")}
          icon={
            <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8" cy="12" r="2" />
              <path d="M12 10h6M12 14h4" />
            </svg>
          }
        />

        <FormField
          id="codigo-sis"
          label="Código SIS (Si tiene)"
          placeholder="Ej. 123456"
          value={objFormData.codigoSis}
          onChange={fnActualizarCampo("codigoSis")}
          icon={
            <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M7 10h4M7 14h7" />
            </svg>
          }
        />

        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Ingreso Como
          </label>
          <div className="min-h-12 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
            {arrOpcionesRol.map((opcion) => (
              <label
                key={opcion.strValor}
                className="flex items-center gap-2.5 text-[#173F77] text-[15px] font-semibold cursor-pointer"
              >
                <input
                  type="radio"
                  name="rol"
                  className="w-[19px] h-[19px] border-2 border-[#7190B7] accent-primary-blue"
                  checked={strRolSeleccionado === opcion.strValor}
                  onChange={() => setStrRolSeleccionado(opcion.strValor)}
                />
                {textoInterfaz(opcion.strEtiqueta)}
              </label>
            ))}
          </div>
        </div>

        {strRolSeleccionado && strRolSeleccionado !== "estudiante" && (
          <FormField
            id="contrasena"
            label="Contraseña"
            type={strInputType}
            placeholder="********"
            value={objFormData.contrasena}
            onChange={fnActualizarCampo("contrasena")}
            required
            className="col-span-2"
            icon={
              <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            endAdornment={
              <button
                type="button"
                onClick={fnToggleShowPassword}
                className="text-[#173F77] hover:text-primary-blue transition-colors cursor-pointer"
                aria-label={boolShowPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {boolShowPassword ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[1.8]">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[1.8]">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />
        )}

        <div className="col-span-2 mt-1.5">
          <button
            type="submit"
            disabled={boolIsSubmitting}
            className="w-full h-[52px] rounded-md bg-primary-navy text-white font-extrabold text-base shadow-[0_7px_16px_rgba(15,23,42,0.25)] transition-all duration-300 hover:shadow-[0_0_28px_6px_rgba(96,165,250,0.6)] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:shadow-[0_7px_16px_rgba(15,23,42,0.25)] disabled:hover:translate-y-0"
          >
            {boolIsSubmitting ? "Creando cuenta…" : "Crear cuenta   →"}
          </button>
          <div className="text-center mt-[18px] text-sm text-[#52729D]">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="text-[#1763C6] font-extrabold no-underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}
