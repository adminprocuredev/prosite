import { useEffect, useState } from 'react'

// ** Firebase Imports
import {
  Timestamp,
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  or,
  orderBy,
  query,
  where
} from 'firebase/firestore'
import { db } from 'src/configs/firebase'

import { unixToDate } from 'src/@core/components/unixToDate'

// Librería
import { capitalize } from 'lodash'

const moment = require('moment')

// ** Trae subcolecciones
const useEvents = (id, userParam, path = 'events') => {
  const [data, setData] = useState([])

  useEffect(() => {
    if (path.includes('//')) {
      return
    }

    if (userParam && id) {
      const q = query(collection(db, 'solicitudes', id, path), orderBy('date', 'desc'))

      const unsubscribe = onSnapshot(q, querySnapshot => {
        try {
          const allDocs = []

          // Una llamada inicial con la devolución de llamada que proporcionas crea una instantánea del documento de inmediato con los contenidos actuales de ese documento.
          // Después, cada vez que cambian los contenidos, otra llamada actualiza la instantánea del documento.

          querySnapshot.forEach(doc => {
            allDocs.push({ ...doc.data(), id: doc.id })
          })
          setData(allDocs)
        } catch (error) {
          console.error('Error al obtener los documentos de Firestore: ', error)

          // Aquí puedes mostrar un mensaje de error
        }
      })

      // Devuelve una función de limpieza que se ejecuta al desmontar el componente
      return () => unsubscribe()
    }
  }, [userParam, id, path])

  return data
}

// ** Escucha cambios en los documentos en tiempo real
const useSnapshot = (datagrid = false, userParam, control = false) => {
  const [data, setData] = useState([])

  useEffect(() => {
    if (userParam) {
      let q = query(collection(db, 'solicitudes'), where('state', '>=', 1))

      if (datagrid) {
        switch (userParam.role) {
          case 1:
            q = query(collection(db, 'solicitudes'))
            break
          case 2:
            q = query(collection(db, 'solicitudes'), where('uid', '==', userParam.uid))
            break
          case 3:
            q = query(collection(db, 'solicitudes'), where('plant', 'in', userParam.plant))
            break
          case 4:
            q = query(collection(db, 'solicitudes'))
            break
          case 5:
            q = query(collection(db, 'solicitudes'))
            // q = query(
            //   collection(db, 'solicitudes'),
            //   or(where('state', '>=', userParam.role - 2), where('state', '==', 0))
            // )                                                                              // se comentará para que el usuario 5 vea todas las solicitudes
            break
          case 6:
            q = query(collection(db, 'solicitudes'))
            break
          case 7:
            q = query(collection(db, 'solicitudes'), or(where('state', '>=', 6), where('state', '==', 0)))
            break
          default:
            if ([4].includes(userParam.role)) {
              q = query(
                collection(db, 'solicitudes'),
                or(where('state', '>=', userParam.role - 1), where('state', '==', 0))
              )
            }
            break
        }
      }

      if (control) {
        switch (userParam.role) {
          case 1:
            q = query(collection(db, 'solicitudes'), where('state', '>=', 8))
            break
          case 7:
            q = query(
              collection(db, 'solicitudes'),
              where('state', '>=', 8),
              where('supervisorShift', '==', userParam.shift[0])
            )
            break
          default:
            q = query(collection(db, 'solicitudes'), where('state', '>=', 8))
            break
        }
      }

      const unsubscribe = onSnapshot(q, async querySnapshot => {
        try {
          const allDocs = []

          const promises = querySnapshot.docs.map(async d => {
            const docData = d.data()
            const userSnapshot = await getDoc(doc(db, 'users', docData.uid))
            const name = userSnapshot.data() ? userSnapshot.data().name : 'No definido'
            const newDoc = { ...docData, id: d.id, name }
            allDocs.push(newDoc)
          })

          await Promise.all(promises)

          // Ordena manualmente las solicitudes por 'date' en orden descendente
          const sortedDocs = allDocs.sort((a, b) => b.date.seconds - a.date.seconds)

          setData(sortedDocs)
        } catch (error) {
          console.error('Error al obtener los documentos de Firestore: ', error)

          // Aquí puedes mostrar un mensaje de error
        }
      })

      // Devuelve una función de limpieza que se ejecuta al desmontar el componente
      return () => unsubscribe()
    }
  }, [userParam])

  return data
}

