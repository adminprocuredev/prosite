// Comprobación de correlativoCodigo. Sin framework: node lo corre directo.
//   node src/context/firebase-functions/correlativoCodigo.test.mjs
import assert from 'node:assert/strict'
import { correlativoDeCodigo, esElUltimo } from './correlativoCodigo.js'

// --- correlativoDeCodigo -----------------------------------------------------

assert.equal(correlativoDeCodigo('21286-100-ME-PL-0003'), 3, 'código Procure')
assert.equal(correlativoDeCodigo('21286-1001-PP-1000-ME-PL-00042'), 42, 'código MEL')
assert.equal(correlativoDeCodigo('0007'), 7, 'código sin guiones')

// Los ceros a la izquierda no pueden convertirse en octal ni perderse.
assert.equal(correlativoDeCodigo('21286-100-ME-PL-0010'), 10, 'ceros a la izquierda')

// Nada de esto es un correlativo: devolver null y no NaN, porque NaN === NaN
// es false y el llamador podría creer que "no coincide" cuando en realidad no
// se pudo leer el código.
assert.equal(correlativoDeCodigo(''), null, 'cadena vacía')
assert.equal(correlativoDeCodigo(null), null, 'null')
assert.equal(correlativoDeCodigo(undefined), null, 'undefined')
assert.equal(correlativoDeCodigo('21286-100-ME-PL-'), null, 'termina en guión')
assert.equal(correlativoDeCodigo('21286-100-ME-PL-00A3'), null, 'con letra')

// --- esElUltimo --------------------------------------------------------------

// El caso que provocaba la pérdida de datos: borrar un entregable INTERMEDIO
// bajaba el contador igual, y el siguiente pisaba a uno existente.
assert.equal(esElUltimo('21286-100-ME-PL-0002', 3), false, 'intermedio: el contador NO baja')
assert.equal(esElUltimo('21286-100-ME-PL-0003', 3), true, 'último: el contador sí baja')
assert.equal(esElUltimo('21286-100-ME-PL-0003', '0003'), true, 'contador como texto con ceros')
assert.equal(esElUltimo('21286-100-ME-PL-0001', 1), true, 'único entregable')

// Sin código legible no se toca el contador: ante la duda, un hueco es
// preferible a sobrescribir un entregable.
assert.equal(esElUltimo(null, 3), false, 'sin código')
assert.equal(esElUltimo('21286-100-ME-PL-00A3', 3), false, 'código ilegible')

// Sin contador tampoco. deleteBlueprintAndDecrementCounters se apoya en esto
// para su guard: si el contador no existe o el campo viene vacío, el borrado
// se degrada a lógico en vez de calcular Number(null) - 1 y escribir "0-1".
assert.equal(esElUltimo('21286-100-ME-PL-0003', null), false, 'contador ausente')
assert.equal(esElUltimo('21286-100-ME-PL-0003', undefined), false, 'contador indefinido')
assert.equal(esElUltimo('21286-100-ME-PL-0003', ''), false, 'contador vacío')

console.log('ok — correlativoCodigo: 18 comprobaciones')
