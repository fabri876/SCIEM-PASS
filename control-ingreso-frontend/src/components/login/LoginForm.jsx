import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../common/Logo";
import FormField from "../common/FormField";
import usePasswordVisibility from "../../hooks/usePasswordVisibility";
import { iniciarSesion } from "../../services/authService";

const objValoresInicialesForm = {
  correo: "",
  contrasena: "",
};

/**
 * LoginForm.jsx
 *
 * Formulario de la tarjeta derecha de la pantalla de Login. Mismo
 * patrón que RegistroForm.jsx: inputs controlados (objFormData) y el
 * submit llama de verdad al servicio de autenticación en vez de un
 * alert.
 *
 * A diferencia de RegistroForm, la tarjeta tiene solo dos campos, así
 * que en vez de dejar un hueco vacío abajo (para igualar la altura del
 * HeroBanner de al lado), el contenido del formulario queda centrado
 * verticalmente dentro de la tarjeta (ver el div "flex-1 justify-center"
 * más abajo). El logo se queda arriba, igual que en Registro.
 *
 * ⚠️ Asume que services/authService.js ya tiene (o va a tener) una
 * función iniciarSesion(datos) con el mismo patrón que
 * registrarUsuario(datos): recibe { correo, contrasena } y lanza un
 * Error con .message si la petición falla. No tengo ese archivo, así
 * que no pude agregarla yo — el snippet sugerido queda en la respuesta,
 * fuera de este archivo.
 */
export default function LoginForm() {
  const [objFormData, setObjFormData] = useState(objValoresInicialesForm);
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
      await iniciarSesion(objFormData);
      // TODO: reemplazar por la redirección real al dashboard cuando el
      // equipo defina el flujo de sesión (JWT, HU16 en adelante).
    } catch (error) {
      setStrErrorEnvio(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[780px] bg-white/97 border border-border/75 rounded-[10px] shadow-[0_10px_35px_rgba(15,23,42,0.07)] px-[80px] pt-[90px] pb-7 flex flex-col">
      <div
        className="self-center"
        style={{
          transform: "scale(2.5)",
          transformOrigin: "center top",
        }}
      >
        <Logo boolCompact />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-[34px] font-extrabold text-primary-navy mt-0.5 mb-0">
          Iniciar sesión
        </h2>
        <p className="text-[17px] text-[#3F6CA9] mt-1 mb-[25px]">
          Ingresa tus datos para acceder al sistema.
        </p>

        {strErrorEnvio && (
          <p className="mb-4 text-sm font-semibold text-accent-red" role="alert">
            {strErrorEnvio}
          </p>
        )}

        <form className="flex flex-col gap-4" onSubmit={fnManejarEnvio}>
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
                className="w-[22px] h-[22px] text-primary-navy"
              >
                <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.7]">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </button>
            }
          />

          <div className="mt-1.5">
            <button
              type="submit"
              disabled={boolIsSubmitting}
              className="w-full h-[52px] rounded-md bg-[image:var(--gradient-button)] text-white font-extrabold text-base shadow-[0_7px_16px_rgba(37,99,235,0.18)] disabled:opacity-60"
            >
              {boolIsSubmitting ? "Ingresando…" : "Iniciar sesión   →"}
            </button>
            <div className="text-center mt-[18px] text-sm text-[#52729D]">
              ¿No tienes una cuenta?{" "}
              <Link to="/registro" className="text-[#1763C6] font-extrabold no-underline">
                Crea una cuenta
              </Link>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
