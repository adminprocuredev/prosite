// ** Firebase Imports
import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore'
import { db } from 'src/configs/firebase'


// ** Imports Propios
import { getUnixTime } from 'date-fns'
import { useEffect, useState } from 'react'
import { solicitudValidator } from '../form-validation/helperSolicitudValidator'
import { getData, getPlantInitals } from './firestoreQuerys'
import { sendEmailDeliverableNextRevision } from './mailing/sendEmailDeliverableNextRevision'
import { sendEmailWhenReviewDocs } from './mailing/sendEmailWhenReviewDocs'

const moment = require('moment')

const newDoc = async (values, userParam) => {
  const {
    title,
    start,
    plant,
    area,
    contop,
    fnlocation,
    petitioner,
    type,
    detention,
    sap,
    objective,
    deliverable,
    receiver,
    description,
    //* ot,
    end,
    urgency,
    mcDescription,
    costCenter,
    files
  } = values

  const { uid, displayName: user, email: userEmail, role: userRole, engineering } = userParam

  try {
    // 'SolicitudValidator' valida que los datos vienen en "values" cumplan con los campos requeridos.
    solicitudValidator(values, userParam.role)
    // Incrementamos el valor del contador 'otCounter' en la base de datos Firestore y devuelve el nuevo valor.
    const ot = await increaseAndGetNewOTValue()

    // Calculamos el valor de 'deadline' sumando 21 días a 'start'.
    // const deadline = addDays(new Date(start), 21)

    // Teniendo como referencia la fecha 'deadline' calculamos el valor de cuantos días faltan (ó han pasado).
    // const daysToDeadline = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))

    const docRef = await addDoc(collection(db, 'solicitudes'), {
      title,
      start,
      plant,
      area,
      contop,
      fnlocation,
      petitioner,
      type,
      detention,
      sap,
      objective,
      deliverable,
      receiver,
      description,
      uid,
      user,
      userEmail,
      userRole,
      // deadline,
      // daysToDeadline,
      costCenter,
      date: Timestamp.fromDate(new Date()),
      engineering,
      ...(urgency && { urgency }),
      ...(ot && { ot }),
      ...(end && { end }),
      ...(mcDescription && { mcDescription })
    })

    // Modificamos el inicio de semana a partir del dia martes y finaliza los días lunes.
    const adjustedDate = moment(values.start).subtract(1, 'day')
    // Utilizamos la función isoWeek() para obtener el número de la semana, puede variar de 1 a 53 en un año determinado.
    const week = moment(adjustedDate.toDate()).isoWeek()

    // Establecemos los campos adicionales de la solicitud.
    await updateDoc(docRef, {
      ...newDoc,
      // Si el usuario que hace la solicitud es Supervisor ó Planificador se genera con estado inicial 6, en caso contrario state se crea con el valor del role del usuario.
      state: userParam.role === 7 || userParam.role === 5 ? 6 : userParam.role,
      // Establecemos el turno del supervisor de acuerdo a la fecha de inicio y se intercalan entre semana considerando que el valor de 'week' sea un valor par o impar.
      supervisorShift: week % 2 === 0 ? 'A' : 'B'
    })

    // Se envía email a quienes corresponda
    // await sendEmailNewPetition(userParam, values, docRef.id, requestNumber)

    console.log('Nueva solicitud creada con éxito.')

    return { id: docRef.id, ot: ot }
  } catch (error) {
    console.error('Error al crear la nueva solicitud:', error)
    throw new Error('Error al crear la nueva solicitud')
  }
}

// Obtenemos un documento de la colección 'solicitudes' y el usuario asociado, con el rol previo del usuario decrementado en 1.
const getDocumentAndUser = async id => {
  const ref = doc(db, 'solicitudes', id)
  const querySnapshot = await getDoc(ref)
  const docSnapshot = querySnapshot.data()
  const userRef = doc(db, 'users', docSnapshot.uid)
  const userQuerySnapshot = await getDoc(userRef)
  const previousRole = userQuerySnapshot.data().role - 1

  return { ref, docSnapshot, previousRole }
}

// Obtienemos el evento más reciente asociado a una solicitud específica.
const getLatestEvent = async id => {
  const eventQuery = query(collection(db, `solicitudes/${id}/events`), orderBy('date', 'desc'), limit(1))
  const eventQuerySnapshot = await getDocs(eventQuery)
  const latestEvent = eventQuerySnapshot.docs.length > 0 ? eventQuerySnapshot.docs[0].data() : false

  return latestEvent
}

// Establecemos el turno del supervisor para una fecha dada, comenzando la semana en martes.
const setSupervisorShift = async date => {
  const adjustedDate = moment(date.toDate()).subtract(1, 'day') // Restar un día para iniciar la semana en martes.
  const week = moment(adjustedDate.toDate()).isoWeek()
  const supervisorShift = week % 2 === 0 ? 'A' : 'B'

  return supervisorShift
}

