import { useState, useEffect, useRef } from "react";
import {
    registrarExamen,
    obtenerAsignaturasPorDocente,
    obtenerHorariosRegulares,
    obtenerAulas,
    obtenerNormasGenerales,
    obtenerTiposExamen,
} from "../../services/examenService";
import { obtenerUsuarioActual } from "../../services/authService";
import { obtenerTiposUsadosPorGrupo } from "../../services/grupoExamenService";
import { useGruposDocente, useAulasOcupadas, textoGrupo } from "./useGrupoYAulas";


//ExamenForm.jsx


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

// Una opción del buscador de aulas: las ocupadas en ese horario salen en gris y no se pueden elegir
function OpcionAula({ aula, boolOcupada, onElegir }) {
    if (boolOcupada) {
        return (
            <div className="px-3 py-2 text-[13px] flex items-center justify-between gap-2 bg-[#F8FAFC] text-gray-400 cursor-not-allowed">
                {aula.nombreAula}
                <span className="text-[11px] font-bold bg-[#F1F5F9] text-[#64748B] rounded-full px-2 py-0.5 whitespace-nowrap">
                    No disponible en este horario
                </span>
            </div>
        );
    }
    return (
        <div
            onMouseDown={() => onElegir(aula)}
            className="px-3 py-2 text-[13px] flex items-center justify-between gap-2 cursor-pointer hover:bg-[#EFF6FF]"
        >
            {aula.nombreAula}
        </div>
    );
}

