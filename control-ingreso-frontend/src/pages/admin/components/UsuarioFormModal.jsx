import React, { useState, useEffect } from "react";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import FormField from "../../../components/common/FormField";

const ROLES_CREABLES = ["ADMINISTRADOR", "DOCENTE", "OPERADOR"];

const VALORES_INICIALES = {
  nombre: "",
  apellido: "",
  ci: "",
  correo: "",
  contrasena: "",
  telefono: "",
  rol: "DOCENTE",
};

/**
 * Modal de "Nuevo Usuario" / "Editar Usuario" del panel de administración
 * (HU16). En modo "crear" pega a POST /api/admin/usuarios (pide CI,
 * contraseña y rol). En modo "editar" pega a PUT /api/admin/usuarios/{id}
 * (solo datos básicos: el rol y la contraseña no se pueden cambiar acá,
 * ver docs/Contrato-API-HU-Usuarios-Roles-Auditoria.md).
 */
export default function UsuarioFormModal({ boolAbierto, modo, usuarioInicial, onCerrar, onGuardar }) {
  const [objFormData, setObjFormData] = useState(VALORES_INICIALES);
  const [boolIsSubmitting, setBoolIsSubmitting] = useState(false);
  const [strError, setStrError] = useState("");

  const boolEsEdicion = modo === "editar";

  useEffect(() => {
    if (!boolAbierto) return;
    setStrError("");
    if (boolEsEdicion && usuarioInicial) {
      setObjFormData({
        nombre: usuarioInicial.nombre || "",
        apellido: usuarioInicial.apellido || "",
        ci: usuarioInicial.ci || "",
        correo: usuarioInicial.correo || "",
        contrasena: "",
        telefono: usuarioInicial.telefono || "",
        rol: usuarioInicial.rol || "DOCENTE",
      });
    } else {
      setObjFormData(VALORES_INICIALES);
    }
  }, [boolAbierto, boolEsEdicion, usuarioInicial]);

  const fnActualizarCampo = (strCampo) => (e) => {
    setObjFormData((prev) => ({ ...prev, [strCampo]: e.target.value }));
  };

  const fnManejarEnvio = async (e) => {
    e.preventDefault();
    setStrError("");
    setBoolIsSubmitting(true);
    try {
      const intTelefono = objFormData.telefono ? Number(objFormData.telefono) : null;

      if (boolEsEdicion) {
        await onGuardar({
          nombre: objFormData.nombre,
          apellido: objFormData.apellido,
          correo: objFormData.correo,
          telefono: intTelefono,
        });
      } else {
        await onGuardar({
          nombre: objFormData.nombre,
          apellido: objFormData.apellido,
          ci: objFormData.ci,
          correo: objFormData.correo,
          contrasena: objFormData.contrasena,
          telefono: intTelefono,
          rol: objFormData.rol,
        });
      }
    } catch (error) {
      setStrError(error.message);
    } finally {
      setBoolIsSubmitting(false);
    }
  };

  return (
    <VentanaEmergente boolAbierto={boolAbierto} onCerrar={onCerrar}>
      <div className="p-6">
        <h2 className="text-lg font-extrabold text-[#021B3B] mb-1">
          {boolEsEdicion ? "Editar usuario" : "Nuevo usuario"}
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          {boolEsEdicion
            ? "Actualiza los datos básicos de la cuenta."
            : "Se crea con estado ACTIVO de inmediato (los estudiantes se auto-registran, no se crean acá)."}
        </p>

        {strError && (
          <p className="mb-4 text-sm font-semibold text-rose-600" role="alert">
            {strError}
          </p>
        )}

        <form onSubmit={fnManejarEnvio} className="grid grid-cols-2 gap-4">
          <FormField
            label="Nombre"
            value={objFormData.nombre}
            onChange={fnActualizarCampo("nombre")}
            required
          />
          <FormField
            label="Apellido"
            value={objFormData.apellido}
            onChange={fnActualizarCampo("apellido")}
            required
          />

          {!boolEsEdicion && (
            <FormField
              label="Carnet de Identidad"
              value={objFormData.ci}
              onChange={fnActualizarCampo("ci")}
              required
            />
          )}

          <FormField
            label="Correo"
            type="email"
            value={objFormData.correo}
            onChange={fnActualizarCampo("correo")}
            required
            className={boolEsEdicion ? "col-span-2" : ""}
          />

          {!boolEsEdicion && (
            <FormField
              label="Contraseña temporal"
              type="password"
              value={objFormData.contrasena}
              onChange={fnActualizarCampo("contrasena")}
              required
            />
          )}

          <FormField
            label="Teléfono"
            type="tel"
            value={objFormData.telefono}
            onChange={fnActualizarCampo("telefono")}
          />

          {!boolEsEdicion && (
            <div className="col-span-2">
              <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">Rol</label>
              <select
                value={objFormData.rol}
                onChange={fnActualizarCampo("rol")}
                className="h-12 w-full border border-[#C8D6E8] rounded-md bg-white px-3 text-[15px] text-text-body outline-none focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
              >
                {ROLES_CREABLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={boolIsSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0066FF] to-[#021B3B] shadow-md disabled:opacity-60"
            >
              {boolIsSubmitting ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </VentanaEmergente>
  );
}
