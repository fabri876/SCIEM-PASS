import { useState } from "react";
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
  const [arrRolesSeleccionados, setArrRolesSeleccionados] = useState([]);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strErrorEnvio, setStrErrorEnvio] = useState("");

  const { boolShowPassword, fnToggleShowPassword, strInputType } =
    usePasswordVisibility();

  const fnActualizarCampo = (strCampo) => (e) => {
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
  };

  const fnToggleRol = (strValorRol) => {
    setArrRolesSeleccionados((prev) =>
      prev.includes(strValorRol)
        ? prev.filter((valor) => valor !== strValorRol)
        : [...prev, strValorRol]
    );
  };

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrErrorEnvio("");
    setBoolIsSubmitting(true);
    try {
      await registrarUsuario({ ...objFormData, roles: arrRolesSeleccionados });
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
      <Logo boolCompact />

      <h2 className="text-[34px] font-extrabold text-primary-navy mt-0.5 mb-0">
        Crear una cuenta
      </h2>
      <p className="text-[17px] text-[#3F6CA9] mt-1 mb-[25px]">
        Completa tus datos para acceder al sistema.
      </p>

      {strErrorEnvio && (
        <p className="mb-4 text-sm font-semibold text-accent-red" role="alert">
          {strErrorEnvio}
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
              placeholder="Segundo nombre (si tiene)"
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
          id="password"
          label="Contraseña"
          type={strInputType}
          placeholder="Mínimo 8 caracteres"
          value={objFormData.contrasena}
          onChange={fnActualizarCampo("contrasena")}
          icon={
            <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          }
          endAdornment={
            <button
              type="button"
              aria-label={boolShowPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={fnToggleShowPassword}
              className="w-[22px] h-[22px] text-sciem-navy"
            >
              <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.7]">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </button>
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
          label="Código SIS"
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

        <div>
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
                  type="checkbox"
                  className="w-[19px] h-[19px] rounded border-2 border-[#7190B7] accent-primary-blue"
                  checked={arrRolesSeleccionados.includes(opcion.strValor)}
                  onChange={() => fnToggleRol(opcion.strValor)}
                />
                {opcion.strEtiqueta}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2 mt-1.5">
          <button
            type="submit"
            disabled={boolIsSubmitting}
            className="w-full h-[52px] rounded-md bg-[image:var(--gradient-button)] text-white font-extrabold text-base shadow-[0_7px_16px_rgba(37,99,235,0.18)] disabled:opacity-60"
          >
            {boolIsSubmitting ? "Creando cuenta…" : "Crear cuenta   →"}
          </button>
          <div className="text-center mt-[18px] text-sm text-[#52729D]">
            ¿Ya tienes una cuenta?{" "}
            <a href="/login" className="text-[#1763C6] font-extrabold no-underline">
              Inicia sesión
            </a>
          </div>
        </div>
      </form>
    </section>
  );
}