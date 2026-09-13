import { useState } from "react";
import { registrarExamen } from "../../services/examenService";

/**
 * ExamenForm.jsx
 *
 * Formulario de registro de examen (HU2)
 *
 * Fecha y hora se capturan en dos campos separados por claridad visual,
 * pero se combinan en un solo valor datetime antes de enviarlos,
 * porque fecha_examen en la BD es un solo TIMESTAMP.
 *
 * Duración se captura en minutos y se convierte a
 * formato HH:MM:SS antes de enviarla, porque duracion_examen en la
 * BD es de tipo TIME.
 *
 * Ambiente: selección múltiple (checkboxes), por 
 * tabla intermedia examen_ambiente (un examen puede usar varias aulas

**/

const ARR_ASIGNATURAS_TEMP = [
    { idAsignatura: 1, nombre: "Inteligencia Artificial" },
    { idAsignatura: 2, nombre: "Machine Learning" },
    { idAsignatura: 3, nombre: "Bases de Datos" },
];

// Lista temporal de ambientes

const ARR_AMBIENTES_TEMP = [
    { idAmbiente: 1, nombre: "Aula 690B" },
    { idAmbiente: 2, nombre: "Aula 691C" },
    { idAmbiente: 3, nombre: "Aula 692C" },
    { idAmbiente: 4, nombre: "Aula 692D" },
    // { idAmbiente: 5, nombre: "Auditorio" },
];

function IconoDocumento() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
    );
}

function IconoCalendario() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 6h15a.75.75 0 01.75.75V19.5a.75.75 0 01-.75.75h-15A.75.75 0 013.75 19.5V6.75A.75.75 0 014.5 6z" />
        </svg>
    );
}

function IconoReloj() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="8.25" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 1.5" />
        </svg>
    );
}

function IconoAmbiente() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18M18.75 3v18M9 6.75h1.5M9 11.25h1.5M13.5 6.75H15M13.5 11.25H15M9 21v-4.5a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5V21" />
        </svg>
    );
}

