/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Llamada a functions y admin de Firebase
const functions = require('firebase-functions')
const admin = require('firebase-admin')

//Llamada a Firestore
const firestore = require('@google-cloud/firestore')

//Llamada al 'client' administrador de Firestore
const client = new firestore.v1.FirestoreAdminClient()

// Llamada a template de e-mail:
const getEmailTemplate = require('./emailTemplate').getEmailTemplate

// Se inicializa el SDK admin de Firebase
admin.initializeApp()

const getSupervisorData = async shift => {
  // Se llama a la referencia de la colección 'users'
  const usersRef = admin.firestore().collection('users')

  try {
    // Se llama sólo al que cumple con la condición de que su name es igual al del supervisor de la solicitud
    const supervisorSnapshot = await usersRef.where('shift', 'array-contains', shift).where('role', '==', 7).get()

    if (supervisorSnapshot.empty) {
      console.log(`No se encontró ningún supervisor para el turno ${shift}`)

      return null
    } else {
      // Accede al UID de la solicitud encontrada
      const data = supervisorSnapshot.docs[0].data()
      const uid = data.id
      const name = data.name
      const email = data.email

      return { uid: uid, name: name, email: email }
    }
  } catch (error) {
    console.log('Error al buscar la solicitud: ', error)

    return null
  }
}

