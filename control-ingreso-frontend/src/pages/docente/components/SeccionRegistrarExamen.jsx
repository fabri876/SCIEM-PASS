// Sección "Registrar examen": el formulario de siempre (ExamenForm), ahora como página
// dentro del panel del docente en lugar de una ventana emergente.
import ExamenForm from "../../../components/examenes/ExamenForm";

export default function SeccionRegistrarExamen({ onCancelar, onRegistrado }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden max-w-4xl">
      <ExamenForm onCancelar={onCancelar} onRegistrado={onRegistrado} />
    </div>
  );
}
