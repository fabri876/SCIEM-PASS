import { useState, useEffect } from "react";
import {
    registrarExamen,
    obtenerAsignaturasPorDocente,
    obtenerHorariosRegulares,
    obtenerAulas,
    obtenerNormasGenerales,
    obtenerTiposExamen,
} from "../../../services/examenService";
import {
    obtenerDocentesAdmin,
    actualizarExamen,
    obtenerTiposUsados,
} from "../../../services/adminNormasService";


const DIAS_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
};

// Horario académico de la facultad: primer horario 6:45, último termina 21:45.
// Solo aplica a EVENTUAL — el REGULAR ya viene validado por el horario fijo del docente.
const HORA_ACADEMICA_INICIO = "06:45";
const HORA_ACADEMICA_FIN = "21:45";

function diaSemanaDeFecha(strFechaYYYYMMDD) {
    if (!strFechaYYYYMMDD) return null;
    const d = new Date(`${strFechaYYYYMMDD}T00:00:00`);
    const js = d.getDay();
    return js === 0 ? 7 : js;
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

function IconoDocente() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="8" r="3.5" />
            <path strokeLinecap="round" d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
        </svg>
    );
}

export default function ExamenFormAdmin({
    onCancelar,
    objExamenAEditar,
    arrAmbientesExamenAEditar,
    arrNormasParticularesExamenAEditar,
}) {
    const boolEditando = !!objExamenAEditar;

    const [arrDocentes, setArrDocentes] = useState([]);
    const [idUsuarioDocente, setIdUsuarioDocente] = useState("");


    const objDocenteSeleccionado = arrDocentes.find(
        (d) => String(d.idUsuario) === String(idUsuarioDocente)
    );
    const intCodsisDocente = objDocenteSeleccionado?.codsisDocente ?? null;

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

    const [arrIdAulasSeleccionadas, setArrIdAulasSeleccionadas] = useState([]);
    const [strBusquedaAula, setStrBusquedaAula] = useState("");
    const [boolSugerenciasAulaVisibles, setBoolSugerenciasAulaVisibles] = useState(false);

    const [arrIdTiposUsados, setArrIdTiposUsados] = useState([]);

    const [arrAulas, setArrAulas] = useState([]);
    const [arrNormasGeneralesCatalogo, setArrNormasGeneralesCatalogo] = useState([]);
    const [arrIdNormasSeleccionadas, setArrIdNormasSeleccionadas] = useState([]);
    const [arrNormasEspecificas, setArrNormasEspecificas] = useState([]);
    const [strNuevaNormaEspecifica, setStrNuevaNormaEspecifica] = useState("");

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");
    const [strTipoMensaje, setStrTipoMensaje] = useState("error"); // "error" | "exito"


    const [boolPrefillDatosHecho, setBoolPrefillDatosHecho] = useState(false);
    const [boolPrefillAmbienteHecho, setBoolPrefillAmbienteHecho] = useState(false);

    // El mensaje de arriba (error o éxito) no debe quedarse pegado cuando el
    // admin sigue editando el formulario después de verlo.
    useEffect(() => {
        setStrMensaje("");
    }, [
        idUsuarioDocente,
        objFormData,
        strTipoHorario,
        idHorarioRegularSeleccionado,
        arrIdAulasSeleccionadas,
        objEventual,
        arrIdNormasSeleccionadas,
        arrNormasEspecificas,
    ]);


    useEffect(() => {
        obtenerDocentesAdmin()
            .then(setArrDocentes)
            .catch(() => setArrDocentes([]));
    }, []);

    useEffect(() => {
        if (!boolEditando || boolPrefillDatosHecho || arrDocentes.length === 0) return;

        setIdUsuarioDocente(String(objExamenAEditar.idUsuario));
        setObjFormData({
            idAsignatura: String(objExamenAEditar.idAsignatura),
            idTipoExamen: String(objExamenAEditar.idTipoExamen),
            detalleTipoExamen: objExamenAEditar.detalleTipoExamen || "",
            fecha: (objExamenAEditar.fechaExamen || "").slice(0, 10),
        });
        setArrNormasEspecificas(
            (arrNormasParticularesExamenAEditar || []).map((n) => n.descripcionNorma)
        );
        setBoolPrefillDatosHecho(true);
    }, [boolEditando, boolPrefillDatosHecho, arrDocentes, objExamenAEditar, arrNormasParticularesExamenAEditar]);


    useEffect(() => {
        if (!boolEditando || boolPrefillAmbienteHecho || !boolPrefillDatosHecho) return;
        if (!Array.isArray(arrAmbientesExamenAEditar)) return; // todavía "cargando" o "error"

        const arrAmbientes = arrAmbientesExamenAEditar;
        const principal = arrAmbientes[0];
        const strTipoDelExamen = principal?.tipoHorario || "EVENTUAL";

        if (strTipoDelExamen === "REGULAR") {
            if (arrHorariosRegulares.length === 0) return; // esperar a que carguen

            setStrTipoHorario("REGULAR");
            const intDiaExamen = diaSemanaDeFecha(objExamenAEditar.fechaExamen?.slice(0, 10));
            const horarioEncontrado = arrHorariosRegulares.find(
                (h) =>
                    h.idAula === principal?.idAula &&
                    h.horaInicio === principal?.horaInicio &&
                    h.horaFin === principal?.horaFin &&
                    h.diaSemana === intDiaExamen
            );
            if (horarioEncontrado) {
                setIdHorarioRegularSeleccionado(String(horarioEncontrado.idHorarioRegular));
            }
            setArrIdAulasSeleccionadas(arrAmbientes.slice(1).map((a) => a.idAula));
        } else {
            setStrTipoHorario("EVENTUAL");
            setArrIdAulasSeleccionadas(arrAmbientes.map((a) => a.idAula));
            setObjEventual({
                horaInicio: (principal?.horaInicio || "").slice(0, 5),
                horaFin: (principal?.horaFin || "").slice(0, 5),
            });
        }
        setBoolPrefillAmbienteHecho(true);
    }, [
        boolEditando,
        boolPrefillDatosHecho,
        boolPrefillAmbienteHecho,
        arrAmbientesExamenAEditar,
        arrHorariosRegulares,
        objExamenAEditar,
    ]);

    // Catálogos que no dependen del docente ni del código SIS
    useEffect(() => {
        obtenerAulas().then(setArrAulas).catch(() => setArrAulas([]));

        obtenerNormasGenerales()
            .then(setArrNormasGeneralesCatalogo)
            .catch(() => setArrNormasGeneralesCatalogo([]));

        obtenerTiposExamen()
            .then(setArrTiposExamen)
            .catch(() => setArrTiposExamen([]));
    }, []);

    // Asignaturas del docente seleccionado (BLOQUEADO por el código SIS)
    useEffect(() => {
        if (!idUsuarioDocente) {
            setArrAsignaturas([]);
            setObjFormData((prev) => ({ ...prev, idAsignatura: "" }));
            return;
        }

        obtenerAsignaturasPorDocente(idUsuarioDocente, intCodsisDocente)
            .then(setArrAsignaturas)
            .catch(() => setArrAsignaturas([]));
    }, [idUsuarioDocente]);

    // Horarios regulares al cambiar la asignatura
    useEffect(() => {
        if (!objFormData.idAsignatura || !idUsuarioDocente) {
            setArrHorariosRegulares([]);
            return;
        }

        obtenerHorariosRegulares(idUsuarioDocente, intCodsisDocente, objFormData.idAsignatura)
            .then((horarios) => {
                setArrHorariosRegulares(horarios);

                if (!boolEditando) {
                    setStrTipoHorario(horarios.length > 0 ? "REGULAR" : "EVENTUAL");
                }
            })
            .catch(() => setArrHorariosRegulares([]));
    }, [objFormData.idAsignatura]);

    // Tipos de examen ya usados por este docente en esta asignatura (para
    // deshabilitarlos en el selector, sin dejar repetir el mismo tipo).
    useEffect(() => {
        if (!objFormData.idAsignatura || !intCodsisDocente) {
            setArrIdTiposUsados([]);
            return;
        }
        obtenerTiposUsados(objFormData.idAsignatura, intCodsisDocente)
            .then((tipos) => setArrIdTiposUsados(tipos || []))
            .catch(() => setArrIdTiposUsados([]));
    }, [objFormData.idAsignatura, intCodsisDocente]);

    const objTipoExamenSeleccionado = arrTiposExamen.find(
        (t) => String(t.idTipoExamen) === String(objFormData.idTipoExamen)
    );
    const boolRequiereDescripcion = objTipoExamenSeleccionado?.requiereDescripcion === true;

    // Aviso/bloqueo si la fecha elegida no coincide con el dia del horario regular
    const objHorarioSeleccionado = arrHorariosRegulares.find(
        (h) => String(h.idHorarioRegular) === String(idHorarioRegularSeleccionado)
    );
    const boolFechaNoCoincide =
        strTipoHorario === "REGULAR" &&
        objHorarioSeleccionado &&
        objFormData.fecha &&
        diaSemanaDeFecha(objFormData.fecha) !== objHorarioSeleccionado.diaSemana;

    // En REGULAR, excluye también el aula principal del horario elegido
    // (para no dejar que la agreguen otra vez como "adicional" -> error 400).
    const arrAulasFiltradas = arrAulas.filter(
        (aula) =>
            !arrIdAulasSeleccionadas.includes(aula.idAula) &&
            !(strTipoHorario === "REGULAR" && objHorarioSeleccionado && aula.idAula === objHorarioSeleccionado.idAula) &&
            aula.nombreAula.toLowerCase().includes(strBusquedaAula.toLowerCase())
    );

    function handleChangeDocente(e) {

        setIdUsuarioDocente(e.target.value);
        setObjFormData((prev) => ({ ...prev, idAsignatura: "", idTipoExamen: "", detalleTipoExamen: "" }));
        setArrHorariosRegulares([]);
        setStrTipoHorario("REGULAR");
        setIdHorarioRegularSeleccionado("");
        setArrIdAulasSeleccionadas([]);
        setObjEventual({ horaInicio: "", horaFin: "" });
    }

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
        setStrTipoMensaje("error");

        if (!idUsuarioDocente) {
            setStrMensaje("Debe seleccionar para qué docente es el examen.");
            return;
        }
        if (strTipoHorario === "REGULAR" && !idHorarioRegularSeleccionado) {
            setStrMensaje("Debe seleccionar un horario regular.");
            return;
        }
        if (
            strTipoHorario === "EVENTUAL" &&
            (arrIdAulasSeleccionadas.length === 0 || !objEventual.horaInicio || !objEventual.horaFin)
        ) {
            setStrMensaje("Complete aula, hora de inicio y hora de fin.");
            return;
        }
        if (
            strTipoHorario === "EVENTUAL" &&
            (objEventual.horaInicio < HORA_ACADEMICA_INICIO ||
                objEventual.horaInicio > HORA_ACADEMICA_FIN ||
                objEventual.horaFin < HORA_ACADEMICA_INICIO ||
                objEventual.horaFin > HORA_ACADEMICA_FIN)
        ) {
            setStrMensaje(
                `El horario debe estar dentro del horario académico (${HORA_ACADEMICA_INICIO} - ${HORA_ACADEMICA_FIN}).`
            );
            return;
        }
        if (boolFechaNoCoincide) {
            setStrMensaje(
                `La fecha no corresponde a ${DIAS_SEMANA[objHorarioSeleccionado.diaSemana]}, el día de ese horario regular. Ajuste la fecha o el horario para continuar.`
            );
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
            idUsuario: parseInt(idUsuarioDocente, 10),
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

            if (arrIdAulasSeleccionadas.length > 0) {
                objBody.idsAulasAdicionales = arrIdAulasSeleccionadas.map((id) => parseInt(id, 10));
            }
        } else {
            // En EVENTUAL, la primera aula elegida es la principal (idAula);
            // el resto son adicionales.
            objBody.idAula = parseInt(arrIdAulasSeleccionadas[0], 10);
            if (arrIdAulasSeleccionadas.length > 1) {
                objBody.idsAulasAdicionales = arrIdAulasSeleccionadas
                    .slice(1)
                    .map((id) => parseInt(id, 10));
            }
            objBody.horaInicio = `${objEventual.horaInicio}:00`;
            objBody.horaFin = `${objEventual.horaFin}:00`;
        }

        try {
            if (boolEditando) {
                await actualizarExamen(objExamenAEditar.idExamen, objBody);
                setStrTipoMensaje("exito");
                setStrMensaje("Examen actualizado correctamente.");
            } else {
                await registrarExamen(objBody);
                setStrTipoMensaje("exito");
                setStrMensaje("Examen registrado correctamente.");
            }
        } catch (error) {
            setStrTipoMensaje("error");
            setStrMensaje(
                error.message ||
                `Ocurrió un error al ${boolEditando ? "actualizar" : "registrar"} el examen.`
            );
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
                    <h2 className="text-[19px] font-bold text-[#163F79]">
                        {boolEditando ? "Editar examen" : "Registrar examen"}
                    </h2>
                    <p className="text-[12.5px] text-gray-500">
                        {boolEditando
                            ? "Modifique los datos y guarde los cambios"
                            : "Complete el formulario para programar la evaluación académica"}
                    </p>
                </div>
            </div>

            <div className="bg-[#EBF3FA] px-6 py-2.5 mt-4 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
                <IconoDocente />
                Docente
            </div>

            <div className="p-6 pb-2">
                <label className="block text-[12.5px] font-semibold text-[#163F79] mb-1.5">
                    ¿Para qué docente es este examen? <span className="text-red-600">*</span>
                </label>
                <select
                    value={idUsuarioDocente}
                    onChange={handleChangeDocente}
                    required
                    className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3 focus:border-[#2B6CB0] focus:ring-3 focus:ring-[#2B6CB0]/15"
                >
                    <option value="" disabled>Seleccione un docente</option>
                    {arrDocentes.map((docente) => (
                        <option key={docente.idUsuario} value={docente.idUsuario}>
                            {docente.nombre} {docente.apellido}
                        </option>
                    ))}
                </select>
                {!idUsuarioDocente && (
                    <p className="text-[11.5px] text-gray-500 mt-1.5">
                        Seleccione un docente para habilitar el resto del formulario.
                    </p>
                )}
            </div>

            <fieldset disabled={!idUsuarioDocente} className="disabled:opacity-40">
                <div className="bg-[#EBF3FA] px-6 py-2.5 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
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
                                {arrTiposExamen.map((tipo) => {

                                    const boolYaUsado =
                                        !tipo.requiereDescripcion &&
                                        arrIdTiposUsados.map(String).includes(String(tipo.idTipoExamen)) &&
                                        !(boolEditando && String(objExamenAEditar.idTipoExamen) === String(tipo.idTipoExamen));
                                    return (
                                        <option key={tipo.idTipoExamen} value={tipo.idTipoExamen} disabled={boolYaUsado}>
                                            {tipo.nombreTipoExamen}
                                            {boolYaUsado ? " (ya registrado)" : ""}
                                        </option>
                                    );
                                })}
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
                            Horario y ambiente <span className="text-red-600">*</span>
                        </label>

                        {arrHorariosRegulares.length > 0 && (
                            <div className="flex gap-4 mb-2.5">
                                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={strTipoHorario === "REGULAR"}
                                        onChange={() => {
                                            setStrTipoHorario("REGULAR");
                                            setArrIdAulasSeleccionadas([]);
                                        }}
                                        className="accent-[#163F79]"
                                    />
                                    Horario regular
                                </label>
                                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={strTipoHorario === "EVENTUAL"}
                                        onChange={() => {
                                            setStrTipoHorario("EVENTUAL");
                                            setArrIdAulasSeleccionadas([]);
                                        }}
                                        className="accent-[#163F79]"
                                    />
                                    Horario eventual
                                </label>
                            </div>
                        )}

                        {strTipoHorario === "REGULAR" && arrHorariosRegulares.length > 0 && (
                            <select
                                value={idHorarioRegularSeleccionado}
                                onChange={(e) => {
                                    setIdHorarioRegularSeleccionado(e.target.value);
                                    setObjFormData((prev) => ({ ...prev, fecha: "" }));
                                    setArrIdAulasSeleccionadas([]);
                                }}
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

                        {strTipoHorario === "REGULAR" && idHorarioRegularSeleccionado && (
                            <div className="relative mt-3">
                                <label className="block text-[11.5px] text-gray-500 mb-1">
                                    Ambiente(s)
                                </label>
                                {objHorarioSeleccionado && (
                                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                                        <span className="inline-flex items-center gap-1.5 bg-[#F4F6FA] text-[#5E6B8A] border border-[#E2E8F0] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                                            {arrAulas.find((a) => a.idAula === objHorarioSeleccionado.idAula)?.nombreAula || "Aula del horario"}
                                        </span>
                                    </div>
                                )}
                                <label className="block text-[11.5px] text-gray-500 mb-1">
                                    Agregar aula(s) adicional(es) <span className="text-gray-400">(opcional)</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar aula adicional..."
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
                            </div>
                        )}

                        {strTipoHorario === "EVENTUAL" && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <label className="block text-[11.5px] text-gray-500 mb-1">Aula(s)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar aula..."
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
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11.5px] text-gray-500 mb-1">Hora inicio</label>
                                        <input
                                            type="time"
                                            name="horaInicio"
                                            value={objEventual.horaInicio}
                                            onChange={handleChangeEventual}
                                            required
                                            min={HORA_ACADEMICA_INICIO}
                                            max={HORA_ACADEMICA_FIN}
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
                                            min={HORA_ACADEMICA_INICIO}
                                            max={HORA_ACADEMICA_FIN}
                                            className="h-[42px] w-full border border-[#C8D6E8] rounded-md text-[13.5px] px-3"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-500 col-span-2">
                                        Dentro del horario académico ({HORA_ACADEMICA_INICIO} - {HORA_ACADEMICA_FIN}).
                                    </p>
                                </div>
                            </div>
                        )}

                        {arrHorariosRegulares.length === 0 && objFormData.idAsignatura && (
                            <p className="text-[11.5px] text-gray-500 mt-1.5">
                                Este docente no tiene un horario regular para esta asignatura, complete un horario eventual.
                            </p>
                        )}
                    </div>

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
                            className={`h-[42px] w-full border rounded-md text-[13.5px] px-3 focus:ring-3 ${boolFechaNoCoincide
                                ? "border-red-400 focus:border-red-500 focus:ring-red-400/15"
                                : "border-[#C8D6E8] focus:border-[#2B6CB0] focus:ring-[#2B6CB0]/15"
                                }`}
                        />
                        {boolFechaNoCoincide && (
                            <p className="text-[11px] text-red-600 mt-1">
                                La fecha no corresponde a {DIAS_SEMANA[objHorarioSeleccionado.diaSemana]}, el día de ese horario regular.
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
                        {boolEditando && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2.5">
                                El backend todavía no informa qué normas generales tenía marcadas este examen, así que no se pudieron precargar. Vuelva a marcar las que correspondan antes de guardar — de lo contrario, se quitarán del examen.
                            </p>
                        )}
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
            </fieldset>

            {strMensaje && (
                <p
                    className={`px-6 text-[12.5px] font-semibold ${strTipoMensaje === "error" ? "text-red-600" : "text-[#1C8A4C]"
                        }`}
                >
                    {strMensaje}
                </p>
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
                        disabled={boolEnviando || !idUsuarioDocente}
                        className="h-[42px] px-5 rounded-md bg-[#163F79] text-white font-semibold text-[13.5px] disabled:opacity-60"
                    >
                        {boolEnviando
                            ? boolEditando
                                ? "Guardando..."
                                : "Registrando..."
                            : boolEditando
                                ? "Guardar cambios"
                                : "Registrar examen"}
                    </button>
                </div>
            </div>
        </form>
    );
}