// * Función que revisa la base de datos cada 60 minutos
exports.checkDatabaseEveryOneHour = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('Chile/Continental')
  .onRun(async context => {
    const devolutionState = 0
    const requestsRef = admin.firestore().collection('solicitudes') // Se llama a la colección de datos 'solicitudes' en Firestore
    const requestsSnapshot = await requestsRef.where('state', '==', devolutionState).get() // Se llaman a los datos de la colección 'solicitudes' que están en estado 1 (en revisión por Solicitante)
    const requestsDocs = requestsSnapshot.docs // Se almacena en una constante todos los documentos que cumplen con la condición anterior

    // Se revisa cada uno de los documentos existentes en 'solicitudes'
    for (let i = 0; i < requestsDocs.length; i++) {
      const requestDoc = requestsDocs[i] // Se almacena en una constante sólo el documento actual [i]
      const requestUid = requestDoc.id // Se almacena el uid del documento en revisión

      const eventsRequestRef = requestsRef.doc(requestDoc.id).collection('events') // Se llama a la colección 'events' dentro del documento
      const eventsRequestSnapshot = await eventsRequestRef.orderBy('date', 'desc').limit(1).get() // Se llaman y ordenan los eventos por fecha y solo se toma el último evento existente
      const eventDocs = eventsRequestSnapshot.docs // Se almacena en una constante todos los eventos que cumplen con la condición anterior

      // Se revisan todos los 'events' dentro del documento
      for (let j = 0; j < eventDocs.length; j++) {
        const eventDoc = eventDocs[j] // Se almacena en una constante sólo el evento actual [j]
        const eventRequestData = eventDoc.data() // Se almacena en una constante todos los campos dentro del evento

        const eventCreationDate = eventRequestData.date.toDate() // Se almacena en una constante la fecha en que fue creado el evento

        const now = new Date() // Se almacena en una constante la fecha instantánea (ahora)

        // Si prevState es 2 (el usuario anterior es C.Opetor) && newState es 0 (el usuario actual es solicitante)
        if (eventRequestData.prevState === 2 && eventRequestData.newState === devolutionState) {
          // Si ha pasado más de 24 horas desde la fecha del evento
          if (now - eventCreationDate > 24 * 60 * 60 * 1000) {
            // Crea un nuevo evento con un UID automático
            const newEvent = {
              date: admin.firestore.Timestamp.fromDate(now), // Se almacena la fecha en que es revisado
              newState: 3, // El newState será 3 para que lo tenga que revisar el Planificador
              prevState: devolutionState, // El prevState es 0 porque debería haber sido revisado por el Solicitante
              user: 'admin.desarrollo@procure.cl', // Se usa el email del admin para que en el historial refleje que fue un cambio automatizado
              userName: 'admin' // Se usa "admin" para que en el historial refleje que fue un cambio automatizado
            }

            await eventsRequestRef.add(newEvent) // Se agrega el nuevo event

            await requestsRef.doc(requestUid).update({ state: newEvent.newState }) // Se actualiza el state de la solicitud

            // Se escribre en colección 'mail' el nuevo e-mail eviado de forma automática
            try {
              const requirementData = requestDoc.data() // Se almacenan todos los datos de la solicitud

              const newDoc = {} // Se genera un elemento vacío
              const emailsRef = admin.firestore().collection('mail') // Se llama a la colección de datos 'mail' en Firestore
              const newEmailRef = await emailsRef.add(newDoc) // Se agrega este elemento vacío a la colección mail
              const mailId = newEmailRef.id // Se obtiene el id del elemento recién agregado

              const usersRef = admin.firestore().collection('users') // Se llama a la referencia de la colección 'users'

              const reqContractOperatorName = requirementData.contop // Se almacena el nombre del Contract Operator de la solicitud
              const reqContractOperatorSnapshot = await usersRef.where('name', '==', reqContractOperatorName).get() // Se llama sólo al que cumple con la condición de que su name es igual al del contop del usuario que generó la solicitud
              const reqContractOperatorData = reqContractOperatorSnapshot.docs[0].data() // Se almacena en una constante los datos del Contract Operator
              const reqContractOperatorEmail = reqContractOperatorData.email // Se almacena el e-mail del Contract Operator

              const contractOwnerSnapshot = await usersRef.where('role', '==', 4).get() // Se llama sólo al que cumple con la condición de que su rol es 4 (Contract Owner)
              const contractOwnerData = contractOwnerSnapshot.docs[0].data() // Se almacena en una constante los datos del Contract Owner
              const contractOwnerEmail = contractOwnerData.email // Se almacena el e-mail del Contract Owner

              const plannerSnapshot = await usersRef.where('role', '==', 5).get() // Se llama sólo al que cumple con la condición de que su rol es 5 (Planificador)
              const plannerData = plannerSnapshot.docs[0].data() // Se almacena en una constante los datos del Planificador
              const plannerEmail = plannerData.email // Se almacena el e-mail del Planificador

              const admContratoSnapshot = await usersRef.where('role', '==', 6).get() // Se llama sólo al que cumple con la condición de que su rol es 6 (Administrador de Contrato)
              const admContratoData = admContratoSnapshot.docs[0].data() // Se almacena en una constante los datos del Administrador de Contrato
              const admContratoEmail = admContratoData.email // Se almacena el e-mail del Administrador de Contrato

              const fechaCompleta = now // Constante que almacena la fecha instantánea

              // Se almacenan las constantes a usar en el email
              const userName = requirementData.user

              const mainMessage = `Con fecha ${fechaCompleta.toLocaleDateString('es-CL', {
                timeZone: 'America/Santiago'
              })} a las ${fechaCompleta.toLocaleTimeString('es-CL', {
                timeZone: 'America/Santiago'
              })}, la revisión que estaba pendiente por su parte ha sido automáticamente aceptada dado que han pasado mas de 24 horas desde que su Contract Operator ${
                requirementData.contop
              } modificó la fecha del levantamiento`
              const requestNumber = requirementData.n_request
              const title = requirementData.title
              const engineering = requirementData.engineering ? 'Si' : 'No'
              const otProcure = requirementData.ot ? requirementData.ot : 'Por definir'
              const supervisor = 'Por definir'
              const start = requirementData.start.toDate().toLocaleDateString('es-CL')
              const end = requirementData.end ? requirementData.end.toDate().toLocaleDateString('es-CL') : 'Por definir'
              const plant = requirementData.plant
              const area = requirementData.area ? requirementData.area : 'No indicado'

              const functionalLocation =
                requirementData.fnlocation && requirementData.fnlocation !== ''
                  ? requirementData.fnlocation
                  : 'No indicado'
              const contractOperator = requirementData.contop
              const petitioner = requirementData.petitioner ? requirementData.petitioner : 'No indicado'
              const sapNumber = requirementData.sap && requirementData.sap !== '' ? requirementData.sap : 'No indicado'
              const operationalType = requirementData.type ? requirementData.type : 'No indicado'
              const machineDetention = requirementData.detention ? requirementData.detention : 'No indicado'
              const jobType = requirementData.objective
              const deliverable = requirementData.deliverable.join(', ')
              const receiver = requirementData.receiver.map(receiver => receiver.email).join(', ')
              const description = requirementData.description
              const lastMessage = ''

              // Llamada al html del email con las constantes previamente indicadads
              const emailHtml = getEmailTemplate(
                userName,
                mainMessage,
                requestNumber,
                title,
                engineering,
                otProcure,
                supervisor,
                start,
                end,
                plant,
                area,
                functionalLocation,
                contractOperator,
                petitioner,
                sapNumber,
                operationalType,
                machineDetention,
                jobType,
                deliverable,
                receiver,
                description,
                lastMessage
              )

              await emailsRef.doc(mailId).update({
                to: requirementData.userEmail,
                cc: [reqContractOperatorEmail, contractOwnerEmail, plannerEmail, admContratoEmail],
                date: fechaCompleta,
                req: requestUid,
                emailType: 'Over24h',
                message: {
                  subject: `Solicitud de levantamiento: N°${requirementData.n_request} - ${requirementData.title}`,
                  html: emailHtml
                }
              })
              console.log(`E-mail de actualizacion enviado con éxito.`)
            } catch (error) {
              console.error('Error al enviar email:', error)
              throw error
            }
          }
        }
      }
    }

    return null
  })

