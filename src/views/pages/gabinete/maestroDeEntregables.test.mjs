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
import {
  COLUMNAS_MAESTRO,
  armarMaestro,
  enEsperaDe,
  enEsperaDeEnPlanilla,
  fechaLegible,
  filaDelMaestro,
  otDeEntregable
} from './maestroDeEntregables.js'

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

// --- En espera de revisión por ------------------------------------------------

// `attentive` es un numero de ROL y los entregables tienen SU PROPIA escala. La
// primera version uso el diccionario de estados de las SOLICITUDES, que es otra
// cosa: Cristina Bustamante lo reporto como «algunos salen con un numero, no
// sabemos que significan». Estos son los seis valores de la pantalla.
assert.equal(enEsperaDe(4), 'Cliente')
assert.equal(enEsperaDe(6), 'Administrador de Contrato')
assert.equal(enEsperaDe(7), 'Supervisor')
assert.equal(enEsperaDe(8), 'Proyectista')
assert.equal(enEsperaDe(9), 'Control Documental')

// El 10 es el que salio crudo en la planilla: no existe en el diccionario de
// solicitudes y aqui si tiene nombre.
assert.equal(enEsperaDe(10), 'Finalizado')

// En pantalla, un valor fuera de la tabla queda en blanco -es lo que hacia
// `renderRole`, y la celda muestra 'N/A'-.
assert.equal(enEsperaDe(5), '')
assert.equal(enEsperaDe(undefined), '')

// En la planilla NUNCA sale un numero pelado, que es justo lo que no se pudo
// leer; se nombra y se deja el numero para rastrearlo.
assert.equal(enEsperaDeEnPlanilla(10), 'Finalizado')
assert.equal(enEsperaDeEnPlanilla(5), 'Sin identificar (5)')
assert.equal(enEsperaDeEnPlanilla(undefined), '')
assert.equal(enEsperaDeEnPlanilla(null), '')
for (const valor of [4, 5, 6, 7, 8, 9, 10, 42]) {
  assert.equal(/^\d+$/.test(enEsperaDeEnPlanilla(valor)), false)
}

// --- La OT --------------------------------------------------------------------

// La fuente buena es la solicitud de la que cuelga el entregable.
assert.equal(otDeEntregable({ solicitudId: 'sol-a', clientCode: '21286-OT0001-X' }, OTS), 1216)

// Y el respaldo, el codigo MEL: la primera version dependia SOLO del mapa y la
// columna OT salio vacia en las 1.500 filas -«no se ve la OT en el item»-,
// porque el maestro se puede pedir antes de que llegue la lista de OT.
assert.equal(otDeEntregable({ solicitudId: 'sol-fantasma', clientCode: '21286-OT1296-PCOL-0510-GN-TRE-00001' }, OTS), 1296)
assert.equal(otDeEntregable({ clientCode: '21286-OT1497-LSL2-1310-GN-TRE-00001' }, new Map()), 1497)
assert.equal(otDeEntregable({ clientCode: '21286-OT1497-LSL2-1310-GN-TRE-00001' }, undefined), 1497)

// El segmento se busca por su FORMA, no por su posicion: contar segmentos a ojo
// ya dio un falso positivo antes.
assert.equal(otDeEntregable({ clientCode: 'ALGO-MAS-21286-OT0980-PCLC-0242' }, undefined), 980)

// Sin ninguna de las dos fuentes, celda vacia y nunca 'undefined' ni NaN.
assert.equal(otDeEntregable({ clientCode: '21286-500-PL-2077' }, undefined), '')
assert.equal(otDeEntregable({}, undefined), '')
assert.equal(otDeEntregable(undefined, undefined), '')

// --- Una fila ----------------------------------------------------------------

const fila = filaDelMaestro(ENTREGABLE, OTS)
assert.equal(fila.ot, 1216)
assert.equal(fila.codigo, '21286-500-PL-2077')
assert.equal(fila.codigoCliente, '21286-OT1216-PCLC-0252-PP-DET-00001')
assert.equal(fila.asignadoA, 'Ana Pérez')
assert.equal(fila.enEsperaDe, 'Administrador de Contrato')
assert.equal(fila.transmittal, '21286-000-TT-1521')

// Cada columna declarada tiene su valor en la fila, y la fila no trae campos
// que la planilla no vaya a escribir.
assert.deepEqual(Object.keys(fila).sort(), COLUMNAS_MAESTRO.map(c => c.key).sort())

// Una solicitud que no está en el mapa cae al respaldo del código MEL: la
// columna OT no puede quedar vacía teniendo el dato a la vista en la fila de
// al lado, que es exactamente lo que reportó Control Documental.
assert.equal(filaDelMaestro({ ...ENTREGABLE, solicitudId: 'sol-fantasma' }, OTS).ot, 1216)
assert.equal(filaDelMaestro(ENTREGABLE, undefined).ot, 1216)

// Sin mapa y sin código MEL sí queda vacía, pero nunca `undefined` ni NaN.
assert.equal(filaDelMaestro({ id: '21286-500-PL-2077' }, undefined).ot, '')

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
