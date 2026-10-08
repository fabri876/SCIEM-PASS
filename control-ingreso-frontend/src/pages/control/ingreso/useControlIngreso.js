// Estado del control de ingreso (independiente del OperadorProvider)
// Sin examen elegido → lista "Mis exámenes de hoy". Con examen elegido → control de ingreso.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  obtenerContador,
  obtenerExamenesAsignados,
  obtenerUltimosIngresos,
  validarIngreso,
} from "../../../services/ingresoService";

const INTERVALO_TIEMPO_REAL_MS = 5000;

export default function useControlIngreso(idExamenInicial = null) {
  const [listExamenes, setListExamenes] = useState([]);
  const [boolCargandoExamenes, setBoolCargandoExamenes] = useState(true);
  const [idExamen, setIdExamen] = useState(idExamenInicial);
  const [objContador, setObjContador] = useState(null);
  const [listUltimos, setListUltimos] = useState([]);
  const [objResultado, setObjResultado] = useState(null);
  const [boolValidando, setBoolValidando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strUltimoRegistrado, setStrUltimoRegistrado] = useState(null);
  const [numVersion, setNumVersion] = useState(0); // sube cada vez que hay un ingreso nuevo
  const refIdExamen = useRef(idExamen);
  refIdExamen.current = idExamen;

  // Exámenes de hoy (con su resumen)
  const fnCargarExamenes = useCallback(async () => {
    try {
      setListExamenes(await obtenerExamenesAsignados());
    } catch (e) {
      setStrError(e.message);
    } finally {
      setBoolCargandoExamenes(false);
    }
  }, []);

  const fnRefrescar = useCallback(async () => {
    const id = refIdExamen.current;
    if (id == null) return;
    const ex = listExamenes.find((e) => e.id === id) || {};
    try {
      const [contador, ultimos] = await Promise.all([obtenerContador(id, ex), obtenerUltimosIngresos(id, 5)]);
      if (refIdExamen.current !== id) return;
      setObjContador(contador);
      setListUltimos(ultimos);
    } catch {
      // Ignorar errores menores de polling en segundo plano
    }
  }, [listExamenes]);

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

  const fnValidar = useCallback(async (strValor, strMetodo) => {
    const id = refIdExamen.current;
    if (id == null || !String(strValor || "").trim()) return null;
    const ex = listExamenes.find((e) => e.id === id) || {};
    setBoolValidando(true);
    setStrError("");
    try {
      const r = await validarIngreso(id, String(strValor).trim(), strMetodo, ex);
      setObjResultado({ ...r, clave: Date.now() });
      if (r.resultado === "PERMITIDO") {
        setStrUltimoRegistrado(r.estudiante ? r.estudiante.ci : null);
        setNumVersion((v) => v + 1);
        if (r.contador) setObjContador(r.contador);
        fnRefrescar();
      }
      return r;
    } catch (e) {
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
    setListUltimos([]);
    setObjContador(null);
    setStrUltimoRegistrado(null);
    setStrError("");
  }, []);

  const fnVolverALista = useCallback(() => fnElegirExamen(null), [fnElegirExamen]);

  const examenActual = listExamenes.find((e) => e.id === idExamen) || null;

  return {
    listExamenes, boolCargandoExamenes, examenActual, idExamen, objContador, listUltimos, objResultado,
    boolValidando, strError, strUltimoRegistrado, numVersion,
    fnValidar, fnCerrarResultado, fnElegirExamen, fnVolverALista, fnRefrescar,
  };
}