//  Incrementamos el valor del contador 'otCounter' en la base de datos Firestore y devuelve el nuevo valor.
async function increaseAndGetNewOTValue() {
  const counterRef = doc(db, 'counters', 'otCounter')

  try {
    // Utilizamos una transacción para garantizar la consistencia de los datos.
    const newOTValue = await runTransaction(db, async transaction => {
      const counterSnapshot = await transaction.get(counterRef)

      const newCounter = counterSnapshot.exists ? counterSnapshot.data().counter + 1 : 1

      transaction.set(counterRef, { counter: newCounter })

      return newCounter
    })

    return newOTValue
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

/**
 * Procesa los cambios en los campos de un documento comparándolos con los campos actuales.
 * Si un campo ha cambiado o es nuevo, lo guarda y realiza ajustes adicionales si es necesario.
 */
const processFieldChanges = (incomingFields, currentDoc) => {
  const changedFields = {}

  const addDays = (date, days) => {
    if (!(date instanceof Date)) {
      date = new Date(date)
    }
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)

    return newDate.getTime()
  }

  for (const key in incomingFields) {
    let value = incomingFields[key]
    let currentFieldValue = currentDoc[key]

    if (key === 'start' || key === 'end' || key === 'deadline') {
      value = moment(value.toDate()).toDate().getTime()
      currentFieldValue = currentFieldValue && currentFieldValue.toDate().getTime()
    }

    if (!currentFieldValue || value !== currentFieldValue) {
      // Verifica si el valor ha cambiado o es nuevo y lo guarda
      if (key === 'start' || key === 'end' || key === 'deadline') {
        value = value && Timestamp.fromDate(moment(value).toDate())
        currentFieldValue = currentFieldValue && Timestamp.fromDate(moment(currentFieldValue).toDate())

        // Verificar si se actualizó 'start' para actualizar 'deadline'
        // if (key === 'start') {
        //   const newDeadline = new Date(addDays(value.toDate(), 21))

        //   changedFields.deadline = newDeadline

        //   const today = new Date()
        //   const millisecondsInDay = 1000 * 60 * 60 * 24

        //   const daysToDeadline = Math.round((newDeadline - today) / millisecondsInDay)

        //   changedFields.daysToDeadline = daysToDeadline
        // }
      }
      changedFields[key] = value
      incomingFields[key] = currentFieldValue || 'none'
    }
  }

  return { changedFields, incomingFields }
}

// La función 'updateDocumentAndAddEvent' Actualiza un documento con los campos cambiados y agrega un registro en la subcolección de eventos.
const updateDocumentAndAddEvent = async (ref, changedFields, userParam, prevDoc, requesterId, id, prevState) => {
  if (Object.keys(changedFields).length > 0) {
    const { email, displayName, role } = userParam

    let newEvent = {
      prevState,
      newState: changedFields.state,
      user: email,
      userName: displayName,
      userRole: role,
      date: Timestamp.fromDate(new Date()),
      ...(prevDoc && Object.keys(prevDoc).length !== 0 ? { prevDoc } : {}),
      ...(changedFields.uprisingInvestedHours && { uprisingInvestedHours: changedFields.uprisingInvestedHours }),
      ...(changedFields.draftmen && { draftmen: changedFields.draftmen })
    }

    await updateDoc(ref, changedFields).then(() => {
      addDoc(collection(db, 'solicitudes', id, 'events'), newEvent)
    })

    await sendEmailWhenReviewDocs(userParam, newEvent.prevState, newEvent.newState, requesterId, id)
  } else {
    console.log('No se escribió ningún documento')
  }
}

const addComment = async (id, comment, userParam) => {
  let newEvent = {
    user: userParam.email,
    userName: userParam.displayName,
    userRole: userParam.role,
    date: Timestamp.fromDate(new Date()),
    comment
  }
  await addDoc(collection(db, 'solicitudes', id, 'events'), newEvent)
    .then(() => {
      console.log('Comentario agregado')
    })
    .catch(err => {
      console.error(err)
    })
}

function getNextState(role, approves, latestEvent, userRole) {
  const state = {
    returned: 1,
    petitioner: 2,
    contOperator: 3,
    contOwner: 4,
    planner: 5,
    contAdmin: 6,
    supervisor: 7,
    draftsman: 8,
    rejected: 0
  }

  // Cambiar la función para que reciba el docSnapshot y compare la fecha original de start con la que estoy modificándolo ahora
  // Si quiero cambiarla por la fecha original, no se devolverá al autor, sino que se va por el caso x default.
  const dateHasChanged = latestEvent && 'prevDoc' in latestEvent && 'start' in latestEvent.prevDoc
  const approveWithChanges = typeof approves === 'object' || typeof approves === 'string'
  const approvedByPlanner = latestEvent.prevState === state.planner
  const emergencyBySupervisor = userRole === 7
  const returned = latestEvent.newState === state.returned
  const changingStartDate = typeof approves === 'object' && 'start' in approves
  const modifiedBySameRole = userRole === role
  const requestMadeByPlanner = userRole === 5
  const requestMadeByMelPetitioner = userRole === 2 && (!latestEvent || (latestEvent && latestEvent.newState === 2))

  const requestMadeByMelPetitionerAndApprovedByContractAdmin =
    userRole === 2 && latestEvent.newState === 3 && latestEvent.userRole === 6

  const rules = new Map([
    [
      2,
      [
        // Si es devuelta x Procure al solicitante y éste acepta, pasa a supervisor (revisada por admin contrato 5 --> 1 --> 6)
        // No se usó dateHasChanged porque el cambio podría haber pasado en el penúltimo evento
        // {
        //   condition: approves && approvedByPlanner && returned && !approveWithChanges,
        //   newState: state.contAdmin,
        //   log: 'Devuelto por Adm Contrato Procure'
        // },

        // // Si es devuelta al Solicitante por Contract Operator y Solicitante acepta (2/3 --> 1 --> 3)
        // {
        //   condition: approves && dateHasChanged && returned && !approveWithChanges,
        //   newState: state.contOperator,
        //   log: 'Devuelto por Cont Operator/Cont Owner MEL'
        // }

        // Para cualquier caso en que Solicitante apruebe o modifique, quedará en state === 2
        // Por lo tanto si la solicitud estaba en state===6, deberá volver a ser aprobada por el Administrador de Contrato.
        {
          condition: approves,
          newState: state.petitioner,
          log: 'Devuelto por Cont Operator/Cont Owner MEL'
        }
      ]
    ],
    [
      3,
      [
        // Contract Operator aprueba una solicitud hecha por Planificador posterior a cerrar el elvantamiento (8 --> 8)
        {
          condition: approves && requestMadeByPlanner,
          newState: state.draftsman,
          plannerPetitionApprovedByContop: true,
          log: 'Emergencia aprobada por Contract Operator'
        },
        // Contract Operator aprueba una solicitud de emergencia hecha por Supervisor posterior a cerrar el elvantamiento (8 --> 8)
        {
          condition: approves && emergencyBySupervisor,
          newState: state.draftsman,
          emergencyApprovedByContop: true,
          log: 'Emergencia aprobada por Contract Operator'
        },
        // Si modifica la solicitud hecha por el Solicitante, se devuelve al solicitante (2 --> 1)
        // {
        //   condition: approves && approveWithChanges && !returned && !modifiedBySameRole,
        //   newState: state.returned,
        //   log: 'Devuelto por Contract Operator hacia Solcitante'
        // },

        // Si aprueba y viene con estado 5 lo pasa a 6 (5 --> 1 --> 6)
        // {
        //   condition: approves && approvedByPlanner && returned && !approveWithChanges,
        //   newState: state.contAdmin,
        //   log: 'Devuelto por Adm Contrato Procure'
        // },

        // // Si vuelve a modificar una devolución, pasa al planificador (revisada por contract owner) (3 --> 1 --> 3)
        // {
        //   condition: approves && !approvedByPlanner && returned,
        //   newState: state.contOperator,
        //   log: 'Devuelto por Cont Owner MEL'
        // }

        // Si modifica algo que estaba en state === 2, deberá pasar a state === 3
        {
          condition: approves && state === 2 && state < 7,
          newState: state.contOperator,
          log: 'Modificado por Contract Operator'
        },

        // Si modifica algo que no estaba en state === 2, deberá pasar a state === 3
        {
          condition: approves && !state === 2 && state < 7,
          newState: state.contOperator,
          log: 'Modificado por Contract Operator'
        }
      ]
    ],
    [
      4,
      [
        // Si modifica, se le devuelve al autor (3 --> 1)
        // {
        //   condition: approveWithChanges ,
        //   newState: state.returned,
        //   log: 'Aprobado por Planificador'
        // }
      ]
    ],
    [
      5,
      [
        // Si el estado del levantamiento es mayor o igual a 8, se mantiene en ese estado.
        {
          condition: approves && state >= 8,
          newState: latestEvent.newState,
          log: 'Modificado por planificador. Se mantiene en el mismo estado.'
        },
        // Si el planificador modifica cualquier campo (6 --> 6)
        {
          condition: approves && approveWithChanges && requestMadeByPlanner,
          newState: state.contAdmin,
          log: 'Modificado por planificador'
        },
        {
          condition: approves && !emergencyBySupervisor && latestEvent.newState >= state.contAdmin,
          newState: latestEvent.newState,
          log: 'Modificado sin cambio de fecha por Planificador1'
        },
        // Planificador acepta cambios de fecha hecho por contract owner (6 --> 6)
        {
          condition: approves && !emergencyBySupervisor && requestMadeByPlanner && modifiedBySameRole,
          newState: state.contAdmin,
          log: 'Planificador acepta cambios de fecha aplicado por contract owner'
        },
        // Planificador modifica solicitud hecha por Supervisor (any --> any)
        {
          condition: approves && emergencyBySupervisor,
          newState: latestEvent.newState ? latestEvent.newState : state.contAdmin,
          log: 'Modificado sin cambiar de estado por Planificador'
        },
        // Planificador acepta Solicitud previamente aceptada por Administrador de Contrato en nombre del Contract Operator
        // (3 --> 6)
        {
          condition: approves && approveWithChanges && requestMadeByMelPetitionerAndApprovedByContractAdmin,
          newState: state.contAdmin,
          log:
            'Aprobado por Planificación: Solicitud Ingresada por MEL y aprobada por Administrador de Contrato en nombre de Contract Operator'
        }
      ]
    ],
    [
      6,
      [
        // Planificador modifica, Adm Contrato no modifica
        // {
        //   condition: approves && !approveWithChanges && dateHasChanged && !requestMadeByMelPetitioner,
        //   newState: state.returned,
        //   log: 'Aprobada con cambio de fecha'
        // },

        // Planificador no modifica, Adm Contrato sí
        // {
        //   condition: approves && approveWithChanges && !dateHasChanged && !requestMadeByMelPetitioner,
        //   newState: state.returned,
        //   log: 'Modificado por adm contrato'
        // },

        // Planificador modifica, Adm Contrato sí modifica
        // {
        //   condition: approves && approveWithChanges && dateHasChanged && !requestMadeByMelPetitioner,
        //   newState: state.returned,
        //   log: 'Modificado por adm contrato y planificador'
        // },

        // Solicitud Modificada por Administrador de Contrato
        {
          condition: approves && !requestMadeByMelPetitioner && latestEvent.newState !== 5,
          newState: latestEvent.newState ? latestEvent.newState : state.contAdmin,
          log: 'Solicitud ingresada por MEL es aprobada por Administrador de Contrato'
        },

        // Solicitud fue ingresada por un Solicitante de MEL
        {
          condition: approves && requestMadeByMelPetitioner,
          newState: state.contOperator,
          log: 'Solicitud ingresada por MEL es aprobada por Administrador de Contrato'
        }
      ]
    ],
    [
      7,
      [
        // Supervisor agrega horas pasando estado de la solicitud a 8
        // Si horas cambia a objeto, en vez de checkear por string se deberá checkear que el objeto tenga {start, end y hours}
        {
          condition: approves && approves.hasOwnProperty('uprisingInvestedHours'),
          newState: state.draftsman,
          log: 'Horas agregadas por Supervisor'
        },
        {
          condition: approves && approves.hasOwnProperty('start'),
          newState: state.contAdmin,
          log: 'fecha modificada por Supervisor'
        },
        {
          condition: approves && approves.hasOwnProperty('gabineteDraftmen'),
          newState: state.draftsman,
          log: 'Proyectistas agregados por Supervisor'
        },
        // Supervisor pausa el levantamiento y retrocede a adm contrato
        {
          condition: approves && approves.hasOwnProperty('pendingReschedule') && approves.pendingReschedule === true,
          newState: state.contAdmin,
          log: 'Pausado por Supervisor'
        }

        // Caso para cuando supervisor cambia fecha al momento de asignar proyectistas o antes (6 --> 1)
      ]
    ]
  ])

  const roleRules = rules.get(role)

  if (!roleRules) {
    console.log('No se encontraron reglas para el rol')

    return role
  }

  for (const rule of roleRules) {
    if (rule.condition) {
      console.log(rule.log)

      return rule.newState
    }
  }

  return role
}

const updateDocs = async (id, approves, userParam) => {
  let canceled = approves.cancelReason ? true : false
  const hasFieldModifications = typeof approves === 'object' && !Array.isArray(approves)
  const { ref, docSnapshot } = await getDocumentAndUser(id)
  const { start: docStartDate, ot: hasOT, state: prevState, userRole } = docSnapshot
  const latestEvent = await getLatestEvent(id)
  const rejected = 0
  const role = userParam.role
  let newState = !canceled ? getNextState(role, approves, latestEvent, userRole) : rejected
  let processedFields = { incomingFields: {}, changedFields: {} }

  // const addOT = role === 5 && approves && !hasOT
  // const ot = addOT ? await increaseAndGetNewOTValue() : null

  const addShift = newState === 6
  const supervisorShift = addShift ? await setSupervisorShift(docStartDate) : null

  if (hasFieldModifications) {
    processedFields = processFieldChanges(approves, docSnapshot)
  }
  let { incomingFields, changedFields } = processedFields
  const prevDoc = { ...incomingFields }

  if (approves) {
    changedFields = {
      //  ...(addOT && ot ? { ot } : {}),
      ...(addShift && supervisorShift ? { supervisorShift } : {}),
      ...changedFields
    }
  }

  if (userRole === 5 && newState === 8) {
    changedFields.plannerPetitionApprovedByContop = prevState === 8 ? true : false
  }

  if (userRole === 7 && newState === 8) {
    changedFields.emergencyApprovedByContop = prevState === 8 ? true : false
  }

  changedFields.state = newState

  updateDocumentAndAddEvent(ref, changedFields, userParam, prevDoc, docSnapshot.uid, id, prevState)
}

// ** Modifica otros campos Usuarios
const updateUserPhone = async (id, obj) => {
  const ref = doc(db, 'users', id)
  await updateDoc(ref, { phone: obj.replace(/\s/g, '') })
}

// ** Actualiza la información del usuario en Firestore
const updateUserData = async (userId, data) => {
  const ref = doc(db, 'users', userId)
  await updateDoc(ref, data)
}

// ** Bloquear o desbloquear un día en la base de datos
const blockDayInDatabase = async (date, cause = '') => {
  try {
    const convertDate = moment(date).startOf().toDate()
    const dateUnix = getUnixTime(convertDate)
    const docRef = doc(collection(db, 'diasBloqueados'), dateUnix.toString())

    const docSnap = await getDoc(docRef)
    const isBlocked = docSnap.exists() ? docSnap.data().blocked : false

    if (isBlocked) {
      await setDoc(docRef, { blocked: false })
      console.log('Día desbloqueado')
    } else if (cause && cause.length > 0) {
      await setDoc(docRef, { blocked: true, cause })
      console.log('Día bloqueado')
    } else {
      console.log('Para bloquear la fecha debes proporcionar un motivo')
    }
  } catch (error) {
    console.error('Error al bloquear/desbloquear el día:', error)
    throw new Error('Error al bloquear/desbloquear el día')
  }
}

/**
 * Función para calcular el % de Avance de un Entregable según condiciones.
 * @param {Object} blueprint - Objeto con datos del Entregable.
 * @returns {Number} - Valor del porcentaje de avance del entregable (0 a 100).
 */
const getBlueprintPercent = (blueprint) => {

  // Desestructuración de blueprint.
  const { milestone } = blueprint

  const blueprintPercents = [
    {
      condition: () => milestone === 0,
      percent: 5,
    },
    {
      condition: () => milestone === 1,
      percent: 20,
    },
    {
      condition: () => milestone === 2,
      percent: 50,
    },
    {
      condition: () => milestone === 3,
      percent: 60,
    },
    {
      condition: () => milestone === 4,
      percent: 80,
    },
    {
      condition: () => milestone === 5,
      percent: 100,
    },
  ]

  const result = blueprintPercents.find(({ condition }) => condition())

  return result ? result.percent : 0
}

// Maneja la obtención de datos de planos asociados a una solicitud y devuelve un array de datos y una función para actualizarlos.
const useBlueprints = id => {
  const [data, setData] = useState([]) // Estado que guarda los documentos de blueprints y sus revisiones
  const [projectistData, setProjectistData] = useState({}) // Estado para la agrupación de datos por usuario y tipo de documento
  const [otPercent, setOtPercent] = useState(null) // Estado para el porcentaje calculado
  const [otReadyToFinish, setOtReadyToFinish] = useState(null) // Estado que evalúa si la OT se puede finalizar o no.

  useEffect(() => {
    if (!id) return undefined

    const unsubscribeAll = [] // Almacenará todas las desuscripciones

    const blueprintsRef = collection(db, `solicitudes/${id}/blueprints`)

    // Suscribirse a cambios en la subcolección 'blueprints'
    const unsubscribeBlueprints = onSnapshot(blueprintsRef, docSnapshot => {
      if (docSnapshot.docs.length === 0) {
        setData([])
        setProjectistData({})
        setOtPercent(null) // Si no hay documentos, el porcentaje es nulo

        return
      }

      let allDocs = []
      let projectistDataTemp = {}
      let totalPercent = 0 // Acumulador de porcentajes
      let totalDocuments = 0 // Contador de documentos válidos (sin eliminar)
      let totalBlueprintsCompleted = 0

      docSnapshot.docs.forEach(doc => {
        const docData = doc.data()
        const { userName, id, deleted, blueprintCompleted } = docData

        // Actualización de agrupación de datos
        if (!deleted) {
          totalDocuments++ // Aumenta el contador de documentos válidos
          totalPercent += getBlueprintPercent(docData) || 0 // Suma el valor de 'blueprintPercent', o 0 si no existe
          totalBlueprintsCompleted = blueprintCompleted ? totalBlueprintsCompleted + 1 : totalBlueprintsCompleted

          // Agrupación de datos por usuario y tipo de documento
          if (userName && id) {
            const documentType = `${id.split('-')[1]}-${id.split('-')[2]}` // Ej: "500-PL"
            if (!projectistDataTemp[userName]) {
              projectistDataTemp[userName] = {}
            }
            if (!projectistDataTemp[userName][documentType]) {
              projectistDataTemp[userName][documentType] = 0
            }
            projectistDataTemp[userName][documentType] += 1
          }
        }
        const revisionsRef = collection(doc.ref, 'revisions')

        // Suscribirse a cambios en 'revisions'
        const unsubscribeRevisions = onSnapshot(query(revisionsRef, orderBy('date', 'desc')), revisionSnapshot => {
          const revisions = revisionSnapshot.docs.map(revDoc => ({
            id: revDoc.id,
            ...revDoc.data()
          }))

          const newDoc = { id: doc.id, ...docData, revisions }
          const docIndex = allDocs.findIndex(existingDoc => existingDoc.id === doc.id)
          if (docIndex === -1) {
            allDocs.push(newDoc)
          } else {
            allDocs[docIndex] = newDoc
          }

          // Actualizar el estado solo cuando se han procesado todos los documentos.
          if (allDocs.length === docSnapshot.docs.length) {
            setData([...allDocs])
            setProjectistData(projectistDataTemp)
          }
        })

        unsubscribeAll.push(unsubscribeRevisions)
      })

      // Calcular 'otPercent' solo si hay documentos válidos
      /* Después de procesar todos los documentos, se calcula el promedio de los valores de blueprintPercent (sumatoria de los porcentajes dividida por la cantidad de documentos). */
      const calculatedOtPercent = totalDocuments > 0 ? Number.isInteger(totalPercent / totalDocuments)
            ? totalPercent / totalDocuments
            : (totalPercent / totalDocuments).toFixed(1)
          : null
      setOtPercent(calculatedOtPercent)

      // Se define si la OT está lista para finalizar.
      setOtReadyToFinish(totalBlueprintsCompleted === totalDocuments)
    })

    unsubscribeAll.push(unsubscribeBlueprints)

    // Limpieza: desuscribirse de todos los listeners cuando el componente se desmonta o el ID cambia
    return () => unsubscribeAll.forEach(unsubscribe => unsubscribe())
  }, [id])

  return [data, projectistData, otPercent, otReadyToFinish, setData]
}

function formatCount(count) {
  return String(count).padStart(3, '0')
}

const addDescription = async (petitionID, blueprint, description) => {
  const ref = doc(db, 'solicitudes', petitionID, 'blueprints', blueprint)
  await updateDoc(ref, { description })
}

// getLatestRevision() obtiene la última revisión de un plano en la base de datos
const getLatestRevision = async (petitionID, blueprintID) => {
  // Obtiene la referencia a la colección de revisiones del entregable (blueprint) en la base de datos
  const revisionsRef = collection(db, 'solicitudes', petitionID, 'blueprints', blueprintID, 'revisions')

  // Obtiene un snapshot de la última revisión del plano, ordenada por fecha en orden descendente
  const revisionsSnapshot = await getDocs(query(revisionsRef, orderBy('date', 'desc'), limit(1)))

  // Si no hay revisiones, devuelve null
  if (revisionsSnapshot.docs && revisionsSnapshot.docs.length === 0) {
    return null
  }

  // Obtiene los datos de la última revisión
  const latestRevision = revisionsSnapshot.docs[0].data()

  // Devuelve los datos de la última revisión
  return latestRevision
}

/**
 * Función para obtener la siguiente revisión letra o número de un entregable.
 * Si es Iniciado, la siguiente revisión es A.
 * Si es una letra, la siguiente revisión es la siguiente letra. En el caso de Z cambia a AA.
 * Si es un número, la siguiente revisión es el siguiente número.
 * @param {string} revision - Revisión en que se encuentra el entregable.
 * @returns {string} - Retorna la siguiente revisión.
 */
function getNextChar(revision) {

  if (revision === "Iniciado" || revision === "iniciado") {
      return "A"
  }

  // Caso en que el string es un número
  if (/^[0-9]+$/.test(revision)) {

    return (parseInt(revision, 10) + 1).toString()

  // Caso en que el string es una letra o secuencia de letras en mayúscula
  } else if (/^[A-Z]+$/.test(revision)) {

    let result = ""
    let carry = 1 // Representa el incremento

    for (let i = revision.length - 1; i >= 0; i--) {
      const charCode = revision.charCodeAt(i) + carry

      if (charCode > 90) { // 90 es el código ASCII de 'Z'
        result = "A" + result
        carry = 1 // Hay acarreo
      } else {
        result = String.fromCharCode(charCode) + result
        carry = 0 // No hay acarreo
      }
    }

    // Si hay un acarreo restante, añadimos 'A' al principio
    if (carry > 0) {
      result = "A" + result
    }

    return result

  } else {
    throw new Error("La Revisión debe ser un número, una letra mayúscula o la palabra 'Iniciado'.")
  }
}

/**
 * Función para obtener la letra con la que debe ser creada la carpeta de la revisión en Google Drive.
 * @param {Object} blueprint - Objeto con los datos del entregable/plano.
 * @returns {string} - Retorna la letra de la siguiente revisión con la que debe ser creada una carpeta.
 */
const getNextRevisionFolderName = (blueprint) => {

  // Desestructuración de blueprint.
  const {
    revision,
    id,
    approvedByClient,
    approvedByDocumentaryControl,
    attentive,
    sentByDesigner,
    sentBySupervisor,
    blueprintCompleted,
    resumeBlueprint
  } = blueprint

  // Se obtiene la letra o número de la siguiente revisión.
  const nextChar = getNextChar(revision)

  // Se define si la revisión actual es numérica.
  const isNumeric = !isNaN(revision)

  // Se define si está siendo revisado por el Cliente.
  const beingReviewedByClient = attentive === 4

  // Se define si la revisión actual es "Iniciado".
  const isInitialRevision = revision === "Iniciado"

  // Se define si la revisión actual es "A".
  const isRevA = revision === "A"

  // Se define Booleano para cuando se encuentra en Rev >= B.
  const isRevisionAtLeastB = !isRevA && !isInitialRevision

  // Booleano que define si el código Procure del entregable es un M3D (Memoria de Cálculo).
  const isM3D = id.split('-')[2] === 'M3D'

  const sentByAuthor = sentByDesigner || sentBySupervisor

  // Se define Patrón de reglas con condiciones y acciones para definir la siguiente revisión de la carpeta.
  const actions = [
    {
      // Caso cuando se Reanuda un Entregable
      condition: () => {
          const result = resumeBlueprint
          if (result) console.log("Condición 0.")

          return result
      },
      action: () => nextChar
    },
    {
      // Si la revisión es "Iniciado" y el entregable es un M3D (Memoria de Cálculo).
      condition: () => {
          const result = isInitialRevision && isM3D
          if (result) console.log("Condición 1.")

          return result
      },
      action: () => '0'
    },
    {
      // Si la revisión es "Iniciado" y el entregable no es un M3D (Memoria de Cálculo).
      condition: () => {
          const result = isInitialRevision && !isM3D
          if (result) console.log("Condición 2.")

          return result
      },
      action: () => 'A'
    },
    {
      // Si la revisión es Rev. A y ha sido Aprobada por Control Documental.
      condition: () => {
          const result = isRevA && approvedByDocumentaryControl
          if (result) console.log("Condición 3.")

          return result
      },
      action: () => nextChar
    },
    {
      // Si la revisión es Rev. A y no ha sido Aprobada por Control Documental.
      condition: () => {
          const result = isRevA && !approvedByDocumentaryControl
          if (result) console.log("Condición 4.")

          return result
      },
      action: () => revision
    },
    {
      // Si la revisión está en manos del Cliente.
      condition: () => {
          const result = beingReviewedByClient
          if (result) console.log("Condición 5.")

          return result
      },
      action: () => revision
    },
    {
      condition: () => {
          const result = !beingReviewedByClient && isRevisionAtLeastB && !isNumeric && approvedByClient
          if (result) console.log("Condición 6.")

          return result
      },
      action: () => '0'
    },
    {
      condition: () => {
          const result = !beingReviewedByClient && isRevisionAtLeastB && approvedByDocumentaryControl && !approvedByClient && !sentByAuthor
          if (result) console.log("Condición 7.")

          return result
      },
      action: () => nextChar
    },
    {
      condition: () => {
          const result = !beingReviewedByClient && isRevisionAtLeastB && approvedByDocumentaryControl && !approvedByClient && !sentByAuthor
          if (result) console.log("Condición 8")

          return result
      },
      action: () => nextChar
    },
    {
      condition: () => {
          const result = isRevisionAtLeastB && isNumeric && approvedByClient && !blueprintCompleted
          if (result) console.log("Condición 9.")

          return result
      },
      action: () => nextChar
    },
    {
      condition: () => {
          const result = !beingReviewedByClient && isRevisionAtLeastB && isNumeric && approvedByClient
          if (result) console.log("Condición 10.")

          return result
      },
      action: () => revision
    }
  ]

  // Se ejecuta la definición de la siguiente revisión.
  const matchedAction = actions.find(({ condition }) => condition())

  // Se retorna la siguiente revisión en caso de que concuerde con alguna de las condiciones definidas.
  // Si no, se retorna la revisión actual.
  return matchedAction ? matchedAction.action() : revision
}

const getMilestone = (newRevision, blueprint, approves, isRevisionAtLeast0) => {

  // Desestructuración de blueprint.
  const { id, lastTransmittal, milestone, attentive } = blueprint

  const isM3D = id.split('-')[2] === 'M3D'

  let newMilestone = milestone

  if (!isM3D) {
    if (milestone === 0 && newRevision === "A") {
      newMilestone = 1
    } else if (milestone === 1 && attentive === 9 && approves) {
      newMilestone = 2
    } else if (milestone === 2 && newRevision === "B") {
      newMilestone = 3
    } else if (milestone === 3 && lastTransmittal) {
      newMilestone = 4
    } else if (milestone === 4 && attentive === 4 && isRevisionAtLeast0) {
      newMilestone = 5
    }
  } else {
    if (milestone === 0 && newRevision === "0") {
      newMilestone = 4
    } else if (milestone === 4 && attentive === 4 && isRevisionAtLeast0) {
      newMilestone = 5
    }
  }

  return newMilestone

}

// getNextRevision calcula la próxima revisión basándose en una serie de condiciones
const getNextRevision = async (approves, latestRevision, authUser, blueprint, remarks) => {

  // Desestructuración de authUser
  const { email, displayName, uid } = authUser

  // Desestructuración de blueprint
  const {
    revision,
    description,
    storageBlueprints,
    approvedByClient,
    attentive,
    lastTransmittal
  } = blueprint

  // Se define si la revisión actual es numérica.
  const isNumeric = !isNaN(revision)
  const letterToNumber = approves && !isNumeric && approvedByClient && lastTransmittal
  const newRevision = letterToNumber ? "0" : getNextRevisionFolderName(blueprint)

  // Crea el objeto de la próxima revisión con los datos proporcionados y la nueva revisión calculada
  const nextRevision = {
    prevRevision: latestRevision && Object.keys(latestRevision).length === 0 ? latestRevision.newRevision : revision,
    newRevision,
    description,
    storageBlueprints:
      approves && storageBlueprints.length === 2
        ? storageBlueprints[storageBlueprints.length - 1]
        : approves && (remarks === false || !remarks)
        ? storageBlueprints[0]
        : storageBlueprints[storageBlueprints.length - 1],
    userEmail: email,
    userName: displayName,
    userId: uid,
    date: Timestamp.fromDate(new Date()),
    remarks: remarks || 'Sin observaciones',
    attentive: attentive
  }

  return nextRevision
}

/**
 * Función que actualiza el entregable en la base de datos.
 * @param {string} petitionID - ID de la OT.
 * @param {Object} blueprint - Objeto con los datos del Entregable.
 * @param {boolean} approves - Booleano que define si el usuario Aprobó o Rechazo el Entreagable.
 * @param {Object} authUser - Objeto con los datos del usuario que realiza la acción.
 * @param {string|boolean} remarks - String con texto que indica comentarios. Si no existen comentarios es Booleano.
 */
const updateBlueprint = async (petitionID, blueprint, approves, authUser, remarks) => {

  // Desestructuración de blueprint.
  const {
    id, // ID del Entregable (Código Procure)
    revision, // Revisión en que se encuentra el Entregable.
    approvedByContractAdmin, // Booleano que define si se encuentra aprobado por el Administrador de Contrato o no.
    approvedBySupervisor, // Booleano que define si se encuentra aprobado por el Supervisor o no.
    approvedByDocumentaryControl, // Booleano que define si se encuentra aprobado por Control Documental o no.
    approvedByClient, // Booleano que define si se encuentra aprobado por el Cliente o no.
    resumeBlueprint, // Creo que es un Booleano que indica cuando hay que reabrir un entregable.
    blueprintCompleted, // Booleano que define si se encuentra terminado o no.
    userId, // ID del Autor del entregable.
    storageBlueprints, // Array con Objeto que contiene Nombre y Link del Entregable en Google Drive.
    sentByDesigner, // Entregable creado por un Proyectista.
    sentBySupervisor, // Entregable creado por un Supervisor.
    attentive, // Rol del usuario que tiene en su poder el Entregable. Caso especial: attentive = 4, cuando Control Documental toma acción por el Cliente.
    sentToClient // Booleano que define si el Entregable fue enviado al Cliente mediante el Transmittal.
  } = blueprint

  console.log(petitionID)
  console.log(blueprint)
  console.log(authUser)

  // Desestructuración de authUser.
  const { uid, role } = authUser

  // Referencia al documento del entregable (blueprint) en la base de datos.
  const blueprintRef = doc(db, 'solicitudes', petitionID, 'blueprints', id)

  // Se define si la revisión actual es numérica.
  const isNumeric = !isNaN(revision)

  // Obtiene la última revisión del plano
  const latestRevision = await getLatestRevision(petitionID, id)

  // Calcula la próxima revisión del plano
  const nextRevision = await getNextRevision(approves, latestRevision, authUser, blueprint, remarks)

  // Comprueba varias condiciones sobre el plano
  const isInitialRevision = revision === 'Iniciado'
  const isRevA = revision === 'A'
  const isRevisionAtLeastB = !isInitialRevision && !isRevA
  const isRevisionAtLeast0 = isNumeric

  const newMilestone = getMilestone(nextRevision.newRevision, blueprint, approves, isRevisionAtLeast0)

  // Se actualiza el hito en los datos que se almacenan en "revisions".
  nextRevision.milestone = newMilestone

  // Inicializa los datos que se van a actualizar
  let updateData = {
    revision: nextRevision.newRevision,
    milestone: newMilestone,
    // sentByDesigner: false,
    // approvedByContractAdmin: approvedByContractAdmin || false,
    // approvedBySupervisor: approvedBySupervisor || false,
    // approvedByDocumentaryControl: approvedByDocumentaryControl || false,
    sentTime: Timestamp.fromDate(new Date())
  }

  const authorData = await getData(userId)
  const authorRole = authorData.role

  // Define las acciones a realizar en función del rol del usuario.
  const handleRole6 = () => {

    return {
      ...updateData,
      sentByDesigner: approves,
      attentive: approves ? 9 : 7,
      sentBySupervisor: approves,
      approvedByContractAdmin: approves,
      storageBlueprints: approves ? storageBlueprints : null
    }
  }

  // TODO: Mejorar la legibilidad de esta parte.
  const handleRole7 = () => {
    if (userId === uid) {

      return {
        ...updateData,
        resumeBlueprint: false,
        checkedByClient: false,
        sentBySupervisor: approves,
        approvedBySupervisor: approves,
        approvedByContractAdmin: false,
        approvedByDocumentaryControl: false,
        approvedByClient: false,
        attentive: isInitialRevision ? 9 : isRevA ? (approvedByDocumentaryControl ? 6 : 9) : (approvedByContractAdmin ? 9 : 6)
      }
    } else {

      return {
        ...updateData,
        sentByDesigner: approves,
        attentive: approves ? 9 : 8,
        approvedBySupervisor: approves,
        storageBlueprints: approves ? storageBlueprints : null
      }
    }
  }

  // TODO: Mejorar la legibilidad de esta parte.
  const handleRole8 = () => {

    return {
      ...updateData,
      resumeBlueprint: false,
      checkedByClient: false,
      sentByDesigner: approves,
      approvedBySupervisor: false,
      approvedByContractAdmin: false,
      approvedByDocumentaryControl: false,
      approvedByClient: false,
      attentive: isInitialRevision ? 9 : isRevA ? (approvedByDocumentaryControl ? 7 : 9) : 7
    }
  }

  // TODO: Mejorar la legibilidad de esta parte.
  const handleRole9 = () => {

    console.log(attentive)

    // Este debería ser el Caso cuando el Cliente responde (No para reabrir un Entregable).
    if (sentToClient && attentive === 4) {

      console.log("CASO 1")

      return {
        ...updateData,
        approvedByClient: blueprintCompleted ? false : approves,
        sentByDesigner: false,
        sentBySupervisor: false,
        checkedByClient: true,
        sentToClient: false,
        storageBlueprints: isRevisionAtLeast0 && approves && !remarks ? storageBlueprints : null,
        storageHlcDocuments: null,
        blueprintCompleted: isRevisionAtLeast0 && approves && !remarks ? true : false,
        attentive: isRevisionAtLeast0 && approves && !remarks ? 10 : authorRole,
        remarks: remarks ? remarks : false
      }

    // Este debería ser el Caso cuando el Cliente reabre un Entregable.
    } else if (attentive === 10) {

      console.log("CASO 2")

      return {
        ...updateData,
        attentive: authorRole,
        blueprintCompleted: false,
        approvedByClient: false,
        approvedByDocumentaryControl: false,
        approvedBySupervisor: false,
        approvedByContractAdmin: false,
        storageBlueprints: null,
        sentByDesigner: false,
        remarks: remarks ? remarks : false,
        resumeBlueprint: true
      }

    // Este debería ser el caso por defecto (Ni respuesta de cliente ni reabrir Entregable).
    } else {

      console.log("CASO 3")

      return {
        ...updateData,
        approvedByDocumentaryControl: approves,
        attentive: !approves ? authorRole : isRevisionAtLeastB ? 4 : authorRole,
        sentByDesigner: approves && isRevisionAtLeastB && sentByDesigner,
        sentBySupervisor: approves && isRevisionAtLeastB && sentBySupervisor,
        remarks: remarks ? true : false,
        storageBlueprints: approves && isRevisionAtLeastB ? [storageBlueprints[0]] : null,
      }
    }
  }

  // Mapeo de roles y sus respectivas acciones.
  const roleActions = {
    6: handleRole6,
    7: handleRole7,
    8: handleRole8,
    9: handleRole9
  }

  // Aplica la acción correspondiente al rol del usuario
  updateData = roleActions[role] ? await roleActions[role]() : updateData

  // Actualiza el plano en la base de datos
  await updateDoc(blueprintRef, updateData)

  // Se registra la nueva acción tomada por el usuario dentro de la colecction 'revisions' del Entregable.
  await addDoc(collection(db, 'solicitudes', petitionID, 'blueprints', id, 'revisions'), nextRevision)

  // Función para enviar emails de forma automática.
  // authUser es el usuario conectado que ejecuta la acción.
  // petitionID es el ID del la Solicitud/OT en Firestore.
  // blueprint es el objeto con la información del entregable
  // updateData es un objeto que contiene datos del siguiente revisor ("attentive" Rol del siguiente revisor , bla, bla)
  await sendEmailDeliverableNextRevision(authUser, petitionID, blueprint, updateData)
}

const generateTransmittalCounter = async currentPetition => {
  try {
    // Referencia al documento de contador para la combinación específica dentro de la subcolección transmittals
    const counterRef = doc(db, 'counters', 'transmittalCounter')

    // Incrementa el contador dentro de una transacción
    const incrementedCount = await runTransaction(db, async transaction => {
      const counterSnapshot = await transaction.get(counterRef)

      let currentCount
      if (!counterSnapshot.exists() || !counterSnapshot.data().counter) {
        currentCount = formatCount(1)
        transaction.set(counterRef, { counter: currentCount }, { merge: true })
      } else {
        currentCount = formatCount(Number(counterSnapshot.data().counter) + 1)
        transaction.update(counterRef, { counter: currentCount })
      }

      return currentCount // Retorna el nuevo contador para usarlo fuera de la transacción
    })

    const idProject = '21286'

    // Ahora, añade este contador al final de tu newCode
    const newCode = `${idProject}-000-TT-${incrementedCount}`

    return newCode
  } catch (error) {
    console.error('Error al generar Transmittal:', error)
    throw new Error('Error al generar Transmittal')
  }
}

/**
 * Función para actualizar campos del blueprint y agregar un nuevo document en "revisions" cuando se genera un Transmittal.
 * @param {string} newCode
 * @param {Array} selected
 * @param {Object} currentPetition
 * @param {Object} authUser
 */
const updateSelectedDocuments = async (newCode, selected, currentPetition, authUser) => {

  try {

    for (const id of selected) {
      const docRef = doc(db, 'solicitudes', currentPetition.id, 'blueprints', id[0])
      const isM3D = id[0].split('-')[2] === 'M3D'

      await updateDoc(docRef, {
        attentive: 4,
        milestone: id[1].milestone === 5 ? 5 : 4,
        sentToClient: true,
        lastTransmittal: newCode,
        ...(isM3D && { approvedByClient: true })
      })

      const nextRevision = {
        prevRevision: id[1].revision,
        newRevision: id[1].revision,
        milestone: id[1].milestone === 5 ? 5 : 4,
        description: id[1].description,
        storageBlueprints: id[1].storageBlueprints[0],
        userEmail: authUser.email,
        userName: authUser.displayName,
        userId: authUser.uid,
        date: Timestamp.fromDate(new Date()),
        remarks: 'Transmittal generado',
        lastTransmittal: newCode,
        storageHlcDocuments: id[1].storageHlcDocuments ? id[1].storageHlcDocuments[0] : null,
        attentive: 4
      }

      // Añade la nueva revisión a la subcolección de revisiones del entregable (blueprint)
      await addDoc(collection(db, 'solicitudes', currentPetition.id, 'blueprints', id[0], 'revisions'), nextRevision)
    }
  } catch (error) {
    console.error('Error al actualizar documentos seleccionados:', error)
    throw new Error('Error al actualizar documentos seleccionados')
  }
}

// Finaliza una solicitud, actualizando su estado y detalles relacionados con la OT. Se basa en la información de la solicitud actual y el usuario autenticado.
const finishPetition = async (currentPetition, authUser) => {
  try {
    // console.log('currentPetition:', currentPetition)
    const petitionRef = doc(db, 'solicitudes', currentPetition.id)
    const petitionDoc = await getDoc(petitionRef)

    // console.log('petitionDoc:', petitionDoc.data())

    const otFinished = petitionDoc.data().otFinished
    const otReadyToFinish = petitionDoc.data().otReadyToFinish

    if (!otFinished && otReadyToFinish) {
      await updateDoc(petitionRef, {
        otFinished: true,
        otFinishedBy: { userName: authUser.displayName, userId: authUser.uid, userEmail: authUser.email },
        otFinishedDate: new Date(),
        state: 9
      })
    } else {
      await updateDoc(petitionRef, {
        otFinished: false,
        otFinishedBy: { userName: authUser.displayName, userId: authUser.uid, userEmail: authUser.email },
        otFinishedDate: new Date(),
        state: 8
      })
    }
  } catch (error) {
    console.error('Error al finalizar la solicitud:', error)
    throw new Error('Error al finalizar la solicitud')
  }
}

const fetchWeekHoursByType = async (userId, weekStart, weekEnd) => {
  try {
    const userDocRef = doc(db, 'users', userId)
    const weekHoursRef = collection(userDocRef, 'workedHours')

    const q = query(
      weekHoursRef,
      where('day', '>=', weekStart),
      where('day', '<=', weekEnd),
      where('deleted', '==', false)
    )
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      return { error: 'No records found for this week.' }
    }
    const weekHours = []
    querySnapshot.forEach(doc => {
      weekHours.push({ id: doc.id, ...doc.data() })
    })

    return weekHours
  } catch (error) {
    console.error('Error fetching week hours:', error)

    return { error: 'Failed to fetch week hours.' }
  }
}

