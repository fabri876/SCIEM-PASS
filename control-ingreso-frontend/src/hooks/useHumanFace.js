import { useCallback, useEffect, useState } from "react";
import Human from "@vladmandic/human";
import { humanConfig } from "../config/humanConfig";

let instancia;
let promesaInicializacion;

async function obtenerHuman() {
  if (instancia) return instancia;
  if (!promesaInicializacion) {
    promesaInicializacion = (async () => {
      const crear = async (backend) => {
        const human = new Human({ ...humanConfig, backend });
        await human.load();
        try {
          await human.warmup();
        } catch (error) {
          // warmup es una optimización: si falla, el modelo sigue siendo usable.
          console.warn(`[useHumanFace] warmup opcional falló en ${backend}:`, error);
        }
        return human;
      };
      try {
        return await crear("webgl");
      } catch {
        return await crear("wasm");
      }
    })().then((human) => {
      instancia = human;
      return human;
    }).catch((error) => {
      // No conservar una promesa rechazada: permite reintentar cuando los
      // modelos se descargaron incompletos o WebGL falló transitoriamente.
      promesaInicializacion = null;
      throw error;
    });
  }
  return promesaInicializacion;
}

/**
 * Umbrales por perfil. El enrolamiento es más estricto porque su vector será la
 * referencia de todos los ingresos; el control es más tolerante para no bloquear
 * a un estudiante legítimo por una condición momentánea.
 */
const PERFILES_CALIDAD = {
  control: {
    brilloMin: 55,
    brilloMax: 220,
    contrasteMin: 12,
    nitidezMin: 4,
    centradoX: 0.18,
    centradoY: 0.22,
    anchoMin: 0.22,
    anchoMax: 0.72,
  },
  enrolamiento: {
    brilloMin: 70,
    brilloMax: 190,
    contrasteMin: 18,
    nitidezMin: 6,
    centradoX: 0.12,
    centradoY: 0.15,
    anchoMin: 0.25,
    anchoMax: 0.60,
  },
};

/**
 * Analiza solo la región del rostro, no el cuadro completo: así un fondo
 * brillante o un contraluz no engañan al filtro de calidad.
 */
function analizarCalidad(elemento, caja, perfil) {
  const ancho = elemento.videoWidth || elemento.width || 0;
  const alto = elemento.videoHeight || elemento.height || 0;
  let x = 0;
  let y = 0;
  let w = ancho;
  let h = alto;
  if (Array.isArray(caja) && caja.length >= 4 && ancho > 0 && alto > 0) {
    const margenX = caja[2] * 0.10;
    const margenY = caja[3] * 0.10;
    x = Math.max(0, Math.floor(caja[0] - margenX));
    y = Math.max(0, Math.floor(caja[1] - margenY));
    w = Math.min(ancho - x, Math.ceil(caja[2] + margenX * 2));
    h = Math.min(alto - y, Math.ceil(caja[3] + margenY * 2));
  }
  if (w <= 0 || h <= 0) {
    return { brillo: 0, contraste: 0, nitidez: 0, suficiente: false };
  }

  const lado = 128;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(elemento, x, y, w, h, 0, 0, lado, lado);
  const data = contexto.getImageData(0, 0, lado, lado).data;

  const gris = new Float32Array(lado * lado);
  let suma = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const valor = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gris[p] = valor;
    suma += valor;
  }
  const brillo = suma / gris.length;

  let varianza = 0;
  for (let p = 0; p < gris.length; p += 1) {
    varianza += (gris[p] - brillo) ** 2;
  }
  const contraste = Math.sqrt(varianza / gris.length);

  let gradiente = 0;
  let muestras = 0;
  for (let fila = 1; fila < lado; fila += 1) {
    for (let col = 1; col < lado; col += 1) {
      const p = fila * lado + col;
      gradiente += Math.abs(gris[p] - gris[p - 1]) + Math.abs(gris[p] - gris[p - lado]);
      muestras += 1;
    }
  }
  const nitidez = muestras ? gradiente / muestras : 0;

  const suficiente =
    brillo >= perfil.brilloMin &&
    brillo <= perfil.brilloMax &&
    contraste >= perfil.contrasteMin &&
    nitidez >= perfil.nitidezMin;

  return { brillo, contraste, nitidez, suficiente };
}