// * Función que revisa la base de datos todos los días a las 17:00
exports.sendInfoToSupervisorAt5PM = functions.pubsub
  .schedule('every day 17:00')
  .timeZone('Chile/Continental')
  .onRun(async context => {
    const now = new Date() // Se almacena la fecha instantánea
    now.toLocaleString('es-CL', { timeZone: 'Chile/Continental' })
    const today = new Date(now) // Se almacena la fecha de hoy, ajustando la hora a medianoche
    today.setHours(0, 0, 0, 0) // Establecer la hora a las 00:00:00
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000) // Se almacena la fecha de mañana, ajustando la fecha al día siguiente
    const afterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) // Se almacena la fecha de mañana, ajustando la fecha al día siguiente

    const requestsRef = admin.firestore().collection('solicitudes') // Se llama a la referencia de Solicitudes

    const requestsSnapshot = await requestsRef.where('start', '>=', tomorrow).where('start', '<', afterTomorrow).get() // Busca documentos cuya fecha de inicio sea hoy

    const requestsDocs = requestsSnapshot.docs.filter(doc => 'supervisorShift' in doc.data()).filter(doc => doc.data().state >= 1 && doc.data().state <= 7) // Se filtra requestDocs para llamar a aquellos documentos que tienen un campo 'supervisorShift' y que su estado sea 6 o 7 (aprobado por Procure, pero sin terminar)

    let supervisorArray = [] // Crea un array vacío para almacenar los supervisores

    // Itera sobre cada documento para encontrar los turnos de los Supervisores que tienen trabajos para hoy
    requestsDocs.forEach(doc => {
      const supervisor = doc.data().supervisorShift // Se almacena el nombre del Supervisor

      // Verifica si el supervisor ya existe en el array. Si no existe, lo añade.
      if (!supervisorArray.includes(supervisor)) {
        supervisorArray.push(supervisor)
      }
    })

    let todayWorks = [] // Array vacío que contendrá todos los trabajos de hoy

    // Se revisa para cada uno de los supervisores que tienen trabajos hoy (teóricamente solo debería haber 1 supervisor)
    for (let i = 0; i < supervisorArray.length; i++) {

      let supervisorTasks = [] // Array vacío que contendrá objetos, donde cada objeto contendrá el nombre del supervisor y las tareas que tiene para hoy

      // Se revisa cada uno de los documentos existentes en 'solicitudes'
      for (let j = 0; j < requestsDocs.length; j++) {
        const requestDoc = requestsDocs[j] // Se almacena el requerimiento j
        const requestDocData = requestDoc.data() // Se obtienen los datos del requerimiento j
        const requestSupervisor = requestDocData.supervisorShift // Se almacena el nombre del supervisor del levantamiento j

        // Si el nombre del supervisor del levantamiento j es igual al del array supervisorArray[i] se añadirá esta tarea al array
        if (supervisorArray[i] == requestSupervisor) {
          supervisorTasks.push(requestDocData)
        }
      }

      // Se define el objeto a almacenar, el cual contendrá el nombre del supervisor y las tareas que tiene este supervisor
      let supervisorWork = {
        supervisorShift: supervisorArray[i],
        tasks: supervisorTasks
      }

      // Añade el objeto al array todayWorks
      todayWorks.push(supervisorWork)

      // ** Empezamos a definir el e-mail

      // Se envía el email a cada uno de los supervisores que tienen levantamientos hoy, con una lista de los levantamientos respectictivos
      try {
        const newDoc = {} // Se genera un elemento vacío
        const emailsRef = admin.firestore().collection('mail') // Se llama a la colección de datos 'mail' en Firestore
        const newEmailRef = await emailsRef.add(newDoc) // Se agrega este elemento vacío a la colección mail
        const mailId = newEmailRef.id // Se obtiene el id del elemento recién agregado

        const usersRef = admin.firestore().collection('users') // Se llama a la referencia de la colección 'users'

        const supervisorSnapshot = await usersRef.where('shift', 'array-contains', supervisorWork.supervisorShift).where('role', '==', 7).get() // Se llama sólo al que cumple con la condición de que su name es igual al del supervisor de la solicitud
        const supervisorData = supervisorSnapshot.docs // Se almacena en una constante los datos del Supervisor
        const supervisorEmail = supervisorData.filter(doc => doc.data().enabled !== false).map(id => id.data().email) // Se almacena el e-mail del Supervisor
        const supervisorName = supervisorData.filter(doc => doc.data().enabled !== false).map(id => id.data().name).join(', ') // Se almacena el e-mail del Supervisor

        const drawmansSnapshot = await usersRef.where('shift', 'array-contains', supervisorWork.supervisorShift).where('role', '==', 8).get() // Se llama sólo al que cumple con la condición de que su rol es 8 (Proyectistas)
        const drawmansData = drawmansSnapshot.docs // Se almacena en una constante los datos de los Proyectistas
        const drawmansEmail = drawmansData.filter(doc => doc.data().enabled !== false).map(id => id.data().email).join(', ') // Se almacenan los emails de los Proyectistas

        const plannerSnapshot = await usersRef.where('role', '==', 5).get() // Se llama sólo al que cumple con la condición de que su rol es 5 (Planificador)
        const plannerData = plannerSnapshot.docs // Se almacena en una constante los datos del Planificador
        const plannerEmail = plannerData.filter(doc => doc.data().enabled !== false).map(id => id.data().email) // Se almacena el e-mail del Planificador

        const admContratoSnapshot = await usersRef.where('role', '==', 6).get() // Se llama sólo al que cumple con la condición de que su rol es 6 (Administrador de Contrato)
        const admContratoData = admContratoSnapshot.docs // Se almacena en una constante los datos del Administrador de Contrato
        const admContratoEmail = admContratoData.filter(doc => doc.data().enabled !== false).map(id => id.data().email) // Se almacena el e-mail del Administrador de Contrato

        // Si hay mas de 1 levantamiento se escribirá 'levantamientos agendados'
        let youHaveTasks = 'Levantamiento agendado'
        if (supervisorTasks.length > 1) {
          youHaveTasks = 'Levantamientos agendados'
        }

        const statesDefinition = {
          0: 'Cancelada',
          1: 'Reprogramado, en revisión de Autor',
          2: 'En revisión de Contract Operator',
          3: 'En revisión de Planificador',
          4: 'En revisión de Planificador',
          5: 'En revisión de Administrador de Contrato',
          6: 'Aprobada para inicio de Levantamiento',
          7: 'Levantamiento Iniciado',
          8: 'Levantamiento finalizado'
        }

        // Se define el mensaje html que contendrá, el cual será una lista con todas los levantamientos que tiene que hacer el actual Supervisor durante hoy
        const tasksHtml =
          '<ul>' +
          supervisorWork.tasks
            .map(
              (task, index) => `
        <li>
          Levantamiento ${index + 1}:
          <ul>
            <li>OT: ${task.ot ? task.ot : 'Por definir'}</li>
            <li>Título: ${task.title}</li>
            <li>Planta: ${task.plant}</li>
            <li>Solicitante: ${task.petitioner}</li>
            <li>Estado: ${statesDefinition[task.state]}</li>
          </ul>
        </li>
      `
            )
            .join('') +
          '</ul>'

        // Se actualiza el elemento recién creado, cargando la información que debe llevar el email
        await emailsRef.doc(mailId).update({
          to: [...supervisorEmail],
          cc: [...plannerEmail, ...admContratoEmail].concat(drawmansEmail),
          date: now,
          emailType: 'supervisorDailyTasks',
          message: {
            subject: `Resumen de mañana ${tomorrow.toLocaleDateString('es-CL')} - ${supervisorName}`,
            html: `
              <h2>Estimad@ ${supervisorName}:</h2>
              <p>Usted tiene ${supervisorTasks.length} ${youHaveTasks} para comenzar mañana. A continuación se presenta el detalle de cada una de ellos:</p>
                ${tasksHtml}
              <p>Para mayor información revise la solicitud en nuestra página web</p>
              <p>Saludos,<br><a href="https://www.prosite.cl/">Prosite</a></p>
              `
          }
        })
        console.log(`E-mail ${mailId} de tareas diarias al Supervisor enviado con éxito.`)
      } catch (error) {
        console.error('Error al enviar email:', error)
        throw error
      }
    }

    return null
  })

