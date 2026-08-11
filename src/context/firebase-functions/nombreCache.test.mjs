// Correr con: node src/context/firebase-functions/nombreCache.test.mjs
import assert from 'node:assert/strict'
import { crearCacheDeNombres } from './nombreCache.js'

const conContador = respuestas => {
  let lecturas = 0

  const leer = uid => {
    lecturas++

    return Promise.resolve(uid in respuestas ? { data: () => respuestas[uid] } : { data: () => undefined })
  }

  return { leer, lecturas: () => lecturas }
}

// El punto del arreglo: 200 filas de dos usuarios distintos = 2 lecturas, no 200.
{
  const { leer, lecturas } = conContador({ u1: { name: 'Ana' }, u2: { name: 'Beto' } })
  const nombreDe = crearCacheDeNombres(leer)
  const filas = Array.from({ length: 200 }, (_, i) => (i % 2 ? 'u1' : 'u2'))

  const nombres = await Promise.all(filas.map(nombreDe))

  assert.equal(lecturas(), 2, `debía leer 2 veces y leyó ${lecturas()}`)
  assert.equal(nombres[0], 'Beto')
  assert.equal(nombres[1], 'Ana')
}

// Un fallo no se guarda: el siguiente intento vuelve a leer en vez de quedarse pegado
// con "No definido" para siempre.
{
  let falla = true

  let lecturas = 0

  const leer = () => {
    lecturas++
    if (falla) return Promise.reject(new Error('sin red'))

    return Promise.resolve({ data: () => ({ name: 'Ana' }) })
  }

  const nombreDe = crearCacheDeNombres(leer)
  assert.equal(await nombreDe('u1'), 'No definido')
  falla = false
  assert.equal(await nombreDe('u1'), 'Ana', 'debe reintentar tras un fallo')
  assert.equal(lecturas, 2)

  // Y una vez que resolvió bien, no vuelve a leer.
  await nombreDe('u1')
  assert.equal(lecturas, 2, 'un resultado bueno sí se guarda')
}

// Usuario borrado, uid vacío y error de red no deben romper la tabla.
{
  const { leer } = conContador({})
  const nombreDe = crearCacheDeNombres(leer)
  assert.equal(await nombreDe('fantasma'), 'No definido')
  assert.equal(await nombreDe(undefined), 'No definido')

  const queFalla = crearCacheDeNombres(() => Promise.reject(new Error('sin red')))
  assert.equal(await queFalla('u1'), 'No definido')
}

console.log('ok — crearCacheDeNombres')
