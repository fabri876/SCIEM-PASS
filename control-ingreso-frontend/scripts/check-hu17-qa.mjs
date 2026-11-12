import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

const valores=new Map([['token','prueba'],['ultimaActividad',String(Date.now())]]);
globalThis.localStorage={getItem:k=>valores.get(k)??null,setItem:(k,v)=>valores.set(k,v),removeItem:k=>valores.delete(k)};
const pwaSsr={name:'qa-pwa-ssr',resolveId(id){if(id==='virtual:pwa-register')return '\0qa-pwa';},load(id){if(id==='\0qa-pwa')return 'export const registerSW = () => async () => {};';}};
const server=await createServer({configFile:false,plugins:[pwaSsr],optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
const fetchOriginal=globalThis.fetch;
try {
  const servicio=await server.ssrLoadModule('/src/services/notificacionesService.js');
  const eventos=[{intId:'evento-1',fecha:'2026-11-10T14:00:00Z',strDescripcion:'INTRODUCCION A LA PROGRAMACION · Aula 692E (#502) · 2026-11-12'},
    {intId:'evento-3',fecha:'2026-11-11T14:00:00Z',strDescripcion:'Cálculo'},
    {intId:'evento-2',fecha:'2026-11-11T14:00:00Z',strDescripcion:'Álgebra'}];
  globalThis.fetch=async()=>({ok:true,json:async()=>({eventos})});
  const avisos=await servicio.obtenerAvisosExamenes();
  assert.deepEqual(avisos.map(n=>n.intId),['evento-3','evento-2','evento-1']);
  assert.match(avisos[2].strDescripcion,/Introducción a la programación/);
  assert.ok(!avisos[2].strDescripcion.includes('#502'));
  assert.match(avisos[2].strDescripcion,/12\/11\/2026/);
  assert.match(avisos[2].strHace,/10\/11\/2026/);
  const documentos=await server.ssrLoadModule('/src/services/examenesPasadosService.js');
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(documentos.obtenerExamenesPasados(),/No se pudieron cargar los exámenes pasados/);
  await assert.rejects(documentos.descargarExamenPasado(1),/No se pudo descargar el archivo del examen/);
  const {default:Carga}=await server.ssrLoadModule('/src/pages/admin/components/CargaExamenesPasados.jsx');
  const html=renderToString(React.createElement(Carga));
  assert.match(html,/maxLength="500"/i);
  assert.match(html,/Máximo 500 caracteres/);
  console.log('OK HU17: orden por evento, fechas bolivianas, presentación y errores de red en español, límite 500.');
} finally {globalThis.fetch=fetchOriginal;await server.close();}