// * Función que revisa la base de datos todos los días a las 8AM y le avisa al Solicitante que debe limpiar el área donde se ejecutará el levantamiento
exports.cleanAreaWarning = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('Chile/Continental')
  .onRun(async context => {
    const now = new Date() // Se almacena la fecha instantánea
    now.toLocaleString('es-CL', { timeZone: 'Chile/Continental' })
    const today = new Date(now) // Se almacena la fecha de hoy, ajustando la hora a medianoche
    today.setHours(0, 0, 0, 0) // Establecer la hora a las 00:00:00
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000) // Se almacena la fecha de mañana, ajustando la fecha al día siguiente
    const afterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) // Se almacena la fecha de mañana, ajustando la fecha al día siguiente

    const requestsRef = admin.firestore().collection('solicitudes') // Se llama a la referencia de Solicitudes

    const requestsSnapshot = await requestsRef.where('start', '>=', tomorrow).where('start', '<', afterTomorrow).get() // Busca documentos cuya fecha de inicio sea mañana

    // Se revisa para cada uno de los supervisores que tienen trabajos hoy (teóricamente solo debería haber 1 supervisor)
    for (let i = 0; i < requestsSnapshot.docs.length; i++) {
      const requirementData = requestsSnapshot.docs[i].data()

      // ** Empezamos a definir el e-mail
      // Se envía el email a cada uno de los Solicitante que han solicitado un levantamiento para Mañana
      try {
        const newDoc = {} // Se genera un elemento vacío
        const emailsRef = admin.firestore().collection('mail') // Se llama a la colección de datos 'mail' en Firestore
        const newEmailRef = await emailsRef.add(newDoc) // Se agrega este elemento vacío a la colección mail
        const mailId = newEmailRef.id // Se obtiene el id del elemento recién agregado

        const usersRef = admin.firestore().collection('users') // Se llama a la referencia de la colección 'users'

        const reqContractOperatorName = requirementData.contop // Se almacena el nombre del Contract Operator de la solicitud
        const reqContractOperatorSnapshot = await usersRef.where('name', '==', reqContractOperatorName).get() // Se llama sólo al que cumple con la condición de que su name es igual al del contop del usuario que generó la solicitud
        const reqContractOperatorData = reqContractOperatorSnapshot.docs[0].data() // Se almacena en una constante los datos del Contract Operator
        const reqContractOperatorEmail = reqContractOperatorData.email // Se almacena el e-mail del Contract Operator

        const contractOwnerSnapshot = await usersRef.where('role', '==', 4).get() // Se llama sólo al que cumple con la condición de que su rol es 4 (Contract Owner)
        const contractOwnerData = contractOwnerSnapshot.docs[0].data() // Se almacena en una constante los datos del Contract Owner
        const contractOwnerEmail = contractOwnerData.email // Se almacena el e-mail del Contract Owner

        const petitionerFieldName = requirementData.petitioner
        const petitionerFieldSnapshot = await usersRef.where('name', '==', petitionerFieldName).get() // Se llama sólo al que cumple con la condición de que su name es igual al del Petitioner indicado en el formulario
        const petitionerFieldData = petitionerFieldSnapshot.docs[0].data() // Se almacena en una constante los datos del Petitioner
        const petitionerFieldEmail = petitionerFieldData.email // Se almacena el e-mail del Petitioner

        const plannerSnapshot = await usersRef.where('role', '==', 5).get() // Se llama sólo al que cumple con la condición de que su rol es 5 (Planificador)
        const plannerData = plannerSnapshot.docs[0].data() // Se almacena en una constante los datos del Planificador
        const plannerEmail = plannerData.email // Se almacena el e-mail del Planificador

        const admContratoSnapshot = await usersRef.where('role', '==', 6).get() // Se llama sólo al que cumple con la condición de que su rol es 6 (Administrador de Contrato)
        const admContratoData = admContratoSnapshot.docs[0].data() // Se almacena en una constante los datos del Administrador de Contrato
        const admContratoEmail = admContratoData.email // Se almacena el e-mail del Administrador de Contrato

        const supervisorData = requirementData.supervisorShift
          ? await getSupervisorData(requirementData.supervisorShift)
          : ''
        const supervisorEmail = supervisorData ? supervisorData.email : ''

        // Se almacenan las constantes a usar en el email
        const userName = requirementData.user

        const mainMessage = `Usted tiene un levantamiento agendado para el día de mañana ${requirementData.start
          .toDate()
          .toLocaleDateString(
            'es-CL'
          )}. <b>Se requiere que usted gestione la limpieza del lugar para que nuestro equipo ejecute su labor lo más rápido posible</b>`
        const requestNumber = requirementData.n_request
        const title = requirementData.title
        const engineering = requirementData.engineering ? 'Si' : 'No'
        const otProcure = requirementData.ot ? requirementData.ot : 'Por definir'
        const supervisor = requirementData.supervisor ? requirementData.supervisor : 'Por definir'
        const start = requirementData.start.toDate().toLocaleDateString('es-CL')
        const end = requirementData.end ? requirementData.end.toDate().toLocaleDateString('es-CL') : 'Por definir'
        const plant = requirementData.plant
        const area = requirementData.area ? requirementData.area : 'No indicado'

        const functionalLocation =
          requirementData.fnlocation && requirementData.fnlocation !== '' ? requirementData.fnlocation : 'No indicado'
        const contractOperator = requirementData.contop
        const petitioner = requirementData.petitioner ? requirementData.petitioner : 'No indicado'
        const sapNumber = requirementData.sap && requirementData.sap !== '' ? requirementData.sap : 'No indicado'
        const operationalType = requirementData.type ? requirementData.type : 'No indicado'
        const machineDetention = requirementData.detention ? requirementData.detention : 'No indicado'
        const jobType = requirementData.objective
        const deliverable = requirementData.deliverable.join(', ')
        const receiver = requirementData.receiver.map(receiver => receiver.email).join(', ')
        const description = requirementData.description
        const lastMessage = ''

        // Llamada al html del email con las constantes previamente indicadads
        const emailHtml = getEmailTemplate(
          userName,
          mainMessage,
          requestNumber,
          title,
          engineering,
          otProcure,
          supervisor,
          start,
          end,
          plant,
          area,
          functionalLocation,
          contractOperator,
          petitioner,
          sapNumber,
          operationalType,
          machineDetention,
          jobType,
          deliverable,
          receiver,
          description,
          lastMessage
        )

        // Se actualiza el elemento recién creado, cargando la información que debe llevar el email
        await emailsRef.doc(mailId).update({
          to: requirementData.userEmail,
          cc: [
            reqContractOperatorEmail,
            contractOwnerEmail,
            petitionerFieldEmail,
            plannerEmail,
            admContratoEmail,
            supervisorEmail
          ],
          date: now,
          emailType: 'clanAreaWarning',
          message: {
            subject: `Limpieza de Área para mañana ${tomorrow.toLocaleDateString(
              'es-CL'
            )} - Solicitud de levantamiento: N°${requirementData.n_request} - ${requirementData.title}`,
            html: emailHtml
          }
        })
        console.log('E-mail de aviso de limpieza enviado con éxito.')
      } catch (error) {
        console.error('Error al enviar email:', error)
        throw error
      }
    }

    return null
  })

