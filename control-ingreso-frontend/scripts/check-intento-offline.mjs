import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  globalThis.window = {};
  const { validarIntentoPendiente } = await server.ssrLoadModule('/src/offline/intentoExamenPendienteRepo.js');
  const intento = { clientUuid: '00000000-0000-4000-8000-000000000001', operadorId: 1,
    asignaturaControl: 2, examenControl: 3, ambienteControl: 4, estudianteSis: 123456,
    asignaturaDestino: 5, examenDestino: 6, ambienteDestino: 7, metodo: 'SIS', fechaCreacion: Date.now() };
  assert.doesNotThrow(() => validarIntentoPendiente(intento));
  assert.throws(() => validarIntentoPendiente({ ...intento, clientUuid: 'invalido' }));
  assert.throws(() => validarIntentoPendiente({ ...intento, operadorId: 0 }));
  assert.throws(() => validarIntentoPendiente({ ...intento, metodo: 'QR', qrHash: 'token-ficticio' }));
  assert.throws(() => validarIntentoPendiente({ ...intento, metodo: 'QR', qrHash: 'a'.repeat(64) }));
  assert.doesNotThrow(() => validarIntentoPendiente({ ...intento, metodo: 'QR', qrHash: 'a'.repeat(64), qrToken: 'ficticio' }));
  console.log('Cola de intentos: validacion de campos y credencial QR verificada');
} finally { delete globalThis.window; await server.close(); }
