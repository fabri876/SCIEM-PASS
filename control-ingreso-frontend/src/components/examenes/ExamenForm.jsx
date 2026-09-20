import { useState, useEffect } from "react";
import {
    registrarExamen,
    obtenerAsignaturasPorDocente,
    obtenerHorariosRegulares,
    obtenerAulas,
    obtenerNormasGenerales,
    obtenerTiposExamen,
} from "../../services/examenService";
import { obtenerUsuarioActual } from "../../services/authService";

/**
 * ExamenForm.jsx
 *
 * Actualizado con la guia del 19-sep de Neil: catalogo real de
 * tipos de examen (GET /api/tipos-examen), con idTipoExamen y
 * detalleTipoExamen (antes "nombrePersonalizado") en el POST.
 *
 * UNICO PENDIENTE REAL: el codigo SIS del docente (codsisDocente) no
 * viene en el login todavia (Neil lo confirmo como pendiente en su
 * ultima guia, sec. 7). Tres endpoints lo piden como obligatorio:
 * asignaturas por docente, horarios regulares, y el registro final
 * del examen. Se manda como null hasta que se resuelva.
 */

const DIAS_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
};

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
    const objUsuario = obtenerUsuarioActual();

    // PENDIENTE: reemplazar por el valor real cuando Neil resuelva
    // como obtener el codigo SIS del docente logueado.
    const intCodsisDocente = null;

    const [objFormData, setObjFormData] = useState({
        idAsignatura: "",
        idTipoExamen: "",
        detalleTipoExamen: "",
        fecha: "",
    });

    const [arrAsignaturas, setArrAsignaturas] = useState([]);
    const [arrTiposExamen, setArrTiposExamen] = useState([]);
    const [arrHorariosRegulares, setArrHorariosRegulares] = useState([]);
    const [strTipoHorario, setStrTipoHorario] = useState("REGULAR");
    const [idHorarioRegularSeleccionado, setIdHorarioRegularSeleccionado] = useState("");

    const [objEventual, setObjEventual] = useState({
        idAula: "",
        horaInicio: "",
        horaFin: "",
    });

    const [arrAulas, setArrAulas] = useState([]);
    const [arrNormasGeneralesCatalogo, setArrNormasGeneralesCatalogo] = useState([]);
    const [arrIdNormasSeleccionadas, setArrIdNormasSeleccionadas] = useState([]);
    const [arrNormasEspecificas, setArrNormasEspecificas] = useState([]);
    const [strNuevaNormaEspecifica, setStrNuevaNormaEspecifica] = useState("");

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");

    // Catálogos que no dependen del código SIS
    useEffect(() => {
        obtenerAulas().then(setArrAulas).catch(() => setArrAulas([]));

        obtenerNormasGenerales()
            .then(setArrNormasGeneralesCatalogo)
            .catch(() => setArrNormasGeneralesCatalogo([]));

        obtenerTiposExamen()
            .then(setArrTiposExamen)
            .catch(() => setArrTiposExamen([]));
    }, []);

    // Asignaturas del docente (BLOQUEADO hasta tener el código SIS real)
    useEffect(() => {
        if (!objUsuario) return;
        obtenerAsignaturasPorDocente(objUsuario.idUsuario, intCodsisDocente)
            .then(setArrAsignaturas)
            .catch(() => setArrAsignaturas([]));
    }, []);

    // Horarios regulares al cambiar la asignatura
    useEffect(() => {
        if (!objFormData.idAsignatura || !objUsuario) {
            setArrHorariosRegulares([]);
            return;
        }

        obtenerHorariosRegulares(objUsuario.idUsuario, intCodsisDocente, objFormData.idAsignatura)
            .then((horarios) => {
                setArrHorariosRegulares(horarios);
                setStrTipoHorario(horarios.length > 0 ? "REGULAR" : "EVENTUAL");
            })
            .catch(() => setArrHorariosRegulares([]));
    }, [objFormData.idAsignatura]);

    const objTipoExamenSeleccionado = arrTiposExamen.find(
        (t) => String(t.idTipoExamen) === String(objFormData.idTipoExamen)
    );
    const boolRequiereDescripcion = objTipoExamenSeleccionado?.requiereDescripcion === true;

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleChangeEventual(e) {
        const { name, value } = e.target;
        setObjEventual((prev) => ({ ...prev, [name]: value }));
    }

    function handleToggleNormaGeneral(idNorma) {
        setArrIdNormasSeleccionadas((prev) =>
            prev.includes(idNorma) ? prev.filter((id) => id !== idNorma) : [...prev, idNorma]
        );
    }

    function handleAgregarNormaEspecifica() {
        const strTexto = strNuevaNormaEspecifica.trim();
        if (strTexto.length === 0) return;
        setArrNormasEspecificas((prev) => [...prev, strTexto]);
        setStrNuevaNormaEspecifica("");
    }

    function handleQuitarNormaEspecifica(index) {
        setArrNormasEspecificas((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStrMensaje("");

        if (strTipoHorario === "REGULAR" && !idHorarioRegularSeleccionado) {
            setStrMensaje("Debe seleccionar un horario regular.");
            return;
        }
        if (
            strTipoHorario === "EVENTUAL" &&
            (!objEventual.idAula || !objEventual.horaInicio || !objEventual.horaFin)
        ) {
            setStrMensaje("Complete aula, hora de inicio y hora de fin.");
            return;
        }
        if (boolRequiereDescripcion && !objFormData.detalleTipoExamen.trim()) {
            setStrMensaje("Especifique el tipo de examen.");
            return;
        }

        setBoolEnviando(true);

        const objBody = {
            fechaExamen: `${objFormData.fecha}T00:00:00`,
            estadoExamen: true,
            idAsignatura: parseInt(objFormData.idAsignatura, 10),
            idUsuario: objUsuario?.idUsuario,
            codsisDocente: intCodsisDocente,
            tipoHorario: strTipoHorario,
            idTipoExamen: parseInt(objFormData.idTipoExamen, 10),
            idsNormasGenerales: arrIdNormasSeleccionadas,
            normasEspecificas: arrNormasEspecificas,
        };

        if (boolRequiereDescripcion) {
            objBody.detalleTipoExamen = objFormData.detalleTipoExamen;
        }

        if (strTipoHorario === "REGULAR") {
            objBody.idHorarioRegular = parseInt(idHorarioRegularSeleccionado, 10);
        } else {
            objBody.idAula = parseInt(objEventual.idAula, 10);
            objBody.horaInicio = `${objEventual.horaInicio}:00`;
            objBody.horaFin = `${objEventual.horaFin}:00`;
        }

        try {
            await registrarExamen(objBody);
            setStrMensaje("Examen registrado correctamente.");
        } catch (error) {
            setStrMensaje(error.message || "Ocurrió un error al registrar el examen.");
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
                            {arrAsignaturas.map((a) => (
                                <option key={a.idAsignatura} value={a.idAsignatura}>
                                    {a.nombreAsignatura}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Tipo de Examen <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="idTipoExamen"
                            value={objFormData.idTipoExamen}
                            onChange={handleChange}
                            required
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        >
                            <option value="" disabled>Seleccione el tipo</option>
                            {arrTiposExamen.map((tipo) => (
                                <option key={tipo.idTipoExamen} value={tipo.idTipoExamen}>
                                    {tipo.nombreTipoExamen}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {boolRequiereDescripcion && (
                    <div>
                        <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                            Especifique tipo de examen <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            name="detalleTipoExamen"
                            maxLength={60}
                            value={objFormData.detalleTipoExamen}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Tercer parcial, Examen extraordinario, etc."
                            className="h-[42px] w-full border border-[#2B6CB0] rounded-md text-[13.5px] px-3 bg-[#2B6CB0]/[0.06] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                        <p className="text-[10.5px] text-gray-500 text-right mt-1">
                            {objFormData.detalleTipoExamen.length}/60
                        </p>
                    </div>
                )}

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
                        Horario y ambiente <span className="text-red-600">*</span>
                    </label>

                    {arrHorariosRegulares.length > 0 && (
                        <div className="flex gap-4 mb-2.5">
                            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                <input
                                    type="radio"
                                    checked={strTipoHorario === "REGULAR"}
                                    onChange={() => setStrTipoHorario("REGULAR")}
                                    className="accent-[#163F79]"
                                />
                                Usar mi horario de siempre
                            </label>
                            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                <input
                                    type="radio"
                                    checked={strTipoHorario === "EVENTUAL"}
                                    onChange={() => setStrTipoHorario("EVENTUAL")}
                                    className="accent-[#163F79]"
                                />
                                Es un horario especial para este examen
                            </label>
                        </div>
                    )}

                    {strTipoHorario === "REGULAR" && arrHorariosRegulares.length > 0 && (
                        <select
                            value={idHorarioRegularSeleccionado}
                            onChange={(e) => setIdHorarioRegularSeleccionado(e.target.value)}
                            required
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        >
                            <option value="" disabled>Seleccione un horario</option>
                            {arrHorariosRegulares.map((h) => (
                                <option key={h.idHorarioRegular} value={h.idHorarioRegular}>
                                    {DIAS_SEMANA[h.diaSemana]} · {h.horaInicio.slice(0, 5)} - {h.horaFin.slice(0, 5)}
                                </option>
                            ))}
                        </select>
                    )}

                    {strTipoHorario === "EVENTUAL" && (
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11.5px] text-gray-500 mb-1">Aula</label>
                                <select
                                    name="idAula"
                                    value={objEventual.idAula}
                                    onChange={handleChangeEventual}
                                    required
                                    className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3"
                                >
                                    <option value="" disabled>Seleccione</option>
                                    {arrAulas.map((aula) => (
                                        <option key={aula.idAula} value={aula.idAula}>{aula.nombreAula}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11.5px] text-gray-500 mb-1">Hora inicio</label>
                                <input
                                    type="time"
                                    name="horaInicio"
                                    value={objEventual.horaInicio}
                                    onChange={handleChangeEventual}
                                    required
                                    className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3"
                                />
                            </div>
                            <div>
                                <label className="block text-[11.5px] text-gray-500 mb-1">Hora fin</label>
                                <input
                                    type="time"
                                    name="horaFin"
                                    value={objEventual.horaFin}
                                    onChange={handleChangeEventual}
                                    required
                                    className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3"
                                />
                            </div>
                        </div>
                    )}

                    {arrHorariosRegulares.length === 0 && objFormData.idAsignatura && (
                        <p className="text-[11.5px] text-gray-500 mt-1.5">
                            No tiene un horario regular para esta asignatura, complete un horario eventual.
                        </p>
                    )}
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
                        {arrNormasGeneralesCatalogo.map((norma) => (
                            <label key={norma.idNormaGeneral} className="flex items-start gap-2 text-[13px] text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={arrIdNormasSeleccionadas.includes(norma.idNormaGeneral)}
                                    onChange={() => handleToggleNormaGeneral(norma.idNormaGeneral)}
                                    className="w-4 h-4 mt-0.5 accent-[#163F79]"
                                />
                                {norma.descripcionNorma}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                        Normas particulares
                    </label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={strNuevaNormaEspecifica}
                            onChange={(e) => setStrNuevaNormaEspecifica(e.target.value)}
                            placeholder="Escriba una indicación y presione Agregar"
                            className="h-[38px] flex-1 border border-[#C8D6E8] rounded-md text-[13px] px-3"
                        />
                        <button
                            type="button"
                            onClick={handleAgregarNormaEspecifica}
                            className="h-[38px] px-4 rounded-md border border-[#163F79] text-[#163F79] text-[13px] font-semibold"
                        >
                            Agregar
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {arrNormasEspecificas.map((norma, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between bg-[#F4F7FB] border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[12.5px] text-gray-700"
                            >
                                {norma}
                                <button
                                    type="button"
                                    onClick={() => handleQuitarNormaEspecifica(index)}
                                    className="text-red-500 font-bold text-[13px] ml-2"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
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