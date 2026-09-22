import { useState, useEffect } from "react";
import {
    registrarExamen,
    obtenerAsignaturasPorDocente,
    obtenerHorariosRegulares,
    obtenerAulas,
    obtenerNormasGenerales,
    obtenerTiposExamen,
    obtenerPerfilDocente,
} from "../../services/examenService";
import { obtenerUsuarioActual } from "../../services/authService";


//ExamenForm.jsx
//
// PENDIENTE (mensaje enviado a Neil): el backend hoy solo acepta un
// "idAula" por examen. Este formulario ya manda "idsAula" (lista),
// asumiendo que ExamenRequest/ExamenService se actualizan para
// aceptar varios ambientes por examen, tal como se le pidio.


const DIAS_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
};

// JS: 0=Domingo..6=Sabado. Nuestro esquema: 1=Lunes..7=Domingo.
function diaSemanaDeFecha(strFechaYYYYMMDD) {
    if (!strFechaYYYYMMDD) return null;
    const d = new Date(`${strFechaYYYYMMDD}T00:00:00`);
    const js = d.getDay();
    return js === 0 ? 7 : js;
}

// Devuelve la proxima fecha (yyyy-mm-dd) cuyo dia de semana coincide
// con diaSemanaObjetivo (1=Lunes..7=Domingo), empezando desde hoy.
function proximaFechaParaDia(diaSemanaObjetivo) {
    const hoy = new Date();
    const diaHoy = hoy.getDay() === 0 ? 7 : hoy.getDay();
    let delta = diaSemanaObjetivo - diaHoy;
    if (delta < 0) delta += 7;
    const resultado = new Date(hoy);
    resultado.setDate(hoy.getDate() + delta);
    const yyyy = resultado.getFullYear();
    const mm = String(resultado.getMonth() + 1).padStart(2, "0");
    const dd = String(resultado.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

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

export default function ExamenForm({ onCancelar }) {
    const objUsuario = obtenerUsuarioActual();

    // Código SIS real del docente, obtenido desde /api/docente/perfil
    const [intCodsisDocente, setIntCodsisDocente] = useState(null);

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
        horaInicio: "",
        horaFin: "",
    });

    // Ambientes: ahora es una lista, valida en REGULAR y EVENTUAL.
    // En REGULAR se precarga con el aula del horario elegido, pero se
    // puede quitar/agregar igual que en EVENTUAL.
    const [arrIdAulasSeleccionadas, setArrIdAulasSeleccionadas] = useState([]);
    const [strBusquedaAula, setStrBusquedaAula] = useState("");
    const [boolSugerenciasAulaVisibles, setBoolSugerenciasAulaVisibles] = useState(false);

    const [arrAulas, setArrAulas] = useState([]);
    const [arrNormasGeneralesCatalogo, setArrNormasGeneralesCatalogo] = useState([]);
    const [arrIdNormasSeleccionadas, setArrIdNormasSeleccionadas] = useState([]);
    const [arrNormasEspecificas, setArrNormasEspecificas] = useState([]);
    const [strNuevaNormaEspecifica, setStrNuevaNormaEspecifica] = useState("");

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");

    // Código SIS del docente logueado
    useEffect(() => {
        obtenerPerfilDocente()
            .then((perfil) => setIntCodsisDocente(perfil.codigoSis))
            .catch(() => setIntCodsisDocente(null));
    }, []);

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

    // Asignaturas del docente (depende del código SIS real)
    useEffect(() => {
        if (!objUsuario || !intCodsisDocente) return;
        obtenerAsignaturasPorDocente(objUsuario.idUsuario, intCodsisDocente)
            .then(setArrAsignaturas)
            .catch(() => setArrAsignaturas([]));
    }, [intCodsisDocente]);

    // Horarios regulares al cambiar la asignatura
    useEffect(() => {
        if (!objFormData.idAsignatura || !objUsuario || !intCodsisDocente) {
            setArrHorariosRegulares([]);
            return;
        }

        obtenerHorariosRegulares(objUsuario.idUsuario, intCodsisDocente, objFormData.idAsignatura)
            .then((horarios) => {
                setArrHorariosRegulares(horarios);
                setStrTipoHorario(horarios.length > 0 ? "REGULAR" : "EVENTUAL");
            })
            .catch(() => setArrHorariosRegulares([]));
    }, [objFormData.idAsignatura, intCodsisDocente]);

    // Al elegir un horario regular: precarga su aula y sugiere la fecha
    useEffect(() => {
        if (strTipoHorario !== "REGULAR" || !idHorarioRegularSeleccionado) return;

        const horario = arrHorariosRegulares.find(
            (h) => String(h.idHorarioRegular) === String(idHorarioRegularSeleccionado)
        );
        if (!horario) return;

        setArrIdAulasSeleccionadas([horario.idAula]);
        setObjFormData((prev) => ({
            ...prev,
            fecha: proximaFechaParaDia(horario.diaSemana),
        }));
    }, [idHorarioRegularSeleccionado, strTipoHorario]);

    // Al cambiar a EVENTUAL, no se precarga ningun aula
    useEffect(() => {
        if (strTipoHorario === "EVENTUAL") {
            setArrIdAulasSeleccionadas([]);
        }
    }, [strTipoHorario]);

    const objTipoExamenSeleccionado = arrTiposExamen.find(
        (t) => String(t.idTipoExamen) === String(objFormData.idTipoExamen)
    );
    const boolRequiereDescripcion = objTipoExamenSeleccionado?.requiereDescripcion === true;

    const arrAulasFiltradas = arrAulas.filter(
        (aula) =>
            !arrIdAulasSeleccionadas.includes(aula.idAula) &&
            aula.nombreAula.toLowerCase().includes(strBusquedaAula.toLowerCase())
    );

    // Aviso si la fecha elegida no coincide con el dia del horario regular
    const objHorarioSeleccionado = arrHorariosRegulares.find(
        (h) => String(h.idHorarioRegular) === String(idHorarioRegularSeleccionado)
    );
    const boolFechaNoCoincide =
        strTipoHorario === "REGULAR" &&
        objHorarioSeleccionado &&
        objFormData.fecha &&
        diaSemanaDeFecha(objFormData.fecha) !== objHorarioSeleccionado.diaSemana;

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleChangeEventual(e) {
        const { name, value } = e.target;
        setObjEventual((prev) => ({ ...prev, [name]: value }));
    }

    function handleAgregarAula(aula) {
        setArrIdAulasSeleccionadas((prev) =>
            prev.includes(aula.idAula) ? prev : [...prev, aula.idAula]
        );
        setStrBusquedaAula("");
        setBoolSugerenciasAulaVisibles(false);
    }

    function handleQuitarAula(idAula) {
        setArrIdAulasSeleccionadas((prev) => prev.filter((id) => id !== idAula));
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

        if (!intCodsisDocente) {
            setStrMensaje("No se pudo obtener el código SIS del docente. Intente recargar la página.");
            return;
        }
        if (strTipoHorario === "REGULAR" && !idHorarioRegularSeleccionado) {
            setStrMensaje("Debe seleccionar un horario regular.");
            return;
        }
        if (strTipoHorario === "EVENTUAL" && (!objEventual.horaInicio || !objEventual.horaFin)) {
            setStrMensaje("Complete hora de inicio y hora de fin.");
            return;
        }
        if (arrIdAulasSeleccionadas.length === 0) {
            setStrMensaje("Debe seleccionar al menos un ambiente.");
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
            idsAula: arrIdAulasSeleccionadas.map((id) => parseInt(id, 10)),
            idsNormasGenerales: arrIdNormasSeleccionadas,
            normasEspecificas: arrNormasEspecificas,
        };

        if (boolRequiereDescripcion) {
            objBody.detalleTipoExamen = objFormData.detalleTipoExamen;
        }

        if (strTipoHorario === "REGULAR") {
            objBody.idHorarioRegular = parseInt(idHorarioRegularSeleccionado, 10);
        } else {
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
                    {boolFechaNoCoincide && (
                        <p className="text-[11px] text-amber-600 mt-1">
                            La fecha elegida no cae en {DIAS_SEMANA[objHorarioSeleccionado.diaSemana]}, que es el día de ese horario regular.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                        Horario <span className="text-red-600">*</span>
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
                        <div className="grid grid-cols-2 gap-3">
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

                <div className="relative">
                    <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                        Ambiente(s) <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                        <input
                            type="text"
                            placeholder="Buscar ambiente..."
                            value={strBusquedaAula}
                            onChange={(e) => setStrBusquedaAula(e.target.value)}
                            onFocus={() => setBoolSugerenciasAulaVisibles(true)}
                            onBlur={() => setTimeout(() => setBoolSugerenciasAulaVisibles(false), 150)}
                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] pl-9 pr-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                        />
                        {boolSugerenciasAulaVisibles && arrAulasFiltradas.length > 0 && (
                            <div className="absolute left-0 right-0 top-[44px] bg-white border border-[#C8D6E8] rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                {arrAulasFiltradas.map((aula) => (
                                    <div
                                        key={aula.idAula}
                                        onMouseDown={() => handleAgregarAula(aula)}
                                        className="px-3 py-2 text-[13px] cursor-pointer hover:bg-[#EBF3FA]"
                                    >
                                        {aula.nombreAula}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {arrIdAulasSeleccionadas.map((idAula) => {
                            const aula = arrAulas.find((a) => a.idAula === idAula);
                            if (!aula) return null;
                            return (
                                <span
                                    key={idAula}
                                    className="inline-flex items-center gap-1.5 bg-[#EBF3FA] text-[#163F79] border border-[#D3E2F5] px-2.5 py-1 rounded-full text-[12px] font-semibold"
                                >
                                    {aula.nombreAula}
                                    <button
                                        type="button"
                                        onClick={() => handleQuitarAula(idAula)}
                                        className="text-[#2B6CB0] font-bold leading-none"
                                    >
                                        &times;
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                    <p className="text-[11.5px] text-gray-500 mt-2">
                        Puede quitar el ambiente sugerido y agregar otro, o sumar más de uno si el examen lo requiere.
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
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="h-[42px] px-5 rounded-md border border-[#C8D6E8] text-[#163F79] font-semibold text-[13.5px]"
                    >
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