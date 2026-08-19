// Correr con: node src/views/pages/solicitudes/estadosPorAprobar.test.mjs
//
// El defecto que esto vigila: la pestaña «Por aprobar» filtraba con
// `doc.state === authUser.role - 1`, y para el rol 1 —Administrador— eso da
// estado 0, que es RECHAZADO. La pestaña mostraba las mismas solicitudes que
// «Rechazadas». Lo reportó Mario Mella, gerente de Procure, mirando la pantalla.
//
// Ninguna prueba de la resta habría fallado: la resta hace exactamente lo que
// dice. El error estaba en creer que el número de rol y el número de estado son
// la misma escala.
import assertOriginal from 'node:assert/strict'
import { ESTADOS_EN_CURSO, estaPorAprobar, estadosPorAprobar, infoPorAprobar, rolAprueba } from './estadosPorAprobar.js'

let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

const RECHAZADO = 0
const APROBADA_POR_PROCURE = 6

// --- Lo que rompió: ninguna pestaña «Por aprobar» puede traer rechazadas -----

// Para TODOS los roles, incluidos los que no existen todavía.
for (let rol = 0; rol <= 13; rol++) {
  assert.equal(estadosPorAprobar(rol).includes(RECHAZADO), false)
  assert.equal(estaPorAprobar({ state: RECHAZADO }, rol), false)
}

// Ni aprobadas: eso es la pestaña de al lado. La excepción es el Supervisor,
// para quien el estado 6 —«Aprobado por Procure, en espera de asignación de
// Proyectistas»— sí es trabajo pendiente. O sea que para el rol 7, y solo para
// él, «Por aprobar» y «Aprobadas» se pisan a propósito.
for (let rol = 0; rol <= 13; rol++) {
  for (const estado of [6, 7, 8, 9]) {
    const esperado = rol === 7 && estado === APROBADA_POR_PROCURE
    assert.equal(estaPorAprobar({ state: estado }, rol), esperado)
  }
}

// --- Cada rol de la cadena, con el estado que de verdad le toca --------------

// Los que sí aprueban. Sale del Map `rules` de firestoreFunctions.js y del
// campo `details` del diccionario de estados.
assert.deepEqual(estadosPorAprobar(2), [1]) // Solicitante: devuelta para revisión
assert.deepEqual(estadosPorAprobar(3), [2]) // Contract Operator
assert.deepEqual(estadosPorAprobar(5), [3, 4]) // Planificador
assert.deepEqual(estadosPorAprobar(6), [5]) // Administrador de Contrato
assert.deepEqual(estadosPorAprobar(7), [6]) // Supervisor: asigna proyectistas

assert.equal(rolAprueba(2), true)
assert.equal(rolAprueba(5), true)
assert.equal(rolAprueba(7), true)

// El comportamiento anterior, para dejar constancia de qué cambia: la resta
// `rol - 1` acertaba en el medio de la cadena y fallaba en los extremos.
for (const rol of [2, 3, 6, 7]) {
  assert.deepEqual(estadosPorAprobar(rol), [rol - 1])
}

// --- Los que no aprueban nada ------------------------------------------------

// Rol 1 (Administrador) y rol 4 (Contract Owner) no están en el Map de reglas
// —el 4 está con la lista vacía—, así que no tienen nada propio que aprobar.
// Ven todo lo que está en curso, que es una vista de supervisión, y el texto de
// ayuda lo dice para no prometer lo que no es.
assert.equal(rolAprueba(1), false)
assert.equal(rolAprueba(4), false)
assert.deepEqual(estadosPorAprobar(1), ESTADOS_EN_CURSO)
assert.deepEqual(estadosPorAprobar(4), ESTADOS_EN_CURSO)

assert.equal(infoPorAprobar(1), 'Solicitudes pendientes de aprobación')
assert.equal(infoPorAprobar(6), 'Solicitudes pendientes de mi aprobación')

// Las tres pestañas de un Administrador parten el total sin superponerse y sin
// dejar nada afuera: en curso (1-5), aprobadas (6-9) y rechazada (0).
const todos = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const enCurso = todos.filter(e => estaPorAprobar({ state: e }, 1))
const aprobadas = todos.filter(e => e >= 6 && e < 10)
const rechazadas = todos.filter(e => e === 0)
assert.deepEqual([...enCurso, ...aprobadas, ...rechazadas].sort((a, b) => a - b), todos)
assert.equal(new Set([...enCurso, ...aprobadas, ...rechazadas]).size, todos.length)

// --- Datos rotos no pueden reventar la pestaña -------------------------------

// Una solicitud sin `state` no es «por aprobar»: `undefined` no está en ninguna
// lista. Y `estaPorAprobar` tiene que aguantar un documento nulo, porque estas
// colecciones traen fichas viejas a las que les falta de todo.
assert.equal(estaPorAprobar({}, 1), false)
assert.equal(estaPorAprobar(undefined, 1), false)
assert.equal(estaPorAprobar(null, 6), false)

// Un `state` guardado como texto no cuenta: `includes` compara con ===, igual
// que lo hacía la resta. Se deja explícito para que nadie lo "arregle" con ==.
assert.equal(estaPorAprobar({ state: '5' }, 6), false)

console.log(`ok — estadosPorAprobar: ${comprobaciones} comprobaciones`)
