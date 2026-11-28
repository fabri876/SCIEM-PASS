import { textoAsignatura } from '../../utils/textoInterfaz.js';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
import { useEffect, useState } from "react";
import { obtenerCarreras, obtenerNiveles, obtenerAsignaturasFiltradas } from "../../services/grupoService";

/** Carrera y nivel son filtros; el valor enviado sigue siendo el ID único de la asignatura. */
export default function SelectorAsignatura({ value, onChange, permitidas, disabled=false, required=false, revision=0, soloClasificacion=false, onClasificacion, soloFiltros=false, onMaterias }) {
  const [carreras,setCarreras]=useState([]), [carrera,setCarrera]=useState("");
  const [niveles,setNiveles]=useState([]), [nivel,setNivel]=useState("");
  const [materias,setMaterias]=useState([]), [cargando,setCargando]=useState(false), [error,setError]=useState("");
  const [reintento,setReintento]=useState(0);
  useEffect(()=>{let activo=true;setError(""); obtenerCarreras().then(d=>{if(activo)setCarreras(d);}).catch(e=>{if(activo)setError(e.message);});return()=>{activo=false;};},[revision,reintento]);
  useEffect(()=>{let activo=true;setNiveles([]);if(!carrera)return;setCargando(true);
    obtenerNiveles(carrera).then(d=>{if(activo)setNiveles(d);}).catch(e=>{if(activo)setError(e.message);}).finally(()=>{if(activo)setCargando(false);});return()=>{activo=false;};},[carrera,revision,reintento]);
  useEffect(()=>{let activo=true;setMaterias([]);if(!carrera||!nivel||soloClasificacion)return;setCargando(true);
    obtenerAsignaturasFiltradas(carrera,nivel).then(d=>{if(activo)setMaterias(d);}).catch(e=>{if(activo)setError(e.message);}).finally(()=>{if(activo)setCargando(false);});return()=>{activo=false;};},[carrera,nivel,revision,reintento,soloClasificacion]);
  const estilo="w-full mt-1 p-2.5 border border-border rounded-xl bg-bg-app text-primary-navy disabled:opacity-60";
  const visibles=permitidas ? materias.filter(a=>permitidas.some(p=>p.idAsignatura===a.idAsignatura)) : materias;
  useEffect(()=>{onMaterias?.(nivel ? materias.map(a=>a.idAsignatura) : null);},[materias,nivel,onMaterias]);
  return <div className="space-y-3">
    {error&&<div role="alert" className="text-accent-red"><p>{error}</p><button type="button" disabled={disabled} onClick={()=>setReintento(v=>v+1)} className="mt-2 underline font-semibold">Reintentar catálogo</button></div>}
    <label className="block text-sm font-bold">Carrera / plan
      <select aria-label="Carrera o plan" required={required} disabled={disabled} className={estilo} value={carrera} onChange={e=>{setCarrera(e.target.value);setNivel("");setError("");onChange?.("");onClasificacion?.(null);}}>
        <option value="">Seleccione una carrera</option>{carreras.map(c=><option key={c.idCarrera} value={c.idCarrera}>{textoAsignatura(c.nombre)} · {c.codigo}</option>)}
      </select>
    </label>
    <label className="block text-sm font-bold">Nivel
      <select aria-label="Nivel" required={required} disabled={disabled||!carrera||cargando} className={estilo} value={nivel} onChange={e=>{setNivel(e.target.value);setError("");onChange?.("");onClasificacion?.({idCarrera:Number(carrera),idNivel:Number(e.target.value)});}}>
        <option value="">Seleccione un nivel</option>{niveles.map(n=><option key={n.idNivel} value={n.idNivel}>Nivel {textoInterfaz(n.nombre)}</option>)}
      </select>
    </label>
    {!soloClasificacion&&!soloFiltros&&<label className="block text-sm font-bold">Asignatura
      <select aria-label="Asignatura" required={required} disabled={disabled||!nivel||cargando} className={estilo} value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">{cargando?"Cargando asignaturas…":"Seleccione una asignatura"}</option>{visibles.map(a=><option key={a.idAsignatura} value={a.idAsignatura}>{textoAsignatura(a.nombreAsignatura)} · Código {a.codigoOficial||a.idAsignatura}</option>)}
      </select>
      {nivel&&!cargando&&!error&&!visibles.length&&<span className="block text-sm font-normal mt-1">No hay asignaturas disponibles para este nivel.</span>}
    </label>}
  </div>;
}
