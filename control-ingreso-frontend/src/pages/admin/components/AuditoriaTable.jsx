import HistorialInmodificable from "./HistorialInmodificable";

/**
 * AuditoriaTable (HU15 / HU16):
 * Delegado al componente oficial del Historial Inmodificable con garantías WORM y SHA-256.
 */
export default function AuditoriaTable(props) {
  return <HistorialInmodificable {...props} />;
}
