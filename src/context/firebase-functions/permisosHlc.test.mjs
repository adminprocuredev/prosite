// Comprobación de permisosHlc. Sin framework: node lo corre directo.
//   node src/context/firebase-functions/permisosHlc.test.mjs
import assert from 'node:assert/strict'
import { puedeSubirHlc, veColumnaHlc } from './permisosHlc.js'

const CONTROL_DOCUMENTAL = { role: 9, uid: 'cd-1' }
const PROYECTISTA = { role: 8, uid: 'proy-1' }
const OTRO_PROYECTISTA = { role: 8, uid: 'proy-2' }
const SUPERVISOR = { role: 7, uid: 'sup-1' }

// Las revisiones llegan con los datos crudos de Firestore: `date` es un
// Timestamp, no una cadena. Probar con cadenas ISO daba tests verdes sobre una
// forma del dato que no existe en la aplicación.
const timestamp = iso => {
  const ms = Date.parse(iso)

  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms) }
}

// La misma fecha pero sin toDate(): así queda un Timestamp que pasó por JSON.
const timestampPlano = iso => ({ seconds: Math.floor(Date.parse(iso) / 1000), nanoseconds: 0 })

const entregable = extra => ({
  userId: 'proy-1',
  approvedByDocumentaryControl: true,
  sentByDesigner: true,
  sentBySupervisor: false,
  revision: 'B',
  revisions: [{ date: timestamp('2026-08-01T10:00:00Z') }, { date: timestamp('2026-08-05T10:00:00Z') }],
  ...extra
})

// --- el defecto que motivó la incidencia ------------------------------------

// Enviado por un PROYECTISTA. Antes la única rama que lo cubría exigía a la vez
// que la última revisión tuviera y no tuviera transmittal, así que ni Control
// Documental podía adjuntar la HLC.
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable()), true, 'CD sobre un entregable enviado por proyectista')

// Enviado por un SUPERVISOR: el único caso que funcionaba antes. Sigue igual.
assert.equal(
  puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ sentByDesigner: false, sentBySupervisor: true })),
  true,
  'CD sobre un entregable enviado por supervisor'
)

// --- lo que pide la incidencia ----------------------------------------------

assert.equal(puedeSubirHlc(PROYECTISTA, entregable()), true, 'el proyectista sube la HLC de SU entregable')
assert.equal(puedeSubirHlc(OTRO_PROYECTISTA, entregable()), false, 'pero no la del entregable de otro')
assert.equal(puedeSubirHlc(SUPERVISOR, entregable()), false, 'el supervisor no sube HLC')
assert.equal(puedeSubirHlc(null, entregable()), false, 'sin usuario, no')

// Un entregable sin dueño no habilita a nadie por coincidencia de undefined.
assert.equal(
  puedeSubirHlc({ role: 8, uid: undefined }, entregable({ userId: undefined })),
  false,
  'undefined === undefined no puede dar permiso'
)

// --- la etapa del flujo ------------------------------------------------------

assert.equal(
  puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ approvedByDocumentaryControl: false })),
  false,
  'sin aprobación de Control Documental, todavía no toca'
)

assert.equal(
  puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ sentByDesigner: false, sentBySupervisor: false })),
  false,
  'si no lo envió su autor, todavía no toca'
)

// El transmittal ya emitido cierra la ventana. Se comprueba sobre la revisión
// MÁS RECIENTE, no sobre la primera del array: el orden de llegada no es el
// cronológico.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: timestamp('2026-08-05T10:00:00Z'), lastTransmittal: 'T-001' },
        { date: timestamp('2026-08-01T10:00:00Z') }
      ]
    })
  ),
  false,
  'con transmittal en la última revisión, la HLC llega tarde'
)

assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: timestamp('2026-08-01T10:00:00Z'), lastTransmittal: 'T-001' },
        { date: timestamp('2026-08-05T10:00:00Z') }
      ]
    })
  ),
  true,
  'un transmittal en una revisión ANTERIOR no cierra la ventana'
)

assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ revisions: [] })), false, 'sin revisiones, no')
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ revisions: undefined })), false, 'sin array de revisiones, no')
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, null), false, 'sin entregable, no')

// Sin revisión identificada no hay a qué asociar la HLC.
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ revision: undefined })), false, 'sin revisión, no')
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ revision: '' })), false, 'revisión vacía, no')

// --- fechas que no se pueden ordenar -----------------------------------------

// El orden decide el permiso. Con una fecha ilegible, `new Date` da NaN, toda
// comparación con NaN es false y sort se queda con el orden de llegada: la
// revisión con transmittal podía quedar fuera de la primera posición y
// autorizar una HLC tardía. Ante la duda, no se autoriza.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [{ date: undefined }, { date: timestamp('2026-08-05T10:00:00Z'), lastTransmittal: 'T-001' }]
    })
  ),
  false,
  'fecha ausente: no se autoriza'
)

assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({ revisions: [{ date: 'no-es-una-fecha' }, { date: timestamp('2026-08-05T10:00:00Z') }] })
  ),
  false,
  'fecha ilegible: no se autoriza'
)

// Empate: no se puede saber cuál es la última, así que basta que una tenga
// transmittal para dar la ventana por cerrada.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: timestamp('2026-08-05T10:00:00Z') },
        { date: timestamp('2026-08-05T10:00:00Z'), lastTransmittal: 'T-001' }
      ]
    })
  ),
  false,
  'mismo instante y una con transmittal: cerrado'
)

assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [{ date: timestamp('2026-08-05T10:00:00Z') }, { date: timestamp('2026-08-05T10:00:00Z') }]
    })
  ),
  true,
  'mismo instante y ninguna con transmittal: abierto'
)

// `null` merece su propio caso: new Date(null) vale 0, o sea 1970, y pasaba por
// una fecha perfectamente válida.
assert.equal(
  puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ revisions: [{ date: null }] })),
  false,
  'fecha null: no se autoriza (new Date(null) es 1970, no NaN)'
)

// --- las formas en que llega un Timestamp ------------------------------------

// Un Timestamp que pasó por JSON pierde toDate() y queda solo con `seconds`.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: timestampPlano('2026-08-01T10:00:00Z') },
        { date: timestampPlano('2026-08-05T10:00:00Z') }
      ]
    })
  ),
  true,
  'Timestamp sin toDate(): se lee por seconds'
)

assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: timestampPlano('2026-08-01T10:00:00Z') },
        { date: timestampPlano('2026-08-05T10:00:00Z'), lastTransmittal: 'T-001' }
      ]
    })
  ),
  false,
  'Timestamp sin toDate(): el orden se respeta y cierra la ventana'
)

// Y si en algún camino ya viene convertida.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({ revisions: [{ date: new Date('2026-08-01T10:00:00Z') }, { date: new Date('2026-08-05T10:00:00Z') }] })
  ),
  true,
  'Date ya convertida'
)

assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({ revisions: [{ date: '2026-08-01T10:00:00Z' }, { date: '2026-08-05T10:00:00Z' }] })
  ),
  true,
  'cadena ISO'
)

// Dos revisiones del mismo segundo NO son un empate: los nanosegundos las
// separan. Sin ellos, la de abajo quedaba empatada con la que trae transmittal
// y se bloqueaba una HLC que sí se puede subir.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: { seconds: 1786550000, nanoseconds: 100000000 }, lastTransmittal: 'T-001' },
        { date: { seconds: 1786550000, nanoseconds: 900000000 } }
      ]
    })
  ),
  true,
  'mismo segundo, distinto nanosegundo: manda la más reciente'
)

assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({
      revisions: [
        { date: { seconds: 1786550000, nanoseconds: 900000000 }, lastTransmittal: 'T-001' },
        { date: { seconds: 1786550000, nanoseconds: 100000000 } }
      ]
    })
  ),
  false,
  'y si la más reciente del segundo tiene transmittal, cierra'
)

// Una fecha en milisegundos también se entiende.
assert.equal(
  puedeSubirHlc(
    CONTROL_DOCUMENTAL,
    entregable({ revisions: [{ date: Date.parse('2026-08-01T10:00:00Z') }, { date: Date.parse('2026-08-05T10:00:00Z') }] })
  ),
  true,
  'milisegundos'
)

// --- la HLC ya adjunta -------------------------------------------------------

assert.equal(
  puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ storageHlcDocuments: [{ name: 'hlc.pdf', url: 'https://x' }] })),
  false,
  'con la HLC ya adjunta no hay nada que subir'
)

assert.equal(
  puedeSubirHlc(PROYECTISTA, entregable({ storageHlcDocuments: [{ name: 'hlc.pdf', url: 'https://x' }] })),
  false,
  'tampoco el proyectista'
)

// Un array vacío o un null no cuentan como HLC adjunta.
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ storageHlcDocuments: [] })), true, 'array vacío: sí se puede')
assert.equal(puedeSubirHlc(CONTROL_DOCUMENTAL, entregable({ storageHlcDocuments: null })), true, 'null: sí se puede')

// --- la columna --------------------------------------------------------------

assert.equal(veColumnaHlc(CONTROL_DOCUMENTAL), true, 'CD ve la columna')
assert.equal(veColumnaHlc(PROYECTISTA), true, 'el proyectista ve la columna')
assert.equal(veColumnaHlc(SUPERVISOR), false, 'el supervisor no')
assert.equal(veColumnaHlc(null), false, 'sin usuario, no')

console.log('ok — permisosHlc: 37 comprobaciones')