// Función para obtener los datos de un documento de la colección 'domain'
// Se pedirá como parámetro obligatorio el documento que quiere obtener (plants, roles, deliverables, etc)
// Si no se selecciona document; vale decir que document es null, se deberá entregar la información de toda la colección 'domain'
// Como parámetro opcional se ingresará el campo que quiere obtener de ese documento
// Si no se indica el parámetro field, se retornarán todos los campos existentes en ese documento
const getDomainData = async (document = null, field = null) => {
  const collectionRef = collection(db, 'domain')

  try {
    if (document === null) {
      // Si no se selecciona document; vale decir que document es null, se deberá entregar la información de toda la colección 'domain'

      const querySnapshot = await getDocs(collectionRef)
      const allData = {}

      querySnapshot.forEach(doc => {
        allData[doc.id] = doc.data()
      })

      return allData
    } else {
      // En cualquier otro caso, se deberá especificar el documento dentro de domain el cual se requiere

      const docRef = doc(collectionRef, document)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        // Si el 'document' indicado existe dentro de 'domain'
        const docData = docSnap.data()

        if (field !== null && field in docData) {
          // Si dentro del documento se requiere especificar el campo el cual se requiere, se debe indicar mediante 'field'
          return docData[field]
        } else if (field === null) {
          // Si no se especifica el campo dentro del documento, se entregará toda la data del 'document'
          return docData
        } else {
          // En cualquier otro caso, se maneja el error
          console.error(`El campo '${field}' no existe en el documento.`)

          return null
        }
      } else {
        // Si el 'document' indicado no existe, se maneja el error
        console.error(`El documento con ID '${document}' no existe.`)

        return null
      }
    }
  } catch (error) {
    console.error('Error al obtener datos:', error)

    return null
  }
}

/**
 * Función que busca la información del usuario buscando por ID.
 * @param {string} id - ID del usuario.
 * @returns {Promise<object|undefined>} - Objeto con campos del usuario en Firestore.
 */
const getData = async id => {
  const docRef = doc(db, 'users', id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data()
  } else {
    return undefined
  }
}

// Función para llamar a todos los usuarios dentro de la colección 'users'
const getAllUsersData = async () => {
  try {
    // Referencia a la colección
    const usersRef = collection(db, 'users')

    // Obtener los documentos de la colección
    const usersSnapshot = await getDocs(usersRef)

    // Array para almacenar los datos de los documentos
    const usersData = []

    // Iterar sobre cada documento y almacenar sus datos
    usersSnapshot.forEach(user => {
      usersData.push({ id: user.id, ...user.data() })
    })

    // Retornar los documentos
    return usersData
  } catch (error) {
    console.error('Error al obtener los datos de los usuarios: ', error)
  }
}

