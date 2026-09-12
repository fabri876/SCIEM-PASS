import { useState } from "react";
import FormField from "../common/FormField";
import { registrarExamen } from "../../services/examenService";

/**
 * ExamenForm.jsx
 *
 * Formulario de registro de examen. Campos acordados:
 * asignatura, fecha, hora, duración, ambiente y normas.
 *
 * El id del examen y el estado NO son campos del formulario: los genera
 * el backend automáticamente al guardar (id autogenerado, estado inicial
 * "Programado").
 */
export default function ExamenForm() {
    const [objFormData, setObjFormData] = useState({
        asignatura: "",
        fecha: "",
        hora: "",
        duracion: "",
        ambiente: "",
        normas: "",
    });

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setBoolEnviando(true);
        setStrMensaje("");

        try {
            await registrarExamen(objFormData);
            setStrMensaje("Examen registrado correctamente.");
            setObjFormData({
                asignatura: "",
                fecha: "",
                hora: "",
                duracion: "",
                ambiente: "",
                normas: "",
            });
        } catch (error) {
            setStrMensaje("Ocurrió un error al registrar el examen.");
        } finally {
            setBoolEnviando(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md space-y-5"
        >
            <h2 className="text-[22px] font-extrabold text-[#163F79] mb-2">
                Registrar examen
            </h2>

            <FormField
                id="asignatura"
                name="asignatura"
                label="Asignatura"
                type="text"
                value={objFormData.asignatura}
                onChange={handleChange}
                required
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    id="fecha"
                    name="fecha"
                    label="Fecha"
                    type="date"
                    value={objFormData.fecha}
                    onChange={handleChange}
                    required
                />
                <FormField
                    id="hora"
                    name="hora"
                    label="Hora"
                    type="time"
                    value={objFormData.hora}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    id="duracion"
                    name="duracion"
                    label="Duración (minutos)"
                    type="number"
                    min="1"
                    value={objFormData.duracion}
                    onChange={handleChange}
                    required
                />
                <FormField
                    id="ambiente"
                    name="ambiente"
                    label="Ambiente"
                    type="text"
                    value={objFormData.ambiente}
                    onChange={handleChange}
                    required
                />
            </div>

            <div>
                <label
                    htmlFor="normas"
                    className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]"
                >
                    Normas particulares
                </label>
                <textarea
                    id="normas"
                    name="normas"
                    rows={3}
                    value={objFormData.normas}
                    onChange={handleChange}
                    className="w-full border border-[#C8D6E8] rounded-md bg-white
            font-nunito text-[15px] text-text-body outline-none p-[15px]
            focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
                />
            </div>

            {strMensaje && (
                <p className="text-sm font-semibold text-[#163F79]">{strMensaje}</p>
            )}

            <button
                type="submit"
                disabled={boolEnviando}
                className="h-12 w-full rounded-md bg-primary-blue text-white font-extrabold
          disabled:opacity-60"
            >
                {boolEnviando ? "Registrando..." : "Registrar examen"}
            </button>
        </form>
    );
}