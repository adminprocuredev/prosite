/**
 * El «Maestro de entregables»: TODOS los entregables, de todas las OT, en una
 * sola planilla.
 *
 * Es la incidencia Gabinete 9 — «Permitir descargar un Maestro de los
 * entregables. Se requiere acceder al listado completo de entregables
 * independiente del usuario asignado». La exportación que ya existía en la
 * tabla del Gabinete sirve para UNA OT —el archivo se llama
 * `Entregables-OT-1216`—, así que para tener el catálogo completo había que
 * bajar una planilla por OT y pegarlas a mano. Cristina Bustamante, de Control
 * Documental, lo volvió a pedir el 20-ago-2026.
 *
 * Aquí vive solo la transformación: de los documentos crudos de Firestore a las
 * filas de la planilla. Sin React y sin Firebase, para poder comprobarla.
 */

export const COLUMNAS_MAESTRO = [
  { header: 'OT', key: 'ot', width: 10 },
  { header: 'Código Procure', key: 'codigo', width: 24 },
  { header: 'Código MEL', key: 'codigoCliente', width: 42 },
  { header: 'Descripción', key: 'descripcion', width: 50 },
  { header: 'Revisión', key: 'revision', width: 12 },
  { header: 'Asignado a', key: 'asignadoA', width: 26 },
  { header: 'En espera de revisión por', key: 'enEsperaDe', width: 30 },
  { header: 'Último transmittal', key: 'transmittal', width: 22 },
  { header: 'Fecha', key: 'fecha', width: 12 }
]

/**
 * Fecha legible a partir de lo que traiga Firestore.
 *
 * Las fechas llegan como Timestamp (`{seconds}`), no como cadena. Y hay que
 * devolver '' cuando falta: `moment(undefined)` es AHORA, así que un entregable
 * sin fecha aparecería con la de hoy —eso ya mordió en la portada—.
 *
 * @param {{seconds: number}|Date|undefined} valor
 * @returns {string} dd-mm-aaaa, o '' si no hay fecha
 */
export const fechaLegible = valor => {
  if (!valor) return ''

  const fecha = valor instanceof Date ? valor : typeof valor.seconds === 'number' ? new Date(valor.seconds * 1000) : null

  if (!fecha || Number.isNaN(fecha.getTime())) return ''

  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')

  return `${dia}-${mes}-${fecha.getFullYear()}`
}

/**
 * Quién tiene que revisar el entregable.
 *
 * `attentive` es un número de ROL, y los entregables usan su propia escala —no
 * la del diccionario de estados de las solicitudes—. Mezclarlas fue el defecto
 * que reportó Cristina Bustamante el 20-ago-2026: «en el estado, algunos salen
 * con un número, no sabemos qué significan». El 10 no existe en el diccionario
 * de solicitudes, así que salía crudo; y los que sí existían salían con el
 * texto EQUIVOCADO, que es peor porque no se nota.
 *
 * Esta es la misma tabla que pinta la columna «EN ESPERA DE REVISIÓN POR» de la
 * pantalla del Gabinete, y ahora vive en un solo lugar: `TableGabinete` la
 * importa de aquí. La planilla y la pantalla no pueden volver a separarse.
 */
export const EN_ESPERA_DE = {
  4: 'Cliente',
  6: 'Administrador de Contrato',
  7: 'Supervisor',
  8: 'Proyectista',
  9: 'Control Documental',
  10: 'Finalizado'
}

/**
 * El rol que tiene que revisar, tal como lo muestra la pantalla: el nombre, o
 * '' si el valor no está en la tabla. Es exactamente lo que hacía `renderRole`
 * dentro de `TableGabinete`, que ahora la importa de aquí.
 *
 * @param {number} attentive
 * @returns {string}
 */
export const enEsperaDe = attentive => EN_ESPERA_DE[attentive] || ''

