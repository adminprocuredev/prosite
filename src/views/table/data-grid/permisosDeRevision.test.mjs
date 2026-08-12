// Comprobación de permisosDeRevision. Sin framework: node lo corre directo.
//   node src/views/table/data-grid/permisosDeRevision.test.mjs
import assertOriginal from 'node:assert/strict'
import { permisosDeRevision } from './permisosDeRevision.js'

// El total se cuenta solo: escrito a mano se desincroniza.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

const SUPERVISOR = { role: 7, uid: 'sup-1' }
const OTRO_SUPERVISOR = { role: 7, uid: 'sup-2' }
const PROYECTISTA = { role: 8, uid: 'proy-1' }
const CONTROL_DOCUMENTAL = { role: 9, uid: 'cd-1' }
const CONTRACT_OWNER = { role: 6, uid: 'co-1' }

// Un entregable listo para revisar: con descripción, código y archivo.
const entregable = extra => ({
  userId: 'proy-1',
  description: 'Plataforma acceso',
  clientCode: '21286-OT1001-PP-1000-ME-PL-00001',
  storageBlueprints: [{ name: 'doc.pdf', url: 'https://drive/x' }],
  attentive: 8,
  sentByDesigner: false,
  sentBySupervisor: false,
  blueprintCompleted: false,
  ...extra
})

// --- Solicitudes 3: el proyectista no está ----------------------------------

// El caso de la incidencia: el entregable espera al proyectista, que está de
// descanso, y el documento ya está cargado. Antes el supervisor no podía tocarlo
// y el flujo se quedaba detenido hasta que volviera.
assert.equal(
  permisosDeRevision(entregable(), SUPERVISOR).approve,
  true,
  'el supervisor da curso a un entregable detenido en el proyectista'
)
assert.equal(
  permisosDeRevision(entregable(), SUPERVISOR).reject,
  true,
  'y también puede devolverlo con observaciones'
)

// Sin documento cargado no hay nada que revisar: la facultad no sirve para
// empujar entregables vacíos.
assert.equal(
  permisosDeRevision(entregable({ storageBlueprints: [] }), SUPERVISOR).approve,
  false,
  'sin archivo cargado, no'
)
assert.equal(
  permisosDeRevision(entregable({ storageBlueprints: null }), SUPERVISOR).approve,
  false,
  'sin storageBlueprints, no'
)
assert.equal(
  permisosDeRevision(entregable({ description: '' }), SUPERVISOR).approve,
  false,
  'sin descripción, no'
)
assert.equal(
  permisosDeRevision(entregable({ clientCode: '' }), SUPERVISOR).approve,
  false,
  'sin código de cliente, no'
)
assert.equal(
  permisosDeRevision(entregable({ blueprintCompleted: true }), SUPERVISOR).approve,
  false,
  'un entregable terminado no se vuelve a aprobar'
)

// Campo presente pero vacío de contenido: ' ' es truthy y [{}] mide 1.
assert.equal(
  permisosDeRevision(entregable({ description: '   ' }), SUPERVISOR).approve,
  false,
  'una descripción de puros espacios no cuenta'
)
assert.equal(
  permisosDeRevision(entregable({ clientCode: '  ' }), SUPERVISOR).approve,
  false,
  'un código de puros espacios no cuenta'
)
assert.equal(
  permisosDeRevision(entregable({ storageBlueprints: [{}] }), SUPERVISOR).approve,
  false,
  'un archivo sin url no es un archivo'
)
assert.equal(
  permisosDeRevision(entregable({ storageBlueprints: [{ name: 'x', url: '   ' }] }), SUPERVISOR).approve,
  false,
  'una url en blanco tampoco'
)
assert.equal(
  permisosDeRevision(entregable({ storageBlueprints: { name: 'x', url: 'https://drive/y' } }), SUPERVISOR).approve,
  true,
  'un archivo como objeto suelto también vale'
)

