import React, { useState, useEffect } from "react";
import VentanaEmergente from "./VentanaEmergente";
import FormField from "./FormField";
import IndicadorSeguridadContrasena from "./IndicadorSeguridadContrasena";
import usePasswordVisibility from "../../hooks/usePasswordVisibility";
import { cambiarContrasena } from "../../services/usuarioService";
import { fnEvaluarContrasena } from "../../utils/passwordStrength";

const VALORES_INICIALES = { contrasenaActual: "", contrasenaNueva: "", confirmarContrasena: "" };

/**
 * Modal de "Cambiar contraseña", compartido por los 4 paneles (admin,
 * docente, ayudante, estudiante) — pide la contraseña actual + la nueva 2
 * veces, y llama a POST /api/auth/cambiar-contrasena.
 * La nueva contraseña debe alcanzar el nivel 8 del medidor de seguridad
 * (ver utils/passwordStrength.js) para poder guardarse.
 * "onExito" (opcional) se llama cuando el cambio se guardó correctamente;
 * lo usa el aviso de primer ingreso para dejar de mostrarse.
 * Tras el éxito, se cierra y deja continuar el flujo del panel.
 * BUG-043-EXP: cada campo tiene su propio estado de visibilidad y su propio
 * ojo, y se oculta el ojo nativo del navegador (Edge) para que no se duplique.
 */
export default function CambiarContrasenaModal({ boolAbierto, onCerrar, onExito }) {
  const [objFormData, setObjFormData] = useState(VALORES_INICIALES);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strError, setStrError] = useState("");

  // Un estado de visibilidad independiente por campo
  const objVisActual = usePasswordVisibility();
  const objVisNueva = usePasswordVisibility();
  const objVisConfirmar = usePasswordVisibility();

  const objEvaluacion = fnEvaluarContrasena(objFormData.contrasenaNueva, objFormData.contrasenaActual);

  useEffect(() => {
    if (!boolAbierto) return;
    setObjFormData(VALORES_INICIALES);
    setStrError("");
  }, [boolAbierto]);

  const fnActualizarCampo = (strCampo) => (e) => {
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
  };

  // Botón de ojo de un campo: solo muestra/oculta la contraseña de ese campo
  const fnBotonOjo = (objVisibilidad, strNombreCampo) => (
    <button
      type="button"
      aria-label={
        objVisibilidad.boolShowPassword ? `Ocultar ${strNombreCampo}` : `Mostrar ${strNombreCampo}`
      }
      onClick={objVisibilidad.fnToggleShowPassword}
      className="w-[22px] h-[22px] text-primary-navy"
    >
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.7]">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    </button>
  );

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrError("");

    if (!objEvaluacion.boolValida) {
      setStrError("Tu nueva contraseña debe llegar al nivel 8 (Segura) para poder guardarla.");
      return;
    }
    if (objFormData.contrasenaNueva !== objFormData.confirmarContrasena) {
      setStrError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setBoolIsSubmitting(true);
    try {
      await cambiarContrasena(objFormData.contrasenaActual, objFormData.contrasenaNueva);
      setObjFormData(VALORES_INICIALES);
      if (onExito) onExito();
      onCerrar();
    } catch (error) {
      setStrError(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <VentanaEmergente boolAbierto={boolAbierto} onCerrar={onCerrar}>
      <div className="p-6">
        <h2 className="text-base font-black text-[#1A365D] mb-1">Cambiar contraseña</h2>
        <p className="text-xs text-slate-500 font-medium mb-5">
          Ingresa tu contraseña actual y luego la nueva. Debe alcanzar el nivel 8 de seguridad.
        </p>

        {strError && (
          <p className="mb-4 text-xs font-semibold text-rose-600" role="alert">
            {strError}
          </p>
        )}

        {/* [&_input::-ms-reveal]:hidden oculta el ojo nativo de Edge en los inputs de este formulario */}
        <form onSubmit={fnManejarEnvio} className="space-y-4 [&_input::-ms-reveal]:hidden">
          <FormField
            label="Contraseña actual"
            type={objVisActual.strInputType}
            value={objFormData.contrasenaActual}
            onChange={fnActualizarCampo("contrasenaActual")}
            required
            endAdornment={fnBotonOjo(objVisActual, "contraseña actual")}
          />

          <div>
            <FormField
              label="Nueva contraseña"
              type={objVisNueva.strInputType}
              placeholder="Mayúsculas, números y símbolos"
              value={objFormData.contrasenaNueva}
              onChange={fnActualizarCampo("contrasenaNueva")}
              required
              endAdornment={fnBotonOjo(objVisNueva, "nueva contraseña")}
            />
            <IndicadorSeguridadContrasena objEvaluacion={objEvaluacion} />
          </div>

          <FormField
            label="Confirmar nueva contraseña"
            type={objVisConfirmar.strInputType}
            value={objFormData.confirmarContrasena}
            onChange={fnActualizarCampo("confirmarContrasena")}
            required
            endAdornment={fnBotonOjo(objVisConfirmar, "confirmación de contraseña")}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={boolIsSubmitting || !objEvaluacion.boolValida}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {boolIsSubmitting ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </VentanaEmergente>
  );
}