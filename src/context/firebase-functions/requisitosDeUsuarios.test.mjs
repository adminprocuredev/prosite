// Correr con: node src/context/firebase-functions/requisitosDeUsuarios.test.mjs
import assertOriginal from 'node:assert/strict'
import { buscaPorNombre, faltaDatoPara } from './requisitosDeUsuarios.js'

// El total se cuenta solo: escrito a mano se desincroniza.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// --- el caso que se vio en producción -----------------------------------------

// dialog-fullsize llama getUserData('getPetitioner', null, { name: 'Fulano' }):
// quiere buscar por NOMBRE, y la planta va nula a propósito. Antes se ejecutaba
// igual la consulta por planta y reventaba antes de llegar a la del nombre.
assert.equal(
  buscaPorNombre('getPetitioner', { name: 'Rodrigo Fernández' }),
  true,
  'con nombre, getPetitioner busca por nombre y no necesita planta'
)
assert.equal(faltaDatoPara('getPetitioner', null, { name: 'x' }), 'planta', 'y sin nombre sí la necesita')
assert.equal(faltaDatoPara('getPetitioner', ['Los Colorados']), null, 'con planta, adelante')

// --- planta ------------------------------------------------------------------

for (const tipo of ['getUsers', 'getAllPlantUsers', 'getPetitioner', 'getReceiverUsers']) {
  assert.equal(faltaDatoPara(tipo, undefined), 'planta', `${tipo} sin planta`)
  assert.equal(faltaDatoPara(tipo, null), 'planta', `${tipo} con planta nula`)
  assert.equal(faltaDatoPara(tipo, ''), 'planta', `${tipo} con planta vacía`)
  assert.equal(faltaDatoPara(tipo, []), 'planta', `${tipo} con lista de plantas vacía`)
  assert.equal(faltaDatoPara(tipo, ['Laguna Seca 1']), null, `${tipo} con planta`)

  // Firestore mira los VALORES del array, no solo el largo: una lista con un
  // hueco vuelve a lanzar el mismo error, entrando por otra puerta.
  assert.equal(faltaDatoPara(tipo, [undefined]), 'planta', `${tipo} con un hueco en la lista`)
  assert.equal(faltaDatoPara(tipo, [null]), 'planta', `${tipo} con un nulo en la lista`)
  assert.equal(faltaDatoPara(tipo, ['Puerto Coloso', '']), 'planta', `${tipo} con una planta vacía entre válidas`)
}

// Un nombre de puros espacios no es un nombre: `where('name','==','   ')` es
// una consulta válida que no encuentra nada nunca.
assert.equal(buscaPorNombre('getPetitioner', { name: '   ' }), false, 'un nombre de puros espacios no cuenta')
assert.equal(faltaDatoPara('getUsersByRole', null, { role: '  ' }), 'rol', 'un rol de puros espacios tampoco')

// --- turno -------------------------------------------------------------------

// Se lee shift[0]: el valor por defecto de userParam es { shift: '' }, y ''[0]
// es undefined, que es justo lo que Firestore rechaza.
for (const tipo of ['getUserProyectistas', 'getUserSupervisor']) {
  assert.equal(faltaDatoPara(tipo, null, { shift: '' }), 'turno', `${tipo} con el turno por defecto`)
  assert.equal(faltaDatoPara(tipo, null, { shift: [] }), 'turno', `${tipo} con turnos vacíos`)
  assert.equal(faltaDatoPara(tipo, null, {}), 'turno', `${tipo} sin turno`)
  assert.equal(faltaDatoPara(tipo, null, { shift: ['A'] }), null, `${tipo} con turno A`)
}

// --- rol ---------------------------------------------------------------------

assert.equal(faltaDatoPara('getUsersByRole', null, {}), 'rol', 'sin rol no se puede filtrar por rol')
assert.equal(faltaDatoPara('getUsersByRole', null, { role: 3 }), null, 'con rol, adelante')

// --- las que no dependen de nada ----------------------------------------------

assert.equal(faltaDatoPara('getAllProcureUsers', null, {}), null, 'la lista de Procure no necesita planta')
assert.equal(faltaDatoPara('tipoQueNoExiste', null, {}), null, 'un tipo desconocido lo rechaza getUserData, no esto')

// --- bordes ------------------------------------------------------------------

assert.equal(faltaDatoPara('getUserProyectistas', null), 'turno', 'sin userParam no revienta')
assert.equal(buscaPorNombre('getPetitioner', {}), false, 'getPetitioner sin nombre no busca por nombre')
assert.equal(buscaPorNombre('getPetitioner', { name: '' }), false, 'un nombre vacío no es un nombre')
assert.equal(buscaPorNombre('getUsers', { name: 'x' }), false, 'solo getPetitioner busca por nombre')
assert.equal(buscaPorNombre('getPetitioner'), false, 'sin userParam tampoco')

// El rol 0 no existe en Prosite (van del 1 al 9), pero si algún día existiera,
// un 0 es un rol y no una ausencia.
assert.equal(faltaDatoPara('getUsersByRole', null, { role: 0 }), null, 'el rol 0 es un valor, no un vacío')

console.log(`ok — requisitosDeUsuarios: ${comprobaciones} comprobaciones`)
