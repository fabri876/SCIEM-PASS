import assert from 'node:assert/strict';
import { createServer } from 'vite';

let estados=[], posicion=0, rol='ADMINISTRADOR';
const datos=new Map();
globalThis.localStorage={getItem:k=>datos.get(k)??null,setItem:(k,v)=>datos.set(k,v)};
globalThis.__notificacionesHooks={
  useEffect:()=>{}, useRef:()=>({current:null}),
  useState:initial=>{const i=posicion++;if(!(i in estados))estados[i]=typeof initial==='function'?initial():initial;
    return [estados[i],v=>{estados[i]=typeof v==='function'?v(estados[i]):v;}];},
};
globalThis.__rolNotificaciones=()=>rol;
const plugin={name:'prueba-notificaciones',enforce:'pre',
  transform(code,id){
    if(id.replaceAll('\\','/').endsWith('/NotificationsMenu.jsx'))return code
      .replace('from "react"','from "virtual:hooks-notificaciones"')
      .replace('from "react-router-dom"','from "virtual:ruta-notificaciones"')
      .replace('from "../../services/authService"','from "virtual:auth-notificaciones"');
    if(id.replaceAll('\\','/').endsWith('/notificacionesService.js'))return code.replace('from "./authService"','from "virtual:auth-notificaciones"');
    if(id.replaceAll('\\','/').endsWith('/grupoService.js'))return code.replace('from "./authService"','from "virtual:auth-notificaciones"');
  },
  resolveId(id){if(id.startsWith('virtual:'))return '\0'+id;},
  load(id){
    if(id==='\0virtual:hooks-notificaciones')return 'export const {useEffect,useRef,useState}=globalThis.__notificacionesHooks;';
    if(id==='\0virtual:ruta-notificaciones')return 'export const useLocation=()=>({pathname:"/admin"});';
    if(id==='\0virtual:auth-notificaciones')return 'export const obtenerUsuarioActual=()=>globalThis.__rolNotificaciones()?({idUsuario:1,rol:globalThis.__rolNotificaciones()}):null; export const obtenerToken=()=>globalThis.__rolNotificaciones()?"prueba":null; export const cerrarSesion=()=>{};';
  },
};
const server=await createServer({configFile:false,plugins:[plugin],optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try {
  const {default:Menu}=await server.ssrLoadModule('/src/components/layout/NotificationsMenu.jsx');
  function nodos(n){if(!n||typeof n!=='object')return [];return [n,...[n.props?.children].flat(Infinity).flatMap(nodos)];}
  function render(){posicion=0;return nodos(Menu({boolAbiertoInicial:true}));}
  let arbol=render();
  const control=(nombre)=>arbol.find(n=>n.props?.['aria-label']===nombre);
  assert.ok(control('Carrera de notificaciones'));
  assert.equal(control('Nivel de notificaciones').props.disabled,true);
  estados[1]='99';estados[2]='88';
  control('Carrera de notificaciones').props.onChange({target:{value:'10'}});
  assert.equal(estados[0],'10'); assert.equal(estados[1],'');assert.equal(estados[2],'');
  arbol=render(); estados[2]='88';
  control('Nivel de notificaciones').props.onChange({target:{value:'100'}});
  assert.equal(estados[2],'');
  estados[7]=[{intId:'nuevo'}];estados[12]=new Set(['leido-otra-carrera']);arbol=render();
  arbol.find(n=>n.type==='button'&&n.props.children==='Marcar como leídas').props.onClick();
  assert.deepEqual([...estados[12]],['leido-otra-carrera','nuevo']);
  for(rol of ['ESTUDIANTE','DOCENTE','AYUDANTE',null]) {
    estados=[]; arbol=render();
    assert.equal(control('Carrera de notificaciones'),undefined,'Filtros solo para administrador');
  }
  rol='ADMINISTRADOR';let consultada;
  globalThis.fetch=async url=>{consultada=new URL(url,'http://localhost');return {ok:true,json:async()=>({eventos:[{intId:'evento-1',strTitulo:'Examen cancelado',strDescripcion:'CÁLCULO · Motivo: prueba',fecha:'2026-11-14T12:00:00Z'}]})};};
  const {obtenerAvisosExamenes}=await server.ssrLoadModule('/src/services/notificacionesService.js');
  const avisos=await obtenerAvisosExamenes({carrera:'10',nivel:'100',asignatura:'1'});
  assert.equal(consultada.searchParams.get('carrera'),'10');assert.equal(consultada.searchParams.get('nivel'),'100');
  assert.equal(avisos[0].strTitulo,'Examen cancelado');
  console.log('OK: filtros exclusivos del administrador, cascada, lectura y petición filtrada.');
} finally {await server.close();}
