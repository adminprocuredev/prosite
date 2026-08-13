// Qué dato necesita cada consulta de la colección `users`, y si lo tiene.
//
// getUserData armaba las ocho consultas de golpe y ejecutaba la pedida sin
// mirar si había con qué. Firestore no perdona un `where()` con undefined:
// lanza «Function where() called with invalid data», el catch lo tragaba,
// devolvía null, y quien llamaba se quedaba sin datos sin saber por qué. En
// producción se veía en la consola del navegador y en ningún otro lado.
//
// Vive en su propio archivo para poder comprobarse sin levantar Firebase.

// Qué campo mira cada consulta. Las que no aparecen no dependen de nada.
const REQUISITOS = {
  getUsers: 'planta',
  getAllPlantUsers: 'planta',
  getPetitioner: 'planta',
  getReceiverUsers: 'planta',
  getUserProyectistas: 'turno',
  getUserSupervisor: 'turno',
  getUsersByRole: 'rol'
}

// Un texto de puros espacios está vacío: `where('name','==','   ')` es una
// consulta válida para Firestore y no encuentra nunca nada.
const vacio = valor => valor === undefined || valor === null || (typeof valor === 'string' ? valor.trim() === '' : false)

/**
 * @returns {string|null} El nombre del dato que falta, o null si se puede consultar.
 */
export const faltaDatoPara = (type, plant, userParam = {}) => {
  switch (REQUISITOS[type]) {
    case 'planta':
      // No basta con que la lista exista: `array-contains-any` con [] no es una
      // consulta válida, y con [undefined] tampoco -Firestore mira los valores,
      // no solo el largo-, que era exactamente el error que esto viene a
      // cerrar, entrando por otra puerta.
      if (Array.isArray(plant)) {
        return plant.length === 0 || plant.some(vacio) ? 'planta' : null
      }

      return vacio(plant) ? 'planta' : null

    case 'turno':
      // Se lee `shift[0]`, así que un turno vacío o ausente deja undefined.
      return vacio(userParam?.shift?.[0]) ? 'turno' : null

    case 'rol':
      return vacio(userParam?.role) ? 'rol' : null

    default:
      return null
  }
}

/**
 * Buscar al solicitante por nombre no necesita la planta: es otra consulta.
 *
 * Se hacía DESPUÉS de la consulta por planta, así que solo se alcanzaba cuando
 * esa consulta salía bien. Con `plant` nulo —como la llama dialog-fullsize a
 * propósito— reventaba antes y esta rama no llegaba a correr; con una planta
 * válida sí funcionaba. Moverla arriba arregla el primer caso y deja el
 * segundo igual.
 */
export const buscaPorNombre = (type, userParam = {}) =>
  type === 'getPetitioner' && !vacio(userParam?.name)