export default function ExamenForm() {
    const [objFormData, setObjFormData] = useState({
        idAsignatura: "",
        fecha: "",
        hora: "",
        duracion: "",
        normas: "",
    });

    const [arrIdAmbientesSeleccionados, setArrIdAmbientesSeleccionados] = useState([]);
    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleToggleAmbiente(idAmbiente) {
        setArrIdAmbientesSeleccionados((prev) =>
            prev.includes(idAmbiente)
                ? prev.filter((id) => id !== idAmbiente)
                : [...prev, idAmbiente]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (arrIdAmbientesSeleccionados.length === 0) {
            setStrMensaje("Debe seleccionar al menos un ambiente.");
            return;
        }

        setBoolEnviando(true);
        setStrMensaje("");

        const strFechaHora = `${objFormData.fecha}T${objFormData.hora}`;

        const intMinutos = parseInt(objFormData.duracion, 10);
        const intHoras = Math.floor(intMinutos / 60);
        const intMinutosRestantes = intMinutos % 60;
        const strDuracion = `${String(intHoras).padStart(2, "0")}:${String(intMinutosRestantes).padStart(2, "0")}:00`;



        try {
            //Lista de campos a enviar-------------------------------

            await registrarExamen({
                fechaExamen: strFechaHora,
                duracionExamen: strDuracion,
                normasExamen: objFormData.normas,
                estadoExamen: true,
                idAsignatura: parseInt(objFormData.idAsignatura, 10),
                idAmbientes: arrIdAmbientesSeleccionados,
            });
            setStrMensaje("Examen registrado correctamente.");
            setObjFormData({ idAsignatura: "", fecha: "", hora: "", duracion: "", normas: "" });
            ssetArrIdAmbientesSeleccionados([]);
        } catch (error) {
            setStrMensaje("Ocurrió un error al registrar el examen.");
        } finally {
            setBoolEnviando(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-lg bg-[#163F79] flex items-center justify-center text-white">
                    <IconoDocumento />
                </div>
                <div>
                    <h2 className="text-[22px] font-extrabold text-[#163F79]">Registrar examen</h2>
                    <p className="text-sm text-gray-500">
                        Configure los datos del examen que será habilitado para los estudiantes.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-[#EEF3FA] px-6 py-3 font-extrabold text-[#163F79]">
                    Información del examen
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
                            Asignatura <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="idAsignatura"
                                value={objFormData.idAsignatura}
                                onChange={handleChange}
                                required
                                className="h-12 w-full border border-[#C8D6E8] rounded-md bg-white
                  font-nunito text-[15px] text-text-body outline-none pl-[15px] pr-10
                  appearance-none
                  focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
                            >
                                <option value="" disabled>Selecciona una asignatura</option>
                                {ARR_ASIGNATURAS_TEMP.map((a) => (
                                    <option key={a.idAsignatura} value={a.idAsignatura}>{a.nombre}</option>
                                ))}
                            </select>
                            <span className="absolute right-4 top-[18px] text-primary-navy pointer-events-none">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
                                Fecha del examen <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-[15px] top-[14px] text-primary-navy pointer-events-none">
                                    <IconoCalendario />
                                </span>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={objFormData.fecha}
                                    onChange={handleChange}
                                    required
                                    className="h-12 w-full border border-[#C8D6E8] rounded-md bg-white
                    font-nunito text-[15px] text-text-body outline-none pl-[46px] pr-[15px]
                    focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
                                Hora de inicio <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-[15px] top-[14px] text-primary-navy pointer-events-none">
                                    <IconoReloj />
                                </span>
                                <input
                                    type="time"
                                    name="hora"
                                    value={objFormData.hora}
                                    onChange={handleChange}
                                    required
                                    className="h-12 w-full border border-[#C8D6E8] rounded-md bg-white
                    font-nunito text-[15px] text-text-body outline-none pl-[46px] pr-[15px]
                    focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-1/2 pr-2">
                        <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
                            Duración del examen (minutos) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-[15px] top-[14px] text-primary-navy pointer-events-none">
                                <IconoReloj />
                            </span>
                            <input
                                type="number"
                                name="duracion"
                                min="1"
                                max="480"
                                placeholder="Ej: 90"
                                value={objFormData.duracion}
                                onChange={handleChange}
                                required
                                className="h-12 w-full border border-[#C8D6E8] rounded-md bg-white
                  font-nunito text-[15px] text-text-body outline-none pl-[46px] pr-[15px]
                  focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Máximo 480 minutos (8 horas)</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-extrabold text-[#163F79] mb-[7px]">
                            Ambiente(s) <span className="text-red-500">*</span>
                        </label>
                        <div className="border border-[#C8D6E8] rounded-md p-4 grid grid-cols-2 gap-3">
                            {ARR_AMBIENTES_TEMP.map((ambiente) => (
                                <label
                                    key={ambiente.idAmbiente}
                                    className="flex items-center gap-2 text-[15px] font-nunito text-text-body cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={arrIdAmbientesSeleccionados.includes(ambiente.idAmbiente)}
                                        onChange={() => handleToggleAmbiente(ambiente.idAmbiente)}
                                        className="w-4 h-4 accent-primary-blue"
                                    />
                                    <IconoAmbiente />
                                    {ambiente.nombre}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Selecciona uno o más ambientes según la capacidad requerida.
                        </p>
                    </div>
                </div>

                <div className="bg-[#EEF3FA] px-6 py-3 font-extrabold text-[#163F79]">
                    Normas e indicaciones
                </div>
                <div className="p-6">
                    <textarea
                        name="normas"
                        rows={4}
                        value={objFormData.normas}
                        onChange={handleChange}
                        placeholder="Escribe las instrucciones que los estudiantes deberán seguir durante el examen..."
                        className="w-full border border-[#C8D6E8] rounded-md bg-white
              font-nunito text-[15px] text-text-body outline-none p-[15px]
              focus:border-primary-blue focus:ring-4 focus:ring-primary-blue/10"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        Ej.: No utilizar celulares. Tiempo máximo: 90 minutos.
                    </p>
                </div>

                {strMensaje && (
                    <p className="px-6 text-sm font-semibold text-[#163F79]">{strMensaje}</p>
                )}

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button
                        type="button"
                        className="h-11 px-5 rounded-md border border-[#C8D6E8] text-[#163F79] font-bold"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={boolEnviando}
                        className="h-11 px-5 rounded-md bg-primary-blue text-white font-bold disabled:opacity-60"
                    >
                        {boolEnviando ? "Registrando..." : "Registrar examen"}
                    </button>
                </div>
            </form>
        </div>
    );
}