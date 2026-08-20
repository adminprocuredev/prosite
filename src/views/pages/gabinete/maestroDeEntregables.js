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

// Import relativo y con extensión, no el alias `src/...`: así este módulo se
// puede correr con `node` para comprobarlo, como el resto de los autochequeos.
import dictionary from '../../../@core/components/dictionary/index.js'

export const COLUMNAS_MAESTRO = [
  { header: 'OT', key: 'ot', width: 10 },
  { header: 'Código Procure', key: 'codigo', width: 24 },
  { header: 'Código MEL', key: 'codigoCliente', width: 42 },
  { header: 'Descripción', key: 'descripcion', width: 50 },
  { header: 'Revisión', key: 'revision', width: 12 },
  { header: 'Asignado a', key: 'asignadoA', width: 26 },
  { header: 'Estado', key: 'estado', width: 30 },
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
 * Nombre del estado del entregable. `attentive` es el número de quién lo tiene
 * que atender; el diccionario lo traduce. Si es un estado que no está en el
 * diccionario se devuelve el número: es preferible a una celda vacía, porque
 * avisa de que falta un caso.
 *
 * @param {number} attentive
 * @returns {string}
 */
export const estadoLegible = attentive =>
  dictionary[attentive]?.longTitle || (attentive === undefined || attentive === null ? '' : String(attentive))

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
  ot: otsPorSolicitud?.get(entregable.solicitudId) ?? '',
  codigo: entregable.id || '',
  codigoCliente: entregable.clientCode || '',
  descripcion: entregable.description || '',
  revision: entregable.revision || '',
  asignadoA: entregable.userName || '',
  estado: estadoLegible(entregable.attentive),
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