// getUserData agrupa funciones relacionadas con la colección 'users'
// identifica que funcion debe ejecutar de acuerdo al parametro 'type' que se le proporcione
// recibe el parametro (userParam = {shift : ''}) para establecer el valor por defecto en caso de recibir sólo los parametros type y plant.
const getUserData = async (type, plant, userParam = { shift: '', name: '', email: '' }) => {
  const coll = collection(db, 'users') // Crear una referencia a la colección 'users' en la base de datos
  let allDocs = [] // Arreglo para almacenar los documentos extendidos

  // Mapa de consultas según el tipo
  const queryMap = {
    // Si se proporciona el turno, obtener usuarios solicitantes con el turno opuesto, de lo contrario, obtener usuarios Contrac Operator
    getUsers: () =>
      userParam.shift !== ''
        ? query(
            coll,
            where('plant', 'array-contains-any', plant),
            where('shift', '!=', userParam.shift),
            where('role', '==', 2)
          )
        : query(coll, where('plant', 'array-contains', plant), where('role', '==', 3), where('enabled', '==', true)),
    getAllPlantUsers: () => query(coll, where('plant', 'array-contains', plant)),
    getAllProcureUsers: () => query(coll, where('company', '==', 'Procure')),
    getUserProyectistas: () =>
      query(coll, where('shift', 'array-contains', userParam.shift[0]), where('role', '==', 8)),
    getUserSupervisor: () => query(coll, where('shift', 'array-contains', userParam.shift[0]), where('role', '==', 7)),
    getPetitioner: () => query(coll, where('plant', 'array-contains', plant)),
    getReceiverUsers: () => query(coll, where('plant', 'array-contains', plant), where('role', '==', 2)),
    getUsersByRole: () => query(coll, where('role', '==', userParam.role))
  }

  const queryFunc = queryMap[type] // Obtener la función de consulta según el tipo

  if (!queryFunc) {
    throw new Error(`Invalid type: ${type}`)
  }

  try {
    // Obtener los documentos según la función de consulta y realizar la consulta
    const querySnapshot = await getDocs(queryFunc())

    // Iterar a través de los resultados de la consulta y construir el arreglo de usuarios extendidos
    querySnapshot.forEach(doc => {
      // Construir el objeto de usuario según el tipo y sus datos
      const userObj =
        type === 'getUserProyectistas'
          ? doc.data().urlFoto
            ? {
                userId: doc.id,
                name: doc.data().name,
                avatar: doc.data().urlFoto,
                enabled: doc.data().enabled,
                shift: doc.data().shift,
                email: doc.data().email,
                role: doc.data().role
              }
            : {
                userId: doc.id,
                name: doc.data().name,
                enabled: doc.data().enabled,
                shift: doc.data().shift,
                email: doc.data().email,
                role: doc.data().role
              }
          : type === 'getUserSupervisor'
          ? doc.data().urlFoto
            ? {
                userId: doc.id,
                name: doc.data().name,
                avatar: doc.data().urlFoto,
                enabled: doc.data().enabled,
                shift: doc.data().shift,
                email: doc.data().email,
                role: doc.data().role
              }
            : {
                userId: doc.id,
                name: doc.data().name,
                enabled: doc.data().enabled,
                shift: doc.data().shift,
                email: doc.data().email,
                role: doc.data().role
              }
          : type === 'getReceiverUsers'
          ? {
              id: doc.id,
              name: doc.data().name,
              email: doc.data().email,
              phone: doc.data().phone
            }
          : {
              ...doc.data(),
              id: doc.id
            }
      allDocs.push(userObj) // Agregar el objeto de usuario al arreglo
    })

    if (type === 'getPetitioner') {
      // Verificar el tipo de usuario actual y agregarlo al arreglo si corresponde
      if (userParam.name) {
        const querySnapshot = await getDocs(query(coll, where('name', '==', userParam.name)))

        if (!querySnapshot.empty) {
          const docSnapshot = querySnapshot.docs[0].data()

          return docSnapshot
        }

        return null // Devolver nulo si no se encuentra el documento
      } else if (userParam.plant === 'allPlants') {
        const allDocsFiltered = allDocs.filter(doc => doc.role === 2)

        return allDocsFiltered
      } else if (userParam.role === 3) {
        return allDocs
      } else if (userParam.id) {
        const docRef = doc(db, 'users', userParam.id)
        const docSnapshot = await getDoc(docRef)

        if (docSnapshot.exists()) {
          allDocs.push({ ...docSnapshot.data(), id: docSnapshot.id })
        }

        return allDocs
      }
    }

    return allDocs // Retornar el arreglo de usuarios extendidos
  } catch (error) {
    console.error('Error fetching documents:', error)

    return null // En caso de error, retornar nulo
  }
}

// Consultar si existen solicitudes para una fecha específica
const dateWithDocs = async date => {
  const allDocs = []

  //const dateUnix = getUnixTime(date) // Convierte la fecha a segundos Unix
  const q = query(collection(db, 'solicitudes'), where('start', '==', new Timestamp(date, 0)), where('state', '!=', 0))
  const querySnapshot = await getDocs(q)
  querySnapshot.forEach(doc => {
    // doc.data() is never undefined for query doc snapshots
    allDocs.push({ ...doc.data(), id: doc.id })
  })

  if (allDocs.length === 0) {
    return
  }

  return `La fecha que está tratando de agendar tiene ${allDocs.length} Solicitudes. Le recomendamos seleccionar otro día.`
}