// * Función para Guardar en un Bucket de Google Cloud la Base de Datos de Firestore todos los días a cierta hora
// Los datos serán almacenados en el bucket en un formato estándar usado en Google Cloud (metadatos)
exports.scheduledFirestoreExport = functions.pubsub
  .schedule('every day 21:00')
  .timeZone('Chile/Continental')
  .onRun(context => {
    const projectId = 'procureterrenoweb' //process.env.GCP_PROJECT
    const databaseName = client.databasePath(projectId, '(default)')

    return client
      .exportDocuments({
        name: databaseName,
        outputUriPrefix: 'gs://firestore-procureterrenoweb-backup',
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: []
      })
      .then(responses => {
        const response = responses[0]
        console.log(`Operation Name: ${response['name']}`)
      })
      .catch(err => {
        console.error('Error when trying to export:', err)
        throw new Error('Export operation failed')
      })
  })

// * Función TEST

// Función para calcular la diferencia en días entre dos fechas

// const calculateDaysToDeadline = deadlineTimestamp => {
//   const today = new Date()
//   today.setHours(0, 0, 0, 0) // Establecer la hora a las 00:00:00
//   const deadlineDate = new Date(deadlineTimestamp * 1000)
//   const diffTime = deadlineDate - today
//   //math.round() redondea hacia arriba el valor a un número entero
//   const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