const createWeekHoursByType = async (userParams, creations) => {
  const batch = writeBatch(db)
  const userRef = userParams.uid || userParams.id
  try {
    const userDocRef = doc(db, 'users', userRef)
    const weekHoursRef = collection(userDocRef, 'workedHours')

    creations.forEach(change => {
      // console.log('change: ', change)
      const newDocRef = doc(weekHoursRef)
      const dayDate = new Date(change.day)
      dayDate.setHours(0, 0, 0, 0)

      const docData = {
        created: Timestamp.fromDate(new Date()),
        day: Timestamp.fromDate(dayDate),
        deleted: false,
        hours: change.newValue,
        hoursSubType:
          change.hoursType === 'ISC'
            ? change.hoursType
            : change.hoursType === 'Vacaciones'
            ? 'VAC'
            : userParams.role === 6 || userParams.role === 7 || userParams.role === 8 || userParams.role === 11
            ? 'OPP'
            : 'OPE',
        hoursType: change.hoursType,
        physicalLocation: '5.1 MEL - NPI&CHO-PRODUCTION CHO',
        user: {
          role: change.userRole,
          shift: change.shift
        },
        //shift: change.shift,
        rowId: change.rowId,
        column: change.field,
        ...(change.hoursType === 'OT'
          ? {
              ot: {
                id: change.otID,
                number: change.otNumber,
                type: change.otType
              }
            }
          : {}),
        ...(change.plant && { plant: change.plant }),
        ...(change.costCenter && { costCenter: change.costCenter })
      }

      batch.set(newDocRef, docData) // Añade la operación de creación al batch
    })

    await batch.commit() // Ejecuta todas las operaciones en el batch
    console.log('All documents successfully created')

    return { success: true }
  } catch (error) {
    console.error('Error creating week hours with batch:', error)

    return { success: false, error: error.message }
  }
}

