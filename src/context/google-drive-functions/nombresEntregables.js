/**
 * El nombre que debe tener el archivo de un entregable, y el emparejamiento de
 * un lote de archivos con los entregables de una OT.
 *
 * La regla del nombre vivía dentro de validateFileName, mezclada con el JSX del
 * mensaje de error. La carga masiva necesita la misma regla —para saber a qué
 * entregable pertenece cada archivo— y copiarla habría dejado dos versiones que
 * se desincronizan a la primera. Incidencia Gabinete 11.
 */

/**
 * Iniciales de un nombre de persona: 'Ana Pérez Soto' → 'APS'.
 */
const inicialesDe = displayName =>
  String(displayName || '')
    .toUpperCase()
    .split(' ')
    .filter(Boolean)
    .map(palabra => palabra.charAt(0))
    .join('')

/**
 * @param {Object} opciones
 * @param {Object} opciones.blueprint - Entregable.
 * @param {Object} opciones.authUser - Usuario que sube el archivo.
 * @param {string} opciones.revisionEsperada - Letra/número de la revisión que viene.
 * @param {boolean} opciones.esHlc - Si lo que se sube es la HLC.
 * @param {boolean} opciones.puedeSerRevisadoPorCliente - checkRoleAndApproval.
 * @param {boolean} opciones.approves - Si la acción en curso es una aprobación.
 * @returns {string|null} El nombre esperado, sin extensión. `null` cuando
 *   cualquier nombre es válido para ese entregable: en ese caso el archivo no
 *   se puede atribuir por su nombre, y la carga masiva debe dejarlo fuera en
 *   vez de asignárselo al primero que pase.
 */
export const nombreEsperadoDeEntregable = ({
  blueprint,
  authUser,
  revisionEsperada,
  esHlc = false,
  puedeSerRevisadoPorCliente = false,
  approves = false
}) => {
  if (!blueprint || !authUser) return null

  const { uid, role, displayName } = authUser

  const {
    id,
    userId,
    clientCode,
    revision,
    approvedByDocumentaryControl,
    approvedBySupervisor,
    approvedByContractAdmin,
    blueprintCompleted
  } = blueprint

  // Entregable cerrado, o Control Documental cargando el documento que devuelve
  // el cliente: vale cualquier nombre.
  if (blueprintCompleted || (role === 9 && approvedByDocumentaryControl === true && puedeSerRevisadoPorCliente)) {
    return null
  }

  if (esHlc && !puedeSerRevisadoPorCliente) return `${clientCode}_REV_${revisionEsperada}_HLC`

  if (role === 8 || (role === 7 && userId === uid)) return `${clientCode}_REV_${revisionEsperada}`

  const esM3D = String(id || '').split('-')[2] === 'M3D'

  if (role === 9 && (approvedBySupervisor || approvedByContractAdmin || esM3D) && revision !== 'A' && approves) {
    return `${clientCode}_REV_${revisionEsperada}`
  }

  return `${clientCode}_REV_${revisionEsperada}_${inicialesDe(displayName)}`
}

/**
 * El nombre de archivo hasta el primer punto.
 *
 * Corta en el PRIMERO y no en el último a propósito: es lo que hacía la
 * validación de la carga de a uno, y cambiarlo endurecería una regla de
 * nomenclatura que nadie pidió tocar. Los códigos —Procure y MEL— no llevan
 * puntos, así que el nombre esperado tampoco; el efecto práctico es que un
 * archivo con un sufijo extra antes de la extensión se sigue aceptando.
 */
export const sinExtension = nombre => String(nombre || '').split('.')[0]

/**
 * ¿Este usuario puede subir el documento de este entregable?
 *
 * Es la misma condición con la que el diálogo de a uno decide si el archivo
 * soltado se toma como documento del entregable. La carga masiva la necesita
 * para no ofrecer entregables que el usuario no podría subir de a uno: la
 * validación del nombre por sí sola no distingue de quién es el entregable.
 *
 * @param {Object} authUser
 * @param {Object} blueprint
 * @param {boolean} puedeSerRevisadoPorCliente - checkRoleAndApproval.
 */
export const puedeSubirDocumento = (authUser, blueprint, puedeSerRevisadoPorCliente = false) => {
  if (!authUser || !blueprint) return false

  // El autor, mientras no lo haya enviado.
  if (Boolean(blueprint.userId) && blueprint.userId === authUser.uid && !blueprint.sentByDesigner) return true

  // El supervisor, sobre lo que envió un proyectista y Control Documental aún
  // no aprueba.
  if (authUser.role === 7 && blueprint.sentByDesigner && !blueprint.approvedByDocumentaryControl) return true

  // Y el documento que vuelve del cliente.
  return Boolean(blueprint.approvedByDocumentaryControl) && puedeSerRevisadoPorCliente
}

/**
 * Empareja un lote de archivos con los entregables de una OT, por nombre.
 *
 * @param {Array.<{name: string}>} archivos
 * @param {Array.<{blueprint: Object, nombreEsperado: string|null}>} candidatos
 * @returns {Array.<{archivo: Object, blueprint: Object|null, motivo: string}>}
 *   Una entrada por archivo, en el mismo orden. `motivo` vale 'ok' cuando hay
 *   un único entregable para ese nombre.
 */
export const emparejarArchivosConEntregables = (archivos, candidatos) => {
  const listaArchivos = Array.isArray(archivos) ? archivos : []
  const listaCandidatos = (Array.isArray(candidatos) ? candidatos : []).filter(c => c && c.nombreEsperado)

  // Cuántos archivos del lote reclaman cada entregable: dos archivos para el
  // mismo entregable no se pueden subir los dos, y subir "el último que gane"
  // en silencio es justo lo que hay que evitar.
  const vecesPorNombre = new Map()
  for (const archivo of listaArchivos) {
    const clave = sinExtension(archivo && archivo.name)
    vecesPorNombre.set(clave, (vecesPorNombre.get(clave) || 0) + 1)
  }

  return listaArchivos.map(archivo => {
    const nombre = sinExtension(archivo && archivo.name)
    const coincidencias = listaCandidatos.filter(c => c.nombreEsperado === nombre)

    if (coincidencias.length === 0) {
      return { archivo, blueprint: null, motivo: 'sin-entregable' }
    }

    if (coincidencias.length > 1) {
      return { archivo, blueprint: null, motivo: 'entregable-ambiguo' }
    }

    if (vecesPorNombre.get(nombre) > 1) {
      return { archivo, blueprint: null, motivo: 'archivo-repetido' }
    }

    return { archivo, blueprint: coincidencias[0].blueprint, motivo: 'ok' }
  })
}

/** Texto para el usuario de cada motivo del emparejamiento. */
export const MOTIVOS = {
  ok: 'Se subirá',
  'sin-entregable': 'Ningún entregable de esta OT espera este archivo',
  'entregable-ambiguo': 'Hay más de un entregable esperando este nombre',
  'archivo-repetido': 'Hay más de un archivo con este nombre en la selección'
}
