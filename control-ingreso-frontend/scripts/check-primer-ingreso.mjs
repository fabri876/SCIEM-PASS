import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fnEvaluarContrasena } from '../src/utils/passwordStrength.js';

assert.equal(fnEvaluarContrasena('Viento!Roca7#Menta','1357986').intNivel,8);
for(const clave of ['Roca!7','ROCAVERDE2026!','rocaverde2026!','Roca!VerdeMenta',
  'Roca Verde2026','Roca!AaAVerde7','Roca!AbcVerde7']) {
  assert.equal(fnEvaluarContrasena(clave,'1357986').boolValida,false);
}
assert.equal(fnEvaluarContrasena('Roca!ViejaClave7#','viejaclave').boolValida,false);

// Ejecuta los callbacks reales del menú con hooks controlados, sin contraseñas ni BD.
let estados, posicion, recargas;
const datos=new Map();
globalThis.sessionStorage={getItem:k=>datos.get(k)??null,setItem:(k,v)=>datos.set(k,v),removeItem:k=>datos.delete(k)};
globalThis.window={location:{reload:()=>recargas++},addEventListener:()=>{}};
globalThis.__hooksPrimerIngreso={
  useState:initial=>{const i=posicion++;if(!(i in estados))estados[i]=typeof initial==='function'?initial():initial;return [estados[i],v=>{estados[i]=typeof v==='function'?v(estados[i]):v;}];},
  useRef:initial=>({current:initial}),useEffect:()=>{},
};
const hooks={name:'hooks-primer-ingreso',enforce:'pre',
  transform(code,id){if(['/UserAccountMenu.jsx','/CambiarContrasenaModal.jsx','/usePasswordVisibility.js'].some(n=>id.replaceAll('\\','/').endsWith(n)))return code.replace('from "react"','from "virtual:hooks-primer-ingreso"');},
  resolveId(id){if(id==='virtual:hooks-primer-ingreso')return '\0hooks-primer-ingreso';},
  load(id){if(id==='\0hooks-primer-ingreso')return `import React from 'react'; export default React; export const {useState,useRef,useEffect}=globalThis.__hooksPrimerIngreso;`;},
};
const pwa={name:'pwa-prueba',resolveId(id){if(id==='virtual:pwa-register')return '\0pwa-prueba';},load(id){if(id==='\0pwa-prueba')return 'export const registerSW=()=>async()=>{};';}};
const server=await createServer({configFile:false,plugins:[hooks,pwa],optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try {
  const {default:Menu}=await server.ssrLoadModule('/src/components/common/UserAccountMenu.jsx');
  function modal(pendiente,rol='ESTUDIANTE') {
    estados=[];posicion=0;recargas=0;datos.clear();
    if(pendiente)datos.set('debeCambiarContrasena','1');
    const arbol=Menu({usuario:{rol,nombre:'Prueba'},onCerrarSesion:()=>{}});
    return arbol.props.children.find(n=>n?.type?.name==='CambiarContrasenaModal').props;
  }
  for(const rol of ['ESTUDIANTE','DOCENTE','OPERADOR','ADMINISTRADOR']) {
    let props=modal(true,rol);
    props.onCerrar();
    assert.equal(recargas,0,'Cancelar no recarga');
    assert.equal(datos.get('debeCambiarContrasena'),'1','Cancelar conserva el aviso');
    props=modal(true,rol);
    props.onExito();
    assert.equal(datos.has('debeCambiarContrasena'),false,'Éxito elimina la marca antes de recargar');
    assert.equal(recargas,0,'El cierre posterior al éxito inicia la recarga');
    props.onCerrar();
    assert.equal(recargas,1,'Cerrar tras el cambio obligatorio reinicia las consultas del panel');
    props.onCerrar();
    assert.equal(recargas,1,'Solo una recarga');
  }
  const props=modal(false);
  props.onExito();props.onCerrar();
  assert.equal(recargas,0,'Un cambio voluntario no recarga el panel');
  const {default:Modal}=await server.ssrLoadModule('/src/components/common/CambiarContrasenaModal.jsx');
  globalThis.localStorage={getItem:k=>k==='token'?'token-prueba':null};
  const fetchOriginal=globalThis.fetch;
  const eventos=[];
  globalThis.fetch=async()=>{eventos.push('guardado');return {ok:true,status:200,json:async()=>({})};};
  function buscarFormulario(n) {
    if(!n || typeof n!=='object')return;
    if(n?.type==='form')return n;
    for(const hijo of [n?.props?.children].flat(Infinity)) {const f=buscarFormulario(hijo);if(f)return f;}
  }
  async function enviar(nueva) {
    estados=[{contrasenaActual:'1357986',contrasenaNueva:nueva,confirmarContrasena:nueva},false,'',false];posicion=0;
    const arbol=Modal({boolAbierto:true,onExito:()=>eventos.push('exito'),onCerrar:()=>eventos.push('cerrado')});
    await buscarFormulario(arbol).props.onSubmit({preventDefault(){}});
  }
  try {
    await enviar('Roca!7');
    assert.deepEqual(eventos,[],'Clave débil: no solicita cambio ni cierra la ventana');
    await enviar('Viento!Roca7#Menta');
    assert.deepEqual(eventos,['guardado','exito','cerrado'],'El cierre ocurre inmediatamente después de guardar, sin temporizador');
  } finally {globalThis.fetch=fetchOriginal;}
  console.log('OK primer ingreso: 4 roles, cancelar, éxito, limpieza de marca y recarga única; cambio voluntario sin recarga.');
} finally {
  await server.close();
  delete globalThis.__hooksPrimerIngreso;
}
