import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Camera, ScanFace, SwitchCamera, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import useHumanFace from "../../../hooks/useHumanFace";
import { obtenerUsuarioActual } from "../../../services/authService";
import { generarUuid } from "../../../offline/uuid";
import { obtenerDeviceId } from "../../../offline/deviceId";
import { pinService } from "../../../offline/pinService";
import { descargarPaqueteFacial } from "../../../offline/paqueteFacial";
import { aHoraLocalIso } from "../../../offline/fechaLocal";
import {
  obtenerPaqueteFacial,
  encolarIntentoFacial,
  inicializarFacialSqlite
} from "../../../offline/facialSqliteDb";
import { solicitarPermisosCamara, detenerPreviewNativo } from "../../../hooks/nativeCameraPreview";
import AvatarConFoto from "../../../components/common/AvatarConFoto";

const UMBRAL_SIMILITUD = 0.82;
const UMBRAL_LIVENESS = 0.70;
const INTENTOS_FRAME = 3;
const PAUSA_FRAME_MS = 120;
const MAX_INTENTOS_ESTUDIANTE = 3;
const MODELO_FACIAL = "human-local-v1";

function normalizarIdExamen(valor) {
  const texto = String(valor ?? "");
  const partes = texto.includes("-") ? texto.split("-") : [];
  const numero = Number(partes[1] ?? valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function filtrarVigentes(lista) {
  const ahora = Date.now();
  return (lista || []).filter((item) => {
    if (!item.expiraEn) return true;
    const vence = new Date(item.expiraEn).getTime();
    return Number.isNaN(vence) || vence > ahora;
  });
}

function leerEmbedding(valor) {
  try {
    const vector = JSON.parse(valor || "[]");
    return Array.isArray(vector) ? vector : [];
  } catch {
    return [];
  }
}

/**
 * Verificación facial de la fase 2. No tiene selector: trabaja con el
 * estudiante que la fase 1 ya identificó. Si no tiene enrolamiento, el paquete
 * no está disponible o se agotan los intentos, avisa al contenedor para que
 * aplique la regla online (excepcional) u offline (registro sin facial).
 */
export default function ControlFacialCamera({
  idExamen,
  idAsignatura,
  idAmbiente,
  estudianteIdentificado = null,
  boolSinRed = false,
  onVerificado,
  onSinEnrolamiento,
  onFalloFacial,
  onCancelar,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const refFallback = useRef("");
  const { listo, detectarRostro, compararSimilitud } = useHumanFace();

  const [paquete, setPaquete] = useState([]);
  const [boolPaqueteCargado, setBoolPaqueteCargado] = useState(false);
  const [estado, setEstado] = useState("Cargando paquete facial del examen...");
  const [intentos, setIntentos] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // Trasera por defecto
  const [camaraActiva, setCamaraActiva] = useState(false);

  const usuario = obtenerUsuarioActual();
  const idOperador = usuario?.idUsuario ?? usuario?.idusuario;
  const idExamenNum = useMemo(() => normalizarIdExamen(idExamen), [idExamen]);

  // El estudiante se busca en el paquete facial por SIS o por id de usuario.
  const estudiante = useMemo(() => {
    const sis = String(estudianteIdentificado?.codsisEstudiante ?? estudianteIdentificado?.sis ?? "");
    const idu = String(estudianteIdentificado?.idUsuarioEstudiante ?? estudianteIdentificado?.idusuario ?? "");
    return (
      paquete.find(
        (item) =>
          (sis && String(item.codsisEstudiante) === sis) ||
          (idu && String(item.idUsuarioEstudiante) === idu)
      ) || null
    );
  }, [paquete, estudianteIdentificado]);

  const nombreEstudiante =
    estudiante?.nombreCompleto ||
    `${estudianteIdentificado?.nombres || ""} ${estudianteIdentificado?.apellidos || ""}`.trim() ||
    "Estudiante identificado";
  const sisEstudiante =
    estudiante?.codsisEstudiante ??
    estudianteIdentificado?.codsisEstudiante ??
    estudianteIdentificado?.sis ??
    "";
  const idUsuarioEstudiante =
    estudiante?.idUsuarioEstudiante ??
    estudianteIdentificado?.idUsuarioEstudiante ??
    estudianteIdentificado?.idusuario ??
    null;

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detenerPreviewNativo();
    setCamaraActiva(false);
  }, []);

  useEffect(() => {
    return () => detenerCamara();
  }, [detenerCamara]);

  /** Carga el paquete del examen; si falta y hay red, lo descarga una vez. */
  const cargarPaquete = useCallback(async ({ descargarSiFalta = true } = {}) => {
    if (!idExamenNum) {
      setPaquete([]);
      setEstado("No se pudo identificar el examen. Vuelve a la lista de exámenes.");
      setBoolPaqueteCargado(true);
      return;
    }
    try {
      const passphrase = idOperador ? await pinService.obtenerPinHash(idOperador) : null;
      await inicializarFacialSqlite({ passphrase });

      let guardados = await obtenerPaqueteFacial({ idExamen: idExamenNum, idAmbiente });
      let vigentes = filtrarVigentes(guardados);

      const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
      if (vigentes.length === 0 && descargarSiFalta && !boolSinRed && online) {
        try {
          await descargarPaqueteFacial(idExamenNum);
          guardados = await obtenerPaqueteFacial({ idExamen: idExamenNum, idAmbiente });
          vigentes = filtrarVigentes(guardados);
        } catch (error) {
          console.warn("[ControlFacialCamera] No se pudo descargar el paquete facial:", error);
        }
      }

      setPaquete(vigentes);
      setEstado(
        vigentes.length > 0
          ? `${vigentes.length} estudiantes disponibles para verificación offline.`
          : "Paquete facial no disponible."
      );
    } catch (error) {
      console.warn("[ControlFacialCamera] Error al cargar el paquete facial:", error);
      const mensaje = String(error?.message || "");
      setPaquete([]);
      setEstado(
        mensaje.includes("PIN")
          ? mensaje
          : "No se pudo abrir el paquete facial. Vuelve a 'Descargar nómina'."
      );
    } finally {
      setBoolPaqueteCargado(true);
    }
  }, [boolSinRed, idAmbiente, idExamenNum, idOperador]);

  useEffect(() => {
    void cargarPaquete();
  }, [cargarPaquete]);

  /**
   * Decide una sola vez qué hacer con el estudiante: sin enrolamiento, sin
   * paquete o listo para el facial. El contenedor aplica la regla online/offline.
   */
  useEffect(() => {
    if (!boolPaqueteCargado || refFallback.current) return;

    if (paquete.length === 0) {
      refFallback.current = "paquete";
      setEstado("Paquete facial no disponible. Se continuará sin verificación facial.");
      onFalloFacial?.("paquete_no_disponible");
      return;
    }

    if (!estudiante) {
      refFallback.current = "sin_enrolamiento";
      setEstado("El estudiante no figura en el paquete facial (sin enrolamiento).");
      onSinEnrolamiento?.();
      return;
    }

    if (estudiante.requiereIngresoManual) {
      refFallback.current = "sin_enrolamiento";
      setEstado("El estudiante no tiene enrolamiento facial activo.");
      onSinEnrolamiento?.();
      return;
    }

    if (leerEmbedding(estudiante.embedding).length === 0) {
      refFallback.current = "sin_enrolamiento";
      setEstado("El estudiante no tiene un vector facial válido.");
      onSinEnrolamiento?.();
      return;
    }

    setEstado(`Rostro de ${nombreEstudiante} listo para verificar.`);
  }, [boolPaqueteCargado, paquete, estudiante, nombreEstudiante, onFalloFacial, onSinEnrolamiento]);

  const iniciarCamara = useCallback(async (modo = facingMode) => {
    detenerCamara();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modo,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamaraActiva(true);
      setEstado(`Cámara activa. Verifica el rostro de ${nombreEstudiante}.`);
      return true;
    } catch (err) {
      console.warn("[ControlFacialCamera] Error con getUserMedia:", err);
      const permiso = await solicitarPermisosCamara();
      if (permiso) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: modo, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
          setCamaraActiva(true);
          setEstado(`Cámara activa. Verifica el rostro de ${nombreEstudiante}.`);
          return true;
        } catch {
          // sigue al fallback
        }
      }
      setCamaraActiva(false);
      setEstado("No se pudo iniciar la cámara. Se continuará sin verificación facial.");
      return false;
    }
  }, [detenerCamara, facingMode, nombreEstudiante]);

  const fnNotificarFalloCamara = useCallback(() => {
    if (refFallback.current) return;
    refFallback.current = "camara";
    onFalloFacial?.("camara_no_disponible");
  }, [onFalloFacial]);

  const cambiarCamara = async () => {
    const nuevoModo = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nuevoModo);
    const ok = await iniciarCamara(nuevoModo);
    if (!ok) fnNotificarFalloCamara();
  };

  const esperarVideoListo = useCallback(async (timeoutMs = 1500) => {
    const inicio = Date.now();
    while (videoRef.current && videoRef.current.readyState < 2) {
      if (Date.now() - inicio > timeoutMs) return false;
      await new Promise((resolver) => setTimeout(resolver, 100));
    }
    return Boolean(videoRef.current);
  }, []);

  const verificar = async () => {
    if (!estudiante) {
      setEstado("No se pudo reconocer al estudiante en el paquete facial.");
      return;
    }
    // Sin estos datos el backend rechaza la marcación y la fila local no puede
    // insertarse (columnas NOT NULL). Es preferible avisar antes de capturar.
    if (!idExamenNum || !idAsignatura || !idAmbiente || !idOperador) {
      setEstado("Falta información del examen o del operador. Vuelve a la lista de exámenes e inténtalo de nuevo.");
      return;
    }

    const referencia = leerEmbedding(estudiante.embedding);
    if (referencia.length === 0) {
      setEstado("El estudiante no tiene un vector facial válido.");
      onSinEnrolamiento?.();
      return;
    }

    if (!camaraActiva || !videoRef.current) {
      const ok = await iniciarCamara();
      if (!ok) {
        fnNotificarFalloCamara();
        return;
      }
    }
    if (!(await esperarVideoListo())) {
      setEstado("La cámara aún no está lista. Intenta de nuevo en un momento.");
      return;
    }

    setProcesando(true);
    try {
      let mejor = null;
      for (let intento = 1; intento <= INTENTOS_FRAME; intento += 1) {
        setEstado(`Analizando rostro... (${intento}/${INTENTOS_FRAME})`);
        const lectura = await detectarRostro(videoRef.current);
        const similitud = lectura.embedding ? compararSimilitud(lectura.embedding, referencia) : 0;
        const liveness = Number(lectura.liveness || 0);
        const aprobado = Boolean(
          lectura.valido &&
          similitud >= UMBRAL_SIMILITUD &&
          liveness >= UMBRAL_LIVENESS
        );
        const candidato = { lectura, similitud, liveness, aprobado };
        const puntaje = (c) => (c.aprobado ? 2 : c.lectura.valido ? 1 : 0);
        if (
          !mejor ||
          puntaje(candidato) > puntaje(mejor) ||
          (puntaje(candidato) === puntaje(mejor) && similitud > mejor.similitud)
        ) {
          mejor = candidato;
        }
        if (aprobado) break;
        if (intento < INTENTOS_FRAME) {
          await new Promise((resolver) => setTimeout(resolver, PAUSA_FRAME_MS));
        }
      }

      const { lectura, similitud, aprobado } = mejor;
      const liveness = Number(mejor.liveness || 0);
      const deviceId = await obtenerDeviceId();

      // La cola facial guarda solo el intento (para auditoría). El ingreso
      // final va por el camino normal: POST /control/ingresos o batch-sync.
      await encolarIntentoFacial({
        clientUuid: generarUuid(),
        idUsuarioEstudiante: estudiante.idUsuarioEstudiante,
        idUsuarioOperador: idOperador,
        idAsignatura,
        idExamen: idExamenNum,
        idAmbiente,
        score: similitud,
        livenessScore: liveness,
        resultado: aprobado ? "autorizado" : "rechazado",
        deviceId,
        modelVersion: MODELO_FACIAL,
        capturadoEn: aHoraLocalIso()
      });

      if (aprobado) {
        setEstado(`AUTORIZADO: rostro verificado (similitud ${(similitud * 100).toFixed(0)}%). Registrando ingreso...`);
        onVerificado?.({
          scoreFacial: similitud,
          livenessScore: liveness,
          modelVersion: MODELO_FACIAL,
          deviceId
        });
      } else {
        const siguiente = intentos + 1;
        setIntentos(siguiente);
        const motivo = lectura.valido ? "" : ` ${lectura.motivo || ""}`;
        setEstado(
          `RECHAZADO: similitud ${(similitud * 100).toFixed(0)}% (liveness ${(liveness * 100).toFixed(0)}%).${motivo} Intento ${siguiente}/${MAX_INTENTOS_ESTUDIANTE}.`
        );
        if (siguiente >= MAX_INTENTOS_ESTUDIANTE) {
          refFallback.current = "intentos";
          setEstado("RECHAZADO: se agotaron los intentos faciales. Se derivará a ingreso excepcional.");
          onFalloFacial?.("intentos_agotados");
        }
      }
    } catch (error) {
      console.error("[ControlFacialCamera] Error en verificación:", error);
      setEstado(error.message || "No se pudo procesar la verificación facial.");
      fnNotificarFalloCamara();
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="pt-2 flex justify-center">
      <div className="w-full max-w-[560px] max-md:max-w-none space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <AvatarConFoto
              idUsuario={idUsuarioEstudiante}
              codigoSis={sisEstudiante}
              className="w-12 h-14 shrink-0 rounded-lg overflow-hidden border border-[#CBD5E1] bg-[#F1F5F9] flex items-center justify-center"
              fallback={<ScanFace className="w-6 h-6 text-[#64748B]" />}
            />
            <div className="min-w-0">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Paso 2 · Verificación facial obligatoria
            </p>
            <h3 className="m-0 text-[17px] font-bold text-[#08264A] truncate">{nombreEstudiante}</h3>
            <p className="m-0 text-xs font-semibold text-[#64748B]">
              SIS {sisEstudiante || "—"} · {estudianteIdentificado?.metodo || "Identificado"}
            </p>
            </div>
          </div>
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#1860A3] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cambiar
            </button>
          )}
        </div>

        {/* Visor 4:3: tarjeta centrada de 560 px en PC, ancho completo en móvil */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950 border-2 border-[#003770] flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${!camaraActiva ? "hidden" : ""}`}
          />

          {!camaraActiva && (
            <div className="text-center p-4 space-y-2">
              <Camera className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Cámara pausada</p>
              <button
                type="button"
                onClick={async () => {
                  const ok = await iniciarCamara();
                  if (!ok) fnNotificarFalloCamara();
                }}
                className="px-4 py-2 rounded-xl bg-[#003770] text-white text-xs font-bold hover:bg-[#124B83] cursor-pointer"
              >
                Activar cámara
              </button>
            </div>
          )}

          {camaraActiva && (
            <>
              {/* Guía ovalada */}
              <div className="pointer-events-none absolute inset-[12%] rounded-[50%] border-2 border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.3)]" />
              <button
                type="button"
                onClick={cambiarCamara}
                title="Cambiar cámara frontal/trasera"
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 text-white hover:bg-black/75 transition backdrop-blur-sm cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Estado del proceso */}
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
            estado.startsWith("AUTORIZADO")
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : estado.startsWith("RECHAZADO")
              ? "bg-rose-50 text-[#B91C1C] border border-rose-200"
              : "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]"
          }`}
        >
          {estado.startsWith("AUTORIZADO") ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#003770] shrink-0 mt-0.5" />
          )}
          <span>{estado}</span>
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-3 pt-1 max-md:grid-cols-1">
          <button
            type="button"
            onClick={async () => {
              if (camaraActiva) {
                detenerCamara();
              } else {
                const ok = await iniciarCamara();
                if (!ok) fnNotificarFalloCamara();
              }
            }}
            className="min-h-[46px] rounded-xl border border-[#003770] text-[#003770] hover:bg-[#F0F6FC] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            {camaraActiva ? "Detener cámara" : "Iniciar cámara"}
          </button>

          <button
            type="button"
            onClick={verificar}
            disabled={!listo || procesando || !estudiante || paquete.length === 0}
            className="min-h-[46px] rounded-xl bg-[#003770] hover:bg-[#124B83] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <ScanFace className="w-4 h-4" />
            {procesando ? "Verificando..." : "Verificar rostro"}
          </button>
        </div>
      </div>
    </div>
  );
}
