/**
 * Configuración sin CDN: Vite y Capacitor empaquetan public/models dentro del APK.
 *
 * Solo se habilitan los modelos que existen en public/models/:
 * blazeface (detección), faceres (embedding) y antispoof.
 *
 * Human trae mesh, iris y emotion habilitados por defecto. Si se dejan activos,
 * intenta descargar facemesh.json, iris.json y emotion.json (ausentes) y
 * emotion.load() falla al leer `model.inputs` porque el modelo no tiene executor.
 * Ese error rechaza human.load() e impide el enrolamiento.
 */
export const humanConfig = {
  modelBasePath: "/models/",
  backend: "webgl",
  face: {
    enabled: true,
    detector: { enabled: true, modelPath: "blazeface.json" },
    mesh: { enabled: false },
    attention: { enabled: false },
    iris: { enabled: false },
    emotion: { enabled: false },
    liveness: { enabled: false },
    description: { enabled: true, modelPath: "faceres.json" },
    antispoof: { enabled: true, modelPath: "antispoof.json" },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
};
