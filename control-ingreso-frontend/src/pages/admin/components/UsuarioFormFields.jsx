import React, { useState, useEffect } from "react";
import FormField from "../../../components/common/FormField";
import usePasswordVisibility from "../../../hooks/usePasswordVisibility";

// Solo puede existir un ADMINISTRADOR en el sistema, así que no se ofrece
// como opción acá (ni para crear ni para cambiar rol).
const ROLES_CREABLES = [
  { valor: "DOCENTE", etiqueta: "Docente" },
  { valor: "OPERADOR", etiqueta: "Ayudante" },
  { valor: "ESTUDIANTE", etiqueta: "Estudiante" },
];

// Roles cuya tabla hija guarda un código propio (codsisdocente /
// codsisestudiante) además de idusuario.
const ROLES_CON_CODIGO_SIS = ["DOCENTE", "ESTUDIANTE"];

// Validaciones básicas de formato, para cortar de raíz registros como
// "correo sin @/dominio", "nombre con números", "teléfono con letras o
// vacío" y "código SIS con letras" (bugs reportados en QA).
const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜñÑáéíóúü\s]+$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_SOLO_NUMEROS = /^[0-9]+$/;
// CI boliviano: número base + complemento opcional alfanumérico (ej. "13193019-1N",
// "4567890 CB"), separado por espacio, guión o pegado directo.
const REGEX_CI = /^[0-9]+([\s-]?[0-9A-Za-z]{1,3})?$/;

// Mismo criterio que CiNormalizador.java en el backend: sin puntos, guiones
// ni espacios, en mayúsculas. Se muestra como preview para que quede claro
// cómo va a quedar guardado antes de enviar el formulario.
function normalizarCi(ci) {
  return ci.trim().toUpperCase().replace(/[.\-\s]/g, "");
}
const REGEX_TELEFONO = /^[0-9]{7,8}$/;

const VALORES_INICIALES = {
  primerNombre: "",
  segundoNombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  ci: "",
  correo: "",
  contrasena: "",
  telefono: "",
  rol: "DOCENTE",
  codigoSis: "",
};

// Separa "nombre"/"apellido" (como vienen de la API, un solo campo) en los
// 2 sub-campos del formulario. Si el usuario original tenía un solo nombre,
// el segundo queda vacío.
function dividirEnDos(strCompleto) {
  const partes = (strCompleto || "").trim().split(/\s+/);
  return [partes[0] || "", partes.slice(1).join(" ")];
}

/**
 * Campos de "Nuevo Usuario" / "Editar Usuario" (HU16), sin el wrapper de
 * modal — así se puede usar tanto dentro de UsuarioFormModal.jsx (panel de
 * admin) como embebido directo en otra ventana (panel de Docente, ver
 * HomeDocente.jsx, que muestra carga masiva + registro individual juntos
 * en una sola ventana más ancha).
 *
 * Mismos campos, iconos y estilo que RegistroForm.jsx (pedido por la inge
 * para que ambos formularios se vean igual), adaptado a lo que el backend
 * espera: primerNombre+segundoNombre -> nombre, apellidoPaterno+
 * apellidoMaterno -> apellido.
 *
 * El admin registra los 4 roles; el panel de Docente pasa
 * rolesDisponibles=["OPERADOR","ESTUDIANTE"] (un docente no puede
 * registrar a otro docente). Docente y Estudiante piden además su propio
 * "Código SIS" (codsisdocente / codsisestudiante en la tabla hija, cada
 * uno independiente del otro).
 *
 * En modo "editar" también se puede cambiar el rol: si el admin lo cambia,
 * onGuardar recibe además "rolCambio" para que quien llame dispare el
 * endpoint de cambiar rol (PATCH /api/admin/usuarios/{id}/rol), separado
 * del PUT de datos básicos.
 */