function motivoCalidad(calidad, perfil) {
  if (calidad.brillo < perfil.brilloMin) {
    return "Tu rostro está muy oscuro. Busca luz de frente, sin contraluz.";
  }
  if (calidad.brillo > perfil.brilloMax) {
    return "Hay demasiada luz sobre tu rostro. Evita el sol directo.";
  }
  if (calidad.contraste < perfil.contrasteMin) {
    return "La imagen no tiene contraste suficiente. Mejora la iluminación.";
  }
  if (calidad.nitidez < perfil.nitidezMin) {
    return "La imagen está borrosa. Mantén la cámara estable y limpia el lente.";
  }
  return null;
}

export default function useHumanFace() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargarModelo = useCallback(async ({ reiniciar = false } = {}) => {
    if (reiniciar) {
      instancia = null;
      promesaInicializacion = null;
    }
    setListo(false);
    setError("");
    setCargando(true);
    try {
      await obtenerHuman();
      setListo(true);
    } catch (err) {
      console.warn("[useHumanFace] No se pudo inicializar Human:", err);
      setError("No se pudo cargar el modelo facial. Revisa tu conexión o vuelve a intentarlo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargarModelo(); }, [cargarModelo]);

  const detectarRostro = useCallback(async (elemento, { perfil = "control" } = {}) => {
    const config = PERFILES_CALIDAD[perfil] || PERFILES_CALIDAD.control;
    const human = await obtenerHuman();
    const resultado = await human.detect(elemento);
    const rostros = resultado.face || [];
    if (rostros.length !== 1) {
      return {
        valido: false,
        motivo: rostros.length ? "Solo una persona frente a la cámara" : "No se detectó un rostro",
      };
    }
    const rostro = rostros[0];
    const caja = rostro.box;
    const centroX = caja[0] + caja[2] / 2;
    const centroY = caja[1] + caja[3] / 2;
    const ancho = elemento.videoWidth || elemento.width;
    const alto = elemento.videoHeight || elemento.height;
    const centrado =
      Math.abs(centroX - ancho / 2) < ancho * config.centradoX &&
      Math.abs(centroY - alto / 2) < alto * config.centradoY;
    const distanciaCorrecta = caja[2] >= ancho * config.anchoMin && caja[2] <= ancho * config.anchoMax;
    const calidad = analizarCalidad(elemento, caja, config);
    const detalleCalidad = motivoCalidad(calidad, config);
    const embedding = rostro.embedding || rostro.descriptor || null;
    const liveness = Number(rostro.real ?? rostro.live ?? 0);
    const valido = Boolean(embedding && centrado && distanciaCorrecta && !detalleCalidad);
    const motivo = !embedding
      ? "No se pudo extraer el vector facial. Espera a que el modelo termine de cargar."
      : !centrado
        ? "Centra tu rostro dentro del marco guía"
        : !distanciaCorrecta
          ? "Acércate o aléjate hasta que tu rostro ocupe el marco"
          : detalleCalidad;
    return {
      valido,
      rostro,
      embedding,
      liveness,
      centrado,
      distanciaCorrecta,
      iluminacion: calidad,
      calidad,
      motivo,
    };
  }, []);

  const compararSimilitud = useCallback((actual, referencia) => {
    const a = Array.from(actual || []); const b = Array.from(referencia || []);
    if (!a.length || a.length !== b.length) return 0;
    let producto = 0; let normaA = 0; let normaB = 0;
    a.forEach((valor, indice) => { producto += valor * b[indice]; normaA += valor ** 2; normaB += b[indice] ** 2; });
    const coseno = producto / (Math.sqrt(normaA) * Math.sqrt(normaB) || 1);
    return Math.max(0, Math.min(1, (coseno + 1) / 2));
  }, []);
  return {
    listo,
    cargando,
    error,
    detectarRostro,
    compararSimilitud,
    recargarModelo: () => cargarModelo({ reiniciar: true }),
  };
}
