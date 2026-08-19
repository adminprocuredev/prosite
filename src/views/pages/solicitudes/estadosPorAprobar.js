/**
 * Qué solicitudes entran en la pestaña «Por aprobar», según el rol.
 *
 * Antes esto era una resta: `doc.state === authUser.role - 1`, con el rol 5
 * parchado aparte. Para un Administrador —rol 1— la resta da **estado 0, que es
 * RECHAZADO**: la pestaña «Por aprobar» mostraba exactamente las mismas
 * solicitudes que «Rechazadas». Lo reportó Mario Mella el 19-ago-2026.
 *
 * La resta funcionaba de casualidad para el medio de la cadena y no puede
 * funcionar en los extremos, porque los números de rol no son los números de
 * estado: son dos listas distintas que en el medio coinciden.
 *
 * Quién puede mover una solicitud está en el `Map` de `firestoreFunctions.js`
 * (`rules`), y sus claves son los roles 2, 3, 4, 5, 6 y 7 — el rol 1 no está, y
 * el 4 está con la lista de reglas VACÍA. O sea ni el Administrador ni el
 * Contract Owner aprueban nada en este flujo.
 *
 * Los estados, de `src/@core/components/dictionary`:
 *   0 Rechazado · 1 Devuelto · 2 Solicitante · 3 Contract Operator
 *   4 Contract Owner · 5 Planificador · 6 Administrador de Contrato (aprobada)
 *   7 Supervisor · 8 Proyectista
 * El estado dice quién actuó por última vez, así que lo que espera a un rol es
 * el estado ANTERIOR al suyo en la cadena.
 */

// Estados en los que una solicitud sigue en camino: ni rechazada (0) ni
// aprobada por Procure (6 en adelante).
export const ESTADOS_EN_CURSO = [1, 2, 3, 4, 5]

// Rol -> estados que esperan la acción de ESE rol. Escrito, no calculado.
const POR_ROL = {
  2: [1], // Solicitante: se le devolvió para revisión
  3: [2], // Contract Operator
  5: [3, 4], // Planificador: revisa lo que dejan Contract Operator y Contract Owner
  6: [5], // Administrador de Contrato
  7: [6] // Supervisor: asigna proyectistas
}

/**
 * Estados que la pestaña «Por aprobar» debe mostrar para un rol.
 *
 * Un rol que no aprueba nada —Administrador (1) y Contract Owner (4)— ve todo
 * lo que está pendiente de aprobación de alguien. Es una vista de supervisión,
 * y por eso la pestaña le cambia el texto de ayuda: ver `infoPorAprobar`.
 *
 * @param {number} rol
 * @returns {number[]}
 */
export const estadosPorAprobar = rol => POR_ROL[rol] || ESTADOS_EN_CURSO

/**
 * @param {number} rol
 * @returns {boolean} si ese rol aprueba algo en el flujo
 */
export const rolAprueba = rol => Boolean(POR_ROL[rol])

/**
 * Texto de ayuda de la pestaña, para que no prometa algo distinto de lo que
 * muestra.
 *
 * @param {number} rol
 * @returns {string}
 */
export const infoPorAprobar = rol =>
  rolAprueba(rol) ? 'Solicitudes pendientes de mi aprobación' : 'Solicitudes pendientes de aprobación'

/**
 * @param {Object} doc
 * @param {number} rol
 * @returns {boolean}
 */
export const estaPorAprobar = (doc, rol) => estadosPorAprobar(rol).includes(doc?.state)