//   return diffDays
// }

// Función que actualiza para c/u de las solicitudes los días faltantes para la fecha límite (entrega de Gabinete)
// exports.updateDaysToDeadlineOnSchedule = functions.pubsub
//   .schedule('every day 00:00')
//   .timeZone('Chile/Continental')
//   .onRun(async context => {
//     const db = admin.firestore()
//     const solicitudesRef = db.collection('solicitudes')

//     const snapshot = await solicitudesRef.get()
//     const updatePromises = []

//     snapshot.forEach(docSnapshot => {
//       const data = docSnapshot.data()
//       let deadlineTimestamp

//       if (data.deadline) {
//         deadlineTimestamp = data.deadline.seconds
//         const daysToDeadline = calculateDaysToDeadline(deadlineTimestamp)
//         // Preparar para actualizar el documento con los días hasta la fecha límite
//         updatePromises.push(docSnapshot.ref.update({ daysToDeadline: daysToDeadline }))
//       }

//       // } else {
//       //   // Si 'deadline' no existe, se establece a 21 días después de 'start'
//       //   // Convierte la marca de tiempo Unix 'data.start.seconds' a un objeto 'Date' de JavaScript
//       //   const startDate = new Date(data.start.seconds * 1000)
//       //   const deadlineDate = new Date(startDate)
//       //   deadlineDate.setDate(startDate.getDate() + 21)
//       //   // Convierte el objeto 'deadlineDate' a una marca de tiempo Unix (segundos desde el 1 de enero de 1970). math.floor() trunca el valor a un número entero
//       //   deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000)
//       //   // Preparar para actualizar el documento con el nuevo 'deadline'
//       //   updatePromises.push(
//       //     docSnapshot.ref.update({
//       //       deadline: admin.firestore.Timestamp.fromDate(deadlineDate)
//       //     })
//       //   )
//       // }



//     })

