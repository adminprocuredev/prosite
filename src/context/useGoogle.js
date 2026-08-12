import { createContext, useContext, useEffect, useRef } from 'react'

// ** Crea contexto
export const GoogleContext = createContext()

// ** Hooks
import { useGoogleAuth } from 'src/context/google-drive-functions/useGoogleDriveAuth'
import { useFirebase } from 'src/context/useFirebase'

const GoogleContextProvider = props => {

  // Hooks
  const { authUser } = useFirebase() // Hook para obtener el usuario autenticado
  const { signInToGoogle, refreshAccessTokenIfExpired } = useGoogleAuth()
  const tokensValidity = useRef(null) // Referencia para manejar la validez de los Tokens de Google.

  const refreshTokens = async googleTokens => {
    // Antes esto imprimia los tokens de Google en la consola del navegador.
    await refreshAccessTokenIfExpired(googleTokens)
  }

  // Efecto que manejar la autenticación/refresco de las credenciales de Google.
  useEffect(() => {

    const checkGoogleConnection = async () => {
      try {
        // ** Si existe un usuario conectado, mantiene viva la conexion a Google.
        if (authUser && authUser.company === "Procure") {
          const googleTokens = JSON.parse(localStorage.getItem('oauth2-params')) || null

          // Se pide la autorizacion de Drive AL ENTRAR, aunque sea intrusivo.
          //
          // Intente moverla a "cuando se necesite" y hay que dejar escrito por
          // que no se puede todavia: signInToGoogle NO abre un popup, navega la
          // pagina completa y vuelve a /home sin conservar lo que estabas
          // haciendo. Pedirla en medio de una operacion pierde el trabajo, y el
          // caso peor es el transmittal: para cuando toca Drive ya consumio el
          // correlativo y ya descargo el PDF, asi que quedaria un hueco en la
          // numeracion, un PDF suelto y ningun registro.
          //
          // Para pedirla bajo demanda hay que convertir antes signInToGoogle en
          // un popup (o guardar la intencion en el parametro `state` y reanudar
          // al volver). Mientras siga siendo una navegacion completa, pedirla al
          // entrar es lo menos malo.
          if (!googleTokens) {
            await signInToGoogle()
          } else {
            await refreshTokens(googleTokens)

            // Cada 2 minutos. El refresco solo ocurre cuando al token le quedan
            // 5 minutos o menos, asi que el intervalo tiene que ser bastante
            // menor que ese umbral o se puede saltar la ventana.
            tokensValidity.current = setInterval(async () => {
              await refreshTokens(googleTokens)
            }, 2 * 60 * 1000)
          }
        } else {
          // ** Limpia el intervalo si el usuario no está conectado
          if (tokensValidity.current) {
            clearInterval(tokensValidity.current)
            tokensValidity.current = null
          }
        }
      } catch (error) {
        console.error('Error durante la autenticación con Google:', error)
      }
    }

    // Se ejecuta la función checkGoogleConnectión luego de 1 segundo de montado el componente.
    // Se deja 1 segundo para evitar inconsistensión de usuario desconectado.
    const timeout = setTimeout(checkGoogleConnection, 1000)

    // Limpieza para evitar efectos secundarios.
    return () => {
      clearTimeout(timeout)
      if (tokensValidity.current) {
        clearInterval(tokensValidity.current)
        tokensValidity.current = null
      }
    }
  }, [authUser])

  const value = {
    signInToGoogle
  }

  return <GoogleContext.Provider value={value}>{props.children}</GoogleContext.Provider>
}

export default GoogleContextProvider

// ** Custom hook para acceder al contexto
export const useGoogle = () => useContext(GoogleContext)
