import { useState, useEffect } from "react";
import { Users, Calendar, UserCheck, History, Shield, AlertTriangle, BookOpen, Activity, FileText, Upload, XCircle } from "lucide-react";
import { obtenerTotalIncidenciasAbiertas } from "../../../services/incidenciaService";

const baseMenuItems = [
    { id: "Historial de Semestres", label: "Historial de Semestres", icon: Calendar },
    { id: "Gestión de Usuarios", label: "Gestión de Usuarios", icon: Users },
    { id: "Gestión de Asignaturas y Grupos", label: "Gestión de Asignaturas y Grupos", icon: BookOpen },
    { id: "Roles y Permisos", label: "Roles y Permisos", icon: Shield },
    { id: "Gestión de Exámenes", label: "Gestión de Exámenes", icon: Calendar },
    { id: "Habilitación de Estudiantes", label: "Habilitación de Estudiantes", icon: UserCheck },
    { id: "Carga de Exámenes Pasados", label: "Carga de Exámenes Pasados", icon: Upload },
    { id: "Monitoreo de Asistencia", label: "Monitoreo de Asistencia", icon: Activity },
    { id: "Reportes y Asistencia", label: "Reportes y Asistencia", icon: FileText },
    { id: "Reporte de Intentos Incorrectos", label: "Intentos Incorrectos (HU13)", icon: XCircle },
    { id: "Incidencias", label: "Incidencias", icon: AlertTriangle, esIncidencia: true },
    { id: "Historial Inmodificable", label: "Historial Inmodificable", icon: History },
];

export default function AdminSidebar({ activeMenu, setActiveMenu }) {
    const [totalAbiertas, setTotalAbiertas] = useState(0);

    useEffect(() => {
        let cancel = false;
        async function fnCargarContador() {
            try {
                const res = await obtenerTotalIncidenciasAbiertas();
                if (!cancel && res && typeof res.total === "number") {
                    setTotalAbiertas(res.total);
                }
            } catch {
                // Silencioso si aún no hay conexión
            }
        }
        fnCargarContador();
        // Se actualiza cuando la sección Incidencias registra, revisa o cierra algo.
        window.addEventListener("incidencias:actualizadas", fnCargarContador);
        return () => {
            cancel = true;
            window.removeEventListener("incidencias:actualizadas", fnCargarContador);
        };
    }, [activeMenu]);

    return (
        <div className="w-full h-full bg-primary-navy text-bg-card p-4 flex flex-col justify-between shrink-0 border-r border-border/20">
            <div className="space-y-2">
                <div className="px-4 py-3 mb-2">
                    <span className="text-badge font-black uppercase tracking-wider text-bg-card/60">
                        Menú Principal
                    </span>
                </div>

                {baseMenuItems.map((item) => {
                    const Icon = item.icon;
                    // Compatible con "Historial Inmodificable" y "Historial de Auditoría"
                    const isActive = activeMenu === item.id ||
                        (item.id === "Historial Inmodificable" && activeMenu === "Historial de Auditoría");
                    const badgeValor = item.esIncidencia ? (totalAbiertas > 0 ? totalAbiertas : null) : item.badge;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveMenu && setActiveMenu(item.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-secondary font-bold transition-all cursor-pointer ${isActive
                                ? "bg-gradient-to-r from-primary-blue to-primary-navy text-bg-card shadow-md border border-bg-card/20"
                                : "text-bg-card/80 hover:text-bg-card hover:bg-bg-card/10 font-semibold"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 ${isActive ? "text-bg-card" : "text-bg-card/60"}`} />
                                <span>{item.label}</span>
                            </div>
                            {badgeValor !== null && badgeValor !== undefined && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    isActive ? "bg-white text-rose-600" : "bg-rose-500 text-white"
                                }`}>
                                    {badgeValor}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-border/20">

            </div>
        </div>
    );
}
