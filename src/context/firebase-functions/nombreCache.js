// Memoriza el nombre de cada usuario para no leerlo una vez por fila.
// Vive en su propio archivo para poder comprobarse sin levantar Firebase.
//
// Se guarda la PROMESA y no el valor: si dos filas del mismo usuario se resuelven a la vez,
// comparten una sola lectura en lugar de disparar dos.
export const crearCacheDeNombres = leerUsuario => {
  const cache = new Map()

  return uid => {
    // Una fila sin uid es un registro corrupto, no un usuario inexistente. Antes esto
    // hacía fallar el snapshot completo y la tabla quedaba vacía sin decir por qué; ahora
    // la fila se muestra, pero el caso queda registrado para poder distinguirlo.
    if (!uid) {
      console.warn('Solicitud sin uid: registro sin usuario asociado')

      return Promise.resolve('No definido')
    }

    if (!cache.has(uid)) {
      cache.set(
        uid,
        Promise.resolve(leerUsuario(uid))
          .then(snap => snap?.data?.()?.name ?? 'No definido')
          .catch(error => {
            // Un fallo NO se guarda: si fue caída de red o permisos, el próximo intento
            // vuelve a leer en vez de dejar "No definido" congelado.
            cache.delete(uid)

            throw error
          })
      )
    }

    return cache.get(uid).catch(() => 'No definido')
  }
}