//     // Espera a que todas las operaciones de actualización se completen
//     await Promise.all(updatePromises)
//       .then(() => {
//         console.log('Todos los documentos han sido actualizados con éxito.')
//       })
//       .catch(error => {
//         console.error('Error al actualizar documentos:', error)
//       })
//   })

  // Firebase Function que está viendo cambios en el campo enabled de Firebase Firestore.
  // Específicamente en users/{usersid}/enabled
  // Si hay cambios de true a false -> se deshabilita un usuario
  // Lo que gatillará esta función
  exports.onUserStatusChange = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {

    const before = change.before.data()
    const after = change.after.data()
    const userId = context.params.userId

    // Verificar si el campo 'enabled' ha cambiado
    if (before.enabled !== after.enabled) {

      try {
        if (after.enabled === false) {
          await admin.auth().updateUser(userId, { disabled: true })
          console.log(`Usuario ${userId} deshabilitado.`)
        } else {
          await admin.auth().updateUser(userId, { disabled: false })
          console.log(`Usuario ${userId} habilitado.`)
        }
      } catch (error) {
        console.error(`Error actualizando el estado del usuario ${userId}:`, error)
      }
    }

    // Verificar si el campo 'name' ha cambiado.
    // Este se usará principalmente para la creación del usuario.
    if (before.name !== after.name) {


      // try-chatch para cambiar el nombre del usuario en Firebase Auth
      try {
        await admin.auth().updateUser(userId, { displayName: after.name })
        console.log(`Nombre del usuario ${userId} actualizado a ${after.name}.`)
      } catch (error) {
        console.error(`Error actualizando el nombre del usuario ${userId}:`, error)
      }


      // try-catch para cambiar el 'user' en cada una de las solicitudes solicitudes/{solicitudId}
      try {
        // Actualizar email en Firestore
        const solicitudesRef = admin.firestore().collection("solicitudes")

        // Obtener documentos que coinciden con el userId
        const querySnapshot = await solicitudesRef.where("uid", "==", userId).get()

        // Actualizar el campo "user" (nombre de quien ingresó la Solicitud) en los documentos encontrados
        const batch = admin.firestore().batch()
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { user: after.name })
        })

        // Ejecutar la actualización en lote
        await batch.commit()

        console.log("Email actualizado exitosamente en Solicitudes.")
      } catch (error) {
        console.error("Error al actualizar el email en Solicitudes:", error)
      }


      // try-catch para cambiar el 'petitioner' en cada una de las solicitudes solicitudes/{solicitudId}
      try {
        // Actualizar email en Firestore
        const solicitudesRef = admin.firestore().collection("solicitudes")

        // Obtener documentos que coinciden con el userId
        const querySnapshot = await solicitudesRef.where("petitioner", "==", before.name).get()

        // Actualizar el campo "petitioner"en los documentos encontrados
        const batch = admin.firestore().batch()
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { petitioner: after.name })
        })

        // Ejecutar la actualización en lote
        await batch.commit()

        console.log("Solicitante actualizado exitosamente en Solicitudes.")
      } catch (error) {
        console.error("Error al actualizar el Solicitante en Solicitudes:", error)
      }

    }

  })


  // Firebase Function que está viendo cambios en el campo Centro de Costos (costCenter) de Solicitudes
  // Específicamente en solicitudes/{solicitudid}/costCenter
  // Si hay cambios -> cambiará el valor de costCenter en todo los carguíos de horas
  // Los carguíos de horas están en users/{userId}/workedHours/{workedHoursId}/costCenter
  exports.onSolicitudChange = functions.firestore.document('solicitudes/{solicitudId}').onUpdate(async (change, context) => {

    const before = change.before.data()
    const after = change.after.data()
    const solicitudId = context.params.solicitudId

    // Verificar si el campo 'costCenter' ha cambiado.
    // Este se usará principalmente para la creación del usuario.
    if (before.costCenter !== after.costCenter) {

      // try-catch para cambiar el 'costCenter' en cada una de los carguios de horas users/{userId}/workedHours/{workedHoursId}/costCenter
      try {

        // snapShot de lo usuarios
        const usersRef = admin.firestore().collection('users')
        const usersSnapshot = await usersRef.get()

        // Inicalización de batch para actualizar por lote
        const batch = admin.firestore().batch()

        // Iterar sobre todos los usuarios
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id

          // Obtener referencia a la subcolección 'workedHours' de cada usuario
          const workedHoursRef = usersRef.doc(userId).collection('workedHours')
          const workedHoursSnapshot = await workedHoursRef.get()

          // Iterar sobre todos los documentos de 'workedHours' y verificar el campo 'ot.id'
          workedHoursSnapshot.forEach((workedHoursDoc) => {
              const workedHoursData = workedHoursDoc.data()

              if (workedHoursData.ot && workedHoursData.ot.id === solicitudId) {
                  const workedHoursDocRef = workedHoursRef.doc(workedHoursDoc.id)
                  batch.update(workedHoursDocRef, { costCenter: after.costCenter })
              }
          });
        }

        // Ejecutar la actualización en lote
        await batch.commit()

        console.log("CostCenter actualizado exitosamente en workedHours.")
      } catch (error) {
        console.error("Error al actualizar el costCenter en workedHours: ", error)
      }

    }

  })

