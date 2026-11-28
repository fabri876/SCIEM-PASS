import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import React, { useState, useEffect } from "react";
import FormField from "../../../components/common/FormField";
import { obtenerVinculaciones, obtenerCatalogoGrupos } from "../../../services/grupoService";
import SeleccionGrupos from "../../../components/common/SeleccionGrupos";
import usePasswordVisibility from "../../../hooks/usePasswordVisibility";
import { verificarUsuarioDuplicado } from "../../../services/usuarioService";

const ROLES_CREABLES = [
  { valor: "DOCENTE", etiqueta: "Docente" },
  { valor: "OPERADOR", etiqueta: "Ayudante" },
  { valor: "ESTUDIANTE", etiqueta: "Estudiante" },
];

const ROLES_CON_CODIGO_SIS = ["DOCENTE", "ESTUDIANTE"];

const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜñÑáéíóúü\s]+$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CORREO_ADMIN_INSTITUCIONAL = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+@umss\.edu\.bo$/i;
const PALABRAS_RESERVADAS_CORREO_ADMIN = ["admin", "administrador", "root", "test", "usuario"];
const REGEX_CI = /^[0-9]+([\s-]?[0-9A-Za-z]{1,3})?$/;

function validarCorreoAdministrador(strCorreo) {
  const strNormalizado = (strCorreo || "").trim().toLowerCase();
  if (!REGEX_CORREO_ADMIN_INSTITUCIONAL.test(strNormalizado)) {
    return "El correo del administrador debe ser institucional con formato nombre.apellido@umss.edu.bo";
  }
  const strParteLocal = strNormalizado.split("@")[0];
  if (PALABRAS_RESERVADAS_CORREO_ADMIN.some((strPalabra) => strParteLocal.includes(strPalabra))) {
    return "El correo del administrador no puede contener palabras reservadas como admin, administrador, root, test o usuario";
  }
  return "";
}

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
  idGrupo: null,
};

function dividirEnDos(strCompleto) {
  const partes = (strCompleto || "").trim().split(/\s+/);
  return [partes[0] || "", partes.slice(1).join(" ")];
}