const updateWeekHoursByType = async (userId, updates) => {
  const batch = writeBatch(db)

  try {
    updates.forEach(update => {
      const docRef = doc(db, 'users', userId, 'workedHours', update.dayDocId)
      batch.update(docRef, { hours: update.newValue })
    })

    await batch.commit()
    console.log('All updates successfully committed')

    return { success: true }
  } catch (error) {
    console.error('Error updating week hours:', error)

    return { success: false, error: error.message }
  }
}

const deleteWeekHoursByType = async (userId, dayDocIds) => {
  const batch = writeBatch(db)

  try {
    dayDocIds.forEach(docId => {
      const docRef = doc(db, 'users', userId, 'workedHours', docId)
      batch.update(docRef, { deleted: true })
    })

    await batch.commit()
    console.log('All documents successfully marked as deleted')

    return { success: true }
  } catch (error) {
    console.error('Error deleting week hours:', error)

    return { success: false, error: error.message }
  }
}

const fetchSolicitudes = async (authUser, otType) => {
  const solicitudesRef = collection(db, 'solicitudes')
  let queryRef = null

  if (authUser.role === 7 || authUser.role === 8) {
    // Filtrar por shift si el usuario tiene uno o dos turnos.
    if (otType === 'Gabinete') {
      queryRef = query(
        solicitudesRef,
        where('state', '==', 8),
        where('supervisorShift', 'in', authUser.shift),
        orderBy('ot')
      )
    } else if (otType === 'Levantamiento') {
      queryRef = query(
        solicitudesRef,
        where('state', '>=', 6),
        where('state', '<=', 8),
        where('supervisorShift', 'in', authUser.shift),
        orderBy('ot')
      )
    }
  } else if (authUser.role === 1 || (authUser.role >= 5 && authUser.role <= 12)) {
    // Usuarios con roles específicos pueden ver todas las solicitudes mayores al estado 6.
    if (otType === 'Gabinete') {
      queryRef = query(solicitudesRef, where('state', '==', 8), orderBy('ot'))
    } else if (otType === 'Levantamiento') {
      queryRef = query(solicitudesRef, where('state', '>=', 6), where('state', '<=', 8), orderBy('ot'))
    }
  }

  try {
    const querySnapshot = await getDocs(queryRef)

    const solicitudes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ot: doc.data().ot,
      plant: doc.data().plant,
      area: doc.data().area,
      costCenter: doc.data().costCenter,
      supervisorShift: doc.data().supervisorShift || []
    }))

    return solicitudes
  } catch (error) {
    console.error('Error fetching solicitudes: ', error)
    throw new Error('Failed to fetch solicitudes.')
  }
}

