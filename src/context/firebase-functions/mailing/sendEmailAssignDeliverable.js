// ** Firebase Imports
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { db } from 'src/configs/firebase'
import { getEmailTemplate } from './assignDeliverableTemplate'
import { getData } from '../firestoreQuerys'

const moment = require('moment')

/**
 * Función para enviar emails de forma automática.
 * @param {Object} user - Usuario conectado que efectúa el envío de la solicitud.
 * @param {Object} ot - Información del Levantamiento (en Firebase es cada documento dentro de levantamientos).
 * @param {Object} draftman - Proyectista que selecciona el Supervisor para hacer ese entregable.
 * @param {Array.<Object>} codes - Array de objetos que se genera cuando se crean los códigos de entregables. clientCode es el codigo cliente y id es el codigo Procure.
 * @param {Array.<string>} usersOnCopy - Array con los e-mails de las personas que deben ir copiadas por defecto.
 */
export const sendEmailAssignDeliverable = async (user, ot, draftman, codes, usersOnCopy) => {

  const collectionRef = collection(db, 'mail') // Se llama a la colección mail de Firestore

  if (user !== null) {
    const fechaCompleta = new Date() // Constante que almacena la fecha en que se genera la solcitud

    // Declaración de variables

    let emailHtml

    // Try Catch
    try {
      const newDoc = {} // Se genera un elemento vacío
      const addedDoc = await addDoc(collectionRef, newDoc) // Se agrega este elemento vacío a la colección mail
      const mailId = addedDoc.id // Se obtiene el id del elemento recién agregado

      const docRef = doc(collectionRef, mailId) // Se busca la referencia del elemento recién creado con su id

      const draftmanData = await getData(draftman.userId) // Se busca la información del Proyectista mediante su ID.

      // Llamada al html del email con las constantes previamente indicadads
      emailHtml = getEmailTemplate(
        draftmanData.name,
        user.displayName,
        ot,
        codes
      )

      // e-mail de quien recibe este e-mail.
      let sendTo = draftmanData.email

      // Se agrega a lista de usuarios en copia al Supervisor(user.email) y usersOnCopy.
      let arrayCC = [user.email, ...usersOnCopy]

      // Se actualiza el elemento recién creado, cargando la información que debe llevar el email
      updateDoc(docRef, {
        to: sendTo,
        cc: arrayCC,
        date: fechaCompleta,
        deliverableId: codes.id,
        emailType: 'AssignDeliverable',
        message: {
          subject: `Entregable asignado // OT ${ot.ot} // ${codes.id} // ${codes.clientCode}:`,
          html: emailHtml
        }
      })

      console.log('E-mail a Autor enviado con éxito.')
    } catch (error) {
      console.error('Error al enviar email de asignación de entregable:', error)
      throw error
    }
  }
}
