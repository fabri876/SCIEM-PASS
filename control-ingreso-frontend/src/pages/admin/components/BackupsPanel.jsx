import { useState, useEffect, useCallback } from "react";
import { Database, Download, RotateCcw, AlertTriangle } from "lucide-react";
import {
    listarBackups,
    generarBackup,
    obtenerUrlDescarga,
    restaurarBackup,
    listarBitacoraBackups,
} from "../../../services/backupService";

const ID_SISTEMA = "00000000-0000-0000-0000-000000000000";

const fnFormatearFecha = (valor) => (valor ? new Date(valor).toLocaleString("es-BO") : "-");
const fnFormatearTamano = (bytes) => (bytes ? `${(bytes / 1024).toFixed(1)} KB` : "-");

const ETIQUETAS_ACCION = {
    GENERAR: "Generación manual",
    GENERAR_AUTO: "Generación automática",
    DESCARGAR: "Descarga",
    RESTAURAR: "Restauración",
    PRE_RESTAURACION: "Respaldo previo a restaurar",
};

export default function BackupsPanel({ onRestaurado }) {
    const [arrBackups, setArrBackups] = useState([]);
    const [arrBitacora, setArrBitacora] = useState([]);
    const [boolCargandoLista, setBoolCargandoLista] = useState(true);
    const [boolGenerando, setBoolGenerando] = useState(false);
    const [boolRestaurando, setBoolRestaurando] = useState(false);
    const [objMensaje, setObjMensaje] = useState(null);
    const [strSeleccionado, setStrSeleccionado] = useState(null);
    const [strConfirmacion, setStrConfirmacion] = useState("");

    const fnCargarDatos = useCallback(async () => {
        try {
            const [backups, bitacora] = await Promise.all([listarBackups(), listarBitacoraBackups()]);
            setArrBackups(backups || []);
            setArrBitacora(bitacora || []);
        } catch (error) {
            setObjMensaje({ tipo: "error", texto: error.message });
        } finally {
            setBoolCargandoLista(false);
        }
    }, []);

    useEffect(() => {
        fnCargarDatos();
    }, [fnCargarDatos]);

    const fnGenerar = async () => {
        setBoolGenerando(true);
        setObjMensaje(null);
        try {
            await generarBackup();
            setObjMensaje({ tipo: "ok", texto: "Copia de seguridad generada correctamente." });
        } catch (error) {
            setObjMensaje({ tipo: "error", texto: error.message });
        } finally {
            setBoolGenerando(false);
            fnCargarDatos();
        }
    };

    const fnDescargar = async (strNombre) => {
        setObjMensaje(null);
        try {
            const { url } = await obtenerUrlDescarga(strNombre);
            window.location.href = url;
        } catch (error) {
            setObjMensaje({ tipo: "error", texto: error.message });
        } finally {
            fnCargarDatos();
        }
    };

    const fnCerrarModal = () => {
        if (boolRestaurando) return;
        setStrSeleccionado(null);
        setStrConfirmacion("");
    };

    const fnRestaurar = async () => {
        setBoolRestaurando(true);
        setObjMensaje(null);
        try {
            await restaurarBackup(strSeleccionado);
            setObjMensaje({ tipo: "ok", texto: `Sistema restaurado al estado de ${strSeleccionado}.` });
            setStrSeleccionado(null);
            setStrConfirmacion("");
            if (onRestaurado) onRestaurado();
        } catch (error) {
            setObjMensaje({ tipo: "error", texto: error.message });
            setStrSeleccionado(null);
            setStrConfirmacion("");
        } finally {
            setBoolRestaurando(false);
            fnCargarDatos();
        }
    };

    return (
        <div className="space-y-6">
            {/* ---------- Copias disponibles ---------- */}
            <section className="rounded-xl border border-border bg-bg-card shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-primary-blue" />
                        <div>
                            <h2 className="text-lg font-extrabold text-primary-navy leading-none">Copias de seguridad</h2>
                            <p className="text-secondary text-text-body mt-1">
                                Respaldo completo de la base de datos. Se genera una copia automática cada 3 días a las 23:55.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fnGenerar}
                        disabled={boolGenerando || boolRestaurando}
                        className="shrink-0 rounded-xl bg-primary-blue px-4 py-2.5 text-secondary font-bold text-white hover:bg-primary-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {boolGenerando ? "Generando copia..." : "Generar copia ahora"}
                    </button>
                </div>

                {objMensaje && (
                    <div
                        role="status"
                        className={`rounded-xl p-3 text-secondary font-semibold ${
                            objMensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                    >
                        {objMensaje.texto}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-secondary">
                        <thead>
                            <tr className="bg-bg-app text-primary-navy text-badge font-black uppercase tracking-wider">
                                <th className="p-3">Archivo</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Tamaño</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {boolCargandoLista && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-text-body">Cargando copias...</td>
                                </tr>
                            )}
                            {!boolCargandoLista && arrBackups.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-text-body">Todavía no hay copias de seguridad.</td>
                                </tr>
                            )}
                            {arrBackups.map((backup) => (
                                <tr key={backup.nombre} className="border-t border-border/40">
                                    <td className="p-3 font-semibold text-primary-navy">{backup.nombre}</td>
                                    <td className="p-3">{fnFormatearFecha(backup.fecha)}</td>
                                    <td className="p-3">{fnFormatearTamano(backup.tamano)}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fnDescargar(backup.nombre)}
                                                disabled={boolRestaurando}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-blue/30 px-3 py-1.5 font-bold text-primary-blue hover:bg-primary-blue/10 transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                Descargar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStrSeleccionado(backup.nombre)}
                                                disabled={boolRestaurando || boolGenerando}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Restaurar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ---------- Bitácora independiente ---------- */}
            <section className="rounded-xl border border-border bg-bg-card shadow-sm p-5 space-y-4">
                <div>
                    <h2 className="text-lg font-extrabold text-primary-navy leading-none">Bitácora de copias de seguridad</h2>
                    <p className="text-secondary text-text-body mt-1">
                        Registro de quién generó, descargó o restauró una copia (independiente del historial de usuarios).
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-secondary">
                        <thead>
                            <tr className="bg-bg-app text-primary-navy text-badge font-black uppercase tracking-wider">
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Acción</th>
                                <th className="p-3">Archivo</th>
                                <th className="p-3">Administrador</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {arrBitacora.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-4 text-text-body">Sin registros todavía.</td>
                                </tr>
                            )}
                            {arrBitacora.map((registro) => (
                                <tr key={registro.id} className="border-t border-border/40 align-top">
                                    <td className="p-3 whitespace-nowrap">{fnFormatearFecha(registro.fecha)}</td>
                                    <td className="p-3 font-semibold text-primary-navy">
                                        {ETIQUETAS_ACCION[registro.accion] || registro.accion}
                                    </td>
                                    <td className="p-3">{registro.archivo_nombre || "-"}</td>
                                    <td className="p-3">
                                        {registro.admin_id === ID_SISTEMA ? "SISTEMA" : registro.admin_id}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                registro.estado === "EXITO"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-rose-100 text-rose-700"
                                            }`}
                                        >
                                            {registro.estado}
                                        </span>
                                    </td>
                                    <td className="p-3 max-w-xs break-words">{registro.detalles}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ---------- Modal de confirmación para restaurar ---------- */}
            {strSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-restaurar-backup"
                        className="w-full max-w-md rounded-xl bg-bg-card p-6 space-y-4 shadow-xl"
                    >
                        <div className="flex items-center gap-2 text-rose-700">
                            <AlertTriangle className="w-5 h-5" />
                            <h3 id="titulo-restaurar-backup" className="text-lg font-extrabold">
                                Restaurar copia de seguridad
                            </h3>
                        </div>
                        <p className="text-secondary text-text-body">
                            Vas a devolver el sistema al estado de <b>{strSeleccionado}</b>. Los datos actuales se
                            reemplazan y el sistema no estará disponible unos segundos. Antes de restaurar se genera
                            automáticamente una copia del estado actual.
                        </p>
                        <p className="text-secondary text-text-body">
                            Escribe <b>RESTAURAR</b> para confirmar:
                        </p>
                        <input
                            type="text"
                            value={strConfirmacion}
                            onChange={(e) => setStrConfirmacion(e.target.value)}
                            disabled={boolRestaurando}
                            className="w-full rounded-lg border border-border p-2.5 text-secondary"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={fnCerrarModal}
                                disabled={boolRestaurando}
                                className="rounded-xl border border-border px-4 py-2 text-secondary font-bold text-primary-navy hover:bg-bg-app disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={fnRestaurar}
                                disabled={strConfirmacion !== "RESTAURAR" || boolRestaurando}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-secondary font-bold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {boolRestaurando ? "Restaurando..." : "Restaurar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
