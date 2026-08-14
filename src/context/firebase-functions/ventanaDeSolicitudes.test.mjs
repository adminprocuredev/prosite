// Correr con: node src/context/firebase-functions/ventanaDeSolicitudes.test.mjs
import assertOriginal from 'node:assert/strict'
import moment from 'moment'
import { MESES_POR_DEFECTO, VENTANAS, desdeCuando, laVentanaAplicaA } from './ventanaDeSolicitudes.js'

// El total se cuenta solo: escrito a mano se desincroniza.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// --- a quién se le puede acotar la consulta -----------------------------------

// Los cuatro roles que hoy traen la colección entera. Que estén acotados no es
// una preferencia: es la lista de consultas a las que Firestore les permite un
// rango sobre `date` sin pedir un índice compuesto.
for (const role of [1, 4, 5, 6]) {
  assert.equal(laVentanaAplicaA(role), true, `el rol ${role} trae la colección entera y se acota`)
}

// Los roles 2 y 3 consultan por `uid ==` y `plant in`: sumarles el rango pediría
// un índice compuesto que no existe, y sus consultas ya son chicas. El 7 ya
// trae una desigualdad sobre `state`, y Firestore no admite dos campos con
// desigualdad en la misma consulta. Si alguno de estos entra a la lista sin
// desplegar índices, la tabla queda vacía y muda.
for (const role of [2, 3, 7]) {
  assert.equal(laVentanaAplicaA(role), false, `el rol ${role} NO se acota`)
}

// Un rol que no existe tampoco se acota: acotar por accidente esconde filas.
assert.equal(laVentanaAplicaA(undefined), false, 'sin rol no se acota')
assert.equal(laVentanaAplicaA(99), false, 'un rol desconocido no se acota')

// --- el corte ----------------------------------------------------------------

// «Todas» es la ausencia de ventana, no una ventana enorme: hay que devolver
// null para que quien consulta no arme ningún `where`.
assert.equal(desdeCuando(null), null, 'sin meses no hay corte')
assert.equal(desdeCuando(0), null, 'cero meses tampoco arma un corte')

// El corte va al INICIO del día. Si dependiera de la hora exacta, una solicitud
// del borde entraría o saldría según el minuto en que se abra la pantalla, y la
// tabla mostraría cosas distintas a las 9:00 y a las 9:01.
{
  const ahora = moment('2026-08-13T17:42:31')
  const desde = desdeCuando(12, ahora)

  assert.equal(moment(desde).format('YYYY-MM-DD HH:mm:ss'), '2025-08-13 00:00:00', 'doce meses, desde el inicio del día')
  assert.equal(moment(desdeCuando(24, ahora)).format('YYYY-MM-DD'), '2024-08-13', 'veinticuatro meses')
}

// Un 31 no se convierte en un mes que no tiene 31: moment lo lleva al último día.
{
  const desde = desdeCuando(1, moment('2026-03-31T10:00:00'))
  assert.equal(moment(desde).format('YYYY-MM-DD'), '2026-02-28', 'del 31 de marzo, un mes atrás es el 28 de febrero')
}

// --- las opciones que ve el usuario ------------------------------------------

// El valor por defecto tiene que ser una de las opciones ofrecidas, o el selector
// arranca en blanco y parece roto.
assert.ok(
  VENTANAS.some(ventana => ventana.meses === MESES_POR_DEFECTO),
  'el valor por defecto está entre las opciones'
)

// Y tiene que existir la salida a «todas», que es lo que hace que acotar no
// pierda nada: sin ella, una solicitud vieja sería inalcanzable desde la tabla.
assert.ok(
  VENTANAS.some(ventana => ventana.meses === null),
  'siempre hay una opción sin ventana'
)

assert.equal(
  VENTANAS.length,
  new Set(VENTANAS.map(ventana => ventana.etiqueta)).size,
  'no hay dos opciones con la misma etiqueta'
)

console.log(`ok — ventanaDeSolicitudes: ${comprobaciones} comprobaciones`)
