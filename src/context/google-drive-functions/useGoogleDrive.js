import { useEffect, useState } from 'react';
import googleAuthConfig from '../../configs/googleDrive'; // Configuración de Google Drive, como IDs de carpeta
import { useGoogleAuth } from './useGoogleDriveAuth'; // Hook personalizado para manejar la autenticación de Google

/**
 * Hook personalizado para interactuar con Google Drive.
 * Proporciona funcionalidad para listar y subir archivos, y manejar el estado de autenticación.
 */
export const useGoogleDrive = () => {

  // Estados y funciones provenientes del hook de autenticación
  const {
    accessToken, // Token de acceso actual
    refreshAccessToken, // Función para refrescar el token de acceso
    isLoading: authLoading, // Estado de carga relacionado con la autenticación
    error: authError, // Error relacionado con la autenticación
    oauth2SignIn // Función para iniciar sesión con OAuth 2.0
  } = useGoogleAuth()

  // Estado local para gestionar la funcionalidad de Google Drive
  const [files, setFiles] = useState([]) // Lista de archivos actuales
  const [nextPageToken, setNextPageToken] = useState(null) // Token para la página siguiente
  const [prevPageTokens, setPrevPageTokens] = useState([]) // Pila de tokens para páginas anteriores
  const [currentPage, setCurrentPage] = useState(1) // Número de la página actual
  const [isLoading, setIsLoading] = useState(false) // Estado de carga general
  const [error, setError] = useState(null) // Mensaje de error
  const [nestedFiles, setNestedFiles] = useState(true) // Indicador para mostrar archivos de subcarpetas
  const [isFirstLoad, setIsFirstLoad] = useState(true) // Indicador para la primera carga de datos
  const [isSwitching, setIsSwitching] = useState(false) // Indicador de cambio de modo de visualización

  // Efecto para cargar archivos al obtener un token de acceso o cambiar el modo de archivos anidados
  useEffect(() => {
    if (accessToken) {
      fetchFiles()
    }
  }, [accessToken, nestedFiles])

  /**
   * Construye la URL y parámetros de la API de Google Drive.
   * @param {string} folderId - ID de la carpeta.
   * @param {string|null} pageToken - Token para paginación.
   * @returns {string} - URL completa con parámetros.
   */
  const buildDriveApiUrl = (folderId, pageToken) => {
    const url = new URL('https://www.googleapis.com/drive/v3/files')

    const queryParams = {
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      pageSize: '100',
      q: `'${folderId}' in parents`
    }

    if (pageToken) {
      queryParams.pageToken = pageToken
    }

    url.search = new URLSearchParams(queryParams).toString()

    return url.toString()
  }

  /**
   * Maneja la paginación actualizando los estados relevantes.
   * @param {'next'|'prev'} direction - Dirección de la paginación.
   * @param {string|null} pageToken - Token actual.
   */
  const handlePagination = (direction, pageToken) => {
    if (isFirstLoad || isSwitching) {
      setCurrentPage(1)
      setPrevPageTokens([])
      setIsSwitching(false)
    } else if (direction === 'next') {
      setPrevPageTokens([...prevPageTokens, pageToken])
      setCurrentPage(currentPage + 1)
    } else if (direction === 'prev') {
      setPrevPageTokens(prevPageTokens.slice(0, -1))
      setCurrentPage(Math.max(1, currentPage - 1))
    }
  }

  /**
   * Obtiene una lista de archivos desde Google Drive.
   * @param {string} folderId - ID de la carpeta a listar (por defecto: principal o raíz).
   * @param {string|null} pageToken - Token para paginación.
   * @param {'next'|'prev'} direction - Dirección de la paginación.
   * @param {boolean} retry - Si se debe reintentar al fallar.
   */
  const fetchFiles = async (
    folderId = nestedFiles ? googleAuthConfig.MAIN_FOLDER_ID : 'root', // ID de la carpeta raíz o una carpeta específica.
    pageToken = null, // Token para la paginación (si no es nulo, continúa desde una página específica).
    direction = 'next', // Dirección de la navegación: 'next' para avanzar, 'prev' para retroceder.
    retry = true // Indica si se debe reintentar la solicitud tras un error de autenticación.
  ) => {
    // Verifica que exista un token de acceso antes de proceder.
    if (!accessToken) {
      setError('No access token found') // Establece un error si no se encuentra el token.

      return // Finaliza la función para evitar ejecuciones innecesarias.
    }

    // Configura el estado inicial antes de realizar la solicitud.
    setIsLoading(true) // Indica que la carga está en curso.
    setError(null) // Limpia cualquier error previo.

    try {
      // Construye la URL de la API de Google Drive con los parámetros necesarios.
      const url = buildDriveApiUrl(folderId, pageToken)

      // Realiza la solicitud a la API de Google Drive.
      const response = await fetch(url, {
        method: 'GET', // Método de la solicitud.
        headers: {
          Authorization: `Bearer ${accessToken}` // Incluye el token de acceso para la autorización.
        }
      })

      // Verifica si la respuesta es válida.
      if (!response.ok) {
        // Si el token ha expirado y está permitido reintentar, renueva el token y vuelve a intentar.
        if (response.status === 401 && retry) {
          await refreshAccessToken() // Intenta renovar el token de acceso.

          return fetchFiles(folderId, pageToken, direction, false) // Llama de nuevo a la función sin reintentar.
        }
        throw new Error('Failed to fetch files') // Lanza un error para manejar otros problemas.
      }

      // Si la solicitud es exitosa, procesa los datos recibidos.
      const data = await response.json() // Convierte la respuesta en formato JSON.
      setFiles(data.files || []) // Actualiza la lista de archivos obtenidos.
      setNextPageToken(data.nextPageToken || null) // Establece el token para la siguiente página (si existe).

      // Maneja el estado de paginación basado en la dirección.
      handlePagination(direction, pageToken)

      // Marca la primera carga como completada.
      setIsFirstLoad(false)
    } catch (error) {
      // Captura y muestra cualquier error que ocurra durante la solicitud.
      setError(error.message) // Establece el mensaje de error en el estado.
    } finally {
      // Restablece el estado de carga independientemente del resultado.
      setIsLoading(false) // Finaliza la indicación de carga.
    }
  }

  /**
   * Sube un solo archivo a Google Drive.
   * @param {File} file - Archivo a subir.
   * @returns {Promise<object>} - Respuesta de la API de Google Drive.
   */
  const uploadSingleFile = async (file, accessToken) => {
    const metadata = {
      name: file.name, // Nombre del archivo
      mimeType: file.type, // Tipo MIME del archivo
    }

    const formData = new FormData()
    // Añade los metadatos del archivo y el archivo en sí a la solicitud
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)

    try {
      // Realiza la solicitud de subida a Google Drive
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      )

      // Verifica si la respuesta es exitosa, de lo contrario lanza un error
      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      // Devuelve los datos del archivo subido
      return await response.json()
    } catch (error) {
      // Si ocurre un error, lo lanza
      throw error
    }
  }

  /**
   * Sube archivos al Google Drive del usuario.
   * @param {File[]} filesToUpload - Lista de archivos a subir.
   */
  const uploadFiles = async filesToUpload => {

    // Verifica si existe un token de acceso. Si no, solicita iniciar sesión.
    if (!accessToken) {
      setError('No access token found')
      oauth2SignIn()

      return
    }

    // Inicia el estado de carga y resetea el error
    setIsLoading(true)
    setError(null)

    try {
      // Crea una lista de promesas para subir cada archivo
      const uploadPromises = Array.from(filesToUpload).map(file =>
        uploadSingleFile(file, accessToken) // Ahora usa la función externa
      )

      // Espera que todas las promesas se resuelvan
      const results = await Promise.all(uploadPromises)

      // Actualiza el estado con los archivos subidos
      setFiles([...files, ...results])
    } catch (error) {
      // Si falla la subida, intenta obtener un nuevo token de acceso y reintentar la subida
      if (error.message === 'Failed to upload file') {
        const newAccessToken = await refreshAccessToken()
        await uploadFiles(filesToUpload); // Reintenta la carga
      } else {
        // En caso de cualquier otro error, establece el error
        setError(error.message)
      }
    } finally {
      // Finaliza el estado de carga
      setIsLoading(false)
    }
  }

  return {
    files,
    nextPageToken,
    prevPageTokens,
    currentPage,
    isLoading: isLoading || authLoading,
    error: error || authError,
    fetchFiles,
    uploadFiles,
    nestedFiles,
    setNestedFiles,
    isFirstLoad,
    isSwitching,
    setIsSwitching
  }
}
