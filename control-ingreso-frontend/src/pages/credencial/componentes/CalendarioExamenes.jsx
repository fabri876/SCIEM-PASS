import { textoInterfaz } from '../../../utils/textoInterfaz.js';
// Calendario compacto: marca los días con examen; al elegir un día muestra sus exámenes
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const pad = (n) => String(n).padStart(2, "0");
const claveDia = (a, m, d) => `${a}-${pad(m + 1)}-${pad(d)}`;

export default function CalendarioExamenes({ listExamenes = [], onVerQr }) {
  const hoy = new Date();
  const [objMes, setObjMes] = useState({ a: hoy.getFullYear(), m: hoy.getMonth() });
  const [strElegido, setStrElegido] = useState(claveDia(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));

  // fecha → exámenes de ese día
  const objPorDia = useMemo(() => {
    const obj = {};
    listExamenes.forEach((e) => { (obj[e.fecha] = obj[e.fecha] || []).push(e); });
    return obj;
  }, [listExamenes]);

  const numPrimer = (new Date(objMes.a, objMes.m, 1).getDay() + 6) % 7; // lunes = 0
  const numDias = new Date(objMes.a, objMes.m + 1, 0).getDate();
  const listCeldas = [...Array(numPrimer).fill(null), ...Array.from({ length: numDias }, (_, i) => i + 1)];
  const strHoy = claveDia(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const listDelDia = objPorDia[strElegido] || [];

  const fnMover = (n) => setObjMes(({ a, m }) => {
    const d = new Date(a, m + n, 1);
    return { a: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <section aria-labelledby="ce-t-cal" className="bg-white border border-[#CBD5E1] rounded-xl p-[18px]">
      <div className="flex items-center justify-between mb-3">
        <h2 id="ce-t-cal" className="m-0 text-[15px] font-bold text-[#08264A]">{MESES[objMes.m]} {objMes.a}</h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => fnMover(-1)} aria-label="Mes anterior" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => fnMover(1)} aria-label="Mes siguiente" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#64748B] mb-1">
        {DIAS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {listCeldas.map((d, i) => {
          if (d === null) return <span key={"v" + i} />;
          const strClave = claveDia(objMes.a, objMes.m, d);
          const boolExamen = Boolean(objPorDia[strClave]);
          const boolHoy = strClave === strHoy;
          const boolElegido = strClave === strElegido;
          return (
            <button
              key={strClave}
              type="button"
              onClick={() => setStrElegido(strClave)}
              aria-label={`${d}${boolExamen ? ", tiene examen" : ""}`}
              className={
                "relative mx-auto w-8 h-8 rounded-full text-[13px] flex items-center justify-center cursor-pointer " +
                (boolElegido ? "bg-[#003770] text-white font-bold" : boolHoy ? "border border-[#003770] text-[#003770] font-bold" : "text-[#08264A] hover:bg-[#F1F5F9]")
              }
            >
              {d}
              {boolExamen && <i className={"absolute bottom-[3px] w-1 h-1 rounded-full " + (boolElegido ? "bg-[#83B7E2]" : "bg-[#267BC2]")} />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
        {listDelDia.length === 0 ? (
          <p className="m-0 text-xs text-[#64748B]">Sin exámenes este día.</p>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {listDelDia.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onVerQr(e.id)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#F0F6FC] hover:bg-[#D9E8F7] cursor-pointer"
                >
                  <b className="block text-[13px] font-semibold text-[#08264A]">{textoInterfaz(e.materia)}</b>
                  <span className="text-xs text-[#475569]">{e.horaInicio}{e.horaFin ? ` – ${e.horaFin}` : ""} · Aula {String(e.aula || "").replace(/^aula\s*/i, "")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