// Consultar si un día está bloqueado en la base de datos
const consultBlockDayInDB = async date => {
  const startOfDay = moment(date).startOf('day').unix().toString()
  const endOfDay = moment(date).endOf('day').unix().toString()

  const docRef = collection(db, 'diasBloqueados')

  const querySnapshot = await getDocs(
    query(docRef, where(documentId(), '>=', startOfDay), where(documentId(), '<=', endOfDay))
  )

  if (!querySnapshot.empty) {
    // Si hay resultados, al menos un timestamp abarca todo el día
    const blockedDoc = querySnapshot.docs.find(doc => doc.data().blocked)

    if (blockedDoc) {
      const data = blockedDoc.data()

      return { msj: `El día que has seleccionado está bloqueado, motivo: ${data.cause}`, blocked: true }
    } else {
      let msj = await dateWithDocs(date / 1000)

      return { msj, blocked: false }
    }
  } else {
    let msj = await dateWithDocs(date / 1000)

    return { msj, blocked: false }
  }
}

// Consultar si existe un número SAP en la base de datos de solicitudes
const consultSAP = async sap => {
  const domainDictionary = await getDomainData('dictionary')

  // Definir la consulta con una condición de igualdad en el campo 'sap' y ordenar por fecha descendente
  const sapQuery = query(collection(db, `solicitudes`), where('sap', '==', sap), orderBy('date', 'desc'))

  // Obtener los documentos que coinciden con la consulta
  const sapQuerySnapshot = await getDocs(sapQuery)

  // Obtener la lista de documentos
  const sapDocs = sapQuerySnapshot.docs

  // Verificar si existen documentos en 'sapDocs'
  if (sapDocs.length > 0) {
    // Arreglos para almacenar las solicitudes con y sin OT asignadas
    let sapWithOt = []
    let sap = []
    let messages
    let otMessages

    // Recorrer cada documento y obtener información adicional del usuario asociado
    await Promise.all(
      sapDocs.map(async docItem => {
        // Obtener la referencia del usuario asociado al documento
        const docItemData = await docItem.data()
        const userRef = doc(db, 'users', docItemData.uid)
        const userQuerySnapshot = await getDoc(userRef)
        const author = userQuerySnapshot.data().name
        const reqState = domainDictionary[docItemData.state].longTitle

        if (docItem.data().ot) {
          // Si el documento tiene una OT asignada, agregarlo al arreglo 'sapWithOt'
          sapWithOt.push({
            title: docItemData.title,
            author,
            ot: docItemData.ot,
            date: unixToDate(docItemData.date.seconds)[0],
            start: unixToDate(docItemData.start.seconds)[0],
            objective: docItemData.objective,
            state: reqState
          })
        } else {
          // Si el documento no tiene una OT asignada, agregarlo al arreglo 'sap'
          sap.push({
            title: docItemData.title,
            author,
            date: unixToDate(docItemData.date.seconds)[0],
            start: unixToDate(docItemData.start.seconds)[0],
            objective: docItemData.objective,
            state: reqState
          })
        }
      })
    )

    if (sap.length > 0) {
      // Si hay solicitudes con OT asignadas, retornar un objeto con información detallada
      messages = sap
        .map(
          item =>
            `Título: ${item.title}\n N° OT Procure: Por definir\n Solicitante: ${item.author}\n Fecha de ingreso de solicitud: ${item.date}\n Fecha de inicio del Levantamiento: ${item.start}\n Estado del Levantamiento: ${item.state}\n Tipo de Levantamiento: ${item.objective}\n`

          // Si todas las solicitudes están en revisión sin OT asignada, retornar un objeto con información detallada
        )
        .join('\n')
    }

    if (sapWithOt.length > 0) {
      otMessages = sapWithOt
        .map(
          item =>
            `Título: ${item.title}\n N° OT Procure: ${item.ot}\n Solicitante: ${item.author}\n Fecha de ingreso de solicitud: ${item.date}\n Fecha de inicio del Levantamiento: ${item.start}\n Estado del Levantamiento: ${item.state}\n Tipo de Levantamiento: ${item.objective}\n`
        )
        .join('\n')
    }

    const messageParameters = length => {
      const existen = length === 1 ? 'Existe' : 'Existen'
      const solicitudes = length === 1 ? 'solicitud' : 'solicitudes'
      const tienen = length === 1 ? 'tiene' : 'tienen'

      return { existe: existen, solicitud: solicitudes, tiene: tienen }
    }

    if (sapWithOt.length > 0 && sap.length > 0) {
      return {
        exist: true,
        sap,
        sapWithOt,
        msj:
          `${messageParameters(sap.length + sapWithOt.length).existe} ${sap.length + sapWithOt.length} ${
            messageParameters(sap.length + sapWithOt.length).solicitud
          } con este número SAP. A continuación le entregamos mayor detalle:\n\n` +
          otMessages +
          `\n` +
          messages +
          `\n` +
          'Le recomendamos comunicarse con el Solicitante original del Levantamiento.'
      }
    } else if (sapWithOt.length > 0 && sap.length === 0) {
      return {
        exist: true,
        sapWithOt,
        msj:
          `${messageParameters(sap.length + sapWithOt.length).existe} ${sap.length + sapWithOt.length} ${
            messageParameters(sap.length + sapWithOt.length).solicitud
          } con este número SAP. A continuación le entregamos mayor detalle:\n\n` +
          otMessages +
          `\n` +
          'Le recomendamos comunicarse con el Solicitante original del Levantamiento.'
      }
    } else {
      return {
        exist: true,
        sap,
        msj:
          `${messageParameters(sap.length).existe} ${sap.length} ${
            messageParameters(sap.length + sapWithOt.length).solicitud
          } con este número SAP. A continuación le entregamos mayor detalle:\n\n` +
          messages +
          `\n` +
          'Le recomendamos comunicarse con el Solicitante original del Levantamiento.'
      }
    }
  } else {
    // Si no hay documentos con el número SAP, retornar un objeto indicando que es un nuevo número SAP
    return { exist: false, msj: 'Nuevo número SAP registrado' }
  }
}

