// ** React Imports
import { useEffect } from 'react'

import googleAuthConfig from '../../configs/googleDrive'
import { LLAVE_DEL_STATE, crearState, stateCoincide } from './stateDeOauth'

/**
 * Hook para interactuar con la Autenticación a Google Drive.
 * @returns {Object} Funciones y estados para gestionar la Autenticación a Google Drive.
 */
export const useGoogleAuth = () => {

  /**
   * Valida si el token de acceso es válido.
   * @param {string} token - Token de acceso para validar.
   * @returns {Promise<boolean>} - `true` si el token es válido, `false` en caso contrario.
   */
  const tokenExpiresIn = async token => {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`)
      const data = await response.json()

      return data.expires_in
    } catch {
      return false
    }
  }

  /**
   * Inicia el proceso de autenticación de OAuth2.
   */
  const oauth2SignIn = async () => {

    // Define la URL del endpoint de autenticación de Google OAuth 2.0
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth'

    // El `state` es la defensa contra CSRF del flujo OAuth, y estaba comentado
    // con un valor de ejemplo. Sin él, un tercero puede hacer que la víctima
    // termine el flujo con un `code` AJENO: la sesión de Drive de Prosite queda
    // apuntando a la cuenta del atacante y los entregables se suben ahí.
    //
    // Se guarda antes de salir y se comprueba al volver, en `getTokens`. Va en
    // sessionStorage porque muere con la pestaña, que es justo lo que dura el
    // viaje de ida y vuelta a Google.
    const state = crearState()
    sessionStorage.setItem(LLAVE_DEL_STATE, state)

    // Configura los parámetros necesarios para la autenticación
    const params = {
      redirect_uri: googleAuthConfig.REDIRECT_URI, // URI de redirección después de autenticarse
      prompt: 'consent',
      response_type: 'code', // Tipo de respuesta esperado (token de acceso)
      client_id: googleAuthConfig.CLIENT_ID, // ID del cliente de la aplicación
      scope: 'https://www.googleapis.com/auth/drive', // Alcances solicitados (acceso a Google Drive)
      state,
      access_type: 'offline'
    }

    // Crea dinámicamente un formulario HTML para redirigir al usuario al endpoint de autenticación
    const form = document.createElement('form')
    form.setAttribute('method', 'GET') // Método de envío del formulario
    form.setAttribute('action', oauth2Endpoint) // URL de destino del formulario

    // Agrega los parámetros como campos ocultos en el formulario
    for (const key in params) {
      const input = document.createElement('input')
      input.type = 'hidden' // Campo oculto
      input.name = key // Nombre del parámetro
      input.value = params[key] // Valor del parámetro
      form.appendChild(input) // Añade el campo al formulario
    }

    // Añade el formulario al cuerpo del documento y lo envía
    document.body.appendChild(form)
    form.submit() // Redirige al usuario al endpoint de autenticación
  }

  /**
   * Intercambia el código de autorización por tokens.
   */
  const getTokens = async () => {

    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    // La otra mitad del `state`: se compara con el que guardamos antes de salir
    // y se consume, para que no sirva dos veces. Si no calza, ese `code` no lo
    // pedimos nosotros y no se cambia por tokens.
    const stateEsperado = sessionStorage.getItem(LLAVE_DEL_STATE)
    sessionStorage.removeItem(LLAVE_DEL_STATE)

    if (!stateCoincide(stateEsperado, urlParams.get('state'))) {
      console.error('El state de OAuth no coincide: se descarta el codigo de autorizacion.')
      window.history.replaceState({}, document.title, window.location.pathname)

      return
    }

    // Al servidor, no a Google: el `client_secret` no puede pasar por aquí.
    // Ver `pages/api/google/token.js`.
    const response = await fetch('/api/google/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    const data = await response.json()

    // Almacena los tokens en localStorage
    if (data.access_token && data.refresh_token) {
      const tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem('oauth2-params', JSON.stringify(tokens))

      // Reemplaza el estado de la URL para eliminar el fragmento hash
      window.history.replaceState({}, document.title, window.location.pathname)
      window.location.href = '/home' // Redirige al usuario a la página de inicio
    }

  }

  /**
   * Refresca el token de acceso utilizando el token de refresco.
   * @param {string} refreshToken - Token de refresco.
   * @returns {Promise<number>} - Tiempo de expiración en segundos del nuevo token.
   */
  const refreshAccessToken = async (storedParams) => {

    console.log("Refrescando las credenciales...")

    // const storedParams = JSON.parse(localStorage.getItem('oauth2-params'))
    const refreshToken = storedParams.refresh_token

    // Configura los parámetros necesarios para refrescar el token de acceso
    try {
      // Al servidor, no a Google, por la misma razón que el intercambio inicial.
      const response = await fetch('/api/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      // Si la respuesta al hacer la solicitud para refrescar el Token no es exitosa,
      // Se forzará la re-autenticación a Google y luego se ejecuta la detención de refreshAccessToken.
      if (!response.ok) {
        // TODO: EVALUAR ESTO.
        //throw new Error('Error al refrescar el Token de Acceso.')
        console.log('Error al refrescar el Token de Acceso.')
        await signInToGoogle()

        return
      }

      // Analiza la respuesta JSON para obtener el nuevo token y el tiempo de expiración
      const data = await response.json()
      const newAccessToken = data.access_token // Nuevo token de acceso

      // Recupera los parámetros almacenados en localStorage, o un objeto vacío si no existen
      storedParams.access_token = newAccessToken // Actualiza el token de acceso

      // Guarda los parámetros actualizados en localStorage
      localStorage.setItem('oauth2-params', JSON.stringify(storedParams))

    } catch (error) {
      throw error // Relanza el error para manejarlo externamente
    }
  }

  /**
   * Función que revisa si la validez del Token y lo refresca.
   * Si quedan mas de 5 minutos, no se refresca el Token.
   * Si quedan menos de 5 minutos, se refresca el Token.
   */
  const refreshAccessTokenIfExpired = async(googleTokens) => {

    const secondsToExpire = await tokenExpiresIn(googleTokens.access_token)

    console.log("Expira en: " + secondsToExpire + " segundos.")

    if (secondsToExpire > 300) {
      return
    } else {
      await refreshAccessToken(googleTokens)
    }
  }

  /**
   * Maneja la autorización de Google Drive.
   * @returns {Promise<string|void>} - Token de acceso o inicia el flujo de autenticación.
   */
  const signInToGoogle = async () => {
    try {
      await oauth2SignIn()
      // await getTokens()
    } catch (error) {
      throw new Error (error)
    }
  }

  // Detectar si la URL contiene el parámetro "code" al cargar la página
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      getTokens()
    }
  }, [])

  return {
    oauth2SignIn,
    tokenExpiresIn,
    refreshAccessToken,
    refreshAccessTokenIfExpired,
    signInToGoogle
  }

}
