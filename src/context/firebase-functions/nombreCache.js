// Resuelve el nombre del autor de cada solicitud sin leer un documento por fila.
//
// Vive en su propio archivo para poder comprobarse sin levantar Firebase.
//
// Antes se leía `users/{uid}` de a uno. Con caché eran tantas lecturas como
// usuarios distintos —unas 34 en la tabla de solicitudes—, cada una su propio
// viaje a us-central1. Ahora los uid van en tandas dentro de una sola consulta:
// las mismas 34 se resuelven en 2.

/** Parte una lista en tandas del tamaño pedido. */
export const trocear = (lista, tamano) => {
  const tandas = []
  for (let i = 0; i < lista.length; i += tamano) {
    tandas.push(lista.slice(i, i + tamano))
  }

  return tandas
}

// Tope de valores que Firestore acepta en un `in`. Pasarse no da un error
// claro, así que las tandas se cortan aquí.
const MAXIMO_POR_CONSULTA = 30

/**
 * @param {Function} leerLote - Recibe un array de uid y devuelve un Map uid→nombre.
 * @returns {Function} Recibe un array de uid y devuelve un Map uid→nombre, leyendo
 *                     solo los que aún no conoce.
 */
export const crearLectorDeNombres = leerLote => {
  const cache = new Map()

  return async uids => {
    // Un uid vacío es un registro corrupto, no un usuario inexistente. Antes
    // esto hacía fallar el snapshot completo y la tabla quedaba vacía sin decir
    // por qué; ahora la fila se muestra y el caso queda registrado.
    if (uids.some(uid => !uid)) {
      console.warn('Solicitud sin uid: registro sin usuario asociado')
    }

    const porLeer = [...new Set(uids.filter(uid => uid && !cache.has(uid)))]

    for (const tanda of trocear(porLeer, MAXIMO_POR_CONSULTA)) {
      try {
        const encontrados = await leerLote(tanda)

        // Los uid que la consulta no devolvió son usuarios borrados: se guardan
        // igual para no volver a preguntar por ellos en cada snapshot.
        for (const uid of tanda) {
          cache.set(uid, encontrados.get(uid) ?? 'No definido')
        }
      } catch (error) {
        // Un fallo NO se guarda: si fue caída de red o permisos, el próximo
        // intento vuelve a leer en vez de dejar "No definido" congelado.
        console.error('No se pudieron leer los nombres de usuario:', error)
      }
    }

    return new Map(uids.map(uid => [uid, (uid && cache.get(uid)) || 'No definido']))
  }
}