const consultOT = async ot => {
  // Si ot tiene un valor de tipo distinto a number, retorna un mensaje de error
  if (typeof ot !== 'number') {
    return { exist: true, msj: 'Sólo se permiten caracteres numéricos.' }
  }
  // Si ot es igual a 0, retorna un mensaje de error
  if (ot === 0) {
    return { exist: true, msj: 'El número de OT no puede ser 0.' }
  }
  const solicitudesRef = collection(db, 'solicitudes')

  // Crear una consulta para buscar solicitudes con el mismo número de OT
  const otQuery = query(solicitudesRef, where('ot', '==', ot))

  try {
    const querySnapshot = await getDocs(otQuery)

    if (!querySnapshot.empty) {
      // Si hay documentos que coinciden con la consulta, significa que existe una solicitud con ese OT
      return { exist: true, msj: 'Existe una solicitud con ese número de OT.' }
    } else {
      // No se encontraron documentos con ese OT
      return { exist: false }
    }
  } catch (error) {
    console.error('Error al consultar OT:', error)

    return { exist: false, error: 'Error al realizar la consulta.' }
  }
}

// Consulta si un correo electrónico existe en la base de datos
const consultUserEmailInDB = async email => {
  // Definir la consulta con una condición de igualdad en el campo 'email'
  const q = query(collection(db, 'users'), where('email', '==', email))

  // Obtener los documentos que coinciden con la consulta
  const emailQuerySnapshot = await getDocs(q)

  // Obtener la lista de documentos
  const emailDocs = emailQuerySnapshot.docs

  // Crear un arreglo para almacenar todos los documentos
  let allDocs = []

  // Recorrer cada documento y agregarlo al arreglo 'allDocs'
  emailDocs.forEach(doc => {
    allDocs.push({ ...doc.data(), id: doc.id })
  })

  // Verificar si existen documentos en 'allDocs'
  if (allDocs.length > 0) {
    // Si hay al menos un documento, lanzar un error indicando que el correo está registrado
    throw new Error(`El correo ${email} se encuentra registrado.`)
  } else {
    // Si no hay documentos, retornar verdadero indicando que el correo no está registrado
    return true
  }
}

const consultDocs = async (type, options = {}) => {
  const coll = collection(db, 'solicitudes')

  try {
    switch (type) {
      case 'all':
        const qAll = query(coll)
        const snapshotAll = await getDocs(qAll)

        return snapshotAll.size

      case 'byPlants':
        const resultsByPlants = await Promise.all(
          options.plants.map(async plant => {
            const qPlant = query(coll, where('plant', '==', plant))
            const snapshotPlant = await getDocs(qPlant)

            return snapshotPlant.size
          })
        )

        return resultsByPlants

      case 'byState':
        const currentDate = Timestamp.now()

        const oneMonthAgo = Timestamp.fromDate(
          new Date(currentDate.toDate().setMonth(currentDate.toDate().getMonth() - 1))
        )

        // Consulta a Firestore para obtener documentos de los últimos 30 días
        const qDate = query(coll, where('date', '>=', oneMonthAgo))
        const snapshotDate = await getDocs(qDate)

        // Crear un array de los datos de los documentos
        const docsData = []
        snapshotDate.forEach(doc => {
          docsData.push(doc.data())
        })

        return docsData

      default:
        throw new Error(`Invalid type: ${type}`)
    }
  } catch (error) {
    console.error('Error fetching document counts:', error)

    return null
  }
}