export default function ExamenForm({ onCancelar, onRegistrado }) {
    const objUsuario = obtenerUsuarioActual();
    // Si el padre pasa onRegistrado, se llama poco después de guardar (deja ver el mensaje de éxito).
    const refTemporizadorRegistrado = useRef(null);
    useEffect(() => () => clearTimeout(refTemporizadorRegistrado.current), []);

    const intCodsisDocente = objUsuario?.codsisDocente ?? null;

    const [objFormData, setObjFormData] = useState({
        idAsignatura: "",
        idTipoExamen: "",
        detalleTipoExamen: "",
        fecha: "",
    });

    const [arrAsignaturas, setArrAsignaturas] = useState([]);
    const [arrTiposExamen, setArrTiposExamen] = useState([]);
    const [arrIdTiposUsados, setArrIdTiposUsados] = useState([]);
    // Todos los horarios regulares del docente en la asignatura; abajo se filtran por grupo
    const [arrHorariosTodos, setArrHorariosRegulares] = useState([]);
    const [strTipoHorario, setStrTipoHorario] = useState("REGULAR");
    const [idHorarioRegularSeleccionado, setIdHorarioRegularSeleccionado] = useState("");

    const [objEventual, setObjEventual] = useState({
        horaInicio: "",
        horaFin: "",
    });


    const [arrIdAulasSeleccionadas, setArrIdAulasSeleccionadas] = useState([]);
    const [strBusquedaAula, setStrBusquedaAula] = useState("");
    const [boolSugerenciasAulaVisibles, setBoolSugerenciasAulaVisibles] = useState(false);


    const [idAulaSeleccionadaRegular, setIdAulaSeleccionadaRegular] = useState(null);
    const [boolCambiandoAulaRegular, setBoolCambiandoAulaRegular] = useState(false);
    const [strBusquedaAulaPrincipal, setStrBusquedaAulaPrincipal] = useState("");
    const [boolSugerenciasAulaPrincipalVisibles, setBoolSugerenciasAulaPrincipalVisibles] = useState(false);

    const [arrAulas, setArrAulas] = useState([]);
    const [arrNormasGeneralesCatalogo, setArrNormasGeneralesCatalogo] = useState([]);
    const [arrIdNormasSeleccionadas, setArrIdNormasSeleccionadas] = useState([]);
    const [arrNormasEspecificas, setArrNormasEspecificas] = useState([]);
    const [strNuevaNormaEspecifica, setStrNuevaNormaEspecifica] = useState("");
    const [intIndexNormaEnEdicion, setIntIndexNormaEnEdicion] = useState(null);

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");

    // Grupo del examen: solo los grupos que el docente dicta en la asignatura (si es uno, se elige solo)
    const { arrGrupos, boolCargandoGrupos, idGrupo, setIdGrupo } = useGruposDocente(
        objFormData.idAsignatura,
        objUsuario?.idUsuario
    );
    const boolPideGrupo = arrGrupos.length > 0;
    // Cuando el backend mande el grupo de cada horario (idGrupo), solo se muestran los del grupo elegido
    const arrHorariosRegulares = arrHorariosTodos.filter(
        (h) => h.idGrupo == null || !idGrupo || String(h.idGrupo) === String(idGrupo)
    );
    const [strTipoMensaje, setStrTipoMensaje] = useState("error"); // "error" | "exito"

    // El mensaje de arriba (error o éxito) no debe quedarse pegado cuando el
    // usuario sigue editando el formulario después de verlo.
    useEffect(() => {
        setStrMensaje("");
    }, [
        objFormData,
        idGrupo,
        strTipoHorario,
        idHorarioRegularSeleccionado,
        arrIdAulasSeleccionadas,
        objEventual,
        arrIdNormasSeleccionadas,
        arrNormasEspecificas,
    ]);

    // Los mensajes de error/éxito también desaparecen solos después de un
    // rato, sin que el usuario tenga que tocar el formulario.
    useEffect(() => {
        if (!strMensaje) return;
        const idTimer = setTimeout(() => setStrMensaje(""), 6000);
        return () => clearTimeout(idTimer);
    }, [strMensaje]);

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

    // Tipos de examen ya registrados en este grupo (cada grupo tiene los suyos).
    // Mientras el backend no filtre por grupo, cuenta como antes (asignatura y docente).
    useEffect(() => {
        if (!objFormData.idAsignatura || !intCodsisDocente) {
            setArrIdTiposUsados([]);
            return;
        }
        obtenerTiposUsadosPorGrupo(objFormData.idAsignatura, intCodsisDocente, idGrupo)
            .then((tipos) => setArrIdTiposUsados(tipos || []))
            .catch(() => setArrIdTiposUsados([]));
    }, [objFormData.idAsignatura, intCodsisDocente, idGrupo]);

    // Al elegir un horario regular: precarga su aula (la fecha queda vacía, sin sugerencia)
    useEffect(() => {
        if (strTipoHorario !== "REGULAR" || !idHorarioRegularSeleccionado) return;

        // La aula del horario ya no se mete acá — se muestra aparte como tag.
        // Este array queda solo para aulas adicionales de verdad.
        setArrIdAulasSeleccionadas([]);
        setIdAulaSeleccionadaRegular(null);
        setObjFormData((prev) => ({ ...prev, fecha: "" }));
    }, [idHorarioRegularSeleccionado, strTipoHorario]);

    // Al cambiar a EVENTUAL, no se precarga ningun aula
    useEffect(() => {
        if (strTipoHorario === "EVENTUAL") {
            setArrIdAulasSeleccionadas([]);
            setIdAulaSeleccionadaRegular(null);
        }
    }, [strTipoHorario]);

    const objTipoExamenSeleccionado = arrTiposExamen.find(
        (t) => String(t.idTipoExamen) === String(objFormData.idTipoExamen)
    );
    const boolRequiereDescripcion = objTipoExamenSeleccionado?.requiereDescripcion === true;

    // Aviso si la fecha elegida no coincide con el dia del horario regular
    const objHorarioSeleccionado = arrHorariosRegulares.find(
        (h) => String(h.idHorarioRegular) === String(idHorarioRegularSeleccionado)
    );
    const boolFechaNoCoincide =
        strTipoHorario === "REGULAR" &&
        objHorarioSeleccionado &&
        objFormData.fecha &&
        diaSemanaDeFecha(objFormData.fecha) !== objHorarioSeleccionado.diaSemana;

    // Aulas con otro examen que se cruza en esa fecha y horario (se muestran en gris)
    const mapAulasOcupadas = useAulasOcupadas({
        fecha: objFormData.fecha,
        horaInicio: strTipoHorario === "REGULAR" ? objHorarioSeleccionado?.horaInicio : objEventual.horaInicio,
        horaFin: strTipoHorario === "REGULAR" ? objHorarioSeleccionado?.horaFin : objEventual.horaFin,
    });

    // Aula principal real para REGULAR: la del horario por defecto, salvo que
    // se haya elegido un reemplazo (idAulaSeleccionadaRegular).
    const intIdAulaPrincipalRegular = idAulaSeleccionadaRegular
        ? parseInt(idAulaSeleccionadaRegular, 10)
        : objHorarioSeleccionado?.idAula;
    const strNombreAulaPrincipalRegular = arrAulas.find(
        (a) => a.idAula === intIdAulaPrincipalRegular
    )?.nombreAula;

    // En REGULAR, excluye también el aula principal actual (por defecto o
    // reemplazada) de las sugerencias de aula adicional.
    const arrAulasFiltradas = arrAulas.filter(
        (aula) =>
            !arrIdAulasSeleccionadas.includes(aula.idAula) &&
            !(strTipoHorario === "REGULAR" && aula.idAula === intIdAulaPrincipalRegular) &&
            aula.nombreAula.toLowerCase().includes(strBusquedaAula.toLowerCase())
    );

    // Sugerencias para el buscador de reemplazo del aula principal (excluye
    // la actual y las ya elegidas como adicionales).
    const arrAulasFiltradasPrincipal = arrAulas.filter(
        (aula) =>
            aula.idAula !== intIdAulaPrincipalRegular &&
            !arrIdAulasSeleccionadas.includes(aula.idAula) &&
            aula.nombreAula.toLowerCase().includes(strBusquedaAulaPrincipal.toLowerCase())
    );

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleChangeGrupo(e) {
        // Otro grupo: el tipo y el horario elegidos ya no tienen por qué corresponder
        setIdGrupo(e.target.value);
        setObjFormData((prev) => ({ ...prev, idTipoExamen: "", detalleTipoExamen: "", fecha: "" }));
        setIdHorarioRegularSeleccionado("");
        setIdAulaSeleccionadaRegular(null);
        setArrIdAulasSeleccionadas([]);
    }

    function handleChangeAsignatura(e) {
        const strValor = e.target.value;
        setIdGrupo("");
        // Al cambiar de asignatura, el tipo/horario/fecha/ambientes elegidos
        // ya no tienen por qué corresponder — se limpian para forzar a
        // elegir de nuevo (antes se quedaban pegados de la asignatura anterior).
        setObjFormData((prev) => ({ ...prev, idAsignatura: strValor, idTipoExamen: "", detalleTipoExamen: "", fecha: "" }));
        setArrHorariosRegulares([]);
        setStrTipoHorario("REGULAR");
        setIdHorarioRegularSeleccionado("");
        setIdAulaSeleccionadaRegular(null);
        setArrIdAulasSeleccionadas([]);
        setObjEventual({ horaInicio: "", horaFin: "" });
    }

    function handleChangeEventual(e) {
        const { name, value } = e.target;
        setObjEventual((prev) => ({ ...prev, [name]: value }));
    }

    function handleAgregarAula(aula) {
        if (mapAulasOcupadas.has(Number(aula.idAula))) return;
        setArrIdAulasSeleccionadas((prev) =>
            prev.includes(aula.idAula) ? prev : [...prev, aula.idAula]
        );
        setStrBusquedaAula("");
        setBoolSugerenciasAulaVisibles(false);
    }

    function handleQuitarAula(idAula) {
        setArrIdAulasSeleccionadas((prev) => prev.filter((id) => id !== idAula));
    }

    function handleElegirAulaPrincipal(aula) {
        if (mapAulasOcupadas.has(Number(aula.idAula))) return;
        setIdAulaSeleccionadaRegular(String(aula.idAula));
        setStrBusquedaAulaPrincipal("");
        setBoolCambiandoAulaRegular(false);
        setBoolSugerenciasAulaPrincipalVisibles(false);
    }

    function handleRestablecerAulaPrincipal() {
        setIdAulaSeleccionadaRegular(null);
        setBoolCambiandoAulaRegular(false);
    }

    function handleToggleNormaGeneral(idNorma) {
        setArrIdNormasSeleccionadas((prev) =>
            prev.includes(idNorma) ? prev.filter((id) => id !== idNorma) : [...prev, idNorma]
        );
    }

    function handleAgregarNormaEspecifica() {
        const strTexto = strNuevaNormaEspecifica.trim();
        if (strTexto.length === 0) return;

        if (intIndexNormaEnEdicion !== null) {
            setArrNormasEspecificas((prev) =>
                prev.map((norma, i) => (i === intIndexNormaEnEdicion ? strTexto : norma))
            );
            setIntIndexNormaEnEdicion(null);
        } else {
            setArrNormasEspecificas((prev) => [...prev, strTexto]);
        }

        setStrNuevaNormaEspecifica("");
    }

    function handleEditarNormaEspecifica(index) {
        setIntIndexNormaEnEdicion(index);
        setStrNuevaNormaEspecifica(arrNormasEspecificas[index]);
    }

    function handleCancelarEdicionNormaEspecifica() {
        setIntIndexNormaEnEdicion(null);
        setStrNuevaNormaEspecifica("");
    }

    function handleQuitarNormaEspecifica(index) {
        setArrNormasEspecificas((prev) => prev.filter((_, i) => i !== index));
        if (intIndexNormaEnEdicion === index) {
            setIntIndexNormaEnEdicion(null);
            setStrNuevaNormaEspecifica("");
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStrMensaje("");
        setStrTipoMensaje("error");

        if (!intCodsisDocente) {
            setStrMensaje("No se pudo obtener el código SIS del docente. Intente recargar la página.");
            return;
        }

        // No se puede programar un examen en una fecha ya pasada.
        const strHoyISO = new Date().toISOString().slice(0, 10);
        if (objFormData.fecha && objFormData.fecha < strHoyISO) {
            setStrMensaje("No se puede programar un examen en una fecha pasada.");
            return;
        }

        if (boolPideGrupo && !idGrupo) {
            setStrMensaje("Debe seleccionar el grupo.");
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
        if (
            strTipoHorario === "EVENTUAL" &&
            objEventual.horaInicio &&
            objEventual.horaFin &&
            objEventual.horaFin <= objEventual.horaInicio
        ) {
            setStrMensaje("La hora de fin debe ser posterior a la hora de inicio.");
            return;
        }
        // Si la fecha elegida es hoy mismo, la hora de inicio ya no puede ser una hora que ya pasó.
        if (
            strTipoHorario === "EVENTUAL" &&
            objFormData.fecha === strHoyISO &&
            objEventual.horaInicio
        ) {
            const strHoraActual = new Date().toTimeString().slice(0, 5);
            if (objEventual.horaInicio < strHoraActual) {
                setStrMensaje("La hora de inicio ya pasó para el día de hoy.");
                return;
            }
        }
        if (
            boolRequiereDescripcion &&
            arrTiposExamen.some(
                (t) =>
                    !t.requiereDescripcion &&
                    t.nombreTipoExamen.trim().toLowerCase() === objFormData.detalleTipoExamen.trim().toLowerCase()
            )
        ) {
            setStrMensaje("El nombre no puede coincidir con un tipo de examen fijo existente.");
            return;
        }
        if (boolFechaNoCoincide) {
            setStrMensaje(
                `La fecha no corresponde a ${DIAS_SEMANA[objHorarioSeleccionado.diaSemana]}, el día de ese horario regular. Ajuste la fecha o el horario para continuar.`
            );
            return;
        }
        if (strTipoHorario === "EVENTUAL" && arrIdAulasSeleccionadas.length === 0) {
            setStrMensaje("Debe seleccionar al menos un ambiente.");
            return;
        }
        if (boolRequiereDescripcion && !objFormData.detalleTipoExamen.trim()) {
            setStrMensaje("Especifique el tipo de examen.");
            return;
        }
        const arrIdAulasDelExamen = [
            ...(strTipoHorario === "REGULAR" && intIdAulaPrincipalRegular ? [intIdAulaPrincipalRegular] : []),
            ...arrIdAulasSeleccionadas,
        ];
        const objAulaOcupada = arrAulas.find((a) => arrIdAulasDelExamen.includes(a.idAula) && mapAulasOcupadas.has(Number(a.idAula)));
        if (objAulaOcupada) {
            setStrMensaje(`El aula ${objAulaOcupada.nombreAula} no está disponible en este horario. Elija otra aula.`);
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
            ...(idGrupo ? { idGrupo: parseInt(idGrupo, 10) } : {}),
            idsNormasGenerales: arrIdNormasSeleccionadas,
            normasEspecificas: arrNormasEspecificas,
        };

        if (boolRequiereDescripcion) {
            objBody.detalleTipoExamen = objFormData.detalleTipoExamen;
        }

        if (strTipoHorario === "REGULAR") {
            // El aula principal se saca del horario regular por defecto, salvo
            // que el docente la haya reemplazado explícitamente 
            objBody.idHorarioRegular = parseInt(idHorarioRegularSeleccionado, 10);
            if (idAulaSeleccionadaRegular) {
                objBody.idAula = parseInt(idAulaSeleccionadaRegular, 10);
            }
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
            await registrarExamen(objBody);
            setStrTipoMensaje("exito");
            setStrMensaje("Examen registrado correctamente.");
            if (onRegistrado) {
                refTemporizadorRegistrado.current = setTimeout(onRegistrado, 1200);
            }
        } catch (error) {
            setStrTipoMensaje("error");
            setStrMensaje(error.message || "Ocurrió un error al registrar el examen.");
        } finally {
            setBoolEnviando(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 p-6 pb-0">
                <div>
                    <h2 className="text-[19px] font-black text-[#08264A]">Registrar examen</h2>
                    <p className="text-[13.5px] text-[#64748B] mt-0.5">
                        Complete el formulario para programar la evaluación académica
                    </p>
                </div>
            </div>

            <div className="px-6 pt-5 font-black text-[13px] text-[#003770]">Información del examen
            </div>

            <div className="px-6 pt-3 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Asignatura <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="idAsignatura"
                            value={objFormData.idAsignatura}
                            onChange={handleChangeAsignatura}
                            required
                            className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3.5 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15"
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
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Grupo {boolPideGrupo && <span className="text-red-600">*</span>}
                        </label>
                        <select
                            name="idGrupo"
                            value={idGrupo}
                            onChange={handleChangeGrupo}
                            required={boolPideGrupo}
                            disabled={!objFormData.idAsignatura || !boolPideGrupo}
                            className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3.5 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15 disabled:opacity-50 disabled:bg-gray-50"
                        >
                            <option value="" disabled>
                                {boolCargandoGrupos ? "Cargando grupos..." : "Seleccione el grupo"}
                            </option>
                            {arrGrupos.map((g) => (
                                <option key={g.idGrupo} value={g.idGrupo}>
                                    {textoGrupo(g)}
                                </option>
                            ))}
                        </select>
                        {objFormData.idAsignatura && !boolCargandoGrupos && (
                            <p className="text-[12.5px] text-[#64748B] mt-1">
                                {boolPideGrupo
                                    ? "Solo los grupos que dicta en esta asignatura"
                                    : "No tiene grupos registrados en esta asignatura"}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <div>
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Tipo de Examen <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="idTipoExamen"
                            value={objFormData.idTipoExamen}
                            onChange={handleChange}
                            required
                            disabled={!objFormData.idAsignatura || (boolPideGrupo && !idGrupo)}
                            className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3.5 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15 disabled:opacity-50 disabled:bg-gray-50"
                        >
                            <option value="" disabled>Seleccione el tipo</option>
                            {arrTiposExamen.map((tipo) => {

                                const boolYaUsado =
                                    !tipo.requiereDescripcion &&
                                    arrIdTiposUsados.map(String).includes(String(tipo.idTipoExamen));

                                // Se puede registrar cualquier tipo, sin exigir el anterior
                                const boolDeshabilitado = boolYaUsado;

                                return (
                                    <option key={tipo.idTipoExamen} value={tipo.idTipoExamen} disabled={boolDeshabilitado}>
                                        {tipo.nombreTipoExamen}
                                        {boolYaUsado ? (idGrupo ? " (ya registrado en este grupo)" : " (ya registrado)") : ""}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                {!objFormData.idAsignatura && (
                    <p className="text-[12.5px] text-[#64748B] -mt-2.5">
                        Seleccione una asignatura para continuar.
                    </p>
                )}

                {boolRequiereDescripcion && (
                    <div>
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
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
                            className="h-11 w-full border border-[#003770] rounded-[10px] text-[14.5px] px-3.5 bg-[#003770]/[0.06] focus:ring-3 focus:ring-[#003770]/15"
                        />
                        <p className="text-[12.5px] text-[#64748B] text-right mt-1">
                            {objFormData.detalleTipoExamen.length}/60
                        </p>
                    </div>
                )}

                <fieldset disabled={!objFormData.idAsignatura || (boolPideGrupo && !idGrupo)} className="space-y-4 disabled:opacity-50">
                    <div>
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Horario <span className="text-red-600">*</span>
                        </label>

                        {arrHorariosRegulares.length > 0 && (
                            <div className="flex gap-4 mb-2.5">
                                <label className="flex items-center gap-1.5 text-[14px] text-[#334155] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={strTipoHorario === "REGULAR"}
                                        onChange={() => setStrTipoHorario("REGULAR")}
                                        className="accent-[#003770]"
                                    />
                                    Horario regular
                                </label>
                                <label className="flex items-center gap-1.5 text-[14px] text-[#334155] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={strTipoHorario === "EVENTUAL"}
                                        onChange={() => setStrTipoHorario("EVENTUAL")}
                                        className="accent-[#003770]"
                                    />
                                    Horario eventual
                                </label>
                            </div>
                        )}

                        {strTipoHorario === "REGULAR" && arrHorariosRegulares.length > 0 && (
                            <select
                                value={idHorarioRegularSeleccionado}
                                onChange={(e) => setIdHorarioRegularSeleccionado(e.target.value)}
                                required
                                className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3.5 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15"
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
                                    <label className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B] mb-1">Hora inicio</label>
                                    <input
                                        type="time"
                                        name="horaInicio"
                                        value={objEventual.horaInicio}
                                        onChange={handleChangeEventual}
                                        required
                                        min={HORA_ACADEMICA_INICIO}
                                        max={HORA_ACADEMICA_FIN}
                                        className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B] mb-1">Hora fin</label>
                                    <input
                                        type="time"
                                        name="horaFin"
                                        value={objEventual.horaFin}
                                        onChange={handleChangeEventual}
                                        required
                                        min={HORA_ACADEMICA_INICIO}
                                        max={HORA_ACADEMICA_FIN}
                                        className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3"
                                    />
                                </div>
                                <p className="text-[12.5px] text-[#64748B] col-span-2">
                                    Dentro del horario académico ({HORA_ACADEMICA_INICIO} - {HORA_ACADEMICA_FIN}).
                                </p>
                            </div>
                        )}

                        {arrHorariosRegulares.length === 0 && objFormData.idAsignatura && (
                            <p className="text-[12.5px] text-[#64748B] mt-1.5">
                                No tiene un horario regular para esta asignatura, complete un horario eventual.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Fecha del Examen <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="date"
                            name="fecha"
                            value={objFormData.fecha}
                            onChange={handleChange}
                            required
                            min={new Date().toISOString().slice(0, 10)}
                            className={`h-11 w-full border rounded-[10px] text-[14.5px] px-3.5 focus:ring-3 ${boolFechaNoCoincide
                                ? "border-red-400 focus:border-red-500 focus:ring-red-400/15"
                                : "border-[#C8D6E8] focus:border-[#003770] focus:ring-[#003770]/15"
                                }`}
                        />
                        {boolFechaNoCoincide && (
                            <p className="text-[12.5px] text-red-600 mt-1">
                                La fecha no corresponde a {DIAS_SEMANA[objHorarioSeleccionado.diaSemana]}, el día de ese horario regular.
                            </p>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Ambiente(s) {strTipoHorario === "EVENTUAL" && <span className="text-red-600">*</span>}
                        </label>

                        {strTipoHorario === "REGULAR" && objHorarioSeleccionado && (
                            <div className="mb-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold ${idAulaSeleccionadaRegular
                                            ? "bg-[#EFF6FF] text-[#003770] border border-[#BFDBFE]"
                                            : "bg-[#F4F6FA] text-[#5E6B8A] border border-[#E2E8F0]"
                                            }`}
                                    >
                                        {strNombreAulaPrincipalRegular || "Aula del horario"}
                                    </span>
                                    {intIdAulaPrincipalRegular && mapAulasOcupadas.has(Number(intIdAulaPrincipalRegular)) && (
                                        <span className="text-[12.5px] font-semibold text-red-600">
                                            No disponible en este horario · use "Cambiar aula"
                                        </span>
                                    )}
                                    {!boolCambiandoAulaRegular && (
                                        <button
                                            type="button"
                                            onClick={() => setBoolCambiandoAulaRegular(true)}
                                            className="text-[13px] text-[#003770] font-semibold"
                                        >
                                            Cambiar aula
                                        </button>
                                    )}
                                    {idAulaSeleccionadaRegular && !boolCambiandoAulaRegular && (
                                        <button
                                            type="button"
                                            onClick={handleRestablecerAulaPrincipal}
                                            className="text-[12.5px] text-[#64748B] font-semibold"
                                        >
                                            Usar la aula del horario
                                        </button>
                                    )}
                                </div>

                                {boolCambiandoAulaRegular && (
                                    <div className="relative mt-2">
                                        <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar aula de reemplazo..."
                                            value={strBusquedaAulaPrincipal}
                                            onChange={(e) => setStrBusquedaAulaPrincipal(e.target.value)}
                                            onFocus={() => setBoolSugerenciasAulaPrincipalVisibles(true)}
                                            onBlur={() => setTimeout(() => setBoolSugerenciasAulaPrincipalVisibles(false), 150)}
                                            autoFocus
                                            className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] pl-9 pr-3 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15"
                                        />
                                        {boolSugerenciasAulaPrincipalVisibles && (
                                            <div className="absolute left-0 right-0 top-[44px] bg-white border border-[#C8D6E8] rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                                {arrAulasFiltradasPrincipal.length > 0 ? (
                                                    arrAulasFiltradasPrincipal.map((aula) => (
                                                        <OpcionAula
                                                            key={aula.idAula}
                                                            aula={aula}
                                                            boolOcupada={mapAulasOcupadas.has(Number(aula.idAula))}
                                                            onElegir={handleElegirAulaPrincipal}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-2 text-[12.5px] text-[#64748B]">
                                                        No se encontraron aulas.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setBoolCambiandoAulaRegular(false)}
                                            className="text-[12.5px] text-[#64748B] font-semibold mt-1.5"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="relative">
                            <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                            <input
                                type="text"
                                placeholder={strTipoHorario === "REGULAR" ? "Buscar aula adicional (opcional)..." : "Buscar ambiente..."}
                                value={strBusquedaAula}
                                onChange={(e) => setStrBusquedaAula(e.target.value)}
                                onFocus={() => setBoolSugerenciasAulaVisibles(true)}
                                onBlur={() => setTimeout(() => setBoolSugerenciasAulaVisibles(false), 150)}
                                className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] pl-9 pr-3 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15"
                            />
                            {boolSugerenciasAulaVisibles && (
                                <div className="absolute left-0 right-0 top-[44px] bg-white border border-[#C8D6E8] rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                    {arrAulasFiltradas.length > 0 ? (
                                        arrAulasFiltradas.map((aula) => (
                                            <OpcionAula
                                                key={aula.idAula}
                                                aula={aula}
                                                boolOcupada={mapAulasOcupadas.has(Number(aula.idAula))}
                                                onElegir={handleAgregarAula}
                                            />
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-[12.5px] text-[#64748B]">
                                            No se encontraron aulas.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {arrIdAulasSeleccionadas.map((idAula) => {
                                const aula = arrAulas.find((a) => a.idAula === idAula);
                                if (!aula) return null;
                                const boolOcupada = mapAulasOcupadas.has(Number(idAula));
                                return (
                                    <span
                                        key={idAula}
                                        title={boolOcupada ? "No disponible en este horario" : undefined}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold border ${boolOcupada
                                            ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                                            : "bg-[#EFF6FF] text-[#003770] border-[#BFDBFE]"
                                            }`}
                                    >
                                        {aula.nombreAula}
                                        {boolOcupada && <span className="font-normal">· No disponible</span>}
                                        <button
                                            type="button"
                                            onClick={() => handleQuitarAula(idAula)}
                                            className="text-[#003770] font-bold leading-none"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </fieldset>
            </div>

            <div className="px-6 pt-5 font-black text-[13px] text-[#003770]">Normas e indicaciones
            </div>

            <div className="px-6 pt-3 pb-6 space-y-4">
                <div>
                    <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-2">
                        Normas generales
                    </label>
                    <div className="flex flex-col gap-2">
                        {arrNormasGeneralesCatalogo.map((norma) => (
                            <label key={norma.idNormaGeneral} className="flex items-start gap-2 text-[14px] text-[#334155] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={arrIdNormasSeleccionadas.includes(norma.idNormaGeneral)}
                                    onChange={() => handleToggleNormaGeneral(norma.idNormaGeneral)}
                                    className="w-4 h-4 mt-0.5 accent-[#003770]"
                                />
                                {norma.descripcionNorma}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                        Normas particulares
                    </label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={strNuevaNormaEspecifica}
                            onChange={(e) => setStrNuevaNormaEspecifica(e.target.value)}
                            maxLength={100}
                            placeholder={
                                intIndexNormaEnEdicion !== null
                                    ? "Edite la indicación"
                                    : "Escriba una indicación y presione Agregar"
                            }
                            className={`h-11 flex-1 border rounded-[10px] text-[14px] px-3.5 ${intIndexNormaEnEdicion !== null
                                ? "border-[#003770] bg-[#003770]/[0.06]"
                                : "border-[#C8D6E8]"
                                }`}
                        />
                        <button
                            type="button"
                            onClick={handleAgregarNormaEspecifica}
                            className="h-11 px-4 rounded-[10px] border border-[#003770] text-[#003770] text-[13px] font-semibold"
                        >
                            {intIndexNormaEnEdicion !== null ? "Guardar cambios" : "Agregar"}
                        </button>
                        {intIndexNormaEnEdicion !== null && (
                            <button
                                type="button"
                                onClick={handleCancelarEdicionNormaEspecifica}
                                className="h-11 px-4 rounded-[10px] border border-[#C8D6E8] text-gray-500 text-[13px] font-semibold"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {arrNormasEspecificas.map((norma, index) => (
                            <div
                                key={index}
                                className={`flex items-center justify-between border rounded-[10px] px-3 py-2 text-[13.5px] text-[#334155] ${intIndexNormaEnEdicion === index
                                    ? "bg-[#003770]/[0.06] border-[#003770]"
                                    : "bg-[#F4F7FB] border-[#E2E8F0]"
                                    }`}
                            >
                                {norma}
                                <span className="flex items-center gap-2 ml-2">
                                    <button
                                        type="button"
                                        onClick={() => handleEditarNormaEspecifica(index)}
                                        className="text-[#003770] font-semibold text-[13px]"
                                        title="Editar"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuitarNormaEspecifica(index)}
                                        className="text-red-500 font-bold text-[13px]"
                                    >
                                        &times;
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {strMensaje && (
                <p
                    className={`px-6 text-[13px] font-semibold ${strTipoMensaje === "error" ? "text-red-600" : "text-[#003770]"
                        }`}
                >
                    {strMensaje}
                </p>
            )}

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
                <span className="text-[12.5px] text-[#64748B]">
                    Campos con (<span className="text-red-600">*</span>) son obligatorios
                </span>
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="h-[42px] px-5 rounded-md border border-[#C8D6E8] text-[#003770] font-semibold text-[14.5px]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={boolEnviando}
                        className="h-[42px] px-5 rounded-md bg-[#003770] text-white font-semibold text-[14.5px] disabled:opacity-60"
                    >
                        {boolEnviando ? "Registrando..." : "Registrar examen"}
                    </button>
                </div>
            </div>
        </form>
    );
}