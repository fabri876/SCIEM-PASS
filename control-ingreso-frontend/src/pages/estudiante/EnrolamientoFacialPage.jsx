import { textoInterfaz } from '../../utils/textoInterfaz.js';
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import useHumanFace from "../../hooks/useHumanFace";
import { enrolarRostro, registrarConsentimientoFacial, obtenerEstadoEnrolamiento } from "../../services/facialService";
import { obtenerUsuarioActual } from "../../services/authService";
import { fotoRepo } from "../../offline/fotoRepo";
import { aHoraLocalIso } from "../../offline/fechaLocal";
import { solicitarPermisosCamara, detenerPreviewNativo } from "../../hooks/nativeCameraPreview";

const UMBRAL_LIVENESS_ENROLAMIENTO = 0.70;
const ESTABILIDAD_MS = 2000;

export default function EnrolamientoFacialPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const estableDesde = useRef(null);
  const deteccionEnCurso = useRef(false);
  const envioEnCurso = useRef(false);
  const navigate = useNavigate();

  const { listo, cargando: cargandoModelo, error: errorModelo, detectarRostro, recargarModelo } = useHumanFace();
  const [consentimiento, setConsentimiento] = useState(false);
  const [estado, setEstado] = useState("Acepta el consentimiento para iniciar.");
  const [valido, setValido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorPermiso, setErrorPermiso] = useState(false);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [estadoEnrolamiento, setEstadoEnrolamiento] = useState("cargando");

  useEffect(() => {
    let activo = true;
    obtenerEstadoEnrolamiento().then((dato) => {
      if (!activo) return;
      const actual = dato?.estado || "pendiente";
      setEstadoEnrolamiento(actual);
      if (actual === "activo") navigate("/estudiante", { replace: true });
    }).catch(() => activo && setEstadoEnrolamiento("error"));
    return () => { activo = false; };
  }, [navigate]);

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detenerPreviewNativo();
  }, []);

  const iniciarCamara = useCallback(async () => {
    setErrorPermiso(false);
    setIniciandoCamara(true);
    setEstado("Iniciando cámara frontal...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
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
      setEstado("Posiciona tu rostro dentro del marco guía.");
    } catch (err) {
      console.warn("[EnrolamientoFacial] Intento directo de cámara:", err);
      const concedido = await solicitarPermisosCamara();
      if (concedido) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }
          setEstado("Posiciona tu rostro dentro del marco guía.");
          return;
        } catch {}
      }
      setErrorPermiso(true);
      setEstado("No se pudo acceder a la cámara frontal. Por favor concede el permiso de cámara.");
    } finally {
      setIniciandoCamara(false);
    }
  }, []);

  useEffect(() => {
    if (!consentimiento) return;
    iniciarCamara();
    return () => detenerCamara();
  }, [consentimiento, iniciarCamara, detenerCamara]);

  // Bucle de inferencia con Human
  useEffect(() => {
    if (!consentimiento || errorPermiso) return;
    let activo = true;

    const intervalo = setInterval(async () => {
      // En teléfonos de gama media la inferencia puede tardar más de 300 ms.
      // No se deben superponer llamadas a Human.detect(), pues invalidan la
      // estabilidad del rostro y pueden bloquear el motor WebGL/WASM.
      if (!activo || !listo || deteccionEnCurso.current || !videoRef.current || videoRef.current.readyState < 2) return;

      try {
        deteccionEnCurso.current = true;
        const lectura = await detectarRostro(videoRef.current, { perfil: "enrolamiento" });
        if (!activo) return;
        setDiagnostico(lectura);

        const livenessOk = Number(lectura?.liveness || 0) >= UMBRAL_LIVENESS_ENROLAMIENTO;
        if (!lectura?.valido || !livenessOk) {
          estableDesde.current = null;
          setValido(false);
          setEstado(
            !lectura?.valido
              ? (lectura?.motivo || "Centra tu rostro frente a la cámara.")
              : "No se pudo confirmar que seas una persona real. Mira de frente y evita fotos o pantallas."
          );
          return;
        }

        if (!estableDesde.current) {
          estableDesde.current = Date.now();
          setEstado("Rostro detectado. Mantén la posición...");
        } else if (Date.now() - estableDesde.current >= ESTABILIDAD_MS) {
          setValido(true);
          setEstado("¡Rostro óptimo! Ya puedes capturar.");
        }
      } catch {
        if (activo) {
          estableDesde.current = null;
          setValido(false);
          setEstado("No se pudo analizar el rostro. Mantén la cámara estable e inténtalo de nuevo.");
        }
      } finally {
        deteccionEnCurso.current = false;
      }
    }, 300);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [consentimiento, listo, errorPermiso, detectarRostro]);

  useEffect(() => {
    if (!consentimiento) return;
    if (cargandoModelo) setEstado("Cargando verificación facial...");
    if (errorModelo) {
      setValido(false);
      setEstado(errorModelo);
    }
  }, [consentimiento, cargandoModelo, errorModelo]);

  const capturar = async () => {
    if (!videoRef.current || !valido || enviando || envioEnCurso.current) return;
    envioEnCurso.current = true;
    setEnviando(true);
    setEstado("Procesando enrolamiento...");

    try {
      const lectura = await detectarRostro(videoRef.current, { perfil: "enrolamiento" });
      if (!lectura?.valido || !lectura?.embedding) {
        throw new Error(lectura?.motivo || "No se pudo extraer el vector biométrico. Intenta de nuevo.");
      }
      if (Number(lectura.liveness || 0) < UMBRAL_LIVENESS_ENROLAMIENTO) {
        throw new Error("No se pudo confirmar que seas una persona real. Mira de frente a la cámara.");
      }

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.90));
      const formData = new FormData();
      formData.append("file", blob, "enrolamiento.jpg");
      formData.append("embedding", JSON.stringify(Array.from(lectura.embedding)));
      formData.append("modelVersion", "human-local-v1");
      formData.append("consentimientoAt", aHoraLocalIso());

      await enrolarRostro(formData);
      // Guardar la copia local solo despues de la confirmacion del servidor.
      const usuarioActual = obtenerUsuarioActual();
      if (usuarioActual?.codigoSis) {
        await fotoRepo.guardarMiniatura(usuarioActual.codigoSis, blob).catch(() => {});
      }
      setEstado("¡Enrolamiento facial completado con éxito!");
      detenerCamara();
      setTimeout(() => navigate("/estudiante", { replace: true }), 1000);
    } catch (err) {
      setEstado(err?.message || "No se pudo guardar el enrolamiento. Reintenta.");
      setValido(false);
      estableDesde.current = null;
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
    }
  };

  if (estadoEnrolamiento === "cargando") return null;
  if (estadoEnrolamiento === "bloqueado") return (
    <main className="min-h-screen bg-[var(--color-bg-app)] p-5 flex items-center justify-center">
      <section className="max-w-md rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-6 text-center text-[#B91C1C]">
        <AlertCircle className="mx-auto mb-3" /><h1 className="font-bold">Registro facial bloqueado</h1>
        <p className="mt-2 text-sm">Contacta a administración para habilitar tu re-enrolamiento.</p>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-[var(--color-bg-app)] font-sans p-4 flex items-center justify-center">
      <section className="w-full max-w-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-app)] flex items-center justify-center text-[var(--color-primary-blue)]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--color-primary-navy)]">
              Enrolamiento facial obligatorio
            </h1>
            <p className="text-xs text-[var(--color-text-body)]">
              Tu foto y vector biométrico son exclusivos para validar tu ingreso a exámenes.
            </p>
          </div>
        </div>

        {!consentimiento ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-border)] text-sm text-[var(--color-secondary-data)] leading-relaxed">
              <p className="font-bold text-[var(--color-primary-navy)] mb-1">Consentimiento informado:</p>
              Autorizo de forma expresa a la Universidad Mayor de San Simón a registrar una fotografía y extraer mi vector biométrico facial con la única finalidad de automatizar y proteger el control de acceso en exámenes presenciales.
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">Antes de capturar tu rostro:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Retira lentes, gorra, mascarilla y audífonos visibles.</li>
                <li>Aparta el cabello que cubra tu rostro.</li>
                <li>Busca luz de frente, sin ventana ni sol detrás de ti.</li>
                <li>Mira de frente a la cámara y mantente quieto 2 segundos.</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  setEstado("Registrando consentimiento...");
                  await registrarConsentimientoFacial();
                  setConsentimiento(true);
                } catch (error) {
                  setEstado(error.message || "No se pudo registrar tu consentimiento. Intenta nuevamente.");
                }
              }}
              className="w-full rounded-xl bg-[image:var(--gradient-button)] py-3 font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
            >
              Acepto y continuar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
              Sin lentes, gorra ni objetos que cubran tu rostro · Luz de frente · Mira a la cámara
            </div>
            <div
              id="cameraPreview"
              className={`relative aspect-[3/4] overflow-hidden rounded-3xl bg-slate-900 border-4 transition-colors duration-300 ${
                valido ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "border-[var(--color-accent-red)]"
              }`}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Guía de óvalo facial */}
              <div
                className={`absolute inset-[12%] rounded-[50%] border-2 transition-colors duration-300 pointer-events-none ${
                  valido ? "border-emerald-400 bg-emerald-500/10" : "border-white/80 border-dashed"
                }`}
              />

              {iniciandoCamara && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-xs font-bold">
                  Iniciando cámara...
                </div>
              )}

              {errorPermiso && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white p-4 text-center space-y-3">
                  <AlertCircle size={36} className="text-[var(--color-accent-red)]" />
                  <p className="text-xs font-semibold">{textoInterfaz(estado)}</p>
                  <button
                    type="button"
                    onClick={iniciarCamara}
                    className="px-4 py-2 rounded-xl bg-[var(--color-primary-blue)] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Reintentar permiso
                  </button>
                </div>
              )}
              {errorModelo && !errorPermiso && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white p-4 text-center space-y-3">
                  <AlertCircle size={36} className="text-[var(--color-accent-red)]" />
                  <p className="text-xs font-semibold">{errorModelo}</p>
                  <button
                    type="button"
                    onClick={recargarModelo}
                    className="px-4 py-2 rounded-xl bg-[var(--color-primary-blue)] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Reintentar modelo
                  </button>
                </div>
              )}
            </div>

            <div className="text-center min-h-[38px] flex items-center justify-center px-2">
              <p
                className={`text-xs font-bold ${
                  valido
                    ? "text-emerald-700"
                    : errorPermiso
                    ? "text-[var(--color-accent-red)]"
                    : "text-[var(--color-secondary-data)]"
                }`}
              >
                {textoInterfaz(estado)}
              </p>
            </div>

            {!errorModelo && diagnostico && !valido && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-app)] px-3 py-2 text-[11px] text-[var(--color-secondary-data)]" aria-live="polite">
                <span>{diagnostico.centrado ? "✓ Rostro centrado" : "○ Centra tu rostro"}</span>
                <span className="mx-2">·</span>
                <span>{diagnostico.distanciaCorrecta ? "✓ Distancia adecuada" : "○ Ajusta la distancia"}</span>
                <span className="mx-2">·</span>
                <span>{diagnostico.iluminacion?.suficiente ? "✓ Luz y nitidez" : "○ Mejora la luz o estabilidad"}</span>
                <span className="mx-2">·</span>
                <span>{Number(diagnostico.liveness || 0) >= UMBRAL_LIVENESS_ENROLAMIENTO ? "✓ Persona real" : "○ Verificando persona"}</span>
                <span className="mt-1 block opacity-70">
                  Luz {Math.round(diagnostico.iluminacion?.brillo ?? 0)} · Contraste {Math.round(diagnostico.iluminacion?.contraste ?? 0)} · Nitidez {(diagnostico.iluminacion?.nitidez ?? 0).toFixed(1)} · Liveness {Math.round((diagnostico.liveness ?? 0) * 100)}%
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!valido || enviando || cargandoModelo || Boolean(errorModelo)}
              onClick={capturar}
              className="w-full rounded-xl bg-[var(--color-primary-blue)] disabled:opacity-50 py-3 font-bold text-white flex justify-center items-center gap-2 shadow-sm transition-opacity"
            >
              <Camera size={18} />
              {enviando ? "Guardando enrolamiento..." : "Capturar y registrar"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
