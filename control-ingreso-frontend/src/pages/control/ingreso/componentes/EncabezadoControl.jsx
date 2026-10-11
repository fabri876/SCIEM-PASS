// Título de la página (saludo / "Control de ingreso") + acciones a la derecha
import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle, HardDrive } from "lucide-react";

function fechaDeHoy() {
  const str = new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Mock: simula estados de conexión para demo
function useMockConnection() {
  const [net, setNet] = useState("online"); // online | syncing | slow | offline
  const [pend, setPend] = useState(0);
  const [enviados, setEnviados] = useState(12);
  const [spacePrc, setSpacePrc] = useState(85);
  const [lastSend, setLastSend] = useState("Hoy 14:32");

  // Demo: cambia estado cada 10s para mostrar todos los estados
  useEffect(() => {
    const estados = ["online", "syncing", "slow", "offline"];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % estados.length;
      setNet(estados[i]);
      if (estados[i] !== "online") {
        setPend(Math.floor(Math.random() * 20) + 1);
      } else {
        setPend(0);
        setEnviados(e => e + Math.floor(Math.random() * 5) + 1);
        setLastSend(new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }));
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return { net, pend, enviados, spacePrc, lastSend };
}

function BadgeConexion({ net, pend }) {
  const configs = {
    online: { bg: "bg-[#F0F6FC]", text: "text-[#1860A3]", dot: "bg-[#267BC2]", label: "En línea", icon: null },
    syncing: { bg: "bg-[#FFF4ED]", text: "text-[#C05621]", dot: "bg-[#F59E0B] animate-pulse", label: `Sincronizando… (${pend})`, icon: "⟳" },
    slow: { bg: "bg-[#FFF4ED]", text: "text-[#C05621]", dot: "bg-[#F59E0B]", label: `Red lenta (${pend} pend.)`, icon: "⚠" },
    offline: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", dot: "bg-[#EF4444]", label: `Sin red (${pend} offline)`, icon: null },
  };
  const c = configs[net] || configs.online;
  return (
    <span className={`inline-flex items-center gap-[7px] px-3 py-1.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <i className={`w-[7px] h-[7px] rounded-full ${c.dot}`} />
      {c.icon && <span className="text-[10px]">{c.icon}</span>}
      {c.label}
    </span>
  );
}

function BannerOffline({ net, pend }) {
  if (net === "online") return null;
  return (
    <div className="w-full bg-[#FEF2F2]/80 border border-[#FEE2E2] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-[#B91C1C] text-white flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            <line x1={1} y1={1} x2={23} y2={23} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h3 className="text-sm font-black text-[#B91C1C]">Sin red · MODO OFFLINE</h3>
          <p className="text-[11px] font-semibold text-[#B91C1C]">
            Último envío: {pend > 0 ? "pendientes" : "hace poco"}. Los ingresos válidos se guardan en la cola local y se sincronizan al recuperar la red.
          </p>
        </div>
      </div>
    </div>
  );
}

function BannerStorage({ spacePrc }) {
  if (spacePrc >= 10) return null;
  return (
    <div className="w-full bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] text-[11px] font-bold rounded-2xl px-4 py-3 flex items-center gap-2">
      <HardDrive className="w-4 h-4 shrink-0" />
      {"⚠ Almacenamiento < 10 %. El registro offline será bloqueado hasta liberar espacio."}
    </div>
  );
}

function SyncProgress({ net, pend, syncTotal, lote, enviados }) {
  if (net === "online" && pend === 0) return null;
  if (net === "offline" && pend === 0) return null;

  let ancho = 0;
  let etiqueta = "";
  if (net === "online" && pend === 0) {
    ancho = 100; etiqueta = "Todo sincronizado";
  } else if (net === "syncing") {
    const prog = syncTotal ? Math.max(0, Math.min(1, (syncTotal - pend) / syncTotal)) : 1;
    ancho = prog * 100;
    etiqueta = `Enviando lote ${lote} de ${Math.ceil(syncTotal / 10)}…`;
  } else if (net === "slow") {
    ancho = pend > 0 ? 10 : 100;
    etiqueta = pend > 0 ? "Enviando en segundo plano…" : "Todo sincronizado";
  } else {
    etiqueta = pend > 0 ? "Esperando señal…" : "Todo sincronizado";
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-[#1860A3]">Sincronizados: {enviados}</span>
        <span className="text-[#64748B]">{pend > 0 ? `${pend} marcas en cola` : "Sin pendientes"}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#4A97D3] transition-all duration-500" style={{ width: ancho + "%" }}></div>
        </div>
        <span className="text-[11px] font-bold text-slate-500 w-44 text-right shrink-0">{etiqueta}</span>
      </div>
    </div>
  );
}

export default function EncabezadoControl({ strTitulo, strDetalle = "Control de ingreso", onVolver, strTextoVolver = "Mis exámenes", children, net: netProp, pend: pendProp }) {
  const { net: autoNet, pend: autoPend, enviados, spacePrc, lastSend } = useMockConnection();
  const [showSync, setShowSync] = useState(false);

  // Si vienen props (vista real conectada), usarlas; sino mock auto
  const net = netProp ?? autoNet;
  const pend = pendProp ?? autoPend;

  const syncTotal = 30;
  const lote = Math.ceil((syncTotal - pend) / 10) || 1;

  return (
    <div className="space-y-3">
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 mb-2.5 text-[13px] font-medium text-[#1860A3] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {strTextoVolver}
        </button>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="m-0 text-[22px] max-md:text-xl font-bold text-[#08264A]">{strTitulo}</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">{fechaDeHoy()} · {strDetalle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 max-md:w-full">
          <BadgeConexion net={net} pend={pend} />
          {children}
        </div>
      </div>

      <BannerOffline net={net} pend={pend} />
      <BannerStorage spacePrc={spacePrc} />
      <SyncProgress net={net} pend={pend} syncTotal={syncTotal} lote={lote} enviados={enviados} />
    </div>
  );
}
