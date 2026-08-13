import { createContext, useContext, useEffect, useState } from 'react'

// ** Firebase Imports
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { app } from 'src/configs/firebase'

// ** Crea contexto
export const FirebaseContext = createContext()

import {
  createUser,
  deleteCurrentUser,
  formatAuthUser,
  resetPassword,
  signGoogle,
  signInWithEmailAndPassword,
  updatePassword,
  updateUserInDatabase
} from 'src/context/firebase-functions/firebaseFunctions'

import {
  addComment,
  addDescription,
  blockDayInDatabase,
  createCostCenter,
  createWeekHoursByType,
  deleteCostCenter,
  deleteWeekHoursByType,
  fetchSolicitudes,
  fetchUserList,
  fetchWeekHoursByType,
  finishPetition,
  generateTransmittalCounter,
  modifyCostCenter,
  newDoc,
  setDefaultCostCenter,
  updateBlueprint,
  updateDocs,
  updateSelectedDocuments,
  updateTransmittalCollection,
  updateUserData,
  updateUserPhone,
  updateWeekHoursByType,
  updateWeekHoursWithPlant,
  generateBlueprintCodes,
  updateBlueprintAssignment,
  getProcureCounter,
  markBlueprintAsDeleted,
  deleteBlueprintAndDecrementCounters,
  updateBlueprintsWithStorageOrHlc,
  deleteReferenceOfLastDocumentAttached,
  useBlueprints,
  getNextChar,
  getBlueprintPercent,
  getNextRevisionFolderName
} from 'src/context/firebase-functions/firestoreFunctions'

import {
  consultBlockDayInDB,
  consultBluePrints,
  consultDocs,
  consultOT,
  consultObjetives,
  consultSAP,
  consultUserEmailInDB,
  fetchPetitionById,
  getAllUsersData,
  getData,
  getDomainData,
  getUserData,
  getUsersWithSolicitudes,
  subscribeToBlockDayChanges,
  subscribeToPetition,
  subscribeToUserProfileChanges,
  useEvents,
  useSnapshot,
  fetchDisciplineProperties,
  fetchDeliverablesByDiscipline,
  getPlantInitals,
  getUsuariosParaReasignar
} from 'src/context/firebase-functions/firestoreQuerys'

import { updateUserProfile, uploadFilesToFirebaseStorage } from 'src/context/firebase-functions/storageFunctions'

