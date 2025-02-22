// ** Firebase Imports
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from 'src/configs/firebase'
import { fetchPetitionById } from 'src/context/firebase-functions/firestoreQuerys'
import { getEmailTemplate } from './deliverableNextRevisionTemplate'

const moment = require('moment')

// Importación de los datos del usuario según el id indicado
const getUserData = async id => {

  const docRef = doc(db, 'users', id)
  const docSnap = await getDoc(docRef)
  const userData = docSnap.data()

  return userData
}

// Obtener usuarios con rol 8 según su turno
const getSupervisorData = async shift => {
  // Realiza la consulta según el campo proporcionado
  const q = query(collection(db, 'users'), where('role', '==', 7), where('shift', 'array-contains', shift))

  let supervisorArray = []

  try {
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log(`No se encontró ningún supervisor para el turno ${shift}`)

      return null
    } else {
      const queryDocs = querySnapshot.docs
      queryDocs.forEach(doc => {
        supervisorArray.push(doc.data())
      })

      return supervisorArray
    }
  } catch (error) {
    console.log('Error al buscar la solicitud: ', error)

    return null
  }
}

// Obtener usuarios con rol 6 (Administrador de Contrato)
const getContractAdministratorData = async () => {
  // Realiza la consulta según el campo proporcionado
  const q = query(collection(db, 'users'), where('role', '==', 6))

  let contractAdministratorArray = []

  try {
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log(`No se encontró ningún Administrador de Contrato`)

      return null
    } else {
      const queryDocs = querySnapshot.docs
      queryDocs.forEach(doc => {
        contractAdministratorArray.push(doc.data())
      })

      return contractAdministratorArray
    }
  } catch (error) {
    console.log('Error al buscar al Administrador de Contrato: ', error)

    return null
  }
}

// Función para definir quién es el siguiente Revisor luego de ejecutar una Aprobación/Rechazo de Entregable.
// petitionData es la información de la Solicitud/OT.
// blueprint es la información del Entregable.
// updateData es un objeto que se genera en 'updateBlueprint' que contiene entre otras cosas a 'attentive' que es...
// un parámetro que define el Rol del siguiente revisor
const getNextRevisorData = async (petitionData, blueprint, updateData) => {

  // nextRevisorData es la data del siguiente Revisor.
  // Dependiendo del caso puede haber más de un usuario para ejecutar la revisión; por lo que es un array.
  let nextRevisorData = []

  // Caso 1 - Siguiente Revisor es Rol 6 (Administrador de Contrato)
  if (updateData && updateData.attentive && updateData.attentive === 6) {

    // Se obtiene los datos del Administrador de Contrato (Rodrigo Fernández)
    const contractAdmintratorData = await getContractAdministratorData()

    // Se llena la información de nextRevisorDarta usando la información de los usuarios que tienen Rol 6.
    contractAdmintratorData.forEach(user => {
      if(user.enabled && user.enabled != false) {
        nextRevisorData.push({name: user.name, email: user.email})
      }
    })

    // Caso 2 - Siguiente Revisor es Rol 7 (Supervisor)
  } else if (updateData && updateData.attentive && updateData.attentive === 7) {

    // Se obtiene el turno de la Solicitud.
    const deliverableSupervisorShift = petitionData.supervisorShift

    // Se obtiene la información del Supervisor o Supervisores del turno definido en el Levantamiento.
    const supervisorData = await getSupervisorData(deliverableSupervisorShift)

    // Se obtiene la información del Autor del Entregable.
    const blueprintAuthorData = await getUserData(blueprint.userId)

    // Se almacena el Rol del Autor del Entregable.
    const blueprintAuthorRole = blueprintAuthorData.role

    // Si el Rol del Autor es 7 (Supervisor)
    if (blueprintAuthorRole === 7) {
      // Sólo podrá haber 1 Revisor, que es el Autor del Entregable.
      // Por lo tanto en este caso le corresponde al Supervisor revisar un Entregable donde él es el Autor.
      nextRevisorData.push({name: blueprint.userName, email: blueprint.userEmail})

      // En cualquier otro caso (Si Rol del Autor no es 7)
      // Por lo tanto en este caso le corresponde al Supervisor revisar un Entregable done él no es el Autor.
    } else {

      // Puede haber más de 1 Supervisor si el turno tuviera más de 1 Supervisor.
      supervisorData.forEach(user => {
        if(user.enabled && user.enabled != false) {
          nextRevisorData.push({name: user.name, email: user.email})
        }
      })
    }

    // Caso 3 - Siguiente Revisor es Rol 8 (Proyectista)
  } else if (updateData && updateData.attentive && updateData.attentive === 8) {

    // Se almacena la información del Autor del Entregable.
    nextRevisorData.push({name: blueprint.userName, email: blueprint.userEmail})

    // Caso 4 - Siguiente Revisor es Rol 9 (Control Documental)
  } else if (updateData && updateData.attentive && updateData.attentive === 9) {

    // Se define el nombre y e-mail a usar para Control Documental.
    // Para Producción será 'controldoc72336@procure.cl'
    // Para Staging será 'cdpruebas@procure.cl'
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'www.prosite.cl' || window.location.hostname === 'procureterrenoweb.vercel.app') {
        nextRevisorData.push({name: 'Control Documental', email: 'controldoc72336@procure.cl'})
      } else {
        nextRevisorData.push({name: 'Control Documental', email: 'cdpruebas@procure.cl'})
      }
    } else {
      nextRevisorData.push({name: 'Control Documental', email: 'cdpruebas@procure.cl'})
    }

  } else {
    // No deberían haber más casos
  }

  return nextRevisorData

}

