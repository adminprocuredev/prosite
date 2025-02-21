import FileCopyIcon from '@mui/icons-material/FileCopy'
import { IconButton, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import { updateBlueprintsWithStorageOrHlc, getNextChar, getNextRevisionFolderName } from 'src/context/firebase-functions/firestoreFunctions'
import { getPlantInitals } from 'src/context/firebase-functions/firestoreQuerys'
import { useGoogleAuth } from './useGoogleDriveAuth'
// ** Configuración de Google Drive
import googleAuthConfig from 'src/configs/googleDrive'

/**
 * Hook para interactuar con Google Drive, que incluye gestión de carpetas, permisos y subida de archivos.
 * @returns {Object} Funciones y estados para gestionar Google Drive.
 */
export const useGoogleDriveFolder = () => {

  const { refreshAccessToken, signInToGoogle } = useGoogleAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Se llama al ID de la carpeta principal de Google Drive.
   */
  const rootFolder = googleAuthConfig.MAIN_FOLDER_ID

  /**
   * Maneja errores y la autenticación para cada solicitud a la API de Google Drive.
   * @param {Function} apiCall - Función que ejecuta la llamada a la API.
   * @param {...any} args - Argumentos necesarios para la función `apiCall`.
   * @returns {Promise<any>} Resultado de la llamada a la API.
   */
  const executeApiCall = async (apiCall, ...args) => {

    const storedParams = JSON.parse(localStorage.getItem('oauth2-params'))
    const accessToken = storedParams.access_token

    if (!accessToken) {
      setError('No access token found')
      await signInToGoogle()

      return
    }

    setIsLoading(true)
    setError(null)

    try {
      return await apiCall(...args)
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshAccessToken()

        return apiCall(...args) // Reintentar después de refrescar el token
      }
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }

  }

  /**
   * Solicita datos a la API de Google Drive.
   * @param {string} url - Endpoint de la API.
   * @param {Object} options - Opciones de la solicitud.
   * @returns {Promise<Object>} Respuesta de la API.
   */
  const makeApiRequest = async (url, options = {}) => {

    const storedParams = JSON.parse(localStorage.getItem('oauth2-params'))
    const accessToken = storedParams.access_token

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Obtiene una lista de carpetas dentro de una carpeta específica en Google Drive.
   * @param {string} parentId - ID de la carpeta padre. Si no se entrega el parámetro se asume que la carpeta a buscar es la carpeta principal.
   * @returns {Promise<Object>} Lista de carpetas.
   */
  const fetchFolders = async (parentId = rootFolder) => {

    const url = `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&includeItemsFromAllDrives=true&supportsAllDrives=true`

    return executeApiCall(() => makeApiRequest(url))

  }

  /**
   * Crea una nueva carpeta en Google Drive.
   * @param {string} name - Nombre de la carpeta.
   * @param {string} parentFolderId - ID de la carpeta padre.
   * @returns {Promise<Object>} Carpeta creada.
   */
  const createFolder = async (name, parentFolderId = rootFolder) => {

    const url = 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true'

    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }

    return executeApiCall(() => makeApiRequest(url, { method: 'POST', body: JSON.stringify(body) }))

  }

  /**
   * Crea un permiso para un archivo en Google Drive.
   * @param {string} fileId - ID del archivo.
   * @param {string} emailAddress - Dirección de correo.
   * @param {string} role - Rol (e.g., 'reader', 'writer').
   * @returns {Promise<Object>} Permiso creado.
   */
  const createPermission = async (fileId, emailAddress, role) => {

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`

    const body = {
      role,
      type: 'user',
      emailAddress,
    }

    return executeApiCall(() => makeApiRequest(url, { method: 'POST', body: JSON.stringify(body) }))
  }

  /**
   * Sube un archivo a Google Drive.
   * @param {string} fileName - Nombre del archivo.
   * @param {File} file - Archivo a subir.
   * @param {string} parentFolderId - ID de la carpeta donde se subirá.
   * @returns {Promise<Object>} Archivo subido.
   */
  const uploadFile = async (fileName, file, parentFolderId) => {

    const storedParams = JSON.parse(localStorage.getItem('oauth2-params'))
    const accessToken = storedParams.access_token

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&includeItemsFromAllDrives=true'

    const metadata = {
      name: fileName,
      parents: [parentFolderId],
    }

    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)

    return executeApiCall(() => fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData }).then(res => res.json()))

  }

  /**
   * Función para Buscar y/o Crear una nueva carpeta.
   * @param {string} parentFolderId - ID de la carpeta donde se debe buscar y/o crear la nueva carpeta.
   * @param {string} folderName - Nombre de la carpeta a crear.
   * @param {string} findBy - String para hacer el match de búsqueda mediante includes().
   * @returns
   */
  const findOrCreateFolder = async (parentFolderId, folderName, findBy) => {

    try {
       // Busca las carpetas dentro del directorio especificado.
      const folders = await fetchFolders(parentFolderId)
      let folder = folders.files.find(f => f.name.includes(findBy))

      // Si no existe, la crea.
      if (!folder) {
        folder = await createFolder(folderName, parentFolderId)
      }

      return folder
    } catch (error) {
      console.error('Error en la ejecución de findOrCreateFolder():', error)
      throw error
    }

  }

  /**
   * Función para Buscar y/o Crear una nueva carpeta de Área.
   * Se crea esta función particular para compensar posible error de string de OT incluido en carpeta pre-existente.
   * @param {string} parentFolderId - ID de la carpeta donde se debe buscar y/o crear la nueva carpeta.
   * @param {string} folderName - Nombre de la carpeta a crear.
   * @param {string} findBy - String para hacer el match de búsqueda mediante includes().
   * @returns
   */
  const findOrCreateOTFolder = async (parentFolderId, folderName, findBy) => {

    try {
       // Busca las carpetas dentro del directorio especificado.
      const folders = await fetchFolders(parentFolderId)
      let folder = folders.files.find(f => f.name.slice(0, 10).includes(findBy))

      // Si no existe, la crea.
      if (!folder) {
        folder = await createFolder(folderName, parentFolderId)
      }

      return folder
    } catch (error) {
      console.error('Error en la ejecución de findOrCreateFolder():', error)
      throw error
    }

  }


  /**
   * Función para extraer el número de área desde el string que contiene el nombre completo del área.
   * @param {string} name - String con el nombre completo del área. Ej: "0100 - Planta Desaladora".
   * @returns {string} - areaNumber que es un string con él número. Ek: "0100".
   */
  function extractAreaNumber(areaFullname) {
    const nameArray = areaFullname.split(" - ")

    return nameArray[0]
  }

  /**
   * Crea una estructura de carpetas jerárquica en Google Drive basada en los datos de la petición.
   * @param {object} petition - Objeto con la información de la OT.
   * @param {string} uploadInFolder - Nombre de la carpeta específica que se quiere crear.
   * @returns {Promise<object>} - Objeto que representa la carpeta final creada o encontrada en Google Drive.
   */
  const createFolderStructure = async (petition, newFolder = []) => {

    const plantInitials = await getPlantInitals(petition.plant)
    const plantFolder = await findOrCreateFolder(rootFolder, plantInitials, plantInitials)
    const areaFolder = await findOrCreateFolder(plantFolder.id, petition.area, extractAreaNumber(petition.area))
    const projectFolder = await findOrCreateOTFolder(areaFolder.id, `OT N°${petition.ot} - ${petition.title}`, petition.ot)

    // Crear subcarpetas si se especifican.
    for (const subfolder of newFolder) {
      await findOrCreateFolder(projectFolder.id, subfolder, subfolder)
    }

    return projectFolder
  }


  /**
   * Función para copiar un texto al portapapeles.
   * @param {string} text - Texto que se quiere copiar al portapapeles.
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Texto copiado al portapapeles:', text)
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err)
      })
  }

  /**
   * Función para definir si el Entregable puede ser revisado por el Cliente. Creo...
   * @param {number} role - Rol del usuario conectado que ejecuta la acción.
   * @param {Object} blueprint - Blueprint modificado que contiene array "revisions" que contiene los datos de todas sus revisiones.
   * @returns {boolean}
   */
  const checkRoleAndApproval = (role, blueprint) => {

    // Desestructuración de blueprint.
    const { revision, revisions, approvedByDocumentaryControl, sentByDesigner, sentBySupervisor, blueprintCompleted } = blueprint

    const isInitialRevision = revision === 'Iniciado'
    const isRevA = revision === 'A'
    const isRevisionAtLeastB = !isInitialRevision && !isRevA
    const sentByAuthor = sentByDesigner || sentBySupervisor
    const isRole9 = role === 9

    if (revisions && revisions.length > 0) {
      const sortedRevisions = [...revisions].sort((a, b) => new Date(b.date) - new Date(a.date))
      const lastRevision = sortedRevisions[0]
      const lastTransmittalExists = 'lastTransmittal' in lastRevision

      if (lastTransmittalExists && isRole9 && approvedByDocumentaryControl && sentByAuthor && isRevisionAtLeastB && !blueprintCompleted) {
        return true
      }
    }

    return false
  }

  /**
   *
   * @param {Array.<Object>} acceptedFiles - Contiene datos del archivo como name, size, type...
   * @param {Object} blueprint - Objeto con los datos del entregable/plano.
   * @param {Object} authUser - Objeto con la información del usuario conectado que ejecuta la acción.
   * @returns {Object} - Objeto con
   */
  const validateFileName = (acceptedFiles, blueprint, authUser, approves) => {

    // Desustructuración de objetos.
    const { uid, role, displayName } = authUser
    const { id, userId, clientCode, revision, approvedByDocumentaryControl, approvedBySupervisor, approvedByContractAdmin, blueprintCompleted } = blueprint

    // Booleano para definir si el Entregable es M3D.
    const isM3D = id.split('-')[2] === 'M3D'

    // Booleano para definir si el Entregable puede ser definido por el Cliente o no.
    const canBeCheckedByClient = checkRoleAndApproval(role, blueprint)

    // Si es Rol 9, está aprobado por control documental y puede ser revisado por el Cliente, se puede subir un documento con cualquier nombre.
    if (blueprintCompleted || (role === 9 && approvedByDocumentaryControl === true && canBeCheckedByClient)) {
      return acceptedFiles.map(file => ({
        name: file.name,
        isValid: true,
        msj: `${file.name}`
      }))
    }

    // Se define la letra/número de la siguiente revisión teórica.
    const expectedRevision = getNextRevisionFolderName(blueprint, authUser)

    let expectedFileName = null

    console.log(canBeCheckedByClient)

    // Se define el nombre esperado del Entregable a cargar según sea el caso.
    // TODO: VALIDAR ESTOS CASOS
    if (role === 8 || (role === 7 && userId === uid)) {
      expectedFileName = `${clientCode}_REV_${expectedRevision}`
    } else if (role === 9 && approvedByDocumentaryControl && !canBeCheckedByClient) {
      expectedFileName = `${clientCode}_REV_${expectedRevision}_HLC`
    } else if (role === 9 && (approvedBySupervisor || approvedByContractAdmin || isM3D) && revision !== 'A' && approves) {
      expectedFileName = `${clientCode}_REV_${expectedRevision}`
    } else {
      const initials = displayName.toUpperCase().split(' ').map(word => word.charAt(0)).join('')
      expectedFileName = `${clientCode}_REV_${expectedRevision}_${initials}`
    }

    return acceptedFiles.map(file => {
      const fileNameWithoutExtension = file.name.split('.')[0]
      const isValid = fileNameWithoutExtension === expectedFileName

      // Si el nombre del archivo no es válido, se retorna un Dialog con indicaciones.
      return {
        name: file.name,
        isValid,
        msj: isValid ? (
          `${file.name}`
        ) : (
          <Typography variant='body2'>
            El nombre del archivo debe ser:{' '}
            <Typography variant='body2' component='span' color='primary'>
              {expectedFileName}
              <Tooltip title='Copiar'>
                <IconButton
                  sx={{ ml: 3 }}
                  size='small'
                  onClick={() => copyToClipboard(expectedFileName)}
                  aria-label='copiar'
                >
                  <FileCopyIcon fontSize='small' />
                  <Typography>copiar</Typography>
                </IconButton>
              </Tooltip>
            </Typography>
            <br />
            <br />
            El nombre del archivo que intentó subir es:{' '}
            <Typography variant='body2' component='span' color='error'>
              {fileNameWithoutExtension}
            </Typography>
          </Typography>
        )
      }
    })
  }

  /**
   *
   * @param {Object} files - Objeto con información del documento a cargar: name, size, path...
   * @param {Object} blueprint - Objeto con los datos del entregable/plano.
   * @param {string} petitionId - String con ID de la OT.
   * @param {Object} petition - Objeto con los datos de la OT.
   * @param {Array.<string>} uploadInFolder - Array con nombres de Carpetas que se quieren crear.
   * @returns
   */
  const handleFileUpload = async (files, blueprint, petitionId, petition, uploadInFolder = ["EN TRABAJO"]) => {

    if (!files || !blueprint.id) {
      return null
    }

    try {
      // Utilizamos createFolderStructure para manejar toda la lógica de carpetas
      const projectFolder = await createFolderStructure(petition, uploadInFolder)

      // Buscar o crear la carpeta final en la que se almacenará el documento.
      const destinationFolder = await findOrCreateFolder(projectFolder.id, uploadInFolder[0], uploadInFolder[0])

      // Se obtiene la letra/número de la siguiente revisión.
      const revision = getNextRevisionFolderName(blueprint)
      const revisionFolderName = `REV_${revision}`

      // Se busca en Google Drive la Carpeta a Crear.
      const revisionFolders = await fetchFolders(destinationFolder.id)
      let revisionFolder = revisionFolders.files.find(folder => folder.name === revisionFolderName)

      // Si no existe la Carpeta, se crea.
      if (!revisionFolder) {
        revisionFolder = await createFolder(revisionFolderName, destinationFolder.id)
      }

      // Luego de asegurada la existencia de la carpeta, se carga el documento en ella.
      const fileData = await uploadFile(files.name, files, revisionFolder.id)

      // Se genera el Link del archivo y se almacena en Firestore.
      if (fileData?.id) {
        const fileLink = `https://drive.google.com/file/d/${fileData.id}/view`
        await updateBlueprintsWithStorageOrHlc(petitionId, blueprint.id, fileLink, fileData.name, 'storage')

        return { fileLink, fileName: fileData.name }
      }
    } catch (error) {
      console.error('Error en handleFileUpload:', error)
      throw error
    }

    return null
  }

  return {
    fetchFolders,
    createFolder,
    createPermission,
    uploadFile,
    isLoading,
    error,
    findOrCreateFolder,
    createFolderStructure,
    getNextRevisionFolderName,
    validateFileName,
    handleFileUpload,
    checkRoleAndApproval
  }
}
