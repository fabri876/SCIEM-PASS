import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../common/Logo";
import FormField from "../common/FormField";
import usePasswordVisibility from "../../hooks/usePasswordVisibility";
import { iniciarSesion, obtenerRutaPorRol } from "../../services/authService";

const objValoresInicialesForm = {
  correo: "",
  contrasena: "",
};

export default function LoginForm() {
  const navigate = useNavigate();
  const [objFormData, setObjFormData] = useState(objValoresInicialesForm);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strErrorEnvio, setStrErrorEnvio] = useState("");

  // Si adminService.js (u otro service autenticado) detectó un 401 por token
  // vencido, dejó este mensaje antes de redirigir acá (HU16, criterio #9).
  useEffect(() => {
    const strMensajeSesion = sessionStorage.getItem("mensajeSesion");
    if (strMensajeSesion) {
      setStrErrorEnvio(strMensajeSesion);
      sessionStorage.removeItem("mensajeSesion");
    }
  }, []);

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
      const respuesta = await iniciarSesion(objFormData);
      const strRol = respuesta?.usuario?.rol;
      const strRutaDestino = obtenerRutaPorRol(strRol);

      // replace: true elimina /login del historial para que al dar "atrás" no vuelva a login
      navigate(strRutaDestino, { replace: true });
    } catch (error) {
      setStrErrorEnvio(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[780px] bg-white/97 border border-border/75 rounded-[10px] shadow-[0_10px_35px_rgba(15,23,42,0.07)] px-[80px] pt-[90px] pb-7 flex flex-col">
      <Logo boolCompact />

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