const fetchUserList = async () => {
  try {
    const userQuery = query(collection(db, 'users'), where('role', '>=', 5), where('role', '<=', 12), orderBy('name'))
    const userListSnapshot = await getDocs(userQuery)

    return userListSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching user list:', error)

    return { error: 'Failed to fetch user list.' }
  }
}

const updateWeekHoursWithPlant = async (userId, dayDocIds, plant, costCenter) => {
  const batch = writeBatch(db)

  dayDocIds.forEach(docId => {
    const docRef = doc(db, 'users', userId, 'workedHours', docId)
    batch.update(docRef, { plant, costCenter })
  })

  try {
    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error('Error updating week hours with plant and cost center:', error)

    return { success: false, error: error.message }
  }
}

/**
 * Función para generar y actualizar los códigos de entregables.
 * Mediante una transaction (FIFO) se obtienen los últimos contadores de códigos, se crean los códigos y se actualizan los contadores.
 * @param {object} mappedCodes - Objeto con siglas de los códigos Procure y MEL a generar.
 * @param {object} docData - Datos de la OT en Firestore.
 * @param {number} quantity - Cantidad de entregables a generar.
 * @param {object} userParam - Datos del Proyectista seleccionado para trabajar el entregable.
 * @returns {Array.<string>} - Lista con códigos generados.
 */
