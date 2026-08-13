// Correr con: node src/context/firebase-functions/nombreCache.test.mjs
import assertOriginal from 'node:assert/strict'
import { crearLectorDeNombres, trocear } from './nombreCache.js'

// El total se cuenta solo: escrito a mano se desincroniza.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// Lector de mentira que anota cuántas CONSULTAS hizo y con qué uid.
const conContador = respuestas => {
  const tandas = []

  const leerLote = uids => {
    tandas.push(uids)

    return Promise.resolve(new Map(uids.filter(uid => uid in respuestas).map(uid => [uid, respuestas[uid]])))
  }

  return { leerLote, consultas: () => tandas.length, tandas: () => tandas }
}

// --- lo que el arreglo viene a cerrar ----------------------------------------

// 200 filas de dos usuarios distintos: UNA consulta, no 200 lecturas.
{
  const { leerLote, consultas } = conContador({ u1: 'Ana', u2: 'Beto' })
  const nombresDe = crearLectorDeNombres(leerLote)
  const filas = Array.from({ length: 200 }, (_, i) => (i % 2 ? 'u1' : 'u2'))

  const nombres = await nombresDe(filas)

  assert.equal(consultas(), 1, `debía consultar 1 vez y consultó ${consultas()}`)
  assert.equal(nombres.get('u1'), 'Ana')
  assert.equal(nombres.get('u2'), 'Beto')
  assert.equal(nombres.size, 2, 'el Map se indexa por uid, sin repetir')
}

// Firestore no acepta más de 30 valores en un `in`: 70 uid son 3 consultas,
// y ninguna se pasa del tope.
{
  const respuestas = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`u${i}`, `Nombre ${i}`]))
  const { leerLote, consultas, tandas } = conContador(respuestas)
  const nombresDe = crearLectorDeNombres(leerLote)

  const nombres = await nombresDe(Object.keys(respuestas))

  assert.equal(consultas(), 3, `70 uid en tandas de 30 son 3 consultas, no ${consultas()}`)
  assert.ok(
    tandas().every(t => t.length <= 30),
    'ninguna tanda puede pasarse del tope de Firestore'
  )
  assert.equal(nombres.get('u0'), 'Nombre 0')
  assert.equal(nombres.get('u69'), 'Nombre 69')
  assert.deepEqual(tandas().map(t => t.length), [30, 30, 10])
}

// Entre un snapshot y el siguiente no se vuelve a preguntar por lo ya conocido.
{
  const { leerLote, consultas, tandas } = conContador({ u1: 'Ana', u2: 'Beto' })
  const nombresDe = crearLectorDeNombres(leerLote)

  await nombresDe(['u1'])
  await nombresDe(['u1', 'u2'])

  assert.equal(consultas(), 2)
  assert.deepEqual(tandas()[1], ['u2'], 'la segunda consulta solo pide lo que falta')

  await nombresDe(['u1', 'u2'])
  assert.equal(consultas(), 2, 'sin uid nuevos no hay consulta')
}

// --- bordes ------------------------------------------------------------------

// Usuario borrado: se responde "No definido" y no se vuelve a preguntar por él
// en cada snapshot.
{
  const { leerLote, consultas } = conContador({ u1: 'Ana' })
  const nombresDe = crearLectorDeNombres(leerLote)

  assert.equal((await nombresDe(['fantasma'])).get('fantasma'), 'No definido')
  await nombresDe(['fantasma'])
  assert.equal(consultas(), 1, 'un usuario que no existe se recuerda igual')
}

// Un uid vacío no dispara consulta ni rompe la fila.
{
  const { leerLote, consultas } = conContador({ u1: 'Ana' })
  const nombresDe = crearLectorDeNombres(leerLote)

  const nombres = await nombresDe([undefined, '', null, 'u1'])

  assert.equal(nombres.get(undefined), 'No definido')
  assert.equal(nombres.get('u1'), 'Ana')
  assert.equal(consultas(), 1, 'los uid vacíos no viajan a Firestore')
}

// Si la consulta falla, el resultado NO se guarda: el siguiente intento vuelve
// a leer en vez de dejar "No definido" congelado para siempre.
{
  let falla = true
  let consultas = 0

  const leerLote = uids => {
    consultas++
    if (falla) return Promise.reject(new Error('sin red'))

    return Promise.resolve(new Map(uids.map(uid => [uid, 'Ana'])))
  }

  const nombresDe = crearLectorDeNombres(leerLote)

  assert.equal((await nombresDe(['u1'])).get('u1'), 'No definido')
  falla = false
  assert.equal((await nombresDe(['u1'])).get('u1'), 'Ana', 'debe reintentar tras un fallo')
  assert.equal(consultas, 2)

  await nombresDe(['u1'])
  assert.equal(consultas, 2, 'un resultado bueno sí se guarda')
}

// trocear, por si acaso.
{
  assert.deepEqual(trocear([], 30), [], 'una lista vacía no genera tandas')
  assert.deepEqual(trocear([1, 2, 3], 30), [[1, 2, 3]], 'menos que el tope va en una sola tanda')
  assert.deepEqual(trocear([1, 2, 3, 4], 2), [[1, 2], [3, 4]], 'exacto no deja una tanda vacía al final')
}

console.log(`ok — crearLectorDeNombres: ${comprobaciones} comprobaciones`)
