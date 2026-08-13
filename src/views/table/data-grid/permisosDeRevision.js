/**
 * Quién puede aprobar o rechazar un entregable, según su rol y el punto del
 * flujo en que está el documento.
 *
 * Vivía dentro de TableGabinete, con seis booleanos y un diccionario de cuatro
 * roles, sin una sola comprobación. Se sacó para poder probarla: es la decisión
 * que define quién puede dar curso a un documento.
 */

/**
 * @param {Object} row - Entregable.
 * @param {Object} authUser - Usuario conectado.
 * @returns {{approve: boolean, reject: boolean}}
 */
export const permisosDeRevision = (row, authUser) => {
  if (!row || !authUser) {
    return { approve: false, reject: false }
  }

  const {
    userId,
    description,
    clientCode,
    storageBlueprints,
    approvedByContractAdmin,
    approvedByDocumentaryControl,
    approvedBySupervisor,
    blueprintCompleted,
    attentive,
    sentByDesigner,
    sentBySupervisor
  } = row

  const { uid, role } = authUser

  // Definición de variables booleanas.
  const isRole7Turn = attentive === 7
  const isRole8Turn = attentive === 8
  const isRole9Turn = attentive === 9
  const isMyBlueprint = Boolean(userId) && userId === uid
  const sentByAuthor = Boolean(sentByDesigner || sentBySupervisor)

  // Se exige contenido de verdad, no solo que el campo exista: ' ' es truthy y
  // [{}] mide 1 sin haber archivo. Un archivo sirve cuando tiene url.
  const textoUtil = valor => typeof valor === 'string' && valor.trim() !== ''

  const archivos = Array.isArray(storageBlueprints) ? storageBlueprints : storageBlueprints ? [storageBlueprints] : []

  const hasRequiredFields =
    textoUtil(description) &&
    textoUtil(clientCode) &&
    archivos.some(archivo => archivo && typeof archivo.url === 'string' && archivo.url.trim() !== '')

  // Incidencia Solicitudes 3: facultar al Supervisor para dar curso a un
  // entregable que quedó detenido esperando al Proyectista —turno de descanso,
  // vacaciones— en vez de esperar a que vuelva.
  //
  // El nombre dice lo que de verdad comprueba. Prosite NO sabe si el proyectista
  // está ausente: no hay dato de turnos ni de vacaciones que consultar, así que
  // esto es una FACULTAD del supervisor, no una detección. Queda traza de quién
  // la usó: cada revisión guarda su autor, y su rol cuando el usuario lo trae.
  //
  // Se exige hasRequiredFields —descripción, código y archivo cargado— porque
  // sin documento no hay nada que revisar: aprobar un entregable vacío no
  // adelanta nada, solo lo mueve de casillero. Y se excluye el propio: un
  // supervisor dando curso a SU entregable saltándose al proyectista sería
  // aprobarse a sí mismo, que es justo lo que la revisión existe para evitar.
  const puedeDarCursoPorElProyectista =
    isRole8Turn && hasRequiredFields && !blueprintCompleted && !isMyBlueprint

  const dictionary = {
    6: {
      approve: isRole7Turn && !approvedByContractAdmin,
      reject: isRole7Turn && !approvedByContractAdmin
    },
    7: {
      approve:
        (isRole7Turn && sentByAuthor && !isMyBlueprint && !approvedBySupervisor) ||
        (isRole7Turn && isMyBlueprint && hasRequiredFields && !blueprintCompleted) ||
        puedeDarCursoPorElProyectista,
      reject:
        (isRole7Turn && sentByAuthor && !isMyBlueprint && !approvedBySupervisor) ||
        // Si puede aprobarlo, puede devolverlo con observaciones: dar curso a un
        // documento y no poder objetarlo sería la mitad de la facultad.
        puedeDarCursoPorElProyectista
    },
    8: {
      approve: isRole8Turn && isMyBlueprint && hasRequiredFields && !blueprintCompleted,
      reject: false
    },
    9: {
      approve: isRole9Turn && !approvedByDocumentaryControl,
      reject: isRole9Turn && !approvedByDocumentaryControl
    }
  }

  // Un rol sin entrada en el diccionario no aprueba ni rechaza nada. Antes se
  // devolvía undefined y quien llamaba hacía `?.approve || false`, así que
  // funcionaba de casualidad.
  return dictionary[role] || { approve: false, reject: false }
}