const generateBlueprintCodes = async (mappedCodes, docData, quantity, userParam) => {

  const { melDiscipline, melDeliverable, procureDiscipline, procureDeliverable } = mappedCodes
  const { ot, plant, area } = docData

  const idProject = '21286'

  const procureCounterField = `${procureDiscipline}-${procureDeliverable}-counter`
  const procureCounterRef = doc(db, 'counters', 'blueprintsProcureCodeCounter')

  const melCounterDocId = `${melDiscipline}-${melDeliverable}-counter`
  const melCounterRef = doc(db, 'solicitudes', docData.id, 'clientCodeGeneratorCount', melCounterDocId)

  const petitionRef = doc(db, 'solicitudes', docData.id)

  function formatCountMEL(count) {
    return String(count).padStart(5, '0')
  }

  function formatCountProcure(count) {
    return String(count).padStart(3, '0')
  }

  function extractAreaNumber(areaFullname) {
    return areaFullname.split(" - ")[0]
  }

  const plantInitials = await getPlantInitals(plant)
  const areaNumber = extractAreaNumber(area)
  const otNumber = `OT${ot}`

  const codes = await runTransaction(db, async transaction => {
    const procureCounterDoc = await transaction.get(procureCounterRef)
    const melCounterDoc = await transaction.get(melCounterRef)
    const solicitudDoc = await transaction.get(petitionRef)

    let melCounter = melCounterDoc.exists() ? Number(melCounterDoc.data().count) : 0
    if (!melCounterDoc.exists()) {
      transaction.set(melCounterRef, { count: formatCountMEL(0) })
    }

    let procureCounterData = procureCounterDoc.data()[procureCounterField]
    if (!procureCounterData) {
      procureCounterData = { count: "000" }
      transaction.update(procureCounterRef, { [procureCounterField]: procureCounterData })
    }

    let procureCounter = Number(procureCounterData.count)

    if (solicitudDoc.exists()) {
      const solicitudData = solicitudDoc.data()
      if (solicitudData.otReadyToFinish !== false) {
        transaction.update(petitionRef, { otReadyToFinish: false })
      }
    }

    const newDocs = []
    const blueprintCollectionRef = collection(db, 'solicitudes', docData.id, 'blueprints')

    for (let i = 0; i < quantity; i++) {

      const procureCode = `${idProject}-${procureDiscipline}-${procureDeliverable}-${formatCountProcure(procureCounter + i + 1)}`
      const melCode = `${idProject}-${otNumber}-${plantInitials}-${areaNumber}-${melDiscipline}-${melDeliverable}-${formatCountMEL(melCounter + i + 1)}`

      const userData = await getData(userParam.userId)

      const newDoc = {
        id: procureCode,
        clientCode: melCode,
        userId: userParam.userId,
        userName: userData.name,
        revision: "Iniciado",
        milestone: 0,
        userEmail: userData.email,
        sentByDesigner: false,
        sentBySupervisor: false,
        date: Timestamp.fromDate(new Date()),
        attentive: userData.role
      };

      // Se agrega el nuevo Blueprint a la collection "blueprints".
      const newDocRef = doc(blueprintCollectionRef, newDoc.id)
      transaction.set(newDocRef, newDoc)

      // Crear referencia para la subcolección "revisions"
      const revisionsCollectionRef = collection(db, 'solicitudes', docData.id, 'blueprints', newDoc.id, 'revisions')

      // milestone = 0 significa Entregable "Iniciado".
      const newRevision = {
        milestone: 0,
        date: Timestamp.fromDate(new Date()),
        prevRevision: null,
        newRevision: "Iniciado",
        storageBlueprints: {
          name: null,
          url: null
        }
      }

      // Genera un documento con un ID aleatorio
      const newRevisionRef = doc(revisionsCollectionRef)
      transaction.set(newRevisionRef, newRevision)

      newDocs.push(newDoc)
    }

    transaction.update(procureCounterRef, { [`${procureCounterField}.count`]: formatCountProcure(procureCounter + quantity) })
    transaction.update(melCounterRef, { count: formatCountMEL(melCounter + quantity) })

    return newDocs
  })

  return codes
}

