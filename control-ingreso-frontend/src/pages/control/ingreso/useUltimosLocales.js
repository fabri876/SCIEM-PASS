// Historial sin conexión ("Mis últimos ingresos" del ayudante y "Últimos ingresos" del docente):
// se arma con los registros que el usuario guardó en este equipo.
// Solo LEE la base local (asistencias_pendientes + nominas); no cambia nada del modo sin conexión.
import { useEffect, useState } from "react";
import { db } from "../../../offline/db.js";
import { ESTADO_SYNC } from "../../../offline/constantes.js";
import { obtenerUsuarioActual } from "../../../services/authService";

const LIMITE = 5;

function textoMetodo(strMetodo) {
  const str = String(strMetodo || "").toUpperCase();
  if (str === "QR") return "QR";
  if (str === "CODIGO") return "SIS";
  if (str === "LISTA") return "Lista";
  return "C.I.";
}

// La nómina local guarda "Nombres Apellidos" en un solo campo: se separa con el apellido paterno
function separarNombre(r) {
  const strNombre = String(r?.nombre || "").trim();
  const strPaterno = String(r?.apellidoPaterno || "").trim();
  const numPos = strPaterno ? strNombre.toLowerCase().indexOf(strPaterno.toLowerCase()) : -1;
  if (numPos > 0) return { nombres: strNombre.slice(0, numPos).trim(), apellidos: strNombre.slice(numPos).trim() };
  return { nombres: strNombre, apellidos: "" };
}

export default function useUltimosLocales(idExamen, boolActivo, numVersion, numPendientes) {
  const [listUltimos, setListUltimos] = useState([]);

  useEffect(() => {
    const exId = Number(idExamen);
    if (!boolActivo || !Number.isInteger(exId) || exId <= 0) return undefined;
    let boolVivo = true;

    (async () => {
      try {
        const usuario = obtenerUsuarioActual();
        const strYo = String(usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id ?? usuario?.correo ?? "");
        // Nombre de quien registró: sin internet solo están los registros propios
        const strMiNombre = `${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim() || "Tú";
        const listMarcas = (await db.asistencias_pendientes.where("examenId").equals(exId).toArray())
          .filter((a) => !strYo || String(a.operadorId) === strYo)
          .sort((a, b) => String(b.timestampLocal).localeCompare(String(a.timestampLocal)))
          .slice(0, LIMITE);

        const listNomina = await db.nominas.bulkGet(listMarcas.map((a) => [exId, a.codigoSis]));
        const list = listMarcas.map((a, i) => {
          const r = listNomina[i];
          return {
            hora: new Date(a.timestampLocal).toLocaleTimeString("es-BO", { hour12: false }),
            metodo: textoMetodo(a.metodo),
            // El facial no es un método: se deriva de score_facial y se muestra
            // como sufijo ("QR · con facial" / "C.I. · sin facial").
            conFacial: a.scoreFacial != null,
            modoRapido: Boolean(a.modoRapido),
            registradoPor: strMiNombre, // columna "Registró" del docente
            sinSincronizar: a.syncStatus === ESTADO_SYNC.PENDIENTE || a.syncStatus === ESTADO_SYNC.SYNCING || a.syncStatus === ESTADO_SYNC.ERROR,
            estudiante: { ...separarNombre(r), sis: a.codigoSis || "", ci: r?.ci || "" },
          };
        });
        if (boolVivo) setListUltimos(list);
      } catch {
        if (boolVivo) setListUltimos([]);
      }
    })();

    return () => { boolVivo = false; };
  }, [idExamen, boolActivo, numVersion, numPendientes]);

  return listUltimos;
}
