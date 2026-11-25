import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, ScanFace, SwitchCamera, AlertCircle, CheckCircle2, ArrowLeft, ShieldAlert } from "lucide-react";
import useHumanFace from "../../../hooks/useHumanFace";
import { verificarRostroEstudiante } from "../../../services/facialService";
import { solicitarPermisosCamara, detenerPreviewNativo } from "../../../hooks/nativeCameraPreview";

const UMBRAL_LIVENESS = 0.70;
const MAX_INTENTOS = 3;

export default function ModalVerificacionFacialEstudiante({ examen, usuario, onVerificado, onCancelar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const activeStreamsRef = useRef(new Set());
  const unmountedRef = useRef(false);
  const { listo, detectarRostro } = useHumanFace();

  const [estado, setEstado] = useState("Iniciando cámara frontal...");
  const [tipoEstado, setTipoEstado] = useState("info"); // 'info' | 'exito' | 'error'
  const [procesando, setProcesando] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // Frontal por defecto para el estudiante
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [rostroDetectado, setRostroDetectado] = useState(false);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [bloqueadoPorIntentos, setBloqueadoPorIntentos] = useState(false);

  const strNombre = `${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim() || "Estudiante";
  const strSis = usuario?.codigoSis || usuario?.codsisEstudiante || "—";

  const detenerCamara = useCallback(() => {
    // 1. Detener todas las fuentes registradas
    activeStreamsRef.current.forEach((s) => {
      try {
        s.getTracks().forEach((t) => {
          try {
            t.enabled = false;
            t.stop();
          } catch {}
        });
      } catch {}
    });
    activeStreamsRef.current.clear();

    // 2. Detener stream principal
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.enabled = false;
            t.stop();
          } catch {}
        });
      } catch {}
      streamRef.current = null;
    }

    // 3. Limpiar elemento video del DOM
    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject instanceof MediaStream) {
          videoRef.current.srcObject.getTracks().forEach((t) => {
            try {
              t.enabled = false;
              t.stop();
            } catch {}
          });
        }
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }

    // 4. Detener preview nativo si aplica y apagar estado
    detenerPreviewNativo();
    setCamaraActiva(false);
    setRostroDetectado(false);
  }, []);

  const iniciarCamara = useCallback(async (modo = facingMode) => {
    detenerCamara();
    if (unmountedRef.current || bloqueadoPorIntentos) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modo,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      if (unmountedRef.current || bloqueadoPorIntentos) {
        stream.getTracks().forEach((t) => {
          try {
            t.enabled = false;
            t.stop();
          } catch {}
        });
        return false;
      }

      activeStreamsRef.current.add(stream);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCamaraActiva(true);
      setEstado("Ubica tu rostro dentro del marco guía y mira a la cámara.");
      setTipoEstado("info");
      return true;
    } catch (err) {
      console.warn("[VerificacionFacialEstudiante] Error con getUserMedia:", err);
      if (unmountedRef.current || bloqueadoPorIntentos) return false;

      const permiso = await solicitarPermisosCamara();
      if (permiso && !unmountedRef.current && !bloqueadoPorIntentos) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: modo, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          });

          if (unmountedRef.current || bloqueadoPorIntentos) {
            stream.getTracks().forEach((t) => {
              try {
                t.enabled = false;
                t.stop();
              } catch {}
            });
            return false;
          }

          activeStreamsRef.current.add(stream);
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          setCamaraActiva(true);
          setEstado("Ubica tu rostro dentro del marco guía y mira a la cámara.");
          setTipoEstado("info");
          return true;
        } catch {
          // fallo final
        }
      }

      if (!unmountedRef.current) {
        setCamaraActiva(false);
        setEstado("No se pudo acceder a la cámara. Concede los permisos necesarios.");
        setTipoEstado("error");
      }
      return false;
    }
  }, [facingMode, bloqueadoPorIntentos, detenerCamara]);

  useEffect(() => {
    unmountedRef.current = false;
    let activo = true;
    iniciarCamara().then((ok) => {
      if (!ok && activo && !unmountedRef.current && !bloqueadoPorIntentos) {
        setEstado("Presiona 'Activar cámara' para conceder permisos y comenzar.");
      }
    });
    return () => {
      activo = false;
      unmountedRef.current = true;
      detenerCamara();
    };
  }, [iniciarCamara, detenerCamara, bloqueadoPorIntentos]);

  const handleCancelar = () => {
    unmountedRef.current = true;
    detenerCamara();
    onCancelar?.();
  };

  // Alternar cámara frontal/trasera si el dispositivo lo soporta
  const cambiarCamara = async () => {
    if (bloqueadoPorIntentos) return;
    const nuevoModo = facingMode === "user" ? "environment" : "user";
    setFacingMode(nuevoModo);
    await iniciarCamara(nuevoModo);
  };

  // Monitoreo suave para feedback visual del marco guía
  useEffect(() => {
    if (!camaraActiva || !listo || procesando || bloqueadoPorIntentos) return;
    let activo = true;

    const intervalo = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const lectura = await detectarRostro(videoRef.current, { perfil: "verificacion" });
        if (activo) {
          setRostroDetectado(Boolean(lectura?.valido));
        }
      } catch {
        if (activo) setRostroDetectado(false);
      }
    }, 450);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [camaraActiva, listo, procesando, bloqueadoPorIntentos, detectarRostro]);

  const verificarIdentidad = async () => {
    if (!videoRef.current || procesando || !listo || bloqueadoPorIntentos) return;
    setProcesando(true);
    setEstado("Analizando rostro y prueba de vida...");
    setTipoEstado("info");

    try {
      const lectura = await detectarRostro(videoRef.current, { perfil: "verificacion" });
      if (!lectura?.valido || !lectura?.embedding) {
        throw new Error(lectura?.motivo || "No se detectó un rostro claro. Mira directamente a la cámara.");
      }

      if (Number(lectura.liveness || 0) < UMBRAL_LIVENESS) {
        throw new Error("No se pudo confirmar que seas una persona real. Evita fotos o reflejos.");
      }

      setEstado("Validando vector con la foto registrada en tu primer ingreso...");
      const embeddingStr = JSON.stringify(Array.from(lectura.embedding));
      const respuesta = await verificarRostroEstudiante({
        embedding: embeddingStr,
        livenessScore: Number(lectura.liveness || 0),
        idExamen: examen?.id || null,
      });

      if (respuesta?.autorizado) {
        // ÉXITO: Desactivar la cámara de inmediato y pasar al QR
        unmountedRef.current = true;
        detenerCamara();
        setTipoEstado("exito");
        setEstado("AUTORIZADO: ¡Identidad confirmada! Desbloqueando tu código QR...");
        setTimeout(() => {
          onVerificado?.();
        }, 800);
      } else {
        // FALLO: Incrementar intentos
        const nuevoConteo = intentosFallidos + 1;
        setIntentosFallidos(nuevoConteo);
        setTipoEstado("error");

        if (nuevoConteo >= MAX_INTENTOS) {
          // Intentos agotados: apagar cámara de inmediato y bloquear
          setBloqueadoPorIntentos(true);
          detenerCamara();
          setEstado(
            `RECHAZADO: Has agotado tus ${MAX_INTENTOS} intentos. Por seguridad, la credencial QR quedó bloqueada para este examen. Acude a la mesa de control.`
          );
        } else {
          // Aún quedan intentos: la cámara SE MANTIENE ACTIVA para reintentar
          setEstado(
            `RECHAZADO: ${respuesta?.mensaje || "Tu rostro no coincide con la foto inicial."} (Intento ${nuevoConteo}/${MAX_INTENTOS})`
          );
        }
      }
    } catch (err) {
      console.warn("[VerificacionFacialEstudiante] Error en verificación:", err);
      const nuevoConteo = intentosFallidos + 1;
      setIntentosFallidos(nuevoConteo);
      setTipoEstado("error");

      if (nuevoConteo >= MAX_INTENTOS) {
        // Intentos agotados por error: apagar cámara y bloquear
        setBloqueadoPorIntentos(true);
        detenerCamara();
        setEstado(
          `Has agotado tus ${MAX_INTENTOS} intentos permitidos. Por seguridad, consulta con tu docente en la mesa de control.`
        );
      } else {
        // Aún quedan intentos: la cámara SE MANTIENE ACTIVA para reintentar
        setEstado(`${err?.message || "Error al verificar."} (Intento ${nuevoConteo}/${MAX_INTENTOS})`);
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="pt-2 flex justify-center text-[#08264A]">
      <div className="w-full max-w-[560px] max-md:max-w-none space-y-4">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-bold tracking-wider text-[#64748B]">
              Control de acceso · Verificación biométrica obligatoria
            </p>
            <h3 className="m-0 text-[17px] font-bold text-[#08264A] truncate">{textoInterfaz(strNombre)}</h3>
            <p className="m-0 text-xs font-semibold text-[#64748B]">
              SIS {strSis} · {textoInterfaz(examen?.materia || "Examen presencial")}
            </p>
          </div>
          {onCancelar && (
            <button
              type="button"
              onClick={handleCancelar}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#1860A3] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
          )}
        </div>

        {/* Visor 4:3 con guía ovalada reactiva */}
        <div
          className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950 border-2 transition-colors duration-300 flex items-center justify-center ${
            bloqueadoPorIntentos
              ? "border-[#B91C1C]"
              : rostroDetectado
              ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              : "border-[#003770]"
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${!camaraActiva ? "hidden" : ""}`}
          />

          {!camaraActiva && (
            <div className="text-center p-4 space-y-2">
              {bloqueadoPorIntentos ? (
                <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
              ) : (
                <Camera className="w-10 h-10 text-slate-500 mx-auto" />
              )}
              <p className="text-xs text-slate-400 font-medium">
                {bloqueadoPorIntentos ? "Cámara bloqueada por seguridad" : "Cámara desactivada"}
              </p>
              {!bloqueadoPorIntentos && (
                <button
                  type="button"
                  onClick={() => iniciarCamara()}
                  className="px-4 py-2 rounded-xl bg-[#003770] text-white text-xs font-bold hover:bg-[#124B83] cursor-pointer"
                >
                  Activar cámara
                </button>
              )}
            </div>
          )}

          {camaraActiva && !bloqueadoPorIntentos && (
            <>
              {/* Guía ovalada */}
              <div
                className={`pointer-events-none absolute inset-[12%] rounded-[50%] border-2 transition-colors duration-300 ${
                  rostroDetectado
                    ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                    : "border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                }`}
              />
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

        {/* Banner de estado */}
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
            tipoEstado === "exito"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : tipoEstado === "error"
              ? "bg-rose-50 text-[#B91C1C] border border-rose-200"
              : "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]"
          }`}
        >
          {tipoEstado === "exito" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle
              className={`w-4 h-4 shrink-0 mt-0.5 ${tipoEstado === "error" ? "text-[#B91C1C]" : "text-[#003770]"}`}
            />
          )}
          <span>{textoInterfaz(estado)}</span>
        </div>

        {/* Controles de acción */}
        {bloqueadoPorIntentos ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleCancelar}
              className="w-full min-h-[46px] rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a mis exámenes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1 max-md:grid-cols-1">
            <button
              type="button"
              onClick={() => {
                if (camaraActiva) {
                  detenerCamara();
                } else {
                  iniciarCamara();
                }
              }}
              className="min-h-[46px] rounded-xl border border-[#003770] text-[#003770] hover:bg-[#F0F6FC] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              {camaraActiva ? "Detener cámara" : "Iniciar cámara"}
            </button>

            <button
              type="button"
              onClick={verificarIdentidad}
              disabled={!listo || procesando || !camaraActiva}
              className="min-h-[46px] rounded-xl bg-[#003770] hover:bg-[#124B83] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <ScanFace className="w-4 h-4" />
              {procesando ? "Verificando..." : "Verificar rostro"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