const updateBlueprintAssignment = async (petitionId, blueprintId, newUser) => {
  const batch = writeBatch(db)

  try {
    // Crea una referencia al documento en la subcolección `blueprints`
    const blueprintDocRef = doc(db, 'solicitudes', petitionId, 'blueprints', blueprintId)

    // Actualiza el documento con los nuevos valores
    batch.update(blueprintDocRef, {
      userId: newUser.userId,
      userName: newUser.name,
      userEmail: newUser.email
    })

    // Ejecuta el batch
    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error('Error updating blueprint assignment:', error)

    return { success: false, error: error.message }
  }
}

const getProcureCounter = async procureCounterField => {
  // Crea referencia a Firestore para el contador de Procure
  const procureCounterRef = doc(db, 'counters', 'blueprintsProcureCodeCounter')

  const procureCounterDoc = await getDoc(procureCounterRef)

  if (!procureCounterDoc.exists()) {
    throw new Error(`El documento blueprintsProcureCodeCounter no existe en Firestore.`)
  }

  const currentProcureCounterData = procureCounterDoc.data()[procureCounterField]
  if (!currentProcureCounterData) {
    throw new Error(`El campo ${procureCounterField} no existe en el documento blueprintsProcureCodeCounter.`)
  }

  const currentProcureCounter = Number(currentProcureCounterData.count)

  return currentProcureCounter
}

