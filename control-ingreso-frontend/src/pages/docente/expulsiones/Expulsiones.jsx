import React, { useState } from "react";
import { Save, Clock, FileText } from "lucide-react";
import RegistroExpulsion from "./RegistroExpulsion";
import PendientesAutorizacion from "./PendientesAutorizacion";
import HistorialExpulsiones from "./HistorialExpulsiones";

const TABS = [
  { valor: "registrar", etiqueta: "Registrar Expulsión", icono: <Save className="w-4 h-4" /> },
  { valor: "pendientes", etiqueta: "Pendientes de Autorización", icono: <Clock className="w-4 h-4" /> },
  { valor: "historial", etiqueta: "Historial de Expulsiones", icono: <FileText className="w-4 h-4" /> },
];

export default function Expulsiones() {
  const [tabActivo, setTabActivo] = useState("registrar");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Encabezado del módulo */}
      <div className="bg-[#1A365D] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px]">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
          Gestión de Expulsiones
        </h2>
        <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
          Seleccione una de las opciones para registrar, autorizar o consultar expulsiones de estudiantes.
        </p>
      </div>

      {/* Tabs de navegación - extremos alineados al encabezado, el del medio centrado */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 overflow-x-auto pb-2">
        {TABS.map((tab, indice) => (
          <button
            key={tab.valor}
            onClick={() => setTabActivo(tab.valor)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              indice === 0 ? "justify-self-start" : indice === 1 ? "justify-self-center" : "justify-self-end"
            } ${
              tabActivo === tab.valor
                ? "bg-[#1A365D] text-white shadow-sm border border-[#1A365D]"
                : "bg-white text-slate-700 border border-[#CBD5E1] hover:border-[#1A365D]/50 hover:bg-[#F8FAFC]"
            }`}
          >
            {tab.icono}
            <span>{tab.etiqueta}</span>
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs min-h-[600px]">
        {tabActivo === "registrar" && <RegistroExpulsion />}
        {tabActivo === "pendientes" && <PendientesAutorizacion />}
        {tabActivo === "historial" && <HistorialExpulsiones />}
      </div>
    </div>
  );
}
