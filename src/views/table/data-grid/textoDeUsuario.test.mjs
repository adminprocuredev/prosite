// Correr con: node src/views/table/data-grid/textoDeUsuario.test.mjs
//
// Estas funciones alimentan a la vez lo que se VE en la tabla de usuarios y lo
// que se DESCARGA a Excel/CSV. Un error aquí no rompe la pantalla: entrega una
// planilla que dice algo falso, que es peor porque nadie lo nota.
//
// El caso que de verdad importa es `enabled` ausente. La mayoría de las fichas
// antiguas no traen el campo, y tanto el login como la tabla lo tratan como
// HABILITADO. Si esto se leyera al revés, el maestro de usuarios diría que casi
// toda la empresa está bloqueada.
import assertOriginal from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SIGLAS_DE_PLANTA,
  textoDeHabilitado,
  textoDePlantas,
  textoDeRol,
  textoDeSiNo,
  textoDeTurno
} from './textoDeUsuario.js'

let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// --- Plantas -----------------------------------------------------------------

assert.equal(textoDePlantas(['Puerto Coloso']), 'PCOL')
assert.equal(textoDePlantas(['Puerto Coloso', 'Instalaciones Mina']), 'PCOL, IMIN')

// Una planta que no está en el diccionario se muestra con su nombre, no en
// blanco. Es la regresión que se quiere evitar: el diccionario está escrito a
// mano y Procure puede agregar plantas en Firestore sin tocar el código.
assert.equal(textoDePlantas(['Planta Nueva Que Nadie Mapeo']), 'Planta Nueva Que Nadie Mapeo')
assert.equal(textoDePlantas(['Puerto Coloso', 'Planta Nueva']), 'PCOL, Planta Nueva')

assert.equal(textoDePlantas([]), 'N/A')
assert.equal(textoDePlantas(undefined), 'N/A')
assert.equal(textoDePlantas(null), 'N/A')

// Un usuario con `plant` guardado como texto suelto y no como arreglo no debe
// reventar la tabla entera.
assert.equal(textoDePlantas('Puerto Coloso'), 'N/A')

// --- Turno -------------------------------------------------------------------

assert.equal(textoDeTurno(['A']), 'A')
assert.equal(textoDeTurno(['A', 'B']), 'A, B')
assert.equal(textoDeTurno([]), 'N/A')
assert.equal(textoDeTurno(undefined), 'N/A')

// --- Rol ---------------------------------------------------------------------

const ROLES = [
  { id: 1, name: 'Administrador de Contrato' },
  { id: 7, name: 'Supervisor' },
  { id: 8, name: 'Proyectista' }
]

assert.equal(textoDeRol(7, ROLES), 'Supervisor')

// El rol se compara con `===`, así que un rol guardado como TEXTO no encuentra
// nada. Es el mismo fallo que ya mordió en el ACL: se documenta, no se disimula.
assert.equal(textoDeRol('7', ROLES), '')

// Los roles se piden a Firestore al montar la pantalla: en los primeros renders
// la lista está vacía y no puede quedar 'undefined' escrito en la celda.
assert.equal(textoDeRol(7, []), '')
assert.equal(textoDeRol(7, undefined), '')
assert.equal(textoDeRol(undefined, ROLES), '')

// --- Habilitado --------------------------------------------------------------

assert.equal(textoDeHabilitado(true), 'Habilitado')
assert.equal(textoDeHabilitado(false), 'Deshabilitado')

// AUSENTE = HABILITADO. Mismo criterio que el login (`data.enabled !== false`).
assert.equal(textoDeHabilitado(undefined), 'Habilitado')
assert.equal(textoDeHabilitado(null), 'Habilitado')

// Y solo el `false` booleano deshabilita: un 0 o una cadena vacía en la ficha
// no pueden dejar a alguien fuera.
assert.equal(textoDeHabilitado(0), 'Habilitado')
assert.equal(textoDeHabilitado(''), 'Habilitado')

// --- Sí / No -----------------------------------------------------------------

assert.equal(textoDeSiNo(true), 'Si')
assert.equal(textoDeSiNo(false), 'No')
assert.equal(textoDeSiNo(undefined), 'No')

// --- El diccionario ----------------------------------------------------------

// Las siglas son de cuatro caracteres —hay dos con dígito, LSL1 y LSL2— y no
// se repiten: dos plantas con la misma sigla harían ilegible la planilla.
const siglas = Object.values(SIGLAS_DE_PLANTA)
assert.equal(siglas.length, new Set(siglas).size)
for (const sigla of siglas) {
  assert.match(sigla, /^[A-Z0-9]{4}$/)
}

// --- La tabla no puede recargar la página ------------------------------------

// Mario Mella lo reportó así: «al momento de desactivar un usuario se reinicia
// Prosite, me borra los filtros y me saca del módulo editar usuarios». La causa
// era un `window.location.reload()` puesto para que el interruptor no mintiera,
// porque la lista no escucha en vivo. Ahora se recarga SOLO la lista, con la
// función que entrega el componente de arriba.
//
// Esto vigila que no vuelva: recargar la página desmonta la aplicación entera y
// se lleva por delante los filtros, el orden y la pantalla en la que se estaba.
// Las dos piezas de la pantalla: la tabla, con el interruptor, y el diálogo de
// editar usuario, que hacía exactamente lo mismo al apretar «Aceptar».
const SIN_RELOAD = [
  new URL('./TableEditUsers.js', import.meta.url),
  new URL('../../../@core/components/dialog-editUser/index.js', import.meta.url)
]

for (const archivo of SIN_RELOAD) {
  const codigo = readFileSync(archivo, 'utf8')
    .split('\n')
    .filter(linea => !linea.trimStart().startsWith('//'))
    .join('\n')

  assert.equal(codigo.includes('location.reload'), false)
  assert.equal(codigo.includes('recargarUsuarios'), true)
}

console.log(`ok — ${comprobaciones} comprobaciones`)