const FirebaseContextProvider = props => {
  // ** Hooks
  const [authUser, setAuthUser] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const storedUser = localStorage.getItem('user')

      return storedUser ? JSON.parse(storedUser) : null
    } else {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Qué salió mal al arrancar, para poder DECIRLO en vez de dejar un spinner.
  const [errorArranque, setErrorArranque] = useState(null)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [domainDictionary, setDomainDictionary] = useState({})
  const [domainRoles, setDomainRoles] = useState({})

  // ** Variables
  const auth = getAuth(app)

  // Este useEffect manejará los datos del usuario conectado
  useEffect(() => {

    // Si `loading` se queda en true, los guards muestran el spinner y no hay
    // forma de salir: ni login, ni error, ni nada que mirar. Pasó de verdad
    // -13-ago-2026, con la base local de Firebase Auth en mal estado en un
    // navegador- y costó horas de diagnóstico porque la app no decía nada:
    // spinner eterno, cero errores en consola y cero peticiones de red.
    //
    // Dos redes para que eso no vuelva a pasar:
    //
    // 1. Un `catch` que apague el spinner y deje ver el error. Sin él,
    //    cualquier lectura que falle -el documento del usuario, el diccionario
    //    o los roles- se traga el `setLoading(false)` que viene después.
    // 2. Dos plazos: si algo no responde en 15 s, se deja de esperar. Un
    //    `onAuthStateChanged` que nunca dispara -IndexedDB bloqueado- no lanza
    //    ningún error que capturar, así que el catch por sí solo no alcanza.
    //
    // Y un número de orden, porque Firebase no espera a que termine un callback
    // para entregar el siguiente: sin él, una carga lenta del usuario A podía
    // terminar DESPUÉS de un logout o del login de B y devolver a A al
    // contexto.
    let turno = 0
    let arranco = false

    // `localStorage.user` es una copia de conveniencia del usuario conectado.
    // Si se limpia el contexto y esa copia no, queda identificando a quien ya
    // no está: se borra en TODOS los caminos que dejan la sesión sin usuario.
    const olvidarUsuarioGuardado = () => {
      try {
        localStorage.removeItem('user')
      } catch (error) {
        console.warn('No se pudo limpiar el usuario guardado:', error)
      }
    }

    // Rendirse y mostrar el login con una explicación. `turno++` invalida
    // cualquier carga en vuelo: si termina más tarde, ya no publica nada.
    // Se deja al usuario en null a propósito —es el estado seguro—: entrar con
    // la identidad anterior mientras Firebase apunta a otra sería peor.
    const rendirse = motivo => {
      console.error(motivo)
      turno++
      setAuthUser(null)
      olvidarUsuarioGuardado()
      setErrorArranque(
        'No se pudo verificar la sesión. Si la pantalla no avanza, borra los datos del sitio en tu navegador y vuelve a entrar.'
      )
      setLoading(false)

      // Se cierra la sesión de Firebase además de limpiar el contexto: si no,
      // quedan dos verdades a la vez -la aplicación mostrando el login y
      // `auth.currentUser` todavía autenticado-, y las lecturas siguientes
      // viajarían con las credenciales de una sesión que la pantalla da por
      // terminada.
      signOut(auth).catch(error => console.warn('No se pudo cerrar la sesión tras el fallo:', error))
    }

    // Plazo de ARRANQUE, fuera del callback a propósito: el caso que originó
    // todo esto —la base local de Firebase Auth bloqueada— hace que
    // `onAuthStateChanged` no dispare NUNCA. Un plazo declarado dentro del
    // callback no llegaría a existir, y el spinner volvería a ser eterno.
    const plazoArranque = setTimeout(() => {
      if (arranco) return
      rendirse('Firebase Auth no respondió en 15 s: se deja de esperar y se muestra el login.')
    }, 15000)

    const unsubscribe = onAuthStateChanged(auth, async authState => {
      arranco = true
      clearTimeout(plazoArranque)

      const miTurno = ++turno

      // Y un plazo POR EJECUCIÓN: el de arranque ya se gastó, así que sin este
      // bastaba iniciar sesión después para volver al spinner eterno si una
      // lectura se queda pendiente —sin resolver ni rechazar, que es lo que no
      // pasa por el catch—.
      const plazo = setTimeout(() => {
        if (miTurno !== turno) return
        rendirse('La carga de la sesión superó los 15 s: se deja de esperar.')
      }, 15000)

      try {
        if (!authState) {
          if (miTurno !== turno) return
          setAuthUser(null)
          olvidarUsuarioGuardado()
          setErrorArranque(null)

          return
        }

        setLoading(true)

        // Se carga TODO antes de publicar el usuario. Al revés -authUser puesto
        // y el diccionario a medias- la aplicación entra con una inicialización
        // incompleta y falla más adentro, lejos de la causa.
        const databaseUserData = await formatAuthUser(authState)
        const dictionary = await getDomainData('dictionary')
        const roles = await getDomainData('roles')

        // Llegó otro evento de sesión mientras se cargaba: manda el nuevo.
        if (miTurno !== turno) return

        setAuthUser(databaseUserData)
        setDomainDictionary(dictionary)
        setDomainRoles(roles)
        setErrorArranque(null)

        // Guardar en localStorage puede lanzar -cuota llena, o el navegador
        // bloqueando el almacenamiento-, y es una copia de conveniencia: que
        // falle no puede tumbar el arranque.
        try {
          localStorage.setItem('user', JSON.stringify(databaseUserData))
        } catch (errorGuardado) {
          console.warn('No se pudo guardar el usuario en localStorage:', errorGuardado)
        }
      } catch (error) {
        console.error('Error al cargar los datos del usuario conectado:', error)
        if (miTurno !== turno) return
        setAuthUser(null)
        olvidarUsuarioGuardado()
        setErrorArranque('No se pudieron cargar tus datos de usuario. Vuelve a intentarlo o avisa a soporte.')
      } finally {
        clearTimeout(plazo)

        // Pase lo que pase, el spinner se apaga —salvo que esta ejecución ya
        // esté pisada por una más nueva, que apagará el suyo.
        if (miTurno === turno) {
          setLoading(false)
        }
      }
    })

    return () => {
      // Invalida cualquier carga en vuelo: al desmontar, sus setState ya no
      // corresponden a este provider.
      turno++
      arranco = true
      clearTimeout(plazoArranque)
      unsubscribe()
    }
  }, [])

  const value = {
    authUser,
    auth,
    loading,
    errorArranque,
    isCreatingProfile,
    domainDictionary,
    domainRoles,
    setIsCreatingProfile,
    signOut,
    resetPassword,
    updatePassword,
    signInWithEmailAndPassword,
    createUser,
    updateUserProfile,
      newDoc,
    useEvents,
    updateDocs,
    updateUserPhone,
    useSnapshot,
      getDomainData,
    getData,
    getUserData,
    getAllUsersData,
    uploadFilesToFirebaseStorage,
    blockDayInDatabase,
    consultBlockDayInDB,
    consultSAP,
    consultUserEmailInDB,
    consultDocs,
    consultObjetives,
    getUsersWithSolicitudes,
    signGoogle,
    useBlueprints,
    fetchPetitionById,
    updateBlueprint,
    addDescription,
    generateTransmittalCounter,
    updateSelectedDocuments,
    updateTransmittalCollection,
    consultBluePrints,
    deleteCurrentUser,
    addComment,
    updateUserData,
    finishPetition,
    subscribeToPetition,
    consultOT,
    subscribeToUserProfileChanges,
    subscribeToBlockDayChanges,
    updateUserInDatabase,
    fetchWeekHoursByType,
    createWeekHoursByType,
    updateWeekHoursByType,
    deleteWeekHoursByType,
    fetchSolicitudes,
    fetchUserList,
    updateWeekHoursWithPlant,
    fetchDisciplineProperties,
    fetchDeliverablesByDiscipline,
    generateBlueprintCodes,
    updateBlueprintAssignment,
    getProcureCounter,
    markBlueprintAsDeleted,
    deleteBlueprintAndDecrementCounters,
    updateBlueprintsWithStorageOrHlc,
    deleteReferenceOfLastDocumentAttached,
    createCostCenter,
    modifyCostCenter,
    deleteCostCenter,
    setDefaultCostCenter,
    getPlantInitals,
    getUsuariosParaReasignar,
    getNextChar,
    getBlueprintPercent,
    getNextRevisionFolderName
  }

  return <FirebaseContext.Provider value={value}>{props.children}</FirebaseContext.Provider>
}

export default FirebaseContextProvider

// ** Custom hook para acceder a estas funciones

export const useFirebase = () => useContext(FirebaseContext)
