// Comprobación de validateFiles. Correr con: node src/context/google-drive-functions/fileValidation.test.mjs
import assert from 'node:assert/strict'
import { validateFiles, MAX_SIZE_MB } from './fileValidation.js'

const MB = 1024 * 1024
const f = (name, sizeMB) => ({ name, size: sizeMB * MB })

const [nube, grande, ajeno, mayusculas, ambos, sinExtension] = validateFiles([
  f('plano.rcs', 10),
  f('nube.e57', MAX_SIZE_MB + 10),
  f('instalador.exe', 1),
  f('PLANO.DWG', 1),
  f('payload.exe', MAX_SIZE_MB + 10),
  f('README', 1)
])

// Nubes de punto y nativos CAD se aceptan: es la incidencia Gabinete 8.
assert.equal(nube.isValid, true)
assert.equal(mayusculas.isValid, true, 'la extensión no debe distinguir mayúsculas')

// Cada rechazo dice su motivo. Antes decía "tamaño y/o extensión".
assert.equal(grande.isValid, false)
assert.match(grande.msj, /tamaño máximo/)
assert.doesNotMatch(grande.msj, /extensión/)

assert.equal(ajeno.isValid, false)
assert.match(ajeno.msj, /extensión \.exe/)
assert.doesNotMatch(ajeno.msj, /tamaño/)

// Si falla por las dos causas, se informan las dos: no obligar a reintentar para
// descubrir la segunda.
assert.equal(ambos.isValid, false)
assert.match(ambos.msj, /extensión \.exe/)
assert.match(ambos.msj, /tamaño máximo/)

// Un archivo sin extensión no debe reportarse como "extensión .readme".
assert.equal(sinExtension.isValid, false)
assert.match(sinExtension.msj, /no tiene extensión/)

console.log('ok — validateFiles')
