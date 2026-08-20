// Correr con: node src/views/pages/gabinete/maestroDeEntregables.test.mjs
//
// El maestro de entregables es una planilla que Control Documental va a leer
// como si fuera la verdad. Un error aquí no rompe ninguna pantalla: entrega un
// catálogo equivocado, que es peor, porque nadie lo nota.
//
// Los dos casos que de verdad importan:
//   - los borrados NO van (el borrado del Gabinete es lógico: el documento se
//     queda en la base con `deleted: true`);
//   - un entregable sin fecha sale con la celda VACÍA, nunca con la de hoy.
import assertOriginal from 'node:assert/strict'
import { COLUMNAS_MAESTRO, armarMaestro, estadoLegible, fechaLegible, filaDelMaestro } from './maestroDeEntregables.js'

let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

const OTS = new Map([
  ['sol-a', 1216],
  ['sol-b', 980]
])

const ENTREGABLE = {
  id: '21286-500-PL-2077',
  clientCode: '21286-OT1216-PCLC-0252-PP-DET-00001',
  description: 'Planta de bombeo, planta general',
  revision: 'A',
  userName: 'Ana Pérez',
  attentive: 6,
  lastTransmittal: '21286-000-TT-1521',
  date: { seconds: 1755000000 },
  solicitudId: 'sol-a'
}

// --- Fechas ------------------------------------------------------------------

// Un Timestamp de Firestore, que es como llegan de verdad: NO son cadenas.
assert.match(fechaLegible({ seconds: 1755000000 }), /^\d{2}-\d{2}-\d{4}$/)
assert.equal(fechaLegible(new Date(2026, 7, 12)), '12-08-2026')

// Sin fecha, celda vacía. `moment(undefined)` es AHORA y eso ya puso
// solicitudes sin `start` en el día de hoy; aquí no puede volver a pasar.
assert.equal(fechaLegible(undefined), '')
assert.equal(fechaLegible(null), '')
assert.equal(fechaLegible({}), '')
assert.equal(fechaLegible({ seconds: 'ayer' }), '')
assert.equal(fechaLegible(new Date('no soy una fecha')), '')

// --- Estados -----------------------------------------------------------------

assert.equal(estadoLegible(6), 'Aprobado por Procure')
assert.equal(estadoLegible(0), 'Rechazado')

// Un estado que el diccionario no conoce sale como número, no en blanco: una
// celda vacía esconde el caso que falta.
assert.equal(estadoLegible(42), '42')
assert.equal(estadoLegible(undefined), '')
assert.equal(estadoLegible(null), '')

// --- Una fila ----------------------------------------------------------------

const fila = filaDelMaestro(ENTREGABLE, OTS)
assert.equal(fila.ot, 1216)
assert.equal(fila.codigo, '21286-500-PL-2077')
assert.equal(fila.codigoCliente, '21286-OT1216-PCLC-0252-PP-DET-00001')
assert.equal(fila.asignadoA, 'Ana Pérez')
assert.equal(fila.estado, 'Aprobado por Procure')
assert.equal(fila.transmittal, '21286-000-TT-1521')

// Cada columna declarada tiene su valor en la fila, y la fila no trae campos
// que la planilla no vaya a escribir.
assert.deepEqual(Object.keys(fila).sort(), COLUMNAS_MAESTRO.map(c => c.key).sort())

// Una solicitud que no está en el mapa deja la OT vacía, no `undefined`
// escrito en la celda.
assert.equal(filaDelMaestro({ ...ENTREGABLE, solicitudId: 'sol-fantasma' }, OTS).ot, '')
assert.equal(filaDelMaestro(ENTREGABLE, undefined).ot, '')

// Un entregable al que le falta todo no puede escribir 'undefined' en ninguna
// celda: es una planilla que va a leer una persona.
const vacio = filaDelMaestro({}, OTS)
for (const [clave, valor] of Object.entries(vacio)) {
  assert.equal(typeof valor, 'string', `la columna ${clave} no es texto`)
  assert.equal(valor.includes('undefined'), false)
}

// --- El maestro completo ------------------------------------------------------

const CRUDOS = [
  { ...ENTREGABLE, id: '21286-500-PL-2077', solicitudId: 'sol-b' },
  { ...ENTREGABLE, id: '21286-340-PL-1183', solicitudId: 'sol-a', deleted: true },
  { ...ENTREGABLE, id: '21286-340-PL-1191', solicitudId: 'sol-a' },
  { ...ENTREGABLE, id: '21286-100-PL-0002', solicitudId: 'sol-a', deleted: false }
]

const maestro = armarMaestro(CRUDOS, OTS)

// El borrado lógico no aparece. Es LA comprobación de este archivo: el
// documento sigue existiendo en Firestore y solo lo distingue `deleted`.
assert.equal(maestro.length, 3)
assert.equal(maestro.some(f => f.codigo === '21286-340-PL-1183'), false)

// `deleted: false` sí aparece, y los 1554 entregables que no tienen el campo
// también: excluir con `!= true` en Firestore los habría dejado fuera a todos.
assert.equal(maestro.some(f => f.codigo === '21286-100-PL-0002'), true)

// Ordenado por OT y después por código, que es como se lee un maestro.
assert.deepEqual(maestro.map(f => f.ot), [980, 1216, 1216])
assert.deepEqual(
  maestro.filter(f => f.ot === 1216).map(f => f.codigo),
  ['21286-100-PL-0002', '21286-340-PL-1191']
)

// Entradas rotas no botan la descarga entera.
assert.deepEqual(armarMaestro([], OTS), [])
assert.deepEqual(armarMaestro(undefined, OTS), [])
assert.deepEqual(armarMaestro(null, OTS), [])
assert.equal(armarMaestro([null, undefined, ENTREGABLE], OTS).length, 1)

console.log(`ok — maestroDeEntregables: ${comprobaciones} comprobaciones`)
