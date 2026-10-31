import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

let token='sesion-A', llamadas=0, reloj=1000, falla=false;
const context=vm.createContext({FormData, Date:class extends Date { static now(){return reloj;} },
  fetch:async () => { llamadas++; if(falla) throw new Error('sin red'); return {ok:true,status:200,json:async()=>[]}; }});
const code=await fs.readFile(new URL('../src/services/grupoService.js',import.meta.url),'utf8');
const module=new vm.SourceTextModule(code,{context});
await module.link(path => {
  if(path==='./apiConfig') return new vm.SyntheticModule(['strApiBaseUrl'],function(){this.setExport('strApiBaseUrl','https://example.test');},{context});
  if(path==='./authService') return new vm.SyntheticModule(['obtenerToken','cerrarSesion'],function(){this.setExport('obtenerToken',()=>token);this.setExport('cerrarSesion',()=>{});},{context});
  throw new Error('Import inesperado: '+path);
});
await module.evaluate();const api=module.namespace;
await Promise.all([api.obtenerAsignaturas(),api.obtenerAsignaturas(),api.obtenerAsignaturas()]);
assert.equal(llamadas,1);
await api.obtenerAsignaturas();assert.equal(llamadas,1);
await Promise.all([api.obtenerGruposPorAsignatura(7),api.obtenerGruposPorAsignatura(7)]);assert.equal(llamadas,2);
await api.obtenerGruposPorAsignatura(8);assert.equal(llamadas,3);
await api.crearAsignatura({nombre:'prueba'});assert.equal(llamadas,4);
await api.obtenerAsignaturas();assert.equal(llamadas,5);
token='sesion-B';await api.obtenerAsignaturas();assert.equal(llamadas,6);
reloj+=16000;await api.obtenerAsignaturas();assert.equal(llamadas,7);
api.invalidarCatalogo();falla=true;
await assert.rejects(api.obtenerAsignaturas());assert.equal(llamadas,8);
falla=false;await api.obtenerAsignaturas();assert.equal(llamadas,9);
console.log('OK: consultas simultaneas compartidas, grupos separados, invalidacion tras cambios, TTL, sesion aislada y errores recuperables.');