/**
 * Función para obtener las disciplinas desde la Tabla de Dominio.
 * @returns {Object} - Objeto con las disciplinas y sus características.
 */
const fetchDisciplineProperties = async () => {
  const propsRef = doc(db, 'domain', 'blueprintCodeProperties')
  const docSnapshot = await getDoc(propsRef)

  if (docSnapshot.exists()) {

    return docSnapshot.data()

  } else {

    throw new Error('No matching document found in the database.')

  }
}

/**
 * Función para obtener los tipos de entregables por disciplina desde la Tabla de Dominio.
 * @param {string} discipline - Disciplina para la cual se buscan sus tipos de entregables.
 * @returns {Object} - Objeto con los tipos de entregables y sus características.
 */
const fetchDeliverablesByDiscipline = async discipline => {
  const propsRef = doc(db, 'domain', 'blueprintCodeProperties')
  const docSnapshot = await getDoc(propsRef)

  if (docSnapshot.exists()) {

    const data = docSnapshot.data()

    return data[discipline]

  } else {

    throw new Error('No matching discipline found in the database.')

  }
}

const fetchPetitionById = async id => {
  const docRef = doc(db, 'solicitudes', id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return { ...docSnap.data(), id: docSnap.id }
  } else {
    return undefined
  }
}

const consultBluePrints = async (type, options = {}) => {
  const coll = collection(db, 'blueprints')
  let queryFunc

  switch (type) {
    case 'finished':
      queryFunc = async () => {
        const solicitudesRef = collection(db, 'solicitudes')
        const solicitudesQuery = query(solicitudesRef, where('state', '>=', 8))

        const solicitudesSnapshot = await getDocs(solicitudesQuery)

        const totalBlueprintsCompleted = solicitudesSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data()

          return acc + (data.counterBlueprintCompleted || 0) // Sumamos solo si existe
        }, 0)

        return totalBlueprintsCompleted
      }
      break
    case 'last30daysRevisions':
      const thirtyDaysAgo = Timestamp.fromDate(moment().subtract(30, 'days').toDate())
      const solicitudesRef = collection(db, 'solicitudes')

      const solicitudesQuery = query(solicitudesRef, where('state', '>=', 8), where('date', '>=', thirtyDaysAgo))

      const solicitudesSnapshot = await getDocs(solicitudesQuery)

      // array de Promises para obtener los blueprints de cada solicitud simultáneamente
      const blueprintsPromises = solicitudesSnapshot.docs.map(async solicitudDoc => {
        const blueprintsRef = collection(db, `solicitudes/${solicitudDoc.id}/blueprints`)
        const blueprintsSnapshot = await getDocs(blueprintsRef)

        return blueprintsSnapshot.docs.map(blueprintDoc => blueprintDoc.data())
      })

      // Se espera a que todas las promesas se resuelvan y "aplanamos" el resultado
      const blueprintsData = (await Promise.all(blueprintsPromises)).flat()

      return blueprintsData

      break

    // Case para contar los blueprints existentes, excluyendo los que tienen "deleted: true"
    case 'existingBlueprints':
      queryFunc = async () => {
        const solicitudesRef = collection(db, 'solicitudes')
        const solicitudesQuery = query(solicitudesRef, where('state', '>=', 8))

        const solicitudesSnapshot = await getDocs(solicitudesQuery)

        // Promesas para obtener y contar los blueprints, excluyendo los que están eliminados (deleted: true)
        const blueprintCountPromises = solicitudesSnapshot.docs.map(async solicitudDoc => {
          const blueprintsRef = collection(db, `solicitudes/${solicitudDoc.id}/blueprints`)

          // Consultamos los documentos de la subcolección "blueprints"
          const blueprintsSnapshot = await getDocs(blueprintsRef)

          // Filtramos y contamos solo los que no tienen "deleted: true"
          const validBlueprints = blueprintsSnapshot.docs.filter(blueprintDoc => {
            const data = blueprintDoc.data()

            return !data.deleted // Excluimos los que tienen "deleted" como true
          })

          return validBlueprints.length // Retornamos la cantidad de blueprints válidos
        })

        // Sumamos todos los conteos de blueprints
        const totalBlueprintCount = (await Promise.all(blueprintCountPromises)).reduce((acc, count) => acc + count, 0)

        return totalBlueprintCount
      }
      break

    default:
      // Lanzar un error si el tipo no es válido
      throw new Error(`Invalid type: ${type}`)
  }

  return queryFunc()
}

