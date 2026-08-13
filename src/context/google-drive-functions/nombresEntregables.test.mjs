// Comprobación de nombresEntregables. Sin framework: node lo corre directo.
//   node src/context/google-drive-functions/nombresEntregables.test.mjs
import assertOriginal from 'node:assert/strict'
import {
  emparejarArchivosConEntregables,
  nombreEsperadoDeEntregable,
  puedeSubirDocumento,
  sinExtension
} from './nombresEntregables.js'

// El total se cuenta solo. Escrito a mano se desincroniza y el resumen termina
// mintiendo sobre cuántos casos corrieron.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

const PROYECTISTA = { role: 8, uid: 'proy-1', displayName: 'Ana Pérez Soto' }
const SUPERVISOR = { role: 7, uid: 'sup-1', displayName: 'Beto Ruiz' }
const CONTROL_DOCUMENTAL = { role: 9, uid: 'cd-1', displayName: 'Carla Díaz' }

const entregable = extra => ({
  id: '21286-100-ME-PL-0001',
  userId: 'proy-1',
  clientCode: '21286-OT1216-PCLC-0252-PP-DET-00001',
  revision: 'B',
  ...extra
})

// --- nombreEsperadoDeEntregable ---------------------------------------------

assert.equal(
  nombreEsperadoDeEntregable({ blueprint: entregable(), authUser: PROYECTISTA, revisionEsperada: 'C' }),
  '21286-OT1216-PCLC-0252-PP-DET-00001_REV_C',
  'proyectista: el código del cliente y la revisión que viene'
)

assert.equal(
  nombreEsperadoDeEntregable({ blueprint: entregable(), authUser: SUPERVISOR, revisionEsperada: 'C' }),
  '21286-OT1216-PCLC-0252-PP-DET-00001_REV_C_BR',
  'supervisor ajeno al entregable: lleva sus iniciales'
)

assert.equal(
  nombreEsperadoDeEntregable({
    blueprint: entregable({ userId: 'sup-1' }),
    authUser: SUPERVISOR,
    revisionEsperada: 'C'
  }),
  '21286-OT1216-PCLC-0252-PP-DET-00001_REV_C',
  'supervisor sobre SU entregable: sin iniciales'
)

assert.equal(
  nombreEsperadoDeEntregable({
    blueprint: entregable(),
    authUser: CONTROL_DOCUMENTAL,
    revisionEsperada: 'C',
    esHlc: true
  }),
  '21286-OT1216-PCLC-0252-PP-DET-00001_REV_C_HLC',
  'la HLC lleva su sufijo'
)

// El caso que arregló la incidencia 11: el proyectista subiendo la HLC no puede
// caer en la rama de rol 8.
assert.equal(
  nombreEsperadoDeEntregable({ blueprint: entregable(), authUser: PROYECTISTA, revisionEsperada: 'C', esHlc: true }),
  '21286-OT1216-PCLC-0252-PP-DET-00001_REV_C_HLC',
  'el proyectista subiendo la HLC: sufijo _HLC, no el nombre del entregable'
)

assert.equal(
  nombreEsperadoDeEntregable({
    blueprint: entregable({ approvedBySupervisor: true }),
    authUser: CONTROL_DOCUMENTAL,
    revisionEsperada: 'C',
    approves: true
  }),
  '21286-OT1216-PCLC-0252-PP-DET-00001_REV_C',
  'Control Documental aprobando: sin iniciales'
)

// Vale cualquier nombre → null, para que la carga masiva no le atribuya un
// archivo cualquiera.
assert.equal(
  nombreEsperadoDeEntregable({
    blueprint: entregable({ blueprintCompleted: true }),
    authUser: PROYECTISTA,
    revisionEsperada: 'C'
  }),
  null,
  'entregable cerrado: cualquier nombre vale, así que no se puede atribuir'
)

assert.equal(
  nombreEsperadoDeEntregable({
    blueprint: entregable({ approvedByDocumentaryControl: true }),
    authUser: CONTROL_DOCUMENTAL,
    revisionEsperada: 'C',
    puedeSerRevisadoPorCliente: true
  }),
  null,
  'documento que vuelve del cliente: cualquier nombre vale'
)

assert.equal(nombreEsperadoDeEntregable({ blueprint: null, authUser: PROYECTISTA }), null, 'sin entregable')
assert.equal(nombreEsperadoDeEntregable({ blueprint: entregable(), authUser: null }), null, 'sin usuario')

// --- sinExtension -------------------------------------------------------------

assert.equal(sinExtension('CODIGO_REV_C.pdf'), 'CODIGO_REV_C', 'quita la extensión')
assert.equal(sinExtension('CODIGO_REV_C'), 'CODIGO_REV_C', 'sin extensión, igual')
assert.equal(sinExtension(undefined), '', 'sin nombre')

// Corta en el PRIMER punto, igual que la validación de la carga de a uno. Los
// códigos no llevan puntos, así que el efecto es aceptar un sufijo extra en vez
// de rechazarlo.
assert.equal(sinExtension('CODIGO_REV_C.final.pdf'), 'CODIGO_REV_C', 'un sufijo extra no rompe el emparejamiento')

