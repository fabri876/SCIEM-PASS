import { formatearNumero } from "../datosMockOperador";

export default function BannerPuntoControl({ examen }) {
  return (
    <div
      className="w-full text-white p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      style={{ backgroundImage: "linear-gradient(to right, #0B2545, #2563EB, #DC2626)" }}
    >
      <div>
        <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/30 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Personal de control · Punto de control activo
        </span>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">{examen.nombre}</h1>
        <p className="text-xs md:text-sm opacity-90 font-medium mt-1">
          Ambiente: <span className="font-bold underline decoration-white/40">{examen.sub.split(" · ")[0]}</span>
        </p>
      </div>

      <div className="flex gap-3 text-center self-stretch md:self-auto shrink-0">
        <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex-1 md:w-28">
          <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wide">Ingresados</span>
          <span className="text-2xl font-black text-emerald-300">{formatearNumero(examen.ing)}</span>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex-1 md:w-28">
          <span className="text-[10px] text-white/80 font-bold block uppercase tracking-wide">Capacidad</span>
          <span className="text-2xl font-black text-white">{examen.cap}</span>
        </div>
      </div>
    </div>
  );
}