const consultObjetives = async (type, options = {}) => {
  const coll = collection(db, 'solicitudes')
  let queryFunc

  switch (type) {
    case 'all':
      // Consulta para obtener el total de documentos con estado mayor o igual a 6
      queryFunc = async () => {
        const q = query(coll, where('state', '>=', 6))
        const snapshot = await getCountFromServer(q)

        return snapshot.data().count
      }
      break

    case 'week':
      // Consulta para obtener el número de documentos por día de la semana en la semana actual
      queryFunc = async () => {
        const startDate = moment().startOf('isoWeek').toDate()
        const endDate = moment().endOf('isoWeek').toDate()
        const documentsByDay = Array(7).fill(0)
        const q = query(coll, where('state', '>=', 6))
        const snapshot = await getDocs(q)

        snapshot.forEach(doc => {
          const start = doc.data().start.toDate()
          const dayOfWeek = moment(start).isoWeekday()
          if (moment(start).isSameOrAfter(startDate) && moment(start).isSameOrBefore(endDate)) {
            documentsByDay[dayOfWeek - 1]++
          }
        })

        return documentsByDay
      }
      break

    case 'lastSixMonths':
      // Consulta para obtener el número de documentos en los últimos seis meses
      queryFunc = async () => {
        const currentDate = moment()
        const monthsData = []
        const queries = []

        for (let i = 0; i < 6; i++) {
          const monthStartDate = currentDate.clone().subtract(i, 'months').startOf('month').toDate()
          const monthEndDate = currentDate.clone().subtract(i, 'months').endOf('month').toDate()

          const q = query(coll, where('start', '>=', monthStartDate), where('start', '<=', monthEndDate))
          queries.push(getDocs(q))
        }

        const snapshots = await Promise.all(queries)

        snapshots.forEach((snapshot, index) => {
          const filteredDocs = snapshot.docs.filter(doc => doc.data().state >= 6)
          const cant = filteredDocs.length
          const monthStartDate = currentDate.clone().subtract(index, 'months').startOf('month')
          const month = capitalize(monthStartDate.locale('es').format('MMM'))
          monthsData.unshift({ month, cant })
        })

        return monthsData
      }
      break

    case 'byPlants':
      // Consulta para obtener el número de documentos por planta
      queryFunc = async () => {
        const queries = options.plants.map(async plant => {
          const query1 = query(coll, where('plant', '==', plant), where('state', '>=', 6))
          const query2 = query(coll, where('plant', '==', plant), where('state', '==', 7))

          const snapshot1 = await getDocs(query1)
          const snapshot2 = await getDocs(query2)

          return {
            query1: snapshot1.size,
            query2: snapshot2.size
          }
        })
        const results = await Promise.all(queries)

        return results
      }
      break

    default:
      // Lanzar un error si el tipo no es válido
      throw new Error(`Invalid type: ${type}`)
  }

  return queryFunc()
}

