import { createContext, useContext, useEffect, useRef, useState } from 'react'

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

  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [domainDictionary, setDomainDictionary] = useState({})
  const [domainRoles, setDomainRoles] = useState({})

  // ** Variables
  const auth = getAuth(app)

  // Quién está publicado ahora mismo. Se lee dentro del callback, donde el
  // `authUser` del closure sería el de cuando se montó el efecto.
  const uidPublicado = useRef(null)

  // Este useEffect manejará los datos del usuario conectado
  useEffect(() => {

    // Firebase no espera a que termine un callback para entregar el siguiente,
    // y aquí hay tres lecturas antes de publicar nada: sin este número de
    // orden, una carga lenta de A podía terminar DESPUÉS de un logout o del
    // login de B y devolver a A al contexto.
    // Firebase no espera a que termine un callback para entregar el siguiente,
    // y aquí hay tres lecturas antes de publicar nada: sin este número de
    // orden, una carga lenta de A podía terminar DESPUÉS de un logout o del
    // login de B y devolver a A al contexto.
    let turno = 0

    const unsubscribe = onAuthStateChanged(auth, async authState => {
      const miTurno = ++turno

      try {
        if (!authState) {
          uidPublicado.current = null
          setAuthUser(null)

          // Al cerrar sesión también se borra la copia de `localStorage`, que
          // este mismo efecto escribe al publicar: si no, el navegador se queda
          // con los datos completos de quien acaba de salir —y en un equipo
          // compartido eso es de otra persona—.
          try {
            localStorage.removeItem('user')
          } catch (errorGuardado) {
            console.warn('No se pudo limpiar el usuario guardado:', errorGuardado)
          }

          return
        }

        // El spinner tapa la pantalla solo cuando cambia QUIÉN está conectado.
        // Encenderlo en cada evento era lo que producía el "app → cargando →
        // app" al entrar: el login te dejaba dentro y este callback volvía a
        // taparlo todo mientras revalidaba al MISMO usuario. No taparlo nunca
        // sería peor: en un cambio de cuenta se vería a la persona anterior
        // mientras se cargan los datos de la nueva.
        if (uidPublicado.current !== authState.uid) {
          uidPublicado.current = null
          setAuthUser(null)
          setLoading(true)
        }

        const databaseUserData = await formatAuthUser(authState)
        const dictionary = await getDomainData('dictionary')
        const roles = await getDomainData('roles')

        // Llegó otro evento de sesión mientras se cargaba: manda el nuevo.
        if (miTurno !== turno) return

        uidPublicado.current = authState.uid
        setAuthUser(databaseUserData)
        setDomainDictionary(dictionary)
        setDomainRoles(roles)

        try {
          localStorage.setItem('user', JSON.stringify(databaseUserData))
        } catch (errorGuardado) {
          console.warn('No se pudo guardar el usuario en localStorage:', errorGuardado)
        }
      } catch (error) {
        // Sin este catch, una lectura que falle se come el setLoading(false) de
        // abajo y los guards se quedan con el spinner para siempre, sin login,
        // sin error y sin nada que mirar. Ahora se apaga y quien no tenga
        // usuario publicado cae en el login, que sí es una salida.
        console.error('Error al cargar los datos del usuario conectado:', error)
      } finally {
        // El spinner se apaga —salvo que esta ejecución ya esté pisada por una
        // más nueva, que apagará el suyo.
        if (miTurno === turno) {
          setLoading(false)
        }
      }
    })

    return () => {
      // Invalida cualquier carga en vuelo: al desmontar, sus setState ya no
      // corresponden a este provider.
      turno++
      unsubscribe()
    }
  }, [])

  const value = {
    authUser,
    auth,
    loading,
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