// Un supervisor NO se da curso a sí mismo saltándose al proyectista: eso sería
// aprobarse solo, que es lo que la revisión existe para evitar.
assert.equal(
  permisosDeRevision(entregable({ userId: 'sup-1' }), SUPERVISOR).approve,
  false,
  'el supervisor no aprueba SU propio entregable por la vía del proyectista'
)
assert.equal(
  permisosDeRevision(entregable({ userId: 'sup-1' }), SUPERVISOR).reject,
  false,
  'ni lo rechaza'
)

// El proyectista dueño sigue pudiendo enviar el suyo, como antes.
assert.equal(permisosDeRevision(entregable(), PROYECTISTA).approve, true, 'el proyectista envía el suyo')
assert.equal(
  permisosDeRevision(entregable(), { role: 8, uid: 'otro' }).approve,
  false,
  'otro proyectista no toca el entregable ajeno'
)
assert.equal(permisosDeRevision(entregable(), PROYECTISTA).reject, false, 'el proyectista no rechaza')

// --- lo que ya funcionaba, que no se puede haber roto -----------------------

const esperandoSupervisor = entregable({ attentive: 7, sentByDesigner: true })

assert.equal(
  permisosDeRevision(esperandoSupervisor, OTRO_SUPERVISOR).approve,
  true,
  'el supervisor revisa lo que le enviaron'
)
assert.equal(permisosDeRevision(esperandoSupervisor, OTRO_SUPERVISOR).reject, true, 'y lo puede rechazar')

assert.equal(
  permisosDeRevision(entregable({ attentive: 7, sentByDesigner: true, approvedBySupervisor: true }), OTRO_SUPERVISOR)
    .approve,
  false,
  'no se aprueba dos veces'
)

// El supervisor sobre SU propio entregable en su turno: puede enviarlo, no
// rechazarlo.
const mioEnMiTurno = entregable({ attentive: 7, userId: 'sup-1' })
assert.equal(permisosDeRevision(mioEnMiTurno, SUPERVISOR).approve, true, 'el supervisor envía el suyo')
assert.equal(permisosDeRevision(mioEnMiTurno, SUPERVISOR).reject, false, 'pero no se rechaza a sí mismo')

// Control Documental.
assert.equal(
  permisosDeRevision(entregable({ attentive: 9 }), CONTROL_DOCUMENTAL).approve,
  true,
  'Control Documental aprueba en su turno'
)
assert.equal(
  permisosDeRevision(entregable({ attentive: 9, approvedByDocumentaryControl: true }), CONTROL_DOCUMENTAL).approve,
  false,
  'y no dos veces'
)
assert.equal(
  permisosDeRevision(entregable({ attentive: 8 }), CONTROL_DOCUMENTAL).approve,
  false,
  'Control Documental no actúa fuera de su turno'
)

// Contract Owner.
assert.equal(
  permisosDeRevision(entregable({ attentive: 7 }), CONTRACT_OWNER).approve,
  true,
  'el Contract Owner aprueba en el turno del supervisor'
)
assert.equal(
  permisosDeRevision(entregable({ attentive: 8 }), CONTRACT_OWNER).approve,
  false,
  'pero no en el del proyectista'
)

// --- bordes ------------------------------------------------------------------

assert.deepEqual(permisosDeRevision(null, SUPERVISOR), { approve: false, reject: false }, 'sin entregable')
assert.deepEqual(permisosDeRevision(entregable(), null), { approve: false, reject: false }, 'sin usuario')

// Un rol sin entrada devolvía undefined y el llamador lo salvaba con `?.`.
assert.deepEqual(
  permisosDeRevision(entregable(), { role: 2, uid: 'x' }),
  { approve: false, reject: false },
  'un rol sin permisos definidos no aprueba nada'
)

// Un entregable sin dueño no puede hacerse "mío" por coincidencia de undefined.
// Va con rol 7 y attentive 7 a propósito: es la rama donde isMyBlueprint decide,
// y con rol 8 el turno no calzaba, así que la comprobación pasaba sola y no
// habría detectado la regresión.
assert.equal(
  permisosDeRevision(entregable({ userId: undefined, attentive: 7 }), { role: 7, uid: undefined }).approve,
  false,
  'undefined === undefined no da permiso'
)

console.log(`ok — permisosDeRevision: ${comprobaciones} comprobaciones`)
