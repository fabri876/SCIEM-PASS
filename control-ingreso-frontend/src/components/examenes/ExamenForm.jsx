import { useState } from "react";
import { registrarExamen } from "../../services/examenService";


// ExamenForm.jsx

const ARR_ASIGNATURAS_TEMP = [
    { idAsignatura: 1, nombre: "Inteligencia Artificial" },
    { idAsignatura: 2, nombre: "Machine Learning" },
    { idAsignatura: 3, nombre: "Bases de Datos" },
];

const ARR_TIPOS_EXAMEN_TEMP = [
    "Primer parcial",
    "Segundo parcial",
    "Examen final",
    "Segunda instancia",
    "Otro",
];

const ARR_AMBIENTES_TEMP = [
    { idAmbiente: 1, nombre: "Aula 690B" },
    { idAmbiente: 2, nombre: "Aula 691C" },
    { idAmbiente: 3, nombre: "Aula 692C" },
    { idAmbiente: 4, nombre: "Aula 692D" },
];

const ARR_NORMAS_GENERALES_TEMP = [
    { idNorma: 1, descripcion: "Presentar carnet de identidad / carnet universitario" },
    { idNorma: 2, descripcion: "Prohibido el uso de teléfonos celulares y dispositivos inteligentes" },
    { idNorma: 3, descripcion: "Llegar puntual (no se permite el ingreso una vez iniciado el examen)" },
    { idNorma: 4, descripcion: "Permitido únicamente uso de calculadora científica no programable" },
];

function IconoDocumento() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
    );
}

function IconoInfo() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8h.01M11 12h1v4h1" />
        </svg>
    );
}

function IconoNormas() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75h6a1 1 0 011 1v1.25H8V4.75a1 1 0 011-1z" />
            <rect x="6" y="5" width="12" height="15" rx="1.5" />
            <path strokeLinecap="round" d="M9 11h6M9 14.5h6M9 18h3.5" />
        </svg>
    );
}

