import React from "react";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import UsuarioFormFields from "./UsuarioFormFields";

/**
 * Modal de "Nuevo Usuario" / "Editar Usuario" del panel de administración
 * (HU16) — wrapper delgado sobre UsuarioFormFields.jsx (los campos en sí)
 * + VentanaEmergente. El panel de Docente usa UsuarioFormFields directo,
 * sin este wrapper, para poder mostrarlo junto a la carga masiva en una
 * sola ventana (ver HomeDocente.jsx).
 */
export default function UsuarioFormModal({ boolAbierto, modo, usuarioInicial, onCerrar, onGuardar, rolesDisponibles, mensajeExito = "" }) {
  return (
    <VentanaEmergente boolAbierto={boolAbierto} onCerrar={onCerrar}>
      <div className="p-6 bg-bg-card rounded-2xl max-h-[85vh] overflow-y-auto">
        <UsuarioFormFields
          modo={modo}
          usuarioInicial={usuarioInicial}
          onCerrar={onCerrar}
          onGuardar={onGuardar}
          rolesDisponibles={rolesDisponibles}
          mensajeExito={mensajeExito}
          boolActivo={boolAbierto}
        />
      </div>
    </VentanaEmergente>
  );
}