const getUsersWithSolicitudes = async () => {
  const collSolicitudes = collection(db, 'solicitudes') // Obtener referencia a la colección 'solicitudes'
  const qSolicitudes = query(collSolicitudes) // Consulta para obtener todas las solicitudes
  const solicitudesSnapshot = await getDocs(qSolicitudes) // Obtener los documentos de las solicitudes

  const solicitudesByUser = {} // Objeto para almacenar el número de solicitudes por usuario

  // Recorrer los documentos de las solicitudes
  solicitudesSnapshot.forEach(doc => {
    const { uid } = doc.data()
    if (uid) {
      // Si el usuario ya tiene solicitudes, incrementar el contador
      if (solicitudesByUser[uid]) {
        solicitudesByUser[uid].docs++
      } else {
        // Si es la primera solicitud del usuario, inicializar el contador
        solicitudesByUser[uid] = {
          id: uid,
          docs: 1
        }
      }
    }
  })

  const sortedUsers = Object.values(solicitudesByUser).sort((a, b) => b.docs - a.docs) // Ordenar los usuarios por cantidad de solicitudes (de mayor a menor)
  const limitedUsers = sortedUsers.slice(0, 10) // Limitar la cantidad de usuarios a 10

  // Consulta adicional a la colección 'users'
  const collUsers = collection(db, 'users') // Obtener referencia a la colección 'users'
  const usersSnapshot = await getDocs(collUsers) // Obtener los documentos de la colección 'users'

  // Mapear los usuarios limitados con sus propiedades
  const usersWithProperties = limitedUsers.map(user => {
    const userSnapshot = usersSnapshot.docs.find(doc => doc.id === user.id) // Encontrar el documento del usuario en el snapshot
    // Si se encontró el usuario en la colección 'users'
    if (userSnapshot) {
      const userData = userSnapshot.data()

      if (userData.urlFoto) {
        return {
          ...user,
          name: userData.name,
          plant: userData.plant,
          avatarSrc: userData.urlFoto
        }
      } else {
        return {
          ...user,
          name: userData.name,
          plant: userData.plant
        }
      }
    } else {
      // Si no se encontró el usuario en la colección 'users', retornar el objeto original
      return user
    }
  })

  return usersWithProperties
}

function subscribeToPetition(petitionId, onUpdate) {
  if (petitionId) {
    const petitionRef = doc(db, 'solicitudes', petitionId)

    const unsubscribe = onSnapshot(petitionRef, doc => {
      if (doc.exists()) {
        // Crea una copia del objeto antes de actualizar el estado
        const newPetition = { ...doc.data(), id: doc.id }
        onUpdate(newPetition)
      } else {
        console.error(`No se encontró ninguna petición con el id ${petitionId}`)
      }
    })

    // Devuelve la función unsubscribe para que pueda ser llamada cuando ya no se necesite la suscripción
    return unsubscribe
  } else {
    console.error('petitionId es undefined o null')
  }
}

const subscribeToUserProfileChanges = (userId, callback) => {
  const userRef = doc(db, 'users', userId)

  const unsubscribe = onSnapshot(userRef, doc => {
    if (doc.exists()) {
      const userData = doc.data()
      callback(userData)
    }
  })

  return unsubscribe
}

const subscribeToBlockDayChanges = setBlockResult => {
  const unsubscribe = onSnapshot(collection(db, 'diasBloqueados'), snapshot => {
    const blockedDays = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(doc => doc.blocked)
      .map(doc => ({
        timestamp: parseInt(doc.id) * 1000, // Convertir id a timestamp
        value: { blocked: doc.blocked, cause: doc.cause }
      }))

    setBlockResult(blockedDays)
  })

  return unsubscribe
}

/**
 * Función para obtener las iniciales de la planta a partir de la información disponible en la Tabla de Dominio.
 * @param {string} plantName - Nombre completo de la Planta.
 * @returns {Promise<string>} - Iniciales de la planta.
 * @throws {Error} - Si ocurre un error al obtener los datos o las iniciales no están disponibles.
 */
const getPlantInitals = async (plantName) => {
  try {
    const plantData = await getDomainData('plants', plantName)

    if (!plantData || !plantData.initials) {
      throw new Error(`No se encontraron iniciales para la planta '${plantName}'.`)
    }

    return plantData.initials
  } catch (error) {
    console.error('Error en getPlantInitals:', error.message)
    throw error // Se vuelve a lanzar el error para que el llamador lo maneje
  }
}


export {
  useEvents,
  useSnapshot,
  getData,
  getUserData,
  getAllUsersData,
  getDomainData,
  consultBlockDayInDB,
  consultSAP,
  consultUserEmailInDB,
  consultDocs,
  consultObjetives,
  getUsersWithSolicitudes,
  fetchPetitionById,
  consultBluePrints,
  subscribeToPetition,
  consultOT,
  subscribeToUserProfileChanges,
  subscribeToBlockDayChanges,
  fetchDisciplineProperties,
  fetchDeliverablesByDiscipline,
  getPlantInitals
}
