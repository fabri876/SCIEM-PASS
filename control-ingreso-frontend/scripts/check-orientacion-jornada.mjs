import assert from 'node:assert/strict';
import { buscarDestinoJornada } from '../src/offline/orientacionJornada.js';

const destino = { sis: '123456', ci: '987654', qrHash: 'hash-ficticio', idAsignatura: 1, idExamen: 2,
  apertura: 100, cierre: 200, qrDesde: 110, qrHasta: 190 };
const buscar = (candidatos, overrides = {}) => buscarDestinoJornada({
  candidatos, tipo: 'SIS', identificador: '123456', examenActual: 1, ahora: 150, ...overrides,
});
assert.equal(buscar([destino]).estado, 'ENCONTRADO');
assert.equal(buscar([destino], { ahora: 99 }).estado, 'SIN_COINCIDENCIA');
assert.equal(buscar([destino], { ahora: 200 }).estado, 'ENCONTRADO');
assert.equal(buscar([destino], { examenActual: 2 }).estado, 'SIN_COINCIDENCIA');
assert.equal(buscar([destino], { tipo: 'CI', identificador: '987654' }).estado, 'ENCONTRADO');
assert.equal(buscar([destino], { tipo: 'QR_HASH', identificador: 'hash-ficticio', ahora: 105 }).estado, 'SIN_COINCIDENCIA');
const ambiguo = buscar([destino, { ...destino, idExamen: 3 }]);
assert.equal(ambiguo.estado, 'AMBIGUO');
assert.equal(ambiguo.estudiante.sis, '123456');
assert.equal(buscar([destino, { ...destino, idExamen: 3, sis: 'otro' }], { tipo: 'CI', identificador: '987654' }).estudiante, null);
assert.equal(buscar([destino, { ...destino, idAmbiente: 4 }]).estado, 'AMBIGUO');
assert.equal(buscar([destino], { tipo: 'QR', identificador: 'token' }).estado, 'SIN_DATOS');
console.log('Resolucion de jornada: coincidencias, horario, QR y ambiguedad verificados');
