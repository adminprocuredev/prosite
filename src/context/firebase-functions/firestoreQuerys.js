import { useState, useEffect } from 'react'

// ** Firebase Imports
import { db } from 'src/configs/firebase'
import {
  collection,
  doc,
  Timestamp,
  query,
  getDoc,
  getDocs,
  onSnapshot,
  where,
  orderBy,
  getCountFromServer
} from 'firebase/firestore'


// Librería
import { capitalize } from 'lodash'

const moment = require('moment')

// ** Trae colección de eventos
const useEvents = (id, userParam) => {
  const [data, setData] = useState([])

  useEffect(() => {
    if (userParam && id) {
      const q = query(collection(db, 'solicitudes', id, 'events'), orderBy('date', 'desc'))

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
  }, [userParam, id])

  return data
}

// ** Escucha cambios en los documentos en tiempo real
const useSnapshot = (datagrid = false, userParam) => {
  const [data, setData] = useState([])

  useEffect(() => {
    if (userParam) {
      console.log(userParam.role, 'USER PLANT')

      let q = query(collection(db, 'solicitudes'))

      const getAllDocs = [1, 4, 5, 6, 7, 9]

      if (datagrid) {
        switch (userParam.role) {
          case 2:
            q = query(collection(db, 'solicitudes'), where('uid', '==', userParam.uid))
            break
          case 3:
            q = query(collection(db, 'solicitudes'), where('plant', 'in', userParam.plant))
            break
          case 5:
            q = query(collection(db, 'solicitudes'), where('state', '>=', userParam.role - 2))
            break
          case 7:
            q = query(collection(db, 'solicitudes'), where('state', '>=', 6))
            break
          default:
            if (getAllDocs.includes(userParam.role) && ![1, 9].includes(userParam.role)) {
              q = query(collection(db, 'solicitudes'), where('state', '>=', userParam.role - 1))
            }
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

// Obtener los datos de un rol
const getRoleData = async role => {
  console.log(role)
  const docRef = doc(db, 'roles', role)
  const docSnap = await getDoc(docRef)
  let data = docSnap.data()
  data.id = docSnap.id

  return data
}

const getData = async id => {
  const docRef = doc(db, 'users', id)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data()
  } else {
    return undefined
  }
}

// const users = await getUserData('getUsers', 'Plant1', { shift: 'ShiftA' });
// const allPlantUsers = await getUserData('getAllPlantUsers', 'Plant3');
// const allProcureUsers = await getUserData('getAllProcureUsers');

const getUserData = async (type, plant, options = {shift: ''}) => {
  const coll = collection(db, 'users');
  let path;

  switch (type) {
    case 'getUsers':
      path = options.shift !== ''
        ? query(coll, where('plant', 'array-contains-any', plant), where('shift', '!=', options.shift), where('role', '==', 2))
        : query(coll, where('plant', 'array-contains', plant), where('role', '==', 3));
      break;

    case 'getAllPlantUsers':
      if (plant) {
        path = query(coll, where('plant', '==', plant));
      } else {
        return [];
      }
      break;

    case 'getAllProcureUsers':
      path = query(coll, where('company', '==', 'Procure'));
      break;

    default:
      throw new Error(`Invalid type: ${type}`);
  }

  const querySnapshot = await getDocs(path);
  const allDocs = [];

  querySnapshot.forEach(doc => {
    const userObj = {
      ...doc.data(),
      id: doc.id
    };
    allDocs.push(userObj);
  });
  console.log(allDocs)

  return allDocs;
};

const getPetitioner = async (plant, userParam) => {
  const q = query(collection(db, 'users'), where('plant', 'array-contains', plant));

  const querySnapshot = await getDocs(q);

  const allDocs = querySnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  }));

  if (userParam.plant === 'allPlants') {
    return allDocs.filter(doc => doc.role === 2);
  } else if (userParam.role === 3) {
    return allDocs;
  } else {
    const docRef = doc(db, 'users', userParam.uid);
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
      allDocs.push({ ...docSnapshot.data(), id: docSnapshot.id });
    }

    return allDocs;
  }
};


// Obtener los usuarios receptores de una planta específica
const getReceiverUsers = async plant => {
  // Consultar la colección 'users' con los filtros de planta y rol
  const q1 = query(collection(db, 'users'), where('plant', 'array-contains', plant), where('role', '==', 2))
  const q2 = query(collection(db, 'users'), where('role', '==', 3))
  const q3 = query(collection(db, 'users'), where('role', '==', 4))
  const querySnapshot1 = await getDocs(q1)
  const querySnapshot2 = await getDocs(q2)
  const querySnapshot3 = await getDocs(q3)
  const allDocs = []

  querySnapshot1.forEach(doc => {
    // Obtener los datos de cada usuario receptor y agregarlos al array 'allDocs'
    allDocs.push({ name: doc.data().name, email: doc.data().email, phone: doc.data().phone, id: doc.id })
  })
  querySnapshot2.forEach(doc => {
    // Obtener los datos de cada usuario receptor y agregarlos al array 'allDocs'
    allDocs.push({ name: doc.data().name, email: doc.data().email, phone: doc.data().phone, id: doc.id })
  })
  querySnapshot3.forEach(doc => {
    // Obtener los datos de cada usuario receptor y agregarlos al array 'allDocs'
    allDocs.push({ name: doc.data().name, email: doc.data().email, phone: doc.data().phone, id: doc.id })
  })

  return allDocs
}


// Consultar si existen solicitudes para una fecha específica
const dateWithDocs = async date => {
  if (!date || !date.seconds) {
    return
  }

  const allDocs = []

  //const dateUnix = getUnixTime(date) // Convierte la fecha a segundos Unix
  const q = query(collection(db, 'solicitudes'), where('start', '==', date))
  const querySnapshot = await getDocs(q)

  querySnapshot.forEach(doc => {
    // doc.data() is never undefined for query doc snapshots
    allDocs.push({ ...doc.data(), id: doc.id })
  })

  if (allDocs.length > 0) {
    return `La fecha que está tratando de agendar tiene ${allDocs.length} Solicitudes. Le recomendamos seleccionar otro día`
  } else {
    return 'Fecha Disponible'
  }
}

// Consultar si un día está bloqueado en la base de datos
const consultBlockDayInDB = async date => {
  const fechaTimestamp = Timestamp.fromMillis(date) // Convierte a objeto Timestamp de Firebase
  const docRef = doc(collection(db, 'diasBloqueados'), date.toString())

  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    if (data.blocked === true) {
      // Si el día ya está bloqueado, lo desbloquea en el documento
      return { msj: `El día que ha seleccionado se encuentra inhabilitado, motivo: ${data.cause} `, blocked: true }
    } else {
      let msj = await dateWithDocs(fechaTimestamp)

      return { msj, blocked: false }
    }
  } else {
    let msj = await dateWithDocs(fechaTimestamp)

    return { msj, blocked: false }
  }
}

// Consultar si existe un número SAP en la base de datos de solicitudes
const consultSAP = async sap => {
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

    // Recorrer cada documento y obtener información adicional del usuario asociado
    await Promise.all(
      sapDocs.map(async docItem => {
        // Obtener la referencia del usuario asociado al documento
        const userRef = doc(db, 'users', docItem.data().uid)
        const userQuerySnapshot = await getDoc(userRef)
        const author = userQuerySnapshot.data().name

        if (docItem.data().ot) {
          // Si el documento tiene una OT asignada, agregarlo al arreglo 'sapWithOt'
          sapWithOt.push({
            ot: docItem.data().ot,
            author,
            objective: docItem.data().objective,
            title: docItem.data().title
          })
        } else {
          // Si el documento no tiene una OT asignada, agregarlo al arreglo 'sap'
          sap.push({ author, objective: docItem.data().objective, title: docItem.data().title })
        }
      })
    )

    if (sap.length > 0) {
      // Si hay solicitudes con OT asignadas, retornar un objeto con información detallada
      messages = sap
        .map(
          item => `Título: ${item.title}\n Solicitante: ${item.author}\n Tipo de Levantamiento: ${item.objective}\n`

          // Si todas las solicitudes están en revisión sin OT asignada, retornar un objeto con información detallada
        )
        .join('\n')
    }

    if (sapWithOt.length > 0) {
      const otMessages = sapWithOt
        .map(
          item =>
            `Título: ${item.title}\n OT: ${item.ot}\n Solicitante: ${item.author}\n Tipo de Levantamiento: ${item.objective}\n`
        )
        .join('\n')

      return {
        exist: true,
        sap,
        sapWithOt,
        msj:
          `Existen ${sap.length + sapWithOt.length} solicitudes con este número SAP, de las cuales ${
            sapWithOt.length
          } tienen OT asignadas y ${sap.length} están en revisión:\n\n` +
          otMessages +
          `\n` +
          messages
      }
    } else {
      // Si no hay documentos con el número SAP, retornar un objeto indicando que es un nuevo número SAP
      return {
        exist: true,
        sap,
        msj:
          `Existen ${sap.length} solicitudes con este número SAP que se encuentran en revisión para ser aprobadas:\n\n` +
          messages
      }
    }
  } else {
    return { exist: false, msj: 'Nuevo número SAP registrado' }
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
  const coll = collection(db, 'solicitudes');
  let queries = [];

  switch (type) {
    case 'all':
      queries.push(getCountFromServer(coll));
      break;

    case 'byPlants':
      const plantQueries = options.plants.map(plant =>
        query(coll, where('plant', '==', plant))
      );
      queries = plantQueries.map(getCountFromServer);
      break;

    case 'byState':
      const q1 = query(coll, where('state', '>=', 1), where('state', '<', 6));
      const q2 = query(coll, where('state', '>=', 6), where('state', '<', 10));
      const q3 = query(coll, where('state', '==', 10));
      queries = [q1, q2, q3].map(getCountFromServer);
      break;

    default:
      throw new Error(`Invalid type: ${type}`);
  }

  const snapshots = await Promise.all(queries);
  const counts = snapshots.map(snapshot => snapshot.data().count);

return counts;
};


const consultObjetives = async (type, options = {}) => {
  const coll = collection(db, 'solicitudes');
  let queryFunc;

  switch (type) {
    case 'all':
      queryFunc = async () => {
        const q = query(coll, where('state', '>=', 6));
        const snapshot = await getCountFromServer(q);

return snapshot.data().count;
      };
      break;

    case 'week':
      queryFunc = async () => {
        const startDate = moment().startOf('isoWeek').toDate();
        const endDate = moment().endOf('isoWeek').toDate();
        const documentsByDay = Array(7).fill(0);
        const q = query(coll, where('state', '>=', 6));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
          const start = doc.data().start.toDate();
          const dayOfWeek = moment(start).isoWeekday();
          if (moment(start).isSameOrAfter(startDate) && moment(start).isSameOrBefore(endDate)) {
            documentsByDay[dayOfWeek - 1]++;
          }
        });

        return documentsByDay;
      };
      break;

    case 'lastSixMonths':
      queryFunc = async () => {
        const currentDate = moment();
        const monthsData = [];
        const queries = [];

        for (let i = 0; i < 6; i++) {
          const monthStartDate = currentDate.clone().subtract(i, 'months').startOf('month').toDate();
          const monthEndDate = currentDate.clone().subtract(i, 'months').endOf('month').toDate();

          const q = query(coll, where('start', '>=', monthStartDate), where('start', '<=', monthEndDate));
          queries.push(getDocs(q));
        }

        const snapshots = await Promise.all(queries);

        snapshots.forEach((snapshot, index) => {
          const filteredDocs = snapshot.docs.filter(doc => doc.data().state >= 6);
          const cant = filteredDocs.length;
          const monthStartDate = currentDate.clone().subtract(index, 'months').startOf('month');
          const month = capitalize(monthStartDate.locale('es').format('MMM'));
          monthsData.unshift({ month, cant });
        });

        return monthsData;
      };
      break;

    case 'byPlants':
      queryFunc = async () => {
        const queries = options.plants.map(async plant => {
          const q = query(coll, where('plant', '==', plant), where('state', '>=', 6));
          const snapshot = await getDocs(q);

return snapshot.size;
        });

        const results = await Promise.all(queries);

return results;
      };
      break;

    case 'byState':
      queryFunc = async () => {
        const q1 = query(coll, where('state', '==', 6));
        const q2 = query(coll, where('state', '==', 7));
        const q3 = query(coll, where('state', '>=', 8), where('state', '<', 10));
        const queryAllStates = [q1, q2, q3];

        const promises = queryAllStates.map(query => getCountFromServer(query));
        const snapshots = await Promise.all(promises);
        const documentsByState = snapshots.map(snapshot => snapshot.data().count);

return documentsByState;
      };
      break;

    default:
      throw new Error(`Invalid type: ${type}`);
  }

  return queryFunc();
};