// --- emparejarArchivosConEntregables ------------------------------------------

const bpA = entregable({ id: 'A', clientCode: 'COD-A' })
const bpB = entregable({ id: 'B', clientCode: 'COD-B' })

const candidatos = [
  { blueprint: bpA, nombreEsperado: 'COD-A_REV_C' },
  { blueprint: bpB, nombreEsperado: 'COD-B_REV_C' }
]

const resultado = emparejarArchivosConEntregables(
  [{ name: 'COD-B_REV_C.pdf' }, { name: 'COD-A_REV_C.dwg' }, { name: 'otra-cosa.pdf' }],
  candidatos
)

assert.equal(resultado.length, 3, 'una entrada por archivo')
assert.equal(resultado[0].blueprint.id, 'B', 'empareja por nombre, no por posición')
assert.equal(resultado[0].motivo, 'ok')
assert.equal(resultado[1].blueprint.id, 'A', 'la extensión no participa')
assert.equal(resultado[2].blueprint, null, 'un archivo que no corresponde a nada')
assert.equal(resultado[2].motivo, 'sin-entregable')

// Dos archivos para el mismo entregable: ninguno se sube en silencio.
const repetidos = emparejarArchivosConEntregables(
  [{ name: 'COD-A_REV_C.pdf' }, { name: 'COD-A_REV_C.dwg' }],
  candidatos
)
assert.equal(repetidos[0].motivo, 'archivo-repetido', 'dos archivos para el mismo entregable: no se elige uno')
assert.equal(repetidos[1].motivo, 'archivo-repetido')
assert.equal(repetidos[0].blueprint, null)

// Dos entregables esperando el mismo nombre: tampoco se adivina.
const ambiguos = emparejarArchivosConEntregables([{ name: 'COD-A_REV_C.pdf' }], [
  { blueprint: bpA, nombreEsperado: 'COD-A_REV_C' },
  { blueprint: bpB, nombreEsperado: 'COD-A_REV_C' }
])
assert.equal(ambiguos[0].motivo, 'entregable-ambiguo')
assert.equal(ambiguos[0].blueprint, null)

// Los entregables sin nombre esperado quedan fuera del emparejamiento: si no,
// se llevarían cualquier archivo.
const conNulos = emparejarArchivosConEntregables(
  [{ name: 'COD-A_REV_C.pdf' }],
  [{ blueprint: bpB, nombreEsperado: null }, { blueprint: bpA, nombreEsperado: 'COD-A_REV_C' }]
)
assert.equal(conNulos[0].blueprint.id, 'A', 'un candidato sin nombre esperado no compite')

assert.deepEqual(emparejarArchivosConEntregables([], candidatos), [], 'sin archivos')
assert.deepEqual(emparejarArchivosConEntregables(null, null), [], 'sin nada')
assert.equal(
  emparejarArchivosConEntregables([{ name: 'x.pdf' }], null)[0].motivo,
  'sin-entregable',
  'sin candidatos, nada coincide'
)

// --- puedeSubirDocumento ------------------------------------------------------

// El autor, mientras no lo haya enviado.
assert.equal(puedeSubirDocumento(PROYECTISTA, entregable()), true, 'el autor, antes de enviarlo')
assert.equal(
  puedeSubirDocumento(PROYECTISTA, entregable({ sentByDesigner: true })),
  false,
  'el autor, una vez enviado: ya no'
)

// El de al lado no, y esto es lo que evita que la carga masiva se lleve
// documentos ajenos: la validación del nombre por sí sola no lo distingue.
assert.equal(
  puedeSubirDocumento({ role: 8, uid: 'otro' }, entregable()),
  false,
  'otro proyectista no sube el entregable ajeno'
)

// Un entregable sin dueño no habilita a nadie por coincidencia de undefined.
assert.equal(
  puedeSubirDocumento({ role: 8, uid: undefined }, entregable({ userId: undefined })),
  false,
  'undefined === undefined no da permiso'
)

// El supervisor, sobre lo enviado por el proyectista y aún sin aprobar.
assert.equal(
  puedeSubirDocumento(SUPERVISOR, entregable({ sentByDesigner: true })),
  true,
  'el supervisor revisa lo que envió el proyectista'
)
assert.equal(
  puedeSubirDocumento(SUPERVISOR, entregable({ sentByDesigner: true, approvedByDocumentaryControl: true })),
  false,
  'pero no después de que Control Documental aprobó'
)

// El documento que vuelve del cliente.
assert.equal(
  puedeSubirDocumento(CONTROL_DOCUMENTAL, entregable({ approvedByDocumentaryControl: true }), true),
  true,
  'Control Documental sube el documento que vuelve del cliente'
)
assert.equal(
  puedeSubirDocumento(CONTROL_DOCUMENTAL, entregable({ approvedByDocumentaryControl: true }), false),
  false,
  'si el entregable no está en esa etapa, no'
)

assert.equal(puedeSubirDocumento(null, entregable()), false, 'sin usuario')
assert.equal(puedeSubirDocumento(PROYECTISTA, null), false, 'sin entregable')

console.log(`ok — nombresEntregables: ${comprobaciones} comprobaciones`)