export default function UsuarioFormFields({ modo, usuarioInicial, onCerrar, onGuardar,
                                             rolesDisponibles = ROLES_CREABLES, boolActivo = true, mensajeExito = "" }) {
  const [objFormData, setObjFormData] = useState(VALORES_INICIALES);
  const boolRolAdministrador = modo === "editar" && usuarioInicial?.rol === "ADMINISTRADOR";
  const [strRolOriginal, setStrRolOriginal] = useState(null);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strError, setStrError] = useState("");
  const [objErrores, setObjErrores] = useState({});
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [errorGrupos, setErrorGrupos] = useState("");
  const [gruposAcademicos, setGruposAcademicos] = useState([]);
  const [objDuplicados, setObjDuplicados] = useState({});

  const { boolShowPassword, fnToggleShowPassword, strInputType } = usePasswordVisibility();

  const boolEsEdicion = modo === "editar";
  const estudianteInactivo = boolEsEdicion && usuarioInicial?.rol === "ESTUDIANTE" && usuarioInicial.estado === false;
  const boolPideCodigoSis = ROLES_CON_CODIGO_SIS.includes(objFormData.rol);
  const boolBloquearDuplicado = !boolEsEdicion && Object.values(objDuplicados).some(Boolean);
  useEffect(() => {
    if (boolEsEdicion || !boolActivo || !["ESTUDIANTE", "DOCENTE"].includes(objFormData.rol)) return;
    const t = setTimeout(() => verificarUsuarioDuplicado({ ci: objFormData.ci, correo: objFormData.correo, codigoSis: objFormData.codigoSis }).then(setObjDuplicados).catch(() => setObjDuplicados({})), 350);
    return () => clearTimeout(t);
  }, [boolEsEdicion, boolActivo, objFormData.rol, objFormData.ci, objFormData.correo, objFormData.codigoSis]);

  useEffect(() => {
    if (!boolActivo) return;
    setStrError("");
    setGruposAcademicos([]);
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
        telefono: String(usuarioInicial.telefono ?? ""),
        rol: usuarioInicial.rol || rolesDisponibles[0]?.valor,
        codigoSis: String(usuarioInicial.codigoSis ?? ""),
        idGrupo: null,
      });
      setStrRolOriginal(usuarioInicial.rol || null);
    } else {
      setObjFormData({ ...VALORES_INICIALES, rol: rolesDisponibles[0]?.valor });
      setStrRolOriginal(null);
    }
  }, [boolActivo, boolEsEdicion, usuarioInicial, rolesDisponibles]);

  useEffect(() => {
    if (!boolActivo || !boolEsEdicion || !usuarioInicial || usuarioInicial.rol === "ADMINISTRADOR" || objFormData.rol !== usuarioInicial.rol) { setCargandoGrupos(false); setErrorGrupos(""); return; }
    let activo = true;
    setCargandoGrupos(true); setErrorGrupos("");
    Promise.all([obtenerVinculaciones(), obtenerCatalogoGrupos()]).then(([relaciones, catalogo]) => {
      if (!activo) return;
      const ids = new Set(relaciones.filter(v => v.idUsuario === usuarioInicial.idUsuario && v.rol === usuarioInicial.rol).map(v => v.idGrupo));
      setGruposAcademicos(catalogo.filter(g => ids.has(g.idGrupo)));
    }).catch(e => { if (activo) setErrorGrupos(e.message); })
      .finally(() => { if (activo) setCargandoGrupos(false); });
    return () => { activo = false; };
  }, [boolActivo, boolEsEdicion, usuarioInicial, objFormData.rol]);

  const fnActualizarCampo = (strCampo) => (e) => {
    if (strCampo === "rol") setGruposAcademicos([]);
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
    setObjErrores((prev) => {
      if (!prev[strCampo]) return prev;
      const { [strCampo]: strOmitido, ...resto } = prev;
      return resto;
    });
  };

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
    } else if (boolRolAdministrador) {
      const strErrorCorreoAdmin = validarCorreoAdministrador(objFormData.correo);
      if (strErrorCorreoAdmin) errores.correo = strErrorCorreoAdmin;
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

      if (!["ESTUDIANTE", "DOCENTE"].includes(objFormData.rol) && !objFormData.contrasena) {
        errores.contrasena = "La contraseña es obligatoria";
      }
    }

    if (boolPideCodigoSis && (!boolEsEdicion || objFormData.rol !== strRolOriginal)) {
      if (!objFormData.codigoSis.trim()) {
        errores.codigoSis = "El código SIS es obligatorio para este rol";
      } else if (!/^[0-9]{9}$/.test(objFormData.codigoSis.trim())) {
        errores.codigoSis = "El código SIS debe tener exactamente 9 dígitos";
      }
    }

    return errores;
  };

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrError("");

    if (boolEsEdicion && !estudianteInactivo && (cargandoGrupos || errorGrupos)) { setStrError(errorGrupos || "Espere a que carguen las asignaciones."); return; }
    const errores = fnValidarFormulario();
    if (boolBloquearDuplicado) {
      if (objDuplicados.ci) errores.ci = "Este carnet de identidad ya está registrado.";
      if (objDuplicados.correo) errores.correo = "Este correo electrónico ya está registrado.";
      if (objDuplicados.codigoSis) errores.codigoSis = "Este Código SIS ya está registrado.";
    }
    if (!boolEsEdicion && ["DOCENTE", "ESTUDIANTE", "OPERADOR"].includes(objFormData.rol) && !gruposAcademicos.length)
      errores.grupos = "Seleccione una asignatura y al menos un grupo.";
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
        const boolRolCambio = !boolRolAdministrador && strRolOriginal && objFormData.rol !== strRolOriginal;
        await onGuardar({
          nombre: strNombre,
          apellido: strApellido,
          correo: objFormData.correo,
          telefono: intTelefono,
          idGrupos: !estudianteInactivo && !boolRolCambio && objFormData.rol !== "ADMINISTRADOR" ? gruposAcademicos.map(g => g.idGrupo) : undefined,
          idCarreras: estudianteInactivo ? undefined : [...new Set(gruposAcademicos.map(g=>g.idCarrera).filter(Boolean))],
          rolCambio: boolRolCambio
            ? { nuevoRol: objFormData.rol, codigoSis: boolPideCodigoSis ? intCodigoSis : null }
            : null,
        });
      } else {
        const strContrasenaFinal = ["ESTUDIANTE", "DOCENTE"].includes(objFormData.rol)
          ? null
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
          idGrupo: objFormData.idGrupo || null,
          idGrupos: gruposAcademicos.map(g => g.idGrupo),
          idCarreras: [...new Set(gruposAcademicos.map(g=>g.idCarrera).filter(Boolean))],
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
        {textoInterfaz(boolEsEdicion
          ? "Actualiza sus datos y corrige las materias y grupos asignados."
          : "Se crea con estado ACTIVO de inmediato.")}
      </p>

      <form onSubmit={fnManejarEnvio} autoComplete="off" className="grid grid-cols-2 gap-4">
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
                placeholder="Apellido materno (si tiene)"
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

        <div className={boolEsEdicion ? "col-span-2" : ""}>
          <FormField
            label="Correo electrónico"
            id="registro-persona-correo"
            name="registro-persona-correo"
            autoComplete="off"
            type="email"
            placeholder={boolRolAdministrador ? "nombre.apellido@umss.edu.bo" : "ejemplo@est.umss.edu"}
            value={objFormData.correo}
            onChange={fnActualizarCampo("correo")}
            required
            icon={
              <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            }
          />
          {objErrores.correo && (
            <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.correo}</p>
          )}
          {objDuplicados.correo && !objErrores.correo && (
            <p className="mt-1 text-badge font-semibold text-accent-red">Este correo electrónico ya existe.</p>
          )}
        </div>

        <div className={boolEsEdicion ? "col-span-2" : ""}>
          <FormField
            label="Teléfono / Celular"
            placeholder="71234567"
            value={objFormData.telefono}
            onChange={fnActualizarCampo("telefono")}
            required
            icon={
              <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            }
          />
          {objErrores.telefono && (
            <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.telefono}</p>
          )}
        </div>

        {!boolEsEdicion && (
          <div>
            <FormField
              label="Carnet de Identidad"
              id="registro-persona-documento"
              name="registro-persona-documento"
              autoComplete="off"
              placeholder="12345678"
              value={objFormData.ci}
              onChange={fnActualizarCampo("ci")}
              required
              icon={
                <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current stroke-[1.8]">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="M15 8h2M15 12h2M7 16h10" />
                </svg>
              }
            />
            {objErrores.ci && (
              <p className="mt-1 text-badge font-semibold text-accent-red">{objErrores.ci}</p>
            )}
            {objDuplicados.ci && !objErrores.ci && (
              <p className="mt-1 text-badge font-semibold text-accent-red">Este carnet de identidad ya existe.</p>
            )}
            {objFormData.ci.trim() && (
              <p className="mt-1 text-badge font-semibold text-primary-navy">
                Normalizado en BD: <span className="font-mono">{normalizarCi(objFormData.ci)}</span>
              </p>
            )}
          </div>
        )}

        {!boolEsEdicion && !["ESTUDIANTE", "DOCENTE"].includes(objFormData.rol) && (
          <div className={boolPideCodigoSis ? "col-span-2" : ""}>
          <FormField
            label="Contraseña"
            id="registro-persona-clave-nueva"
            name="registro-persona-clave-nueva"
            autoComplete="new-password"
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
            {boolEsEdicion && objFormData.rol === strRolOriginal && (
              <p className="mb-2 text-xs text-secondary">El código SIS identifica el registro académico y se conserva al editar sus datos.</p>
            )}
            <FormField
              label="Código SIS"
              placeholder="Ej. 202309099"
              value={objFormData.codigoSis}
              onChange={fnActualizarCampo("codigoSis")}
              readOnly={boolEsEdicion && objFormData.rol === strRolOriginal}
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
            {objDuplicados.codigoSis && !objErrores.codigoSis && (
              <p className="mt-1 text-badge font-semibold text-accent-red">Este Código SIS ya existe.</p>
            )}
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
            Rol
          </label>
          <div className="min-h-12 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
            {boolRolAdministrador ? (
              <span className="text-[#173F77] text-[15px] font-semibold">Administrador</span>
            ) : rolesDisponibles.map((opcion) => (
              <label
                key={opcion.valor}
                className="flex items-center gap-2.5 text-[#173F77] text-[15px] font-semibold cursor-pointer"
              >
                <input
                  type="radio"
                  name="rol"
                  className="w-[19px] h-[19px] border-2 border-[#7190B7] accent-primary-blue"
                  checked={objFormData.rol === opcion.valor}
                  onChange={() => { setObjFormData((prev) => ({ ...prev, rol: opcion.valor, idGrupo: null })); setGruposAcademicos([]); }}
                />
                {textoInterfaz(opcion.etiqueta)}
              </label>
            ))}
          </div>
          {boolEsEdicion && strRolOriginal && objFormData.rol !== strRolOriginal && (
            <p className="mt-2 text-badge font-semibold text-accent-gold">
              Al guardar, se moverá la cuenta de {strRolOriginal} a {textoInterfaz(objFormData.rol)} y quedará registrado en auditoría.
            </p>
          )}
          {strError && (
            <p className="mt-3 text-secondary font-semibold text-accent-red" role="alert">
              {textoInterfaz(strError)}
            </p>
          )}
        </div>

        {/* Selección opcional en cascada de Asignatura y Grupo */}
        {objFormData.rol !== "ADMINISTRADOR" && (!boolEsEdicion || objFormData.rol === strRolOriginal) && (
          <div className="col-span-2 mt-2">
            <p className="text-secondary mb-3">{boolEsEdicion ? "Quite el grupo incorrecto y seleccione el correcto, o agregue otras materias. Los cambios se aplican al guardar. Si quita todos, la cuenta quedará sin grupos." : "Los docentes, estudiantes y ayudantes deben registrarse con sus materias y grupos."}</p>
            {cargandoGrupos && <p role="status">Cargando asignaciones actuales…</p>}
            {errorGrupos && <p role="alert" className="text-accent-red">{errorGrupos} Cierre y vuelva a abrir para reintentar.</p>}
            {estudianteInactivo && <p>Reactiva la cuenta para editar sus asignaturas y grupos.</p>}
            <SeleccionGrupos key={objFormData.rol} value={gruposAcademicos} onChange={setGruposAcademicos} disabled={estudianteInactivo || boolIsSubmitting || cargandoGrupos || Boolean(errorGrupos)} required={!boolEsEdicion && ["DOCENTE", "ESTUDIANTE", "OPERADOR"].includes(objFormData.rol)} unGrupoPorAsignatura={objFormData.rol === "ESTUDIANTE"} />
            {objErrores.grupos && <p role="alert" className="text-accent-red text-secondary mt-2">{objErrores.grupos}</p>}
          </div>
        )}

        <div className="col-span-2 flex items-center justify-end gap-3 mt-2">
          {mensajeExito && <p role="status" className="mr-auto rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-800">{mensajeExito}</p>}
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 rounded-xl text-secondary font-bold text-text-body/70 hover:bg-bg-app transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={boolIsSubmitting || (!estudianteInactivo && (cargandoGrupos || Boolean(errorGrupos))) || boolBloquearDuplicado}
            className="px-5 py-2.5 rounded-xl text-secondary font-bold text-bg-card bg-gradient-to-r from-primary-blue to-primary-navy shadow-xs hover:opacity-95 transition-all disabled:opacity-60 active:scale-[0.99]"
          >
            {boolIsSubmitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </>
  );
}
