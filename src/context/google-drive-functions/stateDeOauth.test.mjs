// Correr con: node src/context/google-drive-functions/stateDeOauth.test.mjs
import assertOriginal from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { LLAVE_DEL_STATE, crearState, stateCoincide } from './stateDeOauth.js'

// El total se cuenta solo: escrito a mano se desincroniza.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// --- lo que el arreglo viene a cerrar ----------------------------------------

// El `code` de un tercero llega SIN state, o con otro. Ninguno de los dos pasa.
assert.equal(stateCoincide('abc123', null), false, 'un retorno sin state no pasa')
assert.equal(stateCoincide('abc123', 'otro'), false, 'un state distinto no pasa')
assert.equal(stateCoincide('abc123', 'abc123'), true, 'el nuestro sí pasa')

// El par de nulos: si no guardamos nada y Google no devuelve nada, escrito como
// descarte (`guardado !== recibido`) esto daría true y el flujo seguiría con un
// código que nadie pidió. Es el mismo patrón del NaN en la portada.
assert.equal(stateCoincide(null, null), false, 'dos nulos NO coinciden')
assert.equal(stateCoincide(undefined, undefined), false, 'dos undefined tampoco')
assert.equal(stateCoincide('', ''), false, 'dos vacíos tampoco')

// --- el valor en sí ----------------------------------------------------------

// Impredecible y distinto cada vez: un `state` fijo —como el
// `'try_sample_request'` que estaba comentado— lo reproduce cualquiera.
{
  const generados = new Set(Array.from({ length: 200 }, () => crearState(webcrypto)))

  assert.equal(generados.size, 200, 'doscientos intentos, doscientos valores distintos')

  const uno = crearState(webcrypto)
  assert.match(uno, /^[0-9a-f]{32}$/, '32 caracteres hexadecimales, seguros en una URL')
}

// La llave es una constante compartida: si el hook guardara con una y leyera con
// otra, el flujo se rompería SIEMPRE y en silencio.
assert.equal(typeof LLAVE_DEL_STATE, 'string', 'la llave existe')
assert.ok(LLAVE_DEL_STATE.length > 0, 'y no está vacía')

console.log(`ok — stateDeOauth: ${comprobaciones} comprobaciones`)
