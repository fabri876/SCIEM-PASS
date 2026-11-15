import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  History,
  ShieldAlert,
  UserCheck,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import ModalIncidencia from "./ModalIncidencia";
import ModalHistorialIncidencias from "./ModalHistorialIncidencias";
import ModalIngresoExcepcional from "./ModalIngresoExcepcional";
import { db } from "../../offline/db";
import { ESTADO_SYNC } from "../../offline/constantes";
import { estaOfflineIncidencia } from "../../offline/incidenciaOffline";
import { etiquetaAula } from "./utilidadesIncidencias";

const ESTADOS_EN_COLA = [ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING];

async function contarEnCola(tabla) {
  return await db[tabla].where("syncStatus").anyOf(ESTADOS_EN_COLA).count();
}

/**
 * Panel único de incidencias dentro del control de ingreso (HU21).
 *
 * Reúne las tres acciones de la sección standalone —registrar incidencia,
 * historial e ingreso excepcional— pero siempre sobre el examen/aula abierto y
 * con soporte offline: todo se encola en el dispositivo y se sincroniza al
 * recuperar la conexión.
 */
export default function PanelIncidencias({
  boolAbierto,
  onCerrar,
  idExamen,
  idAmbiente,
  aulaIncidenciaActual = null,
  boolExamenActivo = true,
  rol = "DOCENTE",
}) {
  const [boolOffline, setBoolOffline] = useState(false);
  const [contadores, setContadores] = useState({
    incidencias: 0,
    evidencias: 0,
    revocaciones: 0,
    excepcionales: 0,
    excepcionalesConError: 0,
    incidenciasCanceladas: 0,
  });
  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [modalExcepcional, setModalExcepcional] = useState(false);
  const [estudianteParaIncidencia, setEstudianteParaIncidencia] = useState(null);

  const fnCargarEstado = useCallback(async () => {
    try {
      const [offline, incidencias, evidencias, revocaciones, excepcionales, excepcionalesConError] =
        await Promise.all([
          estaOfflineIncidencia(),
          contarEnCola("incidencias_pendientes"),
          contarEnCola("evidencias_pendientes"),
          contarEnCola("revocaciones_pendientes"),
          contarEnCola("ingresos_excepcionales_pendientes"),
          // Los rechazados por el servidor no se reintentan, pero deben verse
          // para que el docente sepa que quedaron sin registrar.
          db.ingresos_excepcionales_pendientes
            .where("syncStatus")
            .equals(ESTADO_SYNC.ERROR)
            .count(),
        ]);
      // Incidencias descartadas por examen cancelado (no se reintentan).
      const incidenciasCanceladas = (await db.incidencias_pendientes
        .where("syncStatus")
        .equals(ESTADO_SYNC.ERROR)
        .toArray()).filter((i) => String(i.ultimoError || "").includes("Examen cancelado")).length;
      setBoolOffline(offline);
      setContadores({ incidencias, evidencias, revocaciones, excepcionales, excepcionalesConError, incidenciasCanceladas });
    } catch {
      // Sin datos locales se muestran los contadores en cero.
    }
  }, []);

  useEffect(() => {
    if (!boolAbierto) return undefined;
    // Se difiere al siguiente tick: el efecto solo sincroniza con el sistema
    // externo (Dexie/conectividad) y no debe disparar renders en cascada.
    const temporizador = setTimeout(fnCargarEstado, 0);
    const fnActualizar = () => fnCargarEstado();
    window.addEventListener("incidencias:actualizadas", fnActualizar);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("incidencias:actualizadas", fnActualizar);
    };
  }, [boolAbierto, fnCargarEstado]);

  // Cerrar con ESC, igual que la "X" de la cabecera.
  // Si hay un modal hijo abierto (registrar, historial, excepcional), el ESC
  // lo cierra a él: el panel espera a que se cierre el de arriba.
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnTecla = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (modalIncidencia || modalHistorial || modalExcepcional) return;
        if (onCerrar) onCerrar();
      }
    };
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, modalIncidencia, modalHistorial, modalExcepcional, onCerrar]);

  const fnCerrarTodo = () => {
    setModalIncidencia(false);
    setModalHistorial(false);
    setModalExcepcional(false);
    setEstudianteParaIncidencia(null);
    if (onCerrar) onCerrar();
  };

  const fnAbrirIncidencia = () => {
    setEstudianteParaIncidencia(null);
    setModalIncidencia(true);
  };

  if (!boolAbierto) return null;

  const aulas = aulaIncidenciaActual ? [aulaIncidenciaActual] : [];
  const idAmbienteAula = idAmbiente ?? aulaIncidenciaActual?.idAmbiente ?? null;
  const pendientesIncidencias = contadores.incidencias + contadores.evidencias + contadores.revocaciones;

  const opciones = [
    {
      clave: "incidencia",
      icono: ShieldAlert,
      titulo: "Registrar incidencia",
      descripcion: "Suplantación, objeto prohibido, conducta inapropiada, falla técnica u otro.",
      pendientes: contadores.incidencias,
      onClick: fnAbrirIncidencia,
    },
    {
      clave: "historial",
      icono: History,
      titulo: "Historial de incidencias",
      descripcion: "Consulta las incidencias de este examen, las expulsiones y los envíos pendientes.",
      pendientes: pendientesIncidencias,
      onClick: () => setModalHistorial(true),
    },
    {
      clave: "excepcional",
      icono: UserCheck,
      titulo: "Ingresos excepcionales",
      descripcion: "Autoriza el ingreso con carnet faltante, fuera de lista, llegada tardía o fallo facial.",
      pendientes: contadores.excepcionales,
      errores: contadores.excepcionalesConError,
      onClick: () => setModalExcepcional(true),
    },
    {
      clave: "canceladas",
      icono: AlertTriangle,
      titulo: "Exámenes cancelados",
      descripcion: "Incidencias que no se registraron porque el examen fue cancelado.",
      pendientes: contadores.incidenciasCanceladas,
      onClick: () => setModalHistorial(true),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-[#CBD5E1] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#08264A] via-[#003770] to-[#1860A3] text-white p-5 relative">
          <button
            type="button"
            onClick={fnCerrarTodo}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Incidencias</span>
          </div>
          <h3 className="text-lg font-black tracking-tight pr-8">
            {aulaIncidenciaActual?.asignatura || "Examen actual"}
          </h3>
          <p className="text-xs text-white/90 font-medium mt-0.5">
            {aulaIncidenciaActual ? etiquetaAula(aulaIncidenciaActual) : "Aula asignada"}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                boolOffline ? "bg-[#B91C1C] text-white" : "bg-white/20 text-white border border-white/30"
              }`}
            >
              {boolOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              <span>{boolOffline ? "Sin conexión" : "Con conexión"}</span>
            </span>
            {!boolExamenActivo && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FEF9E7] text-[#92400E] text-[10px] font-black uppercase tracking-wider">
                Examen fuera de horario
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-3">
          {boolOffline && (
            <div className="bg-[#FEF9E7] border border-[#FDE68A] text-[#92400E] rounded-xl p-3 text-xs font-bold flex items-start gap-2">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Modo sin conexión: los registros se guardan en este dispositivo y se envían
                automáticamente al recuperar la señal.
              </span>
            </div>
          )}

          {opciones
            .filter((opcion) => !(opcion.clave === "incidencia" && rol !== "DOCENTE"))
            .filter((opcion) => !(opcion.clave === "canceladas" && contadores.incidenciasCanceladas === 0))
            .map((opcion) => {
            const Icono = opcion.icono;
            return (
              <button
                key={opcion.clave}
                type="button"
                onClick={opcion.onClick}
                className="w-full text-left border border-[#CBD5E1] hover:border-[#4A97D3] hover:bg-[#F0F6FC] rounded-2xl p-3.5 flex items-center gap-3 transition cursor-pointer group"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] flex items-center justify-center">
                  <Icono className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-[#003770]">{opcion.titulo}</span>
                    {opcion.pendientes > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-black uppercase tracking-wider">
                        {opcion.pendientes} sin enviar
                      </span>
                    )}
                    {opcion.errores > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEF9E7] text-[#92400E] text-[10px] font-black uppercase tracking-wider">
                        {opcion.errores} con error
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-[#7A8BA0] font-semibold mt-0.5">
                    {opcion.descripcion}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#9AA8BA] group-hover:text-[#4A97D3] shrink-0" />
              </button>
            );
          })}

          <p className="text-[10.5px] text-[#9AA8BA] font-semibold leading-relaxed pt-1">
            Las expulsiones y los ingresos excepcionales solo se autorizan mientras el examen está
            en curso. El historial y las incidencias quedan disponibles para su envío posterior.
          </p>
        </div>
      </div>

      <ModalIncidencia
        boolAbierto={modalIncidencia}
        onCerrar={() => {
          setModalIncidencia(false);
          setEstudianteParaIncidencia(null);
          fnCargarEstado();
        }}
        aulasDisponibles={aulas}
        aulaPreseleccionada={aulaIncidenciaActual}
        boolAulaFija
        boolExamenActivo={boolExamenActivo}
        estudianteInicial={estudianteParaIncidencia}
        onExito={fnCargarEstado}
      />

      <ModalHistorialIncidencias
        boolAbierto={modalHistorial}
        onCerrar={() => {
          setModalHistorial(false);
          fnCargarEstado();
        }}
        idExamen={Number(idExamen)}
        idAmbiente={idAmbienteAula ? Number(idAmbienteAula) : null}
        rol={rol}
      />

      <ModalIngresoExcepcional
        boolAbierto={modalExcepcional}
        onCerrar={() => {
          setModalExcepcional(false);
          fnCargarEstado();
        }}
        aulasDisponibles={aulas}
        aulaPreseleccionada={aulaIncidenciaActual}
        idAmbienteBloqueado={idAmbienteAula}
        onExito={fnCargarEstado}
        onAbrirIncidenciaConEstudiante={(estudiante) => {
          setEstudianteParaIncidencia(estudiante);
          setModalExcepcional(false);
          setModalIncidencia(true);
        }}
      />
    </div>
  );
}
