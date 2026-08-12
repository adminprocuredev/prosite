/**
 * Quién puede subir la Hoja de Levantamiento de Comentarios (HLC) de un
 * entregable, y sobre cuál.
 *
 * La regla vivía repetida —la visibilidad de la columna, el botón de la tabla,
 * el enrutado del archivo soltado, el recuadro del diálogo y la validación del
 * nombre, en cuatro archivos— y se había desincronizado. En la tabla,
 * además, la rama que cubría los entregables enviados por un Proyectista pedía
 * a la vez que la última revisión TUVIERA transmittal (checkRoleAndApproval) y
 * que NO lo tuviera (canUploadHlc): nunca se cumplía, así que a esos
 * entregables no se les podía adjuntar la HLC ni siquiera desde Control
 * Documental. Incidencia Gabinete 11.
 */

/**
 * Milisegundos de una fecha de revisión, venga como venga.
 *
 * Firestore las guarda como Timestamp; según por dónde pase el dato llega con
 * su método toDate(), como objeto plano con `seconds`, o ya convertida. Un
 * `new Date(...)` a secas solo acierta con la última forma, y con las otras da
 * Invalid Date sin quejarse.
 *
 * Devuelve NaN cuando no se puede determinar, incluido `null` — que en
 * `new Date(null)` valdría 0, o sea 1970, y pasaría por una fecha válida.
 */
const instanteDe = valor => {
  if (valor === null || valor === undefined || valor === '') return NaN
  if (typeof valor.toDate === 'function') return valor.toDate().getTime()

  // Los nanosegundos sí importan: dos revisiones del mismo segundo son
  // distinguibles, y sin ellos quedarían empatadas — y un empate aquí se
  // resuelve cerrando la ventana.
  if (typeof valor.seconds === 'number') {
    return valor.seconds * 1000 + (typeof valor.nanoseconds === 'number' ? valor.nanoseconds / 1e6 : 0)
  }

  return new Date(valor).getTime()
}

/**
 * El entregable está en el punto del flujo donde corresponde adjuntar la HLC:
 * Control Documental ya lo aprobó y todavía no salió en un transmittal.
 */
/** ¿El entregable ya tiene su HLC adjunta? */
const yaTieneHlc = blueprint => {
  const adjunta = blueprint && blueprint.storageHlcDocuments

  return Array.isArray(adjunta) ? adjunta.length > 0 : Boolean(adjunta)
}

const estaEnEtapaDeHlc = blueprint => {
  if (!blueprint || !blueprint.approvedByDocumentaryControl) return false

  // Con la HLC ya adjunta no hay nada que subir. Antes esto solo lo miraba el
  // recuadro del diálogo: la tabla dibujaba un botón sin icono pero pulsable.
  // Reemplazarla es tarea de Control Documental, que tiene el botón de borrarla.
  //
  // Es una comprobación de interfaz sobre el documento que el cliente ya tiene
  // cargado, no una garantía: dos personas con la fila abierta a la vez pueden
  // pasar las dos. La escritura usa arrayUnion, así que en ese caso quedan dos
  // HLC adjuntas y no se pierde ninguna.
  if (yaTieneHlc(blueprint)) return false

  // Da igual quién de los dos lo haya enviado. Antes sí importaba, y ese era
  // justamente el defecto.
  if (!blueprint.sentByDesigner && !blueprint.sentBySupervisor) return false

  // Sin una revisión identificada no hay a qué asociar la HLC.
  if (typeof blueprint.revision !== 'string' || blueprint.revision === '') return false

  const revisiones = Array.isArray(blueprint.revisions) ? blueprint.revisions : []
  if (revisiones.length === 0) return false

  // Ordenar por fecha y quedarse con la primera era frágil aquí, y de hecho
  // nunca funcionó: las revisiones llegan con los datos crudos de Firestore, o
  // sea `date` es un Timestamp, y `new Date(unTimestamp)` da Invalid Date. El
  // comparador daba NaN en cada par, `sort` dejaba el array como estaba y el
  // resultado salía bien solo porque la consulta ya trae orderBy('date','desc').
  // Esto decide un permiso: si una fecha no se puede leer, no se autoriza.
  const instantes = revisiones.map(revision => instanteDe(revision && revision.date))
  if (instantes.some(instante => !Number.isFinite(instante))) return false

  const masReciente = Math.max(...instantes)

  // Con varias revisiones en el mismo instante no hay forma de saber cuál es la
  // última: basta que una de ellas ya tenga transmittal para dar la ventana por
  // cerrada. El documento ya salió: la HLC de esa revisión llega tarde.
  return !revisiones.some((revision, i) => instantes[i] === masReciente && 'lastTransmittal' in revision)
}

/**
 * @param {Object} authUser - Usuario conectado.
 * @param {Object} blueprint - Entregable, con su array `revisions`.
 * @returns {boolean}
 */
export const puedeSubirHlc = (authUser, blueprint) => {
  if (!authUser || !estaEnEtapaDeHlc(blueprint)) return false

  // Control Documental, sobre cualquier entregable.
  if (authUser.role === 9) return true

  // Proyectista, solo sobre los suyos: es lo que pide la incidencia, y acotarlo
  // a los propios evita que un proyectista adjunte la HLC del entregable de
  // otro.
  //
  // Como todo el control de acceso de esta aplicación, esto vive en el cliente:
  // decide lo que se dibuja y lo que se enruta, no lo que Firestore acepta.
  // Quien llame directamente a la escritura no pasa por aquí.
  if (authUser.role === 8) return Boolean(blueprint.userId) && blueprint.userId === authUser.uid

  return false
}

/**
 * La columna HLC se muestra a quien puede llegar a usarla, aunque en esa fila
 * concreta todavía no toque.
 */
export const veColumnaHlc = authUser => authUser?.role === 9 || authUser?.role === 8
