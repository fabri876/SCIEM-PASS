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
} from "../../../services/adminNormasService";
import { obtenerTiposUsadosPorGrupo } from "../../../services/grupoExamenService";
import { useGruposDocente, useAulasOcupadas, textoGrupo } from "../../../components/examenes/useGrupoYAulas";


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
            className="px-3 py-2 text-[13px] flex items-center justify-between gap-2 cursor-pointer hover:bg-[#EBF3FA]"
        >
            {aula.nombreAula}
        </div>
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

    // Código SIS del docente elegido. GET /api/admin/docentes devuelve el
    // campo como "codsisDocente" (distinto del "codigoSis" que traía el
    // endpoint viejo /api/admin/usuarios).
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

    // Reemplazo del aula principal para REGULAR (Neil, 27/09/2026: el backend
    // ahora acepta idAula también cuando tipoHorario=REGULAR, para reemplazar
    // el aula por defecto del horario regular en vez de solo poder agregar
    // aulas adicionales). null = usar la del horario regular, sin cambios.
    const [idAulaSeleccionadaRegular, setIdAulaSeleccionadaRegular] = useState(null);
    const [boolCambiandoAulaRegular, setBoolCambiandoAulaRegular] = useState(false);
    const [strBusquedaAulaPrincipal, setStrBusquedaAulaPrincipal] = useState("");
    const [boolSugerenciasAulaPrincipalVisibles, setBoolSugerenciasAulaPrincipalVisibles] = useState(false);

    // Tipos de examen que este docente ya registró para la asignatura elegida
    // (GET /api/examenes/tipos-usados) — el backend igual lo bloquea al
    // guardar, pero así no se deja ni elegirlos desde la interfaz.
    const [arrIdTiposUsados, setArrIdTiposUsados] = useState([]);

    const [arrAulas, setArrAulas] = useState([]);
    const [arrNormasGeneralesCatalogo, setArrNormasGeneralesCatalogo] = useState([]);
    const [arrIdNormasSeleccionadas, setArrIdNormasSeleccionadas] = useState([]);
    const [arrNormasEspecificas, setArrNormasEspecificas] = useState([]);
    const [strNuevaNormaEspecifica, setStrNuevaNormaEspecifica] = useState("");

    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strMensaje, setStrMensaje] = useState("");

    // Grupo del examen: los grupos que el docente elegido dicta en la asignatura (si es uno, se elige solo).
    // Al editar, se precarga el grupo del examen cuando el backend lo mande (idGrupo).
    const { arrGrupos, boolCargandoGrupos, idGrupo, setIdGrupo } = useGruposDocente(
        objFormData.idAsignatura,
        idUsuarioDocente,
        objExamenAEditar?.idGrupo ?? ""
    );
    const boolPideGrupo = arrGrupos.length > 0;
    // Cuando el backend mande el grupo de cada horario (idGrupo), solo se muestran los del grupo elegido
    const arrHorariosRegulares = arrHorariosTodos.filter(
        (h) => h.idGrupo == null || !idGrupo || String(h.idGrupo) === String(idGrupo)
    );
    const [strTipoMensaje, setStrTipoMensaje] = useState("error"); // "error" | "exito"

    // Precarga en dos pasos al editar: primero los datos "simples" del
    // examen (docente, asignatura, tipo, fecha, normas particulares), y
    // luego -una vez que arrHorariosRegulares terminó de cargar para esa
    // asignatura- el horario/aula, que depende de esa lista.
    const [boolPrefillDatosHecho, setBoolPrefillDatosHecho] = useState(false);
    const [boolPrefillAmbienteHecho, setBoolPrefillAmbienteHecho] = useState(false);

    // El mensaje de arriba (error o éxito) no debe quedarse pegado cuando el
    // admin sigue editando el formulario después de verlo.
    useEffect(() => {
        setStrMensaje("");
    }, [
        idUsuarioDocente,
        objFormData,
        idGrupo,
        strTipoHorario,
        idHorarioRegularSeleccionado,
        arrIdAulasSeleccionadas,
        idAulaSeleccionadaRegular,
        objEventual,
        arrIdNormasSeleccionadas,
        arrNormasEspecificas,
    ]);

    // Los mensajes de error/éxito también desaparecen solos después de un
    // rato, sin que el admin tenga que tocar el formulario.
    useEffect(() => {
        if (!strMensaje) return;
        const idTimer = setTimeout(() => setStrMensaje(""), 6000);
        return () => clearTimeout(idTimer);
    }, [strMensaje]);

    // Lista de docentes activos para el selector (GET /api/admin/docentes,
    // distinto de /api/admin/usuarios?rol=DOCENTE que usábamos antes)
    useEffect(() => {
        obtenerDocentesAdmin()
            .then(setArrDocentes)
            .catch(() => setArrDocentes([]));
    }, []);

    // ===== Precarga al editar (paso 1: datos simples) =====
    // Se espera a que arrDocentes tenga contenido para poder resolver el
    // codsisDocente del docente dueño del examen (viene del selector, no
    // del propio examen).
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
        // Neil, 27/09/2026: ExamenRespuestaDto ahora trae "normasGenerales"
        // embebido (mismo shape que el catálogo: idNormaGeneral/descripcionNorma),
        // así que ya se puede precargar sin pedir nada aparte.
        setArrIdNormasSeleccionadas(
            (objExamenAEditar.normasGenerales || []).map((n) => n.idNormaGeneral)
        );
        setBoolPrefillDatosHecho(true);
    }, [boolEditando, boolPrefillDatosHecho, arrDocentes, objExamenAEditar, arrNormasParticularesExamenAEditar]);

    // ===== Precarga al editar (paso 2: horario y aula(s)) =====
    // Neil, 27/09/2026: /api/examenes/{id}/ambientes ahora sí devuelve
    // idHorarioRegular en cada ambiente, así que para REGULAR ya no hace
    // falta adivinar el horario por coincidencia de aula+hora+día — se usa
    // directamente. Si además el idAula del ambiente principal no coincide
    // con el del horario (fue reemplazada), se precarga como reemplazo.
    useEffect(() => {
        if (!boolEditando || boolPrefillAmbienteHecho || !boolPrefillDatosHecho) return;
        if (!Array.isArray(arrAmbientesExamenAEditar)) return; // todavía "cargando" o "error"

        const arrAmbientes = arrAmbientesExamenAEditar;
        const principal = arrAmbientes[0];
        const strTipoDelExamen = principal?.tipoHorario || "EVENTUAL";

        if (strTipoDelExamen === "REGULAR") {
            if (arrHorariosRegulares.length === 0) return; // esperar a que carguen

            setStrTipoHorario("REGULAR");
            if (principal?.idHorarioRegular) {
                setIdHorarioRegularSeleccionado(String(principal.idHorarioRegular));
            }
            const horarioCorrespondiente = arrHorariosRegulares.find(
                (h) => String(h.idHorarioRegular) === String(principal?.idHorarioRegular)
            );
            if (
                horarioCorrespondiente &&
                principal?.idAula != null &&
                principal.idAula !== horarioCorrespondiente.idAula
            ) {
                setIdAulaSeleccionadaRegular(String(principal.idAula));
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
                // Al editar, el tipo de horario (REGULAR/EVENTUAL) lo decide
                // el examen real, vía el efecto de precarga de ambiente más
                // abajo — no hay que pisarlo con el default de "si tiene
                // horarios regulares, asumir REGULAR" (eso es correcto solo
                // al registrar uno nuevo, y este fetch resuelve después de
                // que ya se precargó el tipo correcto, causando que siempre
                // se viera REGULAR marcado aunque el examen fuera eventual).
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
        // Por grupo: mientras el backend no filtre por grupo, cuenta como antes
        obtenerTiposUsadosPorGrupo(objFormData.idAsignatura, intCodsisDocente, idGrupo)
            .then((tipos) => setArrIdTiposUsados(tipos || []))
            .catch(() => setArrIdTiposUsados([]));
    }, [objFormData.idAsignatura, intCodsisDocente, idGrupo]);

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

    // Aulas con otro examen que se cruza en esa fecha y horario (se muestran en gris).
    // Al editar, el propio examen no ocupa sus aulas.
    const mapAulasOcupadas = useAulasOcupadas({
        fecha: objFormData.fecha,
        horaInicio: strTipoHorario === "REGULAR" ? objHorarioSeleccionado?.horaInicio : objEventual.horaInicio,
        horaFin: strTipoHorario === "REGULAR" ? objHorarioSeleccionado?.horaFin : objEventual.horaFin,
        idExamenExcluir: boolEditando ? objExamenAEditar.idExamen : undefined,
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
    // reemplazada) de las sugerencias de aula adicional (para no dejar que
    // la agreguen otra vez como "adicional" -> error 400).
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

    function handleChangeDocente(e) {
        // Si ya había una asignatura/tipo/horario elegidos para el docente
        // anterior, no tienen por qué seguir siendo válidos para el nuevo
        // (la asignatura ni siquiera le pertenece). Se limpia todo lo que
        // depende del docente para forzar a elegir de nuevo.
        setIdUsuarioDocente(e.target.value);
        setIdGrupo("");
        setObjFormData((prev) => ({ ...prev, idAsignatura: "", idTipoExamen: "", detalleTipoExamen: "" }));
        setArrHorariosRegulares([]);
        setStrTipoHorario("REGULAR");
        setIdHorarioRegularSeleccionado("");
        setIdAulaSeleccionadaRegular(null);
        setArrIdAulasSeleccionadas([]);
        setObjEventual({ horaInicio: "", horaFin: "" });
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setObjFormData((prev) => ({ ...prev, [name]: value }));
    }

    function handleChangeGrupo(e) {
        // Otro grupo: el tipo y el horario elegidos ya no tienen por qué corresponder
        setIdGrupo(e.target.value);
        setObjFormData((prev) => ({ ...prev, idTipoExamen: "", detalleTipoExamen: "" }));
        setIdHorarioRegularSeleccionado("");
        setIdAulaSeleccionadaRegular(null);
        setArrIdAulasSeleccionadas([]);
    }

    function handleChangeAsignatura(e) {
        const strValor = e.target.value;
        setIdGrupo("");
        // La asignatura puede cambiar independientemente del docente; si eso
        // pasa, el tipo/horario/fecha/ambientes elegidos ya no corresponden
        // (antes se quedaban pegados de la asignatura anterior).
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

        // No se puede programar un examen en una fecha ya pasada. Al editar,
        // no se bloquea (un examen histórico puede seguir teniendo su fecha
        // real en el pasado; lo que no se permite es MOVER uno a una fecha
        // ya pasada al registrar uno nuevo).
        const strHoyISO = new Date().toISOString().slice(0, 10);
        if (!boolEditando && objFormData.fecha && objFormData.fecha < strHoyISO) {
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
            !boolEditando &&
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
            idUsuario: parseInt(idUsuarioDocente, 10),
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
            objBody.idHorarioRegular = parseInt(idHorarioRegularSeleccionado, 10);
            // El aula principal se saca del horario regular por defecto, salvo
            // que el admin la haya reemplazado explícitamente (Neil, 27/09/2026:
            // el backend ahora acepta idAula también en REGULAR para eso).
            if (idAulaSeleccionadaRegular) {
                objBody.idAula = parseInt(idAulaSeleccionadaRegular, 10);
            }
            // Lo que el admin haya buscado acá aparte son aulas EXTRA, todas opcionales.
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
                <div>
                    <h2 className="text-[19px] font-black text-[#08264A]">
                        {boolEditando ? "Editar examen" : "Registrar examen"}
                    </h2>
                    <p className="text-[13.5px] text-[#64748B] mt-0.5">
                        {boolEditando
                            ? "Modifique los datos y guarde los cambios"
                            : "Complete el formulario para programar la evaluación académica"}
                    </p>
                </div>
            </div>

            <div className="px-6 pt-5 font-black text-[13px] text-[#003770]">Docente
            </div>

            <div className="px-6 pt-3 pb-2">
                <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                    ¿Para qué docente es este examen? <span className="text-red-600">*</span>
                </label>
                <select
                    value={idUsuarioDocente}
                    onChange={handleChangeDocente}
                    required
                    className="h-11 w-full border border-[#C8D6E8] rounded-[10px] text-[14.5px] px-3.5 focus:border-[#003770] focus:ring-3 focus:ring-[#003770]/15"
                >
                    <option value="" disabled>Seleccione un docente</option>
                    {arrDocentes.map((docente) => (
                        <option key={docente.idUsuario} value={docente.idUsuario}>
                            {docente.nombre} {docente.apellido}
                        </option>
                    ))}
                </select>
                {!idUsuarioDocente && (
                    <p className="text-[12.5px] text-[#64748B] mt-1.5">
                        Seleccione un docente para habilitar el resto del formulario.
                    </p>
                )}
            </div>

            <fieldset disabled={!idUsuarioDocente} className="disabled:opacity-40">
                <div className="px-6 pt-5 font-black text-[13px] text-[#003770]">Información del examen
                </div>

                <div className="px-6 pt-3 pb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                                        ? "Solo los grupos que dicta este docente en la asignatura"
                                        : "El docente no tiene grupos registrados en esta asignatura"}
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
                                    // Al editar, el propio tipo del examen no cuenta como "ya usado"
                                    // (si no, ni siquiera se podría guardar sin cambiar de tipo).
                                    // "Otro" (requiereDescripcion) es una opción abierta, se puede
                                    // usar más de una vez distinguiéndose por el texto escrito.
                                    const boolEsElTipoActual =
                                        boolEditando && String(objExamenAEditar.idTipoExamen) === String(tipo.idTipoExamen);
                                    const boolYaUsado =
                                        !tipo.requiereDescripcion &&
                                        arrIdTiposUsados.map(String).includes(String(tipo.idTipoExamen)) &&
                                        !boolEsElTipoActual;

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

                    <div>
                        <label className="block text-[11.5px] font-extrabold uppercase tracking-[.5px] text-[#475569] mb-1.5">
                            Horario y ambiente <span className="text-red-600">*</span>
                        </label>

                        {arrHorariosRegulares.length > 0 && (
                            <div className="flex gap-4 mb-2.5">
                                <label className="flex items-center gap-1.5 text-[14px] text-[#334155] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={strTipoHorario === "REGULAR"}
                                        onChange={() => {
                                            setStrTipoHorario("REGULAR");
                                            setArrIdAulasSeleccionadas([]);
                                            setIdAulaSeleccionadaRegular(null);
                                        }}
                                        className="accent-[#163F79]"
                                    />
                                    Horario regular
                                </label>
                                <label className="flex items-center gap-1.5 text-[14px] text-[#334155] cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={strTipoHorario === "EVENTUAL"}
                                        onChange={() => {
                                            setStrTipoHorario("EVENTUAL");
                                            setArrIdAulasSeleccionadas([]);
                                            setIdAulaSeleccionadaRegular(null);
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
                                    setIdAulaSeleccionadaRegular(null);
                                }}
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

                        {strTipoHorario === "REGULAR" && idHorarioRegularSeleccionado && (
                            <div className="relative mt-3">
                                <label className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B] mb-1">
                                    Ambiente(s)
                                </label>
                                {objHorarioSeleccionado && (
                                    <div className="mb-2.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${idAulaSeleccionadaRegular
                                                        ? "bg-[#EBF3FA] text-[#163F79] border border-[#D3E2F5]"
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
                                                    className="text-[11.5px] text-[#2B6CB0] font-semibold"
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
                                <label className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B] mb-1">
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
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border ${boolOcupada
                                                    ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                                                    : "bg-[#EBF3FA] text-[#163F79] border-[#D3E2F5]"
                                                    }`}
                                            >
                                                {aula.nombreAula}
                                                {boolOcupada && <span className="font-normal">· No disponible</span>}
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
                                    <label className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B] mb-1">Aula(s)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-[13px] text-gray-400">⌕</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar aula..."
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
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border ${boolOcupada
                                                        ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                                                        : "bg-[#EBF3FA] text-[#163F79] border-[#D3E2F5]"
                                                        }`}
                                                >
                                                    {aula.nombreAula}
                                                    {boolOcupada && <span className="font-normal">· No disponible</span>}
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            </div>
                        )}

                        {arrHorariosRegulares.length === 0 && objFormData.idAsignatura && (
                            <p className="text-[12.5px] text-[#64748B] mt-1.5">
                                Este docente no tiene un horario regular para esta asignatura, complete un horario eventual.
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
                            min={boolEditando ? undefined : new Date().toISOString().slice(0, 10)}
                            className={`h-11 w-full border rounded-[10px] text-[14.5px] px-3.5 focus:ring-3 ${boolFechaNoCoincide
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-400/15"
                                    : "border-[#C8D6E8] focus:border-[#2B6CB0] focus:ring-[#2B6CB0]/15"
                                }`}
                        />
                        {boolFechaNoCoincide && (
                            <p className="text-[12.5px] text-red-600 mt-1">
                                La fecha no corresponde a {DIAS_SEMANA[objHorarioSeleccionado.diaSemana]}, el día de ese horario regular.
                            </p>
                        )}
                    </div>
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
                                        className="w-4 h-4 mt-0.5 accent-[#163F79]"
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
                                placeholder="Escriba una indicación y presione Agregar"
                                className="h-11 flex-1 border border-[#C8D6E8] rounded-[10px] text-[14px] px-3.5"
                            />
                            <button
                                type="button"
                                onClick={handleAgregarNormaEspecifica}
                                className="h-11 px-4 rounded-[10px] border border-[#163F79] text-[#163F79] text-[13px] font-semibold"
                            >
                                Agregar
                            </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {arrNormasEspecificas.map((norma, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-[#F4F7FB] border border-[#E2E8F0] rounded-[10px] px-3 py-2 text-[13.5px] text-[#334155]"
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
                <span className="text-[12.5px] text-[#64748B]">
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