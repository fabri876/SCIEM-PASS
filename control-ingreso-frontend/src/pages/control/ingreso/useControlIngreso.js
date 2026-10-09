// Estado del control de ingreso (independiente del OperadorProvider)
// Sin examen elegido → lista "Mis exámenes". Con examen elegido → control de ingreso.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  obtenerContador,
  obtenerExamenesAsignados,
  obtenerUltimosIngresos,
  validarIngreso,
} from "../../../services/ingresoService";

const INTERVALO_TIEMPO_REAL_MS = 5000;
const LIMITE_ULTIMOS = 5;

// objConfig.boolSoloMios = la tabla muestra solo los ingresos que registró el usuario (operador)
export default function useControlIngreso(idExamenInicial = null, objConfig = {}) {
  const boolSoloMios = Boolean(objConfig.boolSoloMios);
  const [listExamenes, setListExamenes] = useState([]);
  const [boolCargandoExamenes, setBoolCargandoExamenes] = useState(true);
  const [idExamen, setIdExamen] = useState(idExamenInicial);
  const [objContador, setObjContador] = useState(null);
  const [listUltimosServidor, setListUltimosServidor] = useState(null); // null = el backend aún no lo da
  const [objLocales, setObjLocales] = useState({}); // ingresos registrados en esta sesión, por examen
  const [objResultado, setObjResultado] = useState(null);
  const [boolValidando, setBoolValidando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strUltimoRegistrado, setStrUltimoRegistrado] = useState(null);
  const [numVersion, setNumVersion] = useState(0); // sube cada vez que hay un ingreso nuevo

  const refIdExamen = useRef(idExamen);
  refIdExamen.current = idExamen;
  const refExamenes = useRef(listExamenes);
  refExamenes.current = listExamenes;
  const examenPorId = (id) => refExamenes.current.find((e) => e.id === id) || {};

  // Exámenes asignados (con su resumen)
  const fnCargarExamenes = useCallback(async () => {
    try {
      setListExamenes(await obtenerExamenesAsignados());
    } catch (e) {
      setStrError(e.message);
    } finally {
      setBoolCargandoExamenes(false);
    }
  }, []);

  // Contador + últimos ingresos del examen elegido
  const fnRefrescar = useCallback(async () => {
    const id = refIdExamen.current;
    if (id == null) return;
    const ex = examenPorId(id);
    try {
      const [contador, ultimos] = await Promise.all([
        obtenerContador(id, ex),
        obtenerUltimosIngresos(id, LIMITE_ULTIMOS, ex, boolSoloMios),
      ]);
      if (refIdExamen.current !== id) return;
      setObjContador(contador);
      setListUltimosServidor(ultimos);
    } catch {
      // Errores de la consulta periódica: se reintenta en el siguiente ciclo
    }
  }, [boolSoloMios]);

  // Siempre se cargan una vez (la vista de control necesita los datos del examen elegido)
  useEffect(() => { fnCargarExamenes(); }, [fnCargarExamenes]);

  // Tiempo real (polling): la lista se actualiza cuando no hay examen elegido,
  // y el contador + últimos ingresos cuando sí lo hay
  useEffect(() => {
    const fnTick = idExamen == null ? fnCargarExamenes : fnRefrescar;
    fnTick();
    const t = setInterval(fnTick, INTERVALO_TIEMPO_REAL_MS);
    return () => clearInterval(t);
  }, [idExamen, fnCargarExamenes, fnRefrescar]);

  // objOpciones.ignorarFila = registrar aunque el apellido le toque a otro operador
  const fnValidar = useCallback(async (strValor, strMetodo, objOpciones = {}) => {
    const id = refIdExamen.current;
    if (id == null || !String(strValor || "").trim()) return null;
    const ex = examenPorId(id);
    setBoolValidando(true);
    setStrError("");
    try {
      const r = await validarIngreso(id, String(strValor).trim(), strMetodo, ex, objOpciones);
      setObjResultado({ ...r, metodoOriginal: strMetodo, clave: Date.now() });
      if (r.resultado === "PERMITIDO") {
        setStrUltimoRegistrado(r.estudiante ? r.estudiante.ci : null);
        setNumVersion((v) => v + 1);
        if (r.contador) setObjContador(r.contador);
        // Se guarda en la sesión para la tabla de últimos ingresos
        setObjLocales((prev) => ({
          ...prev,
          [id]: [
            { hora: r.horaIngreso, metodo: r.metodo, registradoPor: r.registradoPor, estudiante: r.estudiante },
            ...(prev[id] || []),
          ].slice(0, LIMITE_ULTIMOS),
        }));
        fnRefrescar();
      }
      return r;
    } catch (e) {
      setObjResultado(null);
      setStrError(e.message);
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [fnRefrescar]);

  const fnCerrarResultado = useCallback(() => setObjResultado(null), []);

  const fnElegirExamen = useCallback((id) => {
    setIdExamen(id);
    setObjResultado(null);
    setListUltimosServidor(null);
    setObjContador(null);
    setStrUltimoRegistrado(null);
    setStrError("");
  }, []);

  const fnVolverALista = useCallback(() => fnElegirExamen(null), [fnElegirExamen]);

  const examenActual = listExamenes.find((e) => e.id === idExamen) || null;

  // Si el backend ya devuelve los últimos ingresos, se usan; si no, los de esta sesión
  const listUltimos = listUltimosServidor && listUltimosServidor.length
    ? listUltimosServidor
    : objLocales[idExamen] || [];

  return {
    listExamenes, boolCargandoExamenes, examenActual, idExamen, objContador, listUltimos, objResultado,
    boolValidando, strError, strUltimoRegistrado, numVersion,
    fnValidar, fnCerrarResultado, fnElegirExamen, fnVolverALista, fnRefrescar,
  };
}
