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

  const refreshTokens = async(googleTokens) => {
    await refreshAccessTokenIfExpired(googleTokens)
    const newGoogleTokens = JSON.parse(localStorage.getItem('oauth2-params'))
    console.log(newGoogleTokens)
  }

  // Efecto que manejar la autenticación/refresco de las credenciales de Google.
  useEffect(() => {

    const checkGoogleConnection = async () => {
      try {
        // ** Si existe un usuario conectado, maneja la conexión a Google.
        if (authUser && authUser.company === "Procure") {
          const googleTokens = JSON.parse(localStorage.getItem('oauth2-params')) || null
          console.log(googleTokens)
          if (!googleTokens) {
            // Inicia el proceso de autenticación con Google
            await signInToGoogle()
          } else {
            // Si los tokens existen, verifica su validez al recargar la página.
            await refreshTokens(googleTokens)

            // Si existen los tokens, revisa su validez periódicamente
            tokensValidity.current = setInterval(async () => {
              await refreshTokens(googleTokens)
            }, 0.5 * 60 * 1000) // Cada 1 minuto
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