/**
 * Lo mismo, para la planilla.
 *
 * En pantalla, un valor desconocido puede quedar en blanco y a nadie le
 * estorba: la fila está a la vista y se pregunta. En una planilla que alguien
 * va a leer sola, un número pelado es lo que Control Documental no supo
 * interpretar y una celda vacía es peor todavía. Se nombra el problema y se
 * deja el número para poder rastrearlo.
 *
 * @param {number} attentive
 * @returns {string}
 */
export const enEsperaDeEnPlanilla = attentive => {
  if (attentive === undefined || attentive === null || attentive === '') return ''

  return enEsperaDe(attentive) || `Sin identificar (${attentive})`
}

/**
 * La OT del entregable.
 *
 * El entregable NO guarda la OT: el que la tiene es la solicitud de la que
 * cuelga. Por eso la fuente principal es el mapa que arma la pantalla con su
 * lista de OT ya cargada.
 *
 * Y por eso hay respaldo. La primera versión dependía solo de ese mapa y la
 * columna salió VACÍA en las 1.500 filas —Cristina: «no se ve la OT en el
 * item»—, porque el maestro se puede pedir antes de que termine de llegar la
 * lista de OT, que son 1.490 solicitudes. El código MEL se arma como
 * `21286-OT1296-PCOL-0510-GN-TRE-00001`, con la OT dentro, así que sirve de
 * respaldo aunque el mapa todavía no esté.
 *
 * El segmento se busca por su forma y no por su posición: contar segmentos de
 * un código a ojo ya dio un falso positivo antes.
 *
 * @param {Object} entregable
 * @param {Map<string, string|number>} otsPorSolicitud
 * @returns {string|number}
 */
export const otDeEntregable = (entregable, otsPorSolicitud) => {
  const deLaSolicitud = otsPorSolicitud?.get(entregable?.solicitudId)
  if (deLaSolicitud !== undefined && deLaSolicitud !== null && deLaSolicitud !== '') return deLaSolicitud

  const segmentos = String(entregable?.clientCode || '').split('-')
  const conOt = segmentos.find(segmento => /^OT\d+$/i.test(segmento))

  return conOt ? Number(conOt.slice(2)) : ''
}

/**
 * Una fila de la planilla a partir de un entregable.
 *
 * El id del documento ES el código Procure (`21286-500-PL-2077`) y `clientCode`
 * es el código MEL que ve el cliente. La OT no está en el entregable: se busca
 * por la solicitud de la que cuelga.
 *
 * @param {Object} entregable
 * @param {Map<string, string|number>} otsPorSolicitud
 * @returns {Object}
 */
export const filaDelMaestro = (entregable, otsPorSolicitud) => ({
  ot: otDeEntregable(entregable, otsPorSolicitud),
  codigo: entregable.id || '',
  codigoCliente: entregable.clientCode || '',
  descripcion: entregable.description || '',
  revision: entregable.revision || '',
  asignadoA: entregable.userName || '',
  enEsperaDe: enEsperaDeEnPlanilla(entregable.attentive),
  transmittal: entregable.lastTransmittal || '',
  fecha: fechaLegible(entregable.date)
})

/**
 * El maestro completo, listo para escribir.
 *
 * Deja fuera los borrados. El borrado del Gabinete es LÓGICO cuando el
 * entregable no es el último de su serie: el documento se queda en la base con
 * `deleted: true`. En un maestro para Control Documental esos no son
 * entregables vigentes. Son 13 de 1567 —medido en BigQuery—.
 *
 * Se ordena por OT y después por código, que es como se lee un maestro; el
 * orden en que Firestore devuelve una consulta de grupo no significa nada.
 *
 * @param {Object[]} entregables
 * @param {Map<string, string|number>} otsPorSolicitud
 * @returns {Object[]}
 */
export const armarMaestro = (entregables, otsPorSolicitud) =>
  (Array.isArray(entregables) ? entregables : [])
    .filter(entregable => entregable && entregable.deleted !== true)
    .map(entregable => filaDelMaestro(entregable, otsPorSolicitud))
    .sort((a, b) => String(a.ot).localeCompare(String(b.ot), 'es', { numeric: true }) || String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }))