const getUsersWithSolicitudes = async () => {
  const collSolicitudes = collection(db, 'solicitudes')
  const qSolicitudes = query(collSolicitudes)
  const solicitudesSnapshot = await getDocs(qSolicitudes)

  const solicitudesByUser = {}

  solicitudesSnapshot.forEach(doc => {
    const { uid } = doc.data()
    if (uid) {
      if (solicitudesByUser[uid]) {
        solicitudesByUser[uid].docs++
      } else {
        solicitudesByUser[uid] = {
          id: uid,
          docs: 1
        }
      }
    }
  })

  const sortedUsers = Object.values(solicitudesByUser).sort((a, b) => b.docs - a.docs)
  const limitedUsers = sortedUsers.slice(0, 10)

  // Consulta adicional a la colección 'users'
  const collUsers = collection(db, 'users')
  const usersSnapshot = await getDocs(collUsers)

  const usersWithProperties = limitedUsers.map(user => {
    const userSnapshot = usersSnapshot.docs.find(doc => doc.id === user.id)
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
      return user
    }
  })

  return usersWithProperties
}

// Obtener usuarios con rol 8 según su turno
const getUserProyectistas = async shift => {
  // Definir la consulta con una condición de igualdad en el campo 'shift'
  const q = query(collection(db, 'users'), where('role', '==', 8), where('shift', '==', shift))

  // Obtener los documentos que coinciden con la consulta
  const proyectistasQuerySnapshot = await getDocs(q)

  // Obtener la lista de documentos
  const proyectistasDocs = proyectistasQuerySnapshot.docs

  // Crear un arreglo para almacenar todos los documentos
  let allDocs = []

  // Recorrer cada documento y agregarlo al arreglo 'allDocs'
  proyectistasDocs.forEach(doc => {
    if (doc.data().urlFoto) {
      allDocs.push({ userId: doc.id, name: doc.data().name, avatar: doc.data().urlFoto })
    } else {
      allDocs.push({ userId: doc.id, name: doc.data().name }) //, unit: doc.data().unit
    }
  })

  return allDocs
}

export {
  useEvents,
  useSnapshot,
  getData,
  getUserData,
  getRoleData,
  getPetitioner,
  getReceiverUsers,
  consultBlockDayInDB,
  consultSAP,
  consultUserEmailInDB,
  consultDocs,
  consultObjetives,
  getUsersWithSolicitudes,
  getUserProyectistas,
}
