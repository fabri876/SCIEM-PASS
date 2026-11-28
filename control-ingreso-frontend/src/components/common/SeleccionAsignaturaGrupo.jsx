import { textoNombre } from './textoNombre.js';
import { textoAsignatura } from '../../utils/textoInterfaz.js';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useState, useEffect } from "react";
import {
  obtenerAsignaturas,
  obtenerDocentesPorAsignatura,
  obtenerGruposPorDocente,
  obtenerGruposPorAsignatura,
} from "../../services/grupoService";

/**
 * Componente reutilizable para selección de Asignatura, Docente y Grupo en cascada.
 *
 * Flujo:
 * 1. Selección de Asignatura -> Carga docentes (si rol es ESTUDIANTE u OPERADOR) o grupos directamente (si rol es DOCENTE).
 * 2. Selección de Docente -> Carga grupos impartidos por ese docente en la asignatura elegida.
 * 3. Selección de Grupo -> Emite el idGrupo seleccionado mediante onSeleccionGrupo.
 */
export default function SeleccionAsignaturaGrupo({
  rol = "ESTUDIANTE",
  onSeleccionGrupo,
  idGrupoSeleccionado = "",
  mostrarLabel = true,
}) {
  const [listAsignaturas, setListAsignaturas] = useState([]);
  const [idAsignatura, setIdAsignatura] = useState("");
  const [listDocentes, setListDocentes] = useState([]);
  const [idDocente, setIdDocente] = useState("");
  const [listGrupos, setListGrupos] = useState([]);
  const [idGrupo, setIdGrupo] = useState(idGrupoSeleccionado);
  const [boolCargando, setBoolCargando] = useState(false);
  const [strError, setStrError] = useState("");

  const boolEsDocente = rol === "DOCENTE";

  // 1. Cargar todas las asignaturas al montar
  useEffect(() => {
    let montado = true;
    setBoolCargando(true);
    obtenerAsignaturas()
      .then((data) => {
        if (montado) {
          setListAsignaturas(data || []);
          setStrError("");
        }
      })
      .catch((err) => {
        if (montado) {
          console.error("Error al obtener asignaturas:", err);
          setStrError("No se pudieron cargar las asignaturas.");
        }
      })
      .finally(() => {
        if (montado) setBoolCargando(false);
      });

    return () => {
      montado = false;
    };
  }, []);

  // 2. Al cambiar la Asignatura
  const fnCambiarAsignatura = async (e) => {
    const asigId = e.target.value;
    setIdAsignatura(asigId);
    setIdDocente("");
    setIdGrupo("");
    setListDocentes([]);
    setListGrupos([]);
    if (onSeleccionGrupo) onSeleccionGrupo(null);

    if (!asigId) return;

    setBoolCargando(true);
    try {
      if (boolEsDocente) {
        // Docente ve directamente los grupos de la asignatura
        const grupos = await obtenerGruposPorAsignatura(asigId);
        setListGrupos(grupos || []);
      } else {
        // Estudiante u Operador (Ayudante): primero selecciona al docente de la asignatura
        const docentes = await obtenerDocentesPorAsignatura(asigId);
        setListDocentes(docentes || []);
      }
    } catch (err) {
      console.error("Error al cambiar asignatura:", err);
      setStrError("Error al cargar los datos de la asignatura.");
    } finally {
      setBoolCargando(false);
    }
  };

  // 3. Al cambiar el Docente (solo para Estudiante/Ayudante)
  const fnCambiarDocente = async (e) => {
    const docId = e.target.value;
    setIdDocente(docId);
    setIdGrupo("");
    setListGrupos([]);
    if (onSeleccionGrupo) onSeleccionGrupo(null);

    if (!docId || !idAsignatura) return;

    setBoolCargando(true);
    try {
      const grupos = await obtenerGruposPorDocente(idAsignatura, docId);
      setListGrupos(grupos || []);
    } catch (err) {
      console.error("Error al cargar grupos del docente:", err);
      setStrError("Error al cargar los grupos del docente seleccionado.");
    } finally {
      setBoolCargando(false);
    }
  };

  // 4. Al cambiar el Grupo
  const fnCambiarGrupo = (e) => {
    const gId = e.target.value;
    setIdGrupo(gId);
    if (onSeleccionGrupo) {
      onSeleccionGrupo(gId ? Number(gId) : null);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border-card rounded-lg bg-bg-card/50">
      {mostrarLabel && (
        <h4 className="text-secondary font-bold text-primary-navy">
          Vinculación Académica (Asignatura y Grupo)
        </h4>
      )}

      {strError && <p className="text-sm font-semibold text-accent-red">{textoInterfaz(strError)}</p>}

      {/* 1º Desplegable: Asignatura */}
      <div>
        <label className="block text-sm font-medium text-text-body mb-1">
          1. Seleccione Asignatura:
        </label>
        <select
          value={idAsignatura}
          onChange={fnCambiarAsignatura}
          disabled={boolCargando}
          className="w-full p-2 border border-border-card rounded-md bg-white text-text-body focus:ring-2 focus:ring-primary-blue outline-none"
        >
          <option value="">-- Elija una asignatura --</option>
          {listAsignaturas.map((a) => (
            <option key={a.idAsignatura} value={a.idAsignatura}>
              {a.siglaAsignatura ? `[${a.siglaAsignatura}] ` : ""}
              {textoAsignatura(a.nombreAsignatura)}
            </option>
          ))}
        </select>
      </div>

      {/* 2º Desplegable: Docente (si no es rol DOCENTE) */}
      {!boolEsDocente && idAsignatura && (
        <div>
          <label className="block text-sm font-medium text-text-body mb-1">
            2. Seleccione Docente:
          </label>
          <select
            value={idDocente}
            onChange={fnCambiarDocente}
            disabled={boolCargando || listDocentes.length === 0}
            className="w-full p-2 border border-border-card rounded-md bg-white text-text-body focus:ring-2 focus:ring-primary-blue outline-none"
          >
            <option value="">
              {listDocentes.length === 0
                ? "Sin docentes asignados en esta asignatura"
                : "-- Elija el docente --"}
            </option>
            {listDocentes.map((d) => (
              <option key={d.idUsuario} value={d.idUsuario}>
                {textoNombre(d.nombreCompleto)} (SIS: {d.codSisDocente || d.idUsuario})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3º Desplegable: Grupo */}
      {idAsignatura && (boolEsDocente || idDocente) && (
        <div>
          <label className="block text-sm font-medium text-text-body mb-1">
            {boolEsDocente ? "2. Seleccione Grupo:" : "3. Seleccione Grupo:"}
          </label>
          <select
            value={idGrupo}
            onChange={fnCambiarGrupo}
            disabled={boolCargando || listGrupos.length === 0}
            className="w-full p-2 border border-border-card rounded-md bg-white text-text-body focus:ring-2 focus:ring-primary-blue outline-none"
          >
            <option value="">
              {listGrupos.length === 0
                ? "Sin grupos disponibles"
                : "-- Elija el grupo --"}
            </option>
            {listGrupos.map((g) => (
              <option key={g.idGrupo} value={g.idGrupo}>
                {g.nombreGrupo} {g.horarios ? `(${g.horarios})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
