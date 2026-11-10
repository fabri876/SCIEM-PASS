import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import imgLogoUmss from "../../assets/images/logo-umss.png";
import FormField from "../common/FormField";
import usePasswordVisibility from "../../hooks/usePasswordVisibility";
import { iniciarSesion, obtenerRutaPorRol } from "../../services/authService";
import { fnGuardarEstadoPrimerIngreso } from "../../utils/primerIngreso";

const objValoresInicialesForm = {
  correo: "",
  contrasena: "",
};

export default function LoginForm() {
  const navigate = useNavigate();
  const [objFormData, setObjFormData] = useState(objValoresInicialesForm);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strErrorEnvio, setStrErrorEnvio] = useState("");

  const { boolShowPassword, fnToggleShowPassword, strInputType } =
    usePasswordVisibility();

  // TC-211/TC-215 (QA): el mensaje de sesión expirada se guardaba en
  // sessionStorage (por inactividad en App.jsx, o por un 401 en los
  // servicios) pero nada lo leía nunca — por eso el aviso jamás aparecía
  // en pantalla. Se lee una sola vez al montar y se borra, para no
  // repetirlo en un login normal posterior.
  useEffect(() => {
    const strMensaje = sessionStorage.getItem("mensajeSesion");
    if (strMensaje) {
      setStrErrorEnvio(strMensaje);
      sessionStorage.removeItem("mensajeSesion");
    }
  }, []);

  const fnActualizarCampo = (strCampo) => (e) => {
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
  };

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrErrorEnvio("");
    setBoolIsSubmitting(true);
    try {
      const data = await iniciarSesion(objFormData);
      // Primer ingreso: si el backend indica que debe cambiar la contraseña,
      // se deja la marca para que el panel muestre el aviso obligatorio.
      fnGuardarEstadoPrimerIngreso(data?.usuario);
      const strRol = data?.usuario?.rol;
      const strRutaDestino = obtenerRutaPorRol(strRol);
      navigate(strRutaDestino, { replace: true });
    } catch (error) {
      setStrErrorEnvio(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-[600px] sm:min-h-[700px] md:min-h-[780px] bg-white/97 border border-border/75 rounded-[10px] shadow-[0_10px_35px_rgba(15,23,42,0.07)] px-6 sm:px-10 md:px-[80px] pt-12 sm:pt-16 md:pt-[90px] pb-7 flex flex-col overflow-hidden">
      {/*
        El logo se "zoomea" con un transform: scale(...) porque el archivo
        original es chico y así se ve nítido y grande. El factor de escala
        ahora vive en la variable CSS "--logo-scale" y cambia por
        breakpoint (mobile más chico, desktop el valor original de 6), en
        vez de estar fijo — así no se sale del cuadro en pantallas angostas.
        El "overflow-hidden" del <section> es la red de seguridad: si algún
        dispositivo intermedio calculara un ancho de imagen más grande de
        lo esperado, se recorta en vez de desbordar el layout.
      */}
      <div
        className="self-center [--logo-scale:3.2] sm:[--logo-scale:4.2] md:[--logo-scale:6]"
        style={{
          transform: "scale(var(--logo-scale)) translateY(-17px)",
          transformOrigin: "center top",
        }}
      >
        <img
          src={imgLogoUmss}
          alt="Universidad Mayor de San Simón"
          className="h-[51px] w-auto max-w-none"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-2xl sm:text-3xl md:text-[34px] font-extrabold text-primary-navy mt-0.5 mb-0">
          Iniciar sesión
        </h2>
        <p className="text-sm sm:text-base md:text-[17px] text-[#3F6CA9] mt-1 mb-5 md:mb-[25px]">
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
              className="w-full h-[52px] rounded-md bg-primary-navy text-white font-extrabold text-base shadow-[0_7px_16px_rgba(15,23,42,0.25)] transition-all duration-300 hover:shadow-[0_0_28px_6px_rgba(96,165,250,0.6)] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:shadow-[0_7px_16px_rgba(15,23,42,0.25)] disabled:hover:translate-y-0"
            >
              {boolIsSubmitting ? "Ingresando…" : "Iniciar sesión   →"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}