export default function ExamenForm() {
    const [objFormData, setObjFormData] = useState({
        idAsignatura: "",
        tipoExamen: "",
        nombrePersonalizado: "",
        fecha: "",
        hora: "",
        duracion: "",
        normaParticular: "",
    });

    const [arrIdAmbientesSeleccionados, setArrIdAmbientesSeleccionados] = useState([1]);
    const [strBusquedaAmbiente, setStrBusquedaAmbiente] = useState("");
    const [boolSugerenciasVisibles, setBoolSugerenciasVisibles] = useState(false);

    const [arrIdNormasSeleccionadas, setArrIdNormasSeleccionadas] = useState([]);

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");
    const [boolAdvertenciaDuracion, setBoolAdvertenciaDuracion] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleChangeDuracion(e) {
        const value = e.target.value;
        setObjFormData((prev) => ({ ...prev, duracion: value }));
        setBoolAdvertenciaDuracion(parseInt(value, 10) > 480);
    }

    function handleToggleNorma(idNorma) {
        setArrIdNormasSeleccionadas((prev) =>
            prev.includes(idNorma) ? prev.filter((id) => id !== idNorma) : [...prev, idNorma]
        );
    }

    function handleAgregarAmbiente(idAmbiente) {
        if (!arrIdAmbientesSeleccionados.includes(idAmbiente)) {
            setArrIdAmbientesSeleccionados((prev) => [...prev, idAmbiente]);
        }
        setStrBusquedaAmbiente("");
        setBoolSugerenciasVisibles(false);
    }

    function handleQuitarAmbiente(idAmbiente) {
        setArrIdAmbientesSeleccionados((prev) => prev.filter((id) => id !== idAmbiente));
    }

    const arrAmbientesFiltrados = ARR_AMBIENTES_TEMP.filter(
        (ambiente) =>
            !arrIdAmbientesSeleccionados.includes(ambiente.idAmbiente) &&
            ambiente.nombre.toLowerCase().includes(strBusquedaAmbiente.toLowerCase())
    );

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
            await registrarExamen({
                fechaExamen: strFechaHora,
                duracionExamen: strDuracion,
                estadoExamen: true,
                idAsignatura: parseInt(objFormData.idAsignatura, 10),
                idAmbientes: arrIdAmbientesSeleccionados,
                tipoExamen: objFormData.tipoExamen,
                nombrePersonalizado: objFormData.tipoExamen === "Otro" ? objFormData.nombrePersonalizado : null,
                idNormas: arrIdNormasSeleccionadas,
                normaParticular: objFormData.normaParticular,
            });
            setStrMensaje("Examen registrado correctamente.");
        } catch (error) {
            setStrMensaje("Ocurrió un error al registrar el examen.");
        } finally {
            setBoolEnviando(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 p-6 pb-0">
                <div className="w-10 h-10 rounded-lg bg-[#163F79] flex items-center justify-center text-white">
                    <IconoDocumento />
                </div>
                <div>
                    <h2 className="text-[19px] font-bold text-[#163F79]">Registrar examen</h2>
                    <p className="text-[12.5px] text-gray-500">
                        Complete el formulario para programar la evaluación académica
                    </p>
                </div>
            </div>

            <div className="bg-[#EBF3FA] px-6 py-2.5 mt-4 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
                <IconoInfo />
                Información del examen
            </div>

            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Asignatura <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="idAsignatura"
                            value={objFormData.idAsignatura}
                            onChange={handleChange}
                            required
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        >
                            <option value="" disabled>Seleccione una asignatura</option>
                            {ARR_ASIGNATURAS_TEMP.map((a) => (
                                <option key={a.idAsignatura} value={a.idAsignatura}>{a.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Tipo de Examen <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="tipoExamen"
                            value={objFormData.tipoExamen}
                            onChange={handleChange}
                            required
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        >
                            <option value="" disabled>Seleccione el tipo</option>
                            {ARR_TIPOS_EXAMEN_TEMP.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {objFormData.tipoExamen === "Otro" && (
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Especifique tipo de examen <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            name="nombrePersonalizado"
                            maxLength={60}
                            value={objFormData.nombrePersonalizado}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Tercer parcial, Examen extraordinario, etc."
                            className="h-[42px] w-full border border-[#2B6CB0] rounded-md text-[13.5px] px-3 bg-[#2B6CB0]/[0.06] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                        <p className="text-[10.5px] text-gray-500 text-right mt-1">
                            {objFormData.nombrePersonalizado.length}/60
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3.5">
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Fecha del Examen <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="date"
                            name="fecha"
                            value={objFormData.fecha}
                            onChange={handleChange}
                            required
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                    </div>
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Hora de Inicio <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="time"
                            name="hora"
                            value={objFormData.hora}
                            onChange={handleChange}
                            required
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                    </div>
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Duración (min) <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="number"
                            name="duracion"
                            min="1"
                            value={objFormData.duracion}
                            onChange={handleChangeDuracion}
                            required
                            placeholder="90"
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                        {boolAdvertenciaDuracion && (
                            <p className="text-[11px] text-red-600 mt-1">
                                La duración no puede superar 480 minutos (8 horas)
                            </p>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                        Aulas / Ambientes <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                        <input
                            type="text"
                            placeholder="Buscar ambiente..."
                            value={strBusquedaAmbiente}
                            onChange={(e) => setStrBusquedaAmbiente(e.target.value)}
                            onFocus={() => setBoolSugerenciasVisibles(true)}
                            onBlur={() => setTimeout(() => setBoolSugerenciasVisibles(false), 150)}
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] pl-9 pr-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                        {boolSugerenciasVisibles && arrAmbientesFiltrados.length > 0 && (
                            <div className="absolute left-0 right-0 top-[44px] bg-white border border-[#C8D6E8] rounded-b-md shadow-lg z-10">
                                {arrAmbientesFiltrados.map((ambiente) => (
                                    <div
                                        key={ambiente.idAmbiente}
                                        onMouseDown={() => handleAgregarAmbiente(ambiente.idAmbiente)}
                                        className="px-3 py-2 text-[13px] cursor-pointer hover:bg-[#EBF3FA]"
                                    >
                                        {ambiente.nombre}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {arrIdAmbientesSeleccionados.map((idAmbiente) => {
                            const ambiente = ARR_AMBIENTES_TEMP.find((a) => a.idAmbiente === idAmbiente);
                            if (!ambiente) return null;
                            return (
                                <span
                                    key={idAmbiente}
                                    className="inline-flex items-center gap-1.5 bg-[#EBF3FA] text-[#163F79] border border-[#D3E2F5] px-2.5 py-1 rounded-full text-[12px] font-semibold"
                                >
                                    {ambiente.nombre}
                                    <button
                                        type="button"
                                        onClick={() => handleQuitarAmbiente(idAmbiente)}
                                        className="text-[#2B6CB0] font-bold leading-none"
                                    >
                                        &times;
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                    <p className="text-[11.5px] text-gray-500 mt-2">
                        Puede seleccionar más de un ambiente si el examen lo requiere.
                    </p>
                </div>
            </div>

            <div className="bg-[#EBF3FA] px-6 py-2.5 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
                <IconoNormas />
                Normas e indicaciones
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-[12.5px] font-semibold text-[#163F79] mb-2">
                        Normas generales
                    </label>
                    <div className="flex flex-col gap-2">
                        {ARR_NORMAS_GENERALES_TEMP.map((norma) => (
                            <label key={norma.idNorma} className="flex items-start gap-2 text-[13px] text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={arrIdNormasSeleccionadas.includes(norma.idNorma)}
                                    onChange={() => handleToggleNorma(norma.idNorma)}
                                    className="w-4 h-4 mt-0.5 accent-[#163F79]"
                                />
                                {norma.descripcion}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                        Norma particular
                    </label>
                    <textarea
                        name="normaParticular"
                        maxLength={100}
                        rows={3}
                        value={objFormData.normaParticular}
                        onChange={handleChange}
                        placeholder="Escriba aquí alguna indicación específica adicional para este examen"
                        className="w-full border border-[#C8D6E8] rounded-md text-[13.5px] p-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                    />
                    <p className="text-[10.5px] text-gray-500 text-right mt-1">
                        {objFormData.normaParticular.length}/100
                    </p>
                </div>
            </div>

            {strMensaje && (
                <p className="px-6 text-sm font-semibold text-[#163F79]">{strMensaje}</p>
            )}

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
                <span className="text-[11.5px] text-gray-500">
                    Campos con (<span className="text-red-600">*</span>) son obligatorios
                </span>
                <div className="flex gap-2.5">
                    <button type="button" className="h-[42px] px-5 rounded-md border border-[#C8D6E8] text-[#163F79] font-semibold text-[13.5px]">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={boolEnviando}
                        className="h-[42px] px-5 rounded-md bg-[#163F79] text-white font-semibold text-[13.5px] disabled:opacity-60"
                    >
                        {boolEnviando ? "Registrando..." : "Registrar examen"}
                    </button>
                </div>
            </div>
        </form>
    );
}