// * Creación de usuarios con el Admin SDK.
//
// Reemplaza al flujo del navegador, que tenía tres problemas graves:
//   1. Usaba createUserWithEmailAndPassword del SDK de CLIENTE, así que la
//      sesión pasaba a ser la del usuario recién creado y el administrador
//      quedaba desconectado de su propia cuenta.
//   2. El documento en 'users' se escribía DESPUÉS, y solo si el administrador
//      lograba reautenticarse. Si no lo hacía, la cuenta quedaba creada en
//      Authentication y sin documento: entraba al sistema sin rol y sin menú,
//      y el correo ya no se podía reutilizar. Es la causa de las incidencias
//      Gabinete 6 y Solicitudes 1.
//   3. La contraseña inicial era la palabra 'password' para todos.
//
// Aquí las dos escrituras ocurren en el servidor y, si la segunda falla, se
// borra la cuenta recién creada para no dejar usuarios a medio crear.
// maxInstances acotado a proposito: esta funcion la llama una persona desde un
// formulario, nunca en volumen. Con un tope bajo, un bucle de reintentos se
// convierte en un error visible en vez de una factura.
exports.createUserAsAdmin = functions
  .runWith({ maxInstances: 10, timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {
  // Debe haber sesión.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión.')
  }

  // Y quien llama debe ser administrador. Esto se comprueba en el SERVIDOR:
  // la comprobación del navegador no protege nada, porque cualquiera puede
  // llamar a la función directamente.
  const solicitante = await admin.firestore().collection('users').doc(context.auth.uid).get()
  const datosSolicitante = solicitante.exists ? solicitante.data() : null
  // Se exige rol 1 Y estar habilitado: al deshabilitar a alguien se escribe
  // enabled:false y recién después se deshabilita su cuenta de Authentication,
  // y un token ya emitido sigue sirviendo hasta que expira. Sin esta segunda
  // condición, un administrador recién deshabilitado podría seguir creando
  // usuarios durante esa ventana.
  const deshabilitado = datosSolicitante && datosSolicitante.enabled !== undefined && !datosSolicitante.enabled
  if (!datosSolicitante || datosSolicitante.role !== 1 || deshabilitado) {
    throw new functions.https.HttpsError('permission-denied', 'Solo un administrador habilitado puede crear usuarios.')
  }

  const { email, name, role } = data || {}

  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Falta el correo.')
  }
  if (!name || typeof name !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Falta el nombre.')
  }
  // El rol tiene que ser un NÚMERO: acl.js compara con === y un "1" de texto
  // no calza con ningún rol conocido.
  if (typeof role !== 'number' || !Number.isInteger(role) || role < 1 || role > 12) {
    throw new functions.https.HttpsError('invalid-argument', 'El rol debe ser un número entre 1 y 12.')
  }

  // El dominio del correo se valida contra el catálogo 'domain/allowableDomains'.
  // Antes esto vivía solo en el formulario, o sea no protegía nada: quien
  // llamara a la función directamente podía dar de alta cualquier correo.
  // Falla CERRADA a proposito: si el catalogo no existe o viene vacio, no se
  // crea a nadie. Aceptar cualquier dominio ante la duda es el mismo error que
  // tenia el ACL, que ante un rol desconocido concedia el permiso pedido.
  const dominios = await admin.firestore().collection('domain').doc('allowableDomains').get()
  const permitidos = dominios.exists ? Object.keys(dominios.data() || {}).map(d => d.toLowerCase()) : []
  if (!permitidos.length) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No hay dominios autorizados configurados (domain/allowableDomains). No se puede crear usuarios.'
    )
  }
  const dominioCorreo = String(email).split('@')[1]
  if (!dominioCorreo || !permitidos.includes(dominioCorreo.toLowerCase())) {
    throw new functions.https.HttpsError('invalid-argument', 'El dominio del correo no está autorizado.')
  }

  // Contraseña aleatoria que nadie llega a ver: la persona entra por el correo
  // de restablecimiento.
  const password = require('crypto').randomBytes(24).toString('base64url')

  let nuevoUsuario
  try {
    nuevoUsuario = await admin.auth().createUser({ email, password, displayName: name })
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'El usuario ya se encuentra registrado.')
    }
    throw new functions.https.HttpsError('internal', 'No se pudo crear la cuenta: ' + error.message)
  }

  try {
    // OJO: `rut` ya NO entra en `completedProfile`. Si entrara, quitar la
    // obligacion en el formulario no serviria de nada: la cuenta se crearia y
    // despues el guard mandaria a la persona a "completar perfil" sin dejarla
    // usar el sitio. Las dos cosas tenian que salir juntas.
    const { firstName, fatherLastName, motherLastName, rut, phone, plant, engineering, shift, company, opshift, subtype } = data

    // Misma regla de completedProfile que usaba createUserInDatabase.
    let completedProfile = false
    if (company === 'Procure') {
      completedProfile = true
    } else if (company === 'MEL') {
      if (role === 2) {
        completedProfile = !!email && !!name && !!opshift && !!phone && !!plant && !!role && !!shift
      } else if (role === 3 || role === 4) {
        completedProfile = !!email && !!name && !!phone && !!plant && !!role
      } else {
        completedProfile = !!email && !!name && !!opshift && !!phone && !!plant && !!role && !!shift
      }
    }

    await admin.firestore().collection('users').doc(nuevoUsuario.uid).set({
      name,
      firstName: firstName || '',
      fatherLastName: fatherLastName || '',
      motherLastName: motherLastName || '',
      email,
      rut: rut || '',
      phone: phone ? String(phone).replace(/\s/g, '') : '',
      company: company || '',
      role,
      ...(plant && { plant }),
      ...(engineering && { engineering }),
      ...(shift && { shift }),
      ...(opshift && { opshift }),
      ...(subtype && { subtype }),
      completedProfile,
      enabled: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid
    })
  } catch (error) {
    // Si el documento no se pudo escribir, se deshace la cuenta: sin esto queda
    // el usuario huérfano que es justamente el bug que se está arreglando.
    try {
      await admin.auth().deleteUser(nuevoUsuario.uid)
    } catch (errorRollback) {
      // Que el rollback falle es peor que el fallo original: queda una cuenta
      // en Authentication sin documento y con el correo ocupado. Se registra
      // con el uid para poder limpiarla a mano, y se le dice al cliente, en
      // vez de tragarse el error.
      console.error('ROLLBACK FALLIDO — cuenta huérfana en Authentication', {
        uid: nuevoUsuario.uid,
        email,
        errorOriginal: error.message,
        errorRollback: errorRollback.message
      })
      throw new functions.https.HttpsError(
        'internal',
        'El usuario quedó a medio crear y no se pudo deshacer. Avisa a soporte con este correo: ' + email
      )
    }
    throw new functions.https.HttpsError('internal', 'No se pudo guardar el usuario: ' + error.message)
  }

  return { uid: nuevoUsuario.uid, email }
})