export default function UsuarioFormFields({ modo, usuarioInicial, onCerrar, onGuardar,
                                             rolesDisponibles = ROLES_CREABLES, boolActivo = true }) {
  const [objFormData, setObjFormData] = useState(VALORES_INICIALES);
  const [strRolOriginal, setStrRolOriginal] = useState(null);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strError, setStrError] = useState("");
  const [objErrores, setObjErrores] = useState({});

  const { boolShowPassword, fnToggleShowPassword, strInputType } = usePasswordVisibility();

  const boolEsEdicion = modo === "editar";
  const boolPideCodigoSis = ROLES_CON_CODIGO_SIS.includes(objFormData.rol);

  useEffect(() => {
    if (!boolActivo) return;
    setStrError("");
    if (boolEsEdicion && usuarioInicial) {
      const [primerNombre, segundoNombre] = dividirEnDos(usuarioInicial.nombre);
      const [apellidoPaterno, apellidoMaterno] = dividirEnDos(usuarioInicial.apellido);
      setObjFormData({
        primerNombre,
        segundoNombre,
        apellidoPaterno,
        apellidoMaterno,
        ci: usuarioInicial.ci || "",
        correo: usuarioInicial.correo || "",
        contrasena: "",
        telefono: usuarioInicial.telefono || "",
        rol: usuarioInicial.rol || rolesDisponibles[0]?.valor,
        codigoSis: usuarioInicial.codigoSis ?? "",
      });
      setStrRolOriginal(usuarioInicial.rol || null);
    } else {
      setObjFormData({ ...VALORES_INICIALES, rol: rolesDisponibles[0]?.valor });
      setStrRolOriginal(null);
    }
  }, [boolActivo, boolEsEdicion, usuarioInicial, rolesDisponibles]);

  const fnActualizarCampo = (strCampo) => (e) => {
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
    setObjErrores((prev) => {
      if (!prev[strCampo]) return prev;
      const { [strCampo]: strOmitido, ...resto } = prev;
      return resto;
    });
  };

  // Valida formato de cada campo antes de tocar el backend. Devuelve un
  // objeto { nombreCampo: "mensaje" } vacío cuando todo está bien.
  const fnValidarFormulario = () => {
    const errores = {};

    if (!REGEX_SOLO_LETRAS.test(objFormData.primerNombre.trim())) {
      errores.primerNombre = objFormData.primerNombre.trim()
        ? "El primer nombre solo puede contener letras"
        : "El primer nombre es obligatorio";
    }
    if (objFormData.segundoNombre.trim() && !REGEX_SOLO_LETRAS.test(objFormData.segundoNombre.trim())) {
      errores.segundoNombre = "El segundo nombre solo puede contener letras";
    }
    if (!REGEX_SOLO_LETRAS.test(objFormData.apellidoPaterno.trim())) {
      errores.apellidoPaterno = objFormData.apellidoPaterno.trim()
        ? "El apellido paterno solo puede contener letras"
        : "El apellido paterno es obligatorio";
    }
    if (objFormData.apellidoMaterno.trim() && !REGEX_SOLO_LETRAS.test(objFormData.apellidoMaterno.trim())) {
      errores.apellidoMaterno = "El apellido materno solo puede contener letras";
    }

    if (!objFormData.correo.trim()) {
      errores.correo = "El correo es obligatorio";
    } else if (!REGEX_CORREO.test(objFormData.correo.trim())) {
      errores.correo = "Ingrese un correo válido, con dominio y extensión (ej. usuario@dominio.com)";
    }

    if (!objFormData.telefono.trim()) {
      errores.telefono = "El teléfono es obligatorio";
    } else if (!REGEX_TELEFONO.test(objFormData.telefono.trim())) {
      errores.telefono = "Ingrese un teléfono válido, solo números (7 u 8 dígitos)";
    }

    if (!boolEsEdicion) {
      if (!objFormData.ci.trim()) {
        errores.ci = "El carnet de identidad es obligatorio";
      } else if (!REGEX_CI.test(objFormData.ci.trim())) {
        errores.ci = "Ingrese un carnet de identidad válido (número, con complemento opcional como \"1N\")";
      }

      if (objFormData.rol !== "ESTUDIANTE" && !objFormData.contrasena) {
        errores.contrasena = "La contraseña es obligatoria";
      }
    }

    if (boolPideCodigoSis) {
      if (!objFormData.codigoSis.trim()) {
        errores.codigoSis = "El código SIS es obligatorio para este rol";
      } else if (!REGEX_SOLO_NUMEROS.test(objFormData.codigoSis.trim())) {
        errores.codigoSis = "Ingrese un código SIS válido, solo números";
      }
    }

    return errores;
  };

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrError("");

    const errores = fnValidarFormulario();
    if (Object.keys(errores).length > 0) {
      setObjErrores(errores);
      setStrError("Revisa los campos marcados en rojo antes de continuar.");
      return;
    }
    setObjErrores({});

    setBoolIsSubmitting(true);
    try {
      const intTelefono = objFormData.telefono ? Number(objFormData.telefono) : null;
      const strNombre = [objFormData.primerNombre, objFormData.segundoNombre].filter(Boolean).join(" ");
      const strApellido = [objFormData.apellidoPaterno, objFormData.apellidoMaterno].filter(Boolean).join(" ");
      const intCodigoSis = objFormData.codigoSis ? Number(objFormData.codigoSis) : null;

      if (boolEsEdicion) {
        const boolRolCambio = strRolOriginal && objFormData.rol !== strRolOriginal;
        await onGuardar({
          nombre: strNombre,
          apellido: strApellido,
          correo: objFormData.correo,
          telefono: intTelefono,
          rolCambio: boolRolCambio
            ? { nuevoRol: objFormData.rol, codigoSis: boolPideCodigoSis ? intCodigoSis : null }
            : null,
        });
      } else {
        const strContrasenaFinal = objFormData.rol === "ESTUDIANTE"
          ? (objFormData.contrasena || objFormData.ci)
          : objFormData.contrasena;

        await onGuardar({
          nombre: strNombre,
          apellido: strApellido,
          ci: objFormData.ci,
          correo: objFormData.correo,
          contrasena: strContrasenaFinal,
          telefono: intTelefono,
          rol: objFormData.rol,
          codigoSis: boolPideCodigoSis ? intCodigoSis : null,
        });
      }
    } catch (error) {
      setStrError(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <>
      <h2 className="text-sub font-extrabold text-primary-navy mb-1">
        {boolEsEdicion ? "Editar usuario" : "Nuevo usuario"}
      </h2>
      <p className="text-secondary text-text-body/70 mb-5">
        {boolEsEdicion
          ? "Actualiza los datos básicos y, si hace falta, el rol de la cuenta."
          : "Se crea con estado ACTIVO de inmediato."}
      </p>

      {strError && (
        <p className="mb-4 text-secondary font-semibold text-accent-red" role="alert">
          {strError}
        </p>
      )}

      <form onSubmit={fnManejarEnvio} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Nombres
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormField
                placeholder="Primer nombre"
                aria-label="Primer nombre"
                value={objFormData.primerNombre}
                onChange={fnActualizarCampo("primerNombre")}
                required
              />
              {objErrores.primerNombre && (
                <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.primerNombre}</p>
              )}
            </div>
            <div>
              <FormField
                placeholder="Segundo nombre (si tiene)"
                aria-label="Segundo nombre"
                value={objFormData.segundoNombre}
                onChange={fnActualizarCampo("segundoNombre")}
              />
              {objErrores.segundoNombre && (
                <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.segundoNombre}</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Apellidos
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormField
                placeholder="Apellido paterno"
                aria-label="Apellido paterno"
                value={objFormData.apellidoPaterno}
                onChange={fnActualizarCampo("apellidoPaterno")}
                required
              />
              {objErrores.apellidoPaterno && (
                <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.apellidoPaterno}</p>
              )}
            </div>
            <div>
              <FormField
                placeholder="Apellido materno"
                aria-label="Apellido materno"
                value={objFormData.apellidoMaterno}
                onChange={fnActualizarCampo("apellidoMaterno")}
              />
              {objErrores.apellidoMaterno && (
                <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.apellidoMaterno}</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <FormField
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
          {objErrores.telefono && (
            <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.telefono}</p>
          )}
        </div>

        <div className="col-span-2">
          <FormField
            label="Correo"
            type="email"
            placeholder="ejemplo@dominio.com"
            value={objFormData.correo}
            onChange={fnActualizarCampo("correo")}
            required
            icon={
              <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            }
          />
          {objErrores.correo && (
            <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.correo}</p>
          )}
        </div>

        {!boolEsEdicion && (
          <div className={boolPideCodigoSis || objFormData.rol !== "ESTUDIANTE" ? "" : "col-span-2"}>
            <FormField
              label="Carnet de Identidad"
              placeholder="Ej. 12345678"
              value={objFormData.ci}
              onChange={fnActualizarCampo("ci")}
              required
              icon={
                <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8" cy="12" r="2" />
                  <path d="M12 10h6M12 14h4" />
                </svg>
              }
            />
            {objErrores.ci ? (
              <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.ci}</p>
            ) : (
              objFormData.ci.trim() && (
                <p className="mt-1 text-badge text-text-body/60">
                  Se guardará como: <span className="font-semibold text-primary-navy">{normalizarCi(objFormData.ci)}</span>
                </p>
              )
            )}
          </div>
        )}

        {!boolEsEdicion && objFormData.rol !== "ESTUDIANTE" && (
          <div className={boolPideCodigoSis ? "col-span-2" : ""}>
          <FormField
            label="Contraseña"
            type={strInputType}
            placeholder="********"
            value={objFormData.contrasena}
            onChange={fnActualizarCampo("contrasena")}
            required
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
          {objErrores.contrasena && (
            <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.contrasena}</p>
          )}
          </div>
        )}

        {boolPideCodigoSis && (
          <div className={boolEsEdicion ? "col-span-2" : ""}>
            <FormField
              label="Código SIS"
              placeholder="Ej. 123456"
              value={objFormData.codigoSis}
              onChange={fnActualizarCampo("codigoSis")}
              required
              icon={
                <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M7 10h4M7 14h7" />
                </svg>
              }
            />
            {objErrores.codigoSis && (
              <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.codigoSis}</p>
            )}
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Rol
          </label>
          <div className="min-h-12 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
            {rolesDisponibles.map((opcion) => (
              <label
                key={opcion.valor}
                className="flex items-center gap-2.5 text-[#173F77] text-[15px] font-semibold cursor-pointer"
              >
                <input
                  type="radio"
                  name="rol"
                  className="w-[19px] h-[19px] border-2 border-[#7190B7] accent-primary-blue"
                  checked={objFormData.rol === opcion.valor}
                  onChange={() => setObjFormData((prev) => ({ ...prev, rol: opcion.valor }))}
                />
                {opcion.etiqueta}
              </label>
            ))}
          </div>
          {boolEsEdicion && strRolOriginal && objFormData.rol !== strRolOriginal && (
            <p className="mt-2 text-badge font-semibold text-accent-gold">
              Al guardar, se moverá la cuenta de {strRolOriginal} a {objFormData.rol} y quedará registrado en auditoría.
            </p>
          )}
        </div>

        <div className="col-span-2 flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 rounded-xl text-secondary font-bold text-text-body/70 hover:bg-bg-app transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={boolIsSubmitting}
            className="px-5 py-2.5 rounded-xl text-secondary font-bold text-bg-card bg-gradient-to-r from-primary-blue to-primary-navy shadow-xs hover:opacity-95 transition-all disabled:opacity-60 active:scale-[0.99]"
          >
            {boolIsSubmitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </>
  );
}
