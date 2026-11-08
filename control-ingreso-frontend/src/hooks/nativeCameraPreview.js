import { Capacitor } from "@capacitor/core";
import { CameraPreview } from "@capacitor-community/camera-preview";

export const esCamaraNativa = () => Capacitor.isNativePlatform();

export async function solicitarPermisosCamara() {
  if (esCamaraNativa() && typeof CameraPreview.requestPermissions === "function") {
    try {
      await CameraPreview.requestPermissions();
    } catch {}
  }
  if (navigator?.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.warn("[solicitarPermisosCamara] Permiso o dispositivo de cámara no disponible:", err);
      return false;
    }
  }
  return false;
}

export async function iniciarPreviewNativo(position = "front") {
  if (!esCamaraNativa()) return false;
  try {
    const otorgado = await solicitarPermisosCamara();
    if (!otorgado) return false;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    await CameraPreview.start({
      position,
      toBack: true,
      parent: "cameraPreview",
      className: "camera-preview",
      disableAudio: true
    });
    return true;
  } catch (err) {
    console.warn("[nativeCameraPreview] Error al iniciar preview nativo:", err);
    return false;
  }
}

export async function detenerPreviewNativo() {
  if (!esCamaraNativa()) return;
  try {
    await CameraPreview.stop();
  } catch {}
  document.documentElement.style.background = "";
  document.body.style.background = "";
}

export async function capturarFrameNativo(canvas) {
  const muestra = await CameraPreview.captureSample({ quality: 85 });
  const imagen = new Image();
  await new Promise((resolve, reject) => {
    imagen.onload = resolve;
    imagen.onerror = reject;
    imagen.src = `data:image/jpeg;base64,${muestra.value}`;
  });
  if (canvas) {
    canvas.width = imagen.naturalWidth;
    canvas.height = imagen.naturalHeight;
    canvas.getContext("2d").drawImage(imagen, 0, 0);
  }
  return canvas;
}