const markBlueprintAsDeleted = async (mainDocId, procureId, clientCode) => {
  const blueprintRef = doc(db, 'solicitudes', mainDocId, 'blueprints', procureId)

  // Extrae los valores del clientCode (MEL)
  const [__, otNumber, instalacion, areaNumber, melDiscipline, melDeliverable] = clientCode.split('-')

  // Crea referencia al contador MEL
  const melCounterDocId = `${melDiscipline}-${melDeliverable}-counter`
  const melCounterRef = doc(db, 'solicitudes', mainDocId, 'clientCodeGeneratorCount', melCounterDocId)

  await runTransaction(db, async transaction => {
    // Obtiene el documento del contador MEL
    const melCounterDoc = await transaction.get(melCounterRef)
    const currentMelCounter = melCounterDoc.data().count

    // Calcula el nuevo valor del contador
    const newMelCounter = String(Number(currentMelCounter) - 1).padStart(5, '0')

    // Actualiza el contador MEL
    transaction.update(melCounterRef, {
      count: newMelCounter
    })

    // Marca el blueprint como eliminado
    transaction.update(blueprintRef, {
      deleted: true,
      deletedAt: Timestamp.fromDate(new Date())
    })
  })
}

const deleteBlueprintAndDecrementCounters = async (
  mainDocId,
  procureId,
  procureCounterField,
  currentProcureCounter,
  currentMelCounter,
  melDiscipline,
  melDeliverable
) => {
  // Crea referencias a Firestore para el contador de Procure y MEL
  const procureCounterRef = doc(db, 'counters', 'blueprintsProcureCodeCounter')
  const melCounterDocId = `${melDiscipline}-${melDeliverable}-counter`
  const melCounterRef = doc(db, 'solicitudes', mainDocId, 'clientCodeGeneratorCount', melCounterDocId)

  // Referencia al documento de la subcolección "blueprints" que se eliminará
  const blueprintDocRef = doc(db, 'solicitudes', mainDocId, 'blueprints', procureId)

  // Referencia a la subcolección "revisions"
  const revisionsCollectionRef = collection(blueprintDocRef, 'revisions')

  await runTransaction(db, async transaction => {
    // Verifica si la subcolección 'revisions' tiene documentos
    const revisionsSnapshot = await getDocs(revisionsCollectionRef)

    if (!revisionsSnapshot.empty) {
      // Si existen documentos en la subcolección, se eliminan uno por uno
      revisionsSnapshot.forEach(doc => {
        transaction.delete(doc.ref)
      })
    }

    // Después de eliminar los documentos de la subcolección 'revisions', elimina el documento 'blueprints'
    transaction.delete(blueprintDocRef)

    // Disminuye los contadores
    transaction.update(procureCounterRef, {
      [`${procureCounterField}.count`]: String(currentProcureCounter - 1).padStart(3, '0')
    })

    transaction.update(melCounterRef, {
      count: String(currentMelCounter - 1).padStart(5, '0')
    })
  })
}

/**
 * Función para actualizar Firestore con la información del Entregable (blueprint).
 * En específico se añade/actualiza un array con los links de Google Drive del Entregable o de su HLC.
 * @param {string} petitionId - ID de la OT.
 * @param {string} blueprintId - ID del Entregable.
 * @param {string} fileLink - Link de Google Drive donde se almacena el documento.
 * @param {string} fileName - Nombre del documento almacenado.
 * @param {string} destination - String que define si se actualiza el campo storageBlueprints o storageHlcDocuments en Firestore.
 */
const updateBlueprintsWithStorageOrHlc = async (petitionId, blueprintId, fileLink, fileName, destination) => {
  try {
    // Referencia al documento del blueprint dentro de la colección "blueprints" de una "solicitud"
    const blueprintRef = doc(db, 'solicitudes', petitionId, 'blueprints', blueprintId)

    // Crea el objeto que se va a agregar al campo storageBlueprints
    const blueprintData = {
      url: fileLink,
      name: fileName
    }

    if (destination === 'storage') {
      // Actualiza el documento en Firestore, añadiendo el nuevo archivo al array `storageBlueprints`
      await updateDoc(blueprintRef, {
        storageBlueprints: arrayUnion(blueprintData)
      })
    } else if (destination === 'hlc') {
      // Actualiza el documento en Firestore, añadiendo el nuevo archivo al array `storageBlueprints`
      await updateDoc(blueprintRef, {
        storageHlcDocuments: arrayUnion(blueprintData)
      })
    }
  } catch (error) {
    console.error('Error al actualizar el blueprint:', error)
  }
}

const deleteReferenceOfLastDocumentAttached = async (petitionId, blueprintId, action) => {
  const blueprintRef = doc(db, 'solicitudes', petitionId, 'blueprints', blueprintId)

  const querySnapshot = await getDoc(blueprintRef)
  const docSnapshot = querySnapshot.data()

  // console.log('docSnapshot.storageBlueprints', docSnapshot.storageBlueprints)
  if (action === 'resetStorageHlcDocuments') {
    await updateDoc(blueprintRef, {
      storageHlcDocuments: null
    })
  } else if (action === 'resetStorageBlueprints') {
    await updateDoc(blueprintRef, {
      storageBlueprints: null
    })
  } else {
    await updateDoc(blueprintRef, {
      storageBlueprints: [docSnapshot.storageBlueprints[0]]
    })
  }
}

// Función para crear un nuevo Centro de Costo para una Planta específica.
const createCostCenter = async (plant, costCenter) => {
  try {
    // Referencia al documento en Firestore
    const docRef = doc(db, 'domain', 'costCenters')

    // Actualiza el documento agregando el nuevo Centro de Costo al array correspondiente a la Planta.
    await updateDoc(docRef, {
      [plant]: arrayUnion(costCenter)
    })
  } catch (error) {
    // Manejo de errores.
    console.error('Error al crear el Centro de Costo:', error)
    throw error
  }
}

// Función para modificar un Centro de Costo existente en una Planta.
const modifyCostCenter = async (plant, index, newCostCenterValue) => {
  try {
    // Referencia al documento en Firestore.
    const docRef = doc(db, 'domain', 'costCenters')

    // Obtiene el snapshot del documento
    const querySnapshot = await getDoc(docRef)
    const docSnapshot = querySnapshot.data()

    // Modifica el valor del Centro de Costo en el índice especificado.
    var plantCostCenters = docSnapshot[plant]
    plantCostCenters[index] = newCostCenterValue

    // Actualiza el documento con el array modificado.
    await updateDoc(docRef, {
      [plant]: plantCostCenters
    })
  } catch (error) {
    // Manejo de errores
    console.error('Error al modificar el Centro de Costo:', error)
    throw error
  }
}

// Función para eliminar un Centro de Costo específico de una Planta.
const deleteCostCenter = async (plant, costCenter) => {
  try {
    // Referencia al documento en Firestore.
    const docRef = doc(db, 'domain', 'costCenters')

    // Actualiza el documento eliminando el Centro de Costo del array correspondiente a la Planta.
    await updateDoc(docRef, {
      [plant]: arrayRemove(costCenter)
    })
  } catch (error) {
    // Manejo de errores.
    console.error('Error al eliminar el Centro de Costo:', error)
    throw error
  }
}

// Función para establecer un Centro de Costo como predeterminado, intercambiando posiciones en el array.
const setDefaultCostCenter = async (plant, oldIndex) => {
  try {
    // Referencia al documento en Firestore.
    const docRef = doc(db, 'domain', 'costCenters')

    // Obtiene el snapshot del documento.
    const querySnapshot = await getDoc(docRef)
    const docSnapshot = querySnapshot.data()

    // Se intercambia el Centro de costo en oldIndex con el de la posición 0.
    var plantCostCenters = docSnapshot[plant]
    const prevPositionZero = plantCostCenters[0]
    const prevPositionOldIndex = plantCostCenters[oldIndex]

    plantCostCenters[0] = prevPositionOldIndex
    plantCostCenters[oldIndex] = prevPositionZero

    // Actualiza el documento con el array modificado.
    await updateDoc(docRef, {
      [plant]: plantCostCenters
    })
  } catch (error) {
    // Manejo de errores.
    console.error('Error al establecer el Centro de Costo predeterminado:', error)
    throw error
  }
}

export {
  newDoc,
  updateDocs,
  updateUserPhone,
  blockDayInDatabase,
  useBlueprints,
  updateBlueprint,
  addDescription,
  generateTransmittalCounter,
  updateSelectedDocuments,
  addComment,
  updateUserData,
  finishPetition,
  fetchWeekHoursByType,
  createWeekHoursByType,
  updateWeekHoursByType,
  deleteWeekHoursByType,
  fetchSolicitudes,
  fetchUserList,
  updateWeekHoursWithPlant,
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
  getNextChar,
  getBlueprintPercent,
  getNextRevisionFolderName
}