// Función para enviar emails de forma automática.
// user es el usuario conectado que ejecuta la acción.
// petitionID es el ID del la Solicitud/OT en Firestore.
// blueprint es el objeto con la información del entregable, que incluye información del Autor.
// updateData es un objeto que contiene datos del siguiente revisor ("attentive" Rol del siguiente revisor , bla, bla)
export const sendEmailDeliverableNextRevision = async (user, petitionID, blueprint, updateData) => {

  // Si attentive es 4 (Control Documental aprueba Documento para emitir a Cliente) o 10...
  // => Se detiene la ejecución del envío de email.
  if (updateData && updateData.attentive && (updateData.attentive === 4 || updateData.attentive === 10 )) {
    return
  }

  // Se llama a la colección mail de Firestore
  const collectionRef = collection(db, 'mail')

  if (user !== null) {

    // Constante que almacena la fecha en que se genera la solcitud
    const fechaCompleta = new Date()

    // Declaración de variables
    let emailHtml

    // Try Catch
    try {
      const newDoc = {} // Se genera un elemento vacío
      const addedDoc = await addDoc(collectionRef, newDoc) // Se agrega este elemento vacío a la colección mail
      const mailId = addedDoc.id // Se obtiene el id del elemento recién agregado

      const docRef = doc(collectionRef, mailId) // Se busca la referencia del elemento recién creado con su id

      const petitionData = await fetchPetitionById(petitionID) // Se busca la información de la Solicitud/OT

      const nextRevisorData = await getNextRevisorData(petitionData, blueprint, updateData) // Se define quien es el siguiente revisor.

      //const filteredNextRevisorData = nextRevisorData.filter(doc => doc.enabled != false)
      const nextRevisorName = nextRevisorData.map(data => data.name)
      const nextRevisorEmail = nextRevisorData.map(data => data.email)

      // Llamada al html del email con las constantes previamente indicadads
      emailHtml = getEmailTemplate(
        nextRevisorName,
        petitionData,
        blueprint,
        updateData
      )

      let sendTo = [...nextRevisorEmail]

      // Se agrega a lista de usuarios en copia al Supervisor(user.email) y usersOnCopy.
      let arrayCC = []

      // Se actualiza el elemento recién creado, cargando la información que debe llevar el email
      updateDoc(docRef, {
        to: sendTo,
        cc: arrayCC,
        date: fechaCompleta,
        deliverableId: blueprint.id,
        emailType: 'DeliverableNextRevisor',
        message: {
          subject: `Revisión de Entregable // OT ${petitionData.ot} // ${blueprint.id} // ${blueprint.clientCode}:`,
          html: emailHtml
        }
      })

      console.log('E-mail a Siguiente Revisor enviado con éxito.')
    } catch (error) {
      console.error('Error al enviar email de Siguiente Revisor de entregable:', error)
      throw error
    }
  }
}
