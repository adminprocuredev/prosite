import { useEffect, useState } from 'react'

// ** Firebase Imports
import {
  Timestamp,
  collection,
  collectionGroup,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  or,
  orderBy,
  query,
  where
} from 'firebase/firestore'
import { db } from 'src/configs/firebase'
import { crearLectorDeNombres } from './nombreCache'
import { buscaPorNombre, faltaDatoPara } from './requisitosDeUsuarios'
import { agruparActividadReciente, ventanaActividadReciente } from './actividadReciente'
import { desdeCuando, laVentanaAplicaA } from './ventanaDeSolicitudes'

import { unixToDate } from 'src/@core/components/unixToDate'

// Librería

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

/**
 * Solicitudes cuyo levantamiento cae dentro de un rango de fechas.
 *
 * Existe para el calendario, que usaba `useSnapshot` y por lo tanto bajaba las
 * 1.844 solicitudes completas —unos 3,5 MB desde Estados Unidos— para pintar
 * los ~54 eventos de un mes. El 97% de lo que descargaba no se veía.
 *
 * Aquí se pide solo el rango que se está mirando, y se vuelve a pedir cuando
 * cambias de mes. Nadie echa de menos datos que no caben en la pantalla.
 *
 * El filtro va sobre `start` porque es el campo con el que el calendario ubica
 * cada evento. Es la única desigualdad de la consulta, así que le basta el
 * índice de campo único que Firestore mantiene solo.
 *
 * `state >= 1` se aplica en el cliente y no en la consulta: sumarlo sería una
 * segunda desigualdad, y Firestore obligaría entonces a ordenar por ambos
 * campos y a crear un índice compuesto. Sobre unas decenas de documentos
 * filtrar aquí no cuesta nada.
 *
 * @param {Object} userParam - Usuario conectado; sin él no se consulta.
 * @param {Date} desde - Primer día visible.
 * @param {Date} hasta - Último día visible.
 */
const useSolicitudesEnRango = (userParam, desde, hasta) => {
  const [data, setData] = useState([])

  // Las fechas llegan como objetos nuevos en cada render: comparar por valor
  // evita rehacer la suscripción en cada pintada.
  const desdeEnMs = desde ? desde.getTime() : null
  const hastaEnMs = hasta ? hasta.getTime() : null

  useEffect(() => {
    // Sin usuario o sin rango no hay nada que mostrar, y hay que VACIAR: al
    // cerrar sesión o al cambiar de cuenta, quedarse con lo anterior sería
    // enseñarle a alguien las solicitudes de otra persona.
    if (!userParam || desdeEnMs === null || hastaEnMs === null) {
      setData([])

      return
    }

    // Un levantamiento que empezó antes del mes visible y sigue corriendo
    // dentro de él igual se dibuja, así que la ventana se abre hacia atrás.
    //
    // ponytail: techo conocido. La consulta trae los que EMPIEZAN en la
    // ventana, no los que la cruzan, así que un levantamiento de más de 90
    // días que arrancó antes del margen no aparecería. Alcanzarlo con
    // exactitud pedía una segunda desigualdad sobre `end` —otra consulta y un
    // índice compuesto— y a los levantamientos de faena, que duran días o
    // semanas, no les hace falta. Si alguna vez desaparece uno largo del
    // calendario, la salida es subir este número, no rehacer el hook.
    const MARGEN_EN_DIAS = 90
    const inicioConMargen = new Date(desdeEnMs - MARGEN_EN_DIAS * 24 * 60 * 60 * 1000)

    const q = query(
      collection(db, 'solicitudes'),
      where('start', '>=', Timestamp.fromDate(inicioConMargen)),
      where('start', '<=', Timestamp.fromDate(new Date(hastaEnMs)))
    )

    const comienzo = Date.now()

    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        try {
          const solicitudes = querySnapshot.docs
            .map(d => ({ ...d.data(), id: d.id }))
            .filter(solicitud => typeof solicitud.state === 'number' && solicitud.state >= 1)

          setData(solicitudes)
          console.info(
            `[calendario] ${solicitudes.length} de ${querySnapshot.size} en el rango · ` +
              `${querySnapshot.metadata.fromCache ? 'desde caché' : 'del servidor'} · ${Date.now() - comienzo} ms`
          )
        } catch (error) {
          console.error('Error al armar los eventos del calendario:', error)
        }
      },
      error => {
        console.error('Firestore rechazó la consulta del calendario:', error.code, error.message)
        setData([])
      }
    )

    return () => unsubscribe()
  }, [userParam, desdeEnMs, hastaEnMs])

  return data
}

// ** Escucha cambios en los documentos en tiempo real
//
// Devuelve `{ filas, cargando }` y no el arreglo pelado. `cargando` existe
// porque la tabla arrancaba con `[]` y sin nada que distinguiera "todavía no
// llega" de "no hay": el DataGrid mostraba **«Sin filas»** durante los primeros
// segundos, que es una respuesta —equivocada— a la pregunta del usuario, no un
// aviso de que está trabajando. Medido en producción: el cartel aparecía al
// segundo y la primera fila llegaba a los siete.
const useSnapshot = (datagrid = false, userParam, control = false, mesesDeVentana = null) => {
  const [data, setData] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (userParam) {
      // Cambió el usuario o el rol: lo que se ve es de la consulta anterior.
      setCargando(true)
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

      // LA VENTANA DE FECHAS. El porqué —y por qué no es paginación— está en
      // `ventanaDeSolicitudes.js`, junto con la lista de roles a los que se les
      // puede aplicar sin pedir un índice compuesto.
      //
      // Va sobre `date`, que es el mismo campo por el que ordena la foto rápida
      // de abajo: Firestore exige que el primer `orderBy` sea el de la
      // desigualdad, y aquí coinciden, así que la foto sigue siendo válida.
      const desde = datagrid && !control && laVentanaAplicaA(userParam.role) ? desdeCuando(mesesDeVentana) : null

      if (desde) {
        q = query(q, where('date', '>=', Timestamp.fromDate(desde)))
      }

      // CARGA EN DOS TIEMPOS
      //
      // Este hook alimenta CINCO pantallas -Solicitudes, Calendario, Gabinete,
      // Levantamientos y Editar usuarios- y todas esperan a que lleguen las
      // 1.844 solicitudes completas: unos 3,5 MB desde `nam5`, en Estados
      // Unidos, con la gente en faena.
      //
      // Primero se pide una foto de las más recientes, que es lo que se ve al
      // abrir: la pantalla queda usable de inmediato. El listener completo de
      // siempre sigue detrás y la reemplaza en cuanto llega, así que el
      // resultado final es exactamente el mismo de antes —mismos filtros,
      // mismo orden, mismo total, mismo tiempo real—.
      //
      // OJO CON EL ALCANCE: esto NO cubre las cinco pantallas. Solo las
      // consultas sin desigualdad, o sea la tabla de solicitudes y la de
      // levantamientos para los roles 1, 4, 5 y 6 —que son los que traen la
      // colección entera y más esperan—. El calendario y el gabinete filtran
      // por `state` y quedan igual que antes; el porqué está abajo.
      //
      // La foto SOLO se hace cuando la consulta no tiene desigualdad. Firestore
      // exige que el primer orderBy sea el campo de la desigualdad, así que con
      // `state >= N` habría que ordenar por `state` antes que por `date`, y el
      // límite se aplica DESPUÉS del orden compuesto: las 200 primeras serían
      // las de menor `state`, no las más recientes. En el calendario eso podría
      // mostrar cero eventos del mes actual. Una foto que miente es peor que no
      // tener foto.
      //
      // Con eso quedan cubiertos los roles 1, 4, 5 y 6, que son justamente los
      // que traen la colección entera y más esperan hoy. Las consultas con
      // `state >= N` -el calendario entre ellas- necesitan otra solución:
      // acotar por el rango de fechas que se está mirando, que además es lo
      // natural ahí. Va aparte.
      //
      // DOS LÍMITES CONOCIDOS de la foto, los dos sin consecuencia porque es un
      // adelanto y el listener completo la reemplaza:
      //
      // - `orderBy('date')` deja fuera las solicitudes sin ese campo, y con
      //   fechas de tipos mezclados -un string donde debería haber Timestamp-
      //   el orden de Firestore no coincide con el que aplica `segundosDe`
      //   después, así que la foto puede traer una fila rara y dejar afuera una
      //   reciente. El listener completo no ordena en la consulta y sí las trae.
      // - Si el armado del completo falla, la pantalla se queda con las 200 de
      //   la foto y el error solo va a la consola. Son datos parciales, no
      //   incorrectos, y se corrigen al siguiente cambio o al recargar.
      // ponytail: 50 es la perilla. Eran 200, y cada solicitud pesa ~4,66 kB
      // —medido contra producción—, o sea ~930 kB en la ruta crítica del primer
      // pintado; con 50 son ~230 kB. En pantalla caben 13 filas, así que 50 son
      // cuatro pantallas de margen para alcanzar a desplazarse antes de que
      // llegue el listener completo. El techo conocido: durante esos segundos
      // el pie dice «Filas Totales: 50» y quien baje hasta el fondo llega al
      // final de la foto, no al de la tabla. Si molesta, se sube este número y
      // se paga en descarga.
      const TAMANO_DE_LA_FOTO = 50
      const sinDesigualdad = datagrid && [1, 4, 5, 6].includes(userParam.role)

      const consultaRapida = sinDesigualdad ? query(q, orderBy('date', 'desc'), limit(TAMANO_DE_LA_FOTO)) : null

      // Los autores se resuelven en tandas dentro de una sola consulta, no con
      // un getDoc por usuario. El lector vive FUERA del onSnapshot: así lo ya
      // leído se conserva entre snapshots y una actualización cualquiera no
      // vuelve a pedir los mismos nombres. El precio es que un cambio de nombre
      // se ve al recargar la página, no al instante.
      const nombresDe = crearLectorDeNombres(async uids => {
        const snapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', uids)))

        return new Map(snapshot.docs.map(d => [d.id, d.data().name]))
      })

      // Ordena por 'date' descendente.
      //
      // `segundosDe` existe porque esto era `b.date.seconds - a.date.seconds`:
      // UNA sola solicitud sin `date` -o con date null, o migrada a otro tipo-
      // lanzaba TypeError, reventaba el callback entero y la tabla no pintaba
      // NINGUNA fila. Sin filas, sin error visible y sin forma de saber por
      // qué. Las que no tienen fecha se van al final.
      const segundosDe = solicitud =>
        typeof solicitud?.date?.seconds === 'number'
          ? solicitud.date.seconds
          : typeof solicitud?.date?.toDate === 'function'
          ? Math.floor(solicitud.date.toDate().getTime() / 1000)
          : -Infinity

      const armarFilas = async docs => {
        const nombres = await nombresDe(docs.map(d => d.data().uid))

        return docs
          .map(d => {
            const docData = d.data()

            return { ...docData, id: d.id, name: nombres.get(docData.uid) }
          })
          .sort((a, b) => segundosDe(b) - segundosDe(a))
      }

      // Firestore no espera a que termine un snapshot para entregar el
      // siguiente, y aquí se espera a leer los nombres antes de pintar: sin
      // este número de orden, un snapshot lento podía resolver DESPUÉS de uno
      // más nuevo y devolver la tabla a un estado viejo —con solicitudes ya
      // borradas, o estados anteriores— hasta que llegara otro cambio.
      let ultimoSnapshot = 0
      let completoPintado = false
      let descartada = false

      // La foto de las más recientes. Se pinta solo si el completo todavía no
      // se pintó: en cuanto llega manda él, que trae todo y en vivo.
      //
      // La bandera dice "el completo YA SE PINTÓ", no "el callback empezó": si
      // se marcara al entrar y luego fallara el armado, se descartaría una foto
      // válida y la pantalla quedaría sin datos teniendo un adelanto utilizable.
      if (consultaRapida) {
        const comienzoFoto = Date.now()
        getDocs(consultaRapida)
          .then(async foto => {
            if (completoPintado || descartada) return
            const filas = await armarFilas(foto.docs)
            if (completoPintado || descartada) return
            setData(filas)

            // La foto NO apaga el indicador, a propósito. Trae 50 filas de
            // 1.849: apagarlo aquí diría "esto es todo", y un filtro sobre esas
            // 50 respondería «Sin filas» a una solicitud que sí existe —el
            // mismo falso negativo que esto viene a matar, movido de lugar—.
            // Con las filas en pantalla y la barra encendida, el DataGrid dice
            // las dos cosas a la vez: ya hay algo, y todavía viene más.
            console.info(`[solicitudes] foto de ${foto.size} filas en ${Date.now() - comienzoFoto} ms`)
          })
          .catch(error => {
            // La foto es un adelanto: si falla -por ejemplo, porque falta su
            // índice-, se registra y se sigue esperando al listener completo,
            // que es el que de verdad alimenta la pantalla.
            console.warn('No se pudo traer la foto rápida de solicitudes:', error.code, error.message)
          })
      }

      const unsubscribe = onSnapshot(
        q,
        async querySnapshot => {
          const miTurno = ++ultimoSnapshot
          const comienzo = Date.now()

          try {
            const sortedDocs = await armarFilas(querySnapshot.docs)

            if (miTurno === ultimoSnapshot && !descartada) {
              // Solo un snapshot CONFIRMADO POR EL SERVIDOR cancela la foto.
              // Firestore emite primero lo que tenga en caché -a veces vacío-, y
              // marcar ahí habría descartado la foto para volver a esperar los
              // 1.844 documentos: justo lo que esto viene a evitar.
              if (!querySnapshot.metadata.fromCache) {
                completoPintado = true
              }
              setData(sortedDocs)
              setCargando(false)
            }

            // De dónde salen los segundos que tarda la tabla. Sin esto solo se
            // puede especular: Firestore, los nombres de usuario y el pintado
            // son tres tiempos distintos y hay que saber cuál manda.
            console.info(
              `[solicitudes] completo: ${querySnapshot.size} filas · ` +
                `${querySnapshot.metadata.fromCache ? 'desde caché' : 'del servidor'} · ` +
                `${Date.now() - comienzo} ms`
            )
          } catch (error) {
            console.error('Error al obtener los documentos de Firestore: ', error)

            // Se apaga igual: si el armado falla en cada snapshot, dejar el
            // `cargando` encendido cambia una tabla vacía por una tabla que
            // gira para siempre. Las dos están mal, pero la que gira además
            // promete que algo viene.
            //
            // Con el mismo resguardo que el camino bueno: un armado de la
            // consulta ANTERIOR que reviente después de cambiar de usuario no
            // tiene por qué apagar el indicador de la consulta nueva.
            if (miTurno === ultimoSnapshot && !descartada) {
              setCargando(false)
            }
          }
        },

        // Sin este callback, un índice que falte o un rechazo de las reglas
        // dejaba la tabla vacía y muda: Firestore avisa por aquí, no por el
        // try/catch de arriba.
        error => {
          console.error('Firestore rechazó la consulta de solicitudes:', error.code, error.message)
          setData([])
          setCargando(false)
        }
      )

      // Devuelve una función de limpieza que se ejecuta al desmontar el componente
      return () => {
        // `descartada` invalida la foto en vuelo: si el efecto se rehace
        // -cambia el usuario o el rol- y la foto anterior termina después,
        // pintaría solicitudes que ya no corresponden a la consulta actual.
        descartada = true
        unsubscribe()
      }
    } else {
      // Sin usuario no hay consulta ni nada que esperar: aquí la tabla vacía SÍ
      // es la respuesta, y dejarla girando sería la mentira contraria.
      //
      // Y se VACÍA. Quedarse con las filas de quien acaba de salir es enseñarle
      // las solicitudes de otra persona a quien entre después en el mismo
      // equipo —lo mismo que ya obligó a limpiar el `localStorage` al cerrar
      // sesión—. Hoy los guards desmontan la tabla antes de que se vea, así que
      // esto es el cinturón, no el freno.
      setData([])
      setCargando(false)
    }
    // `mesesDeVentana` va en las dependencias: sin el, mover el selector no
    // rehace la suscripcion y la tabla se queda con la ventana anterior.
    //
    // `datagrid` y `control` tambien, aunque hoy los cuatro llamadores los pasen
    // como literales y no puedan cambiar: el cuerpo los lee para armar la
    // consulta, y el dia que alguien los haga variables la tabla mostraria lo
    // que pidio el render anterior sin una sola pista de por que.
  }, [userParam, mesesDeVentana, datagrid, control])

  return { filas: data, cargando }
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

        // Se devuelve {} y no null a proposito: quien llama hace
        // Object.keys(...), Object.entries(...) o dictionary[estado] sin
        // comprobar antes, y con null eso lanza TypeError y mata la pantalla
        // completa. Con {} el resultado queda vacio y la pantalla se dibuja.
        return {}
      }
    }
  } catch (error) {
    console.error('Error al obtener datos:', error)

    return {}
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
    // Buscar al solicitante por NOMBRE es otra consulta y no necesita la
    // planta. Esto vivía más abajo, DESPUÉS de la consulta por planta: con una
    // planta válida funcionaba, pero dialog-fullsize la llama con `plant` nulo
    // a propósito y ahí reventaba antes de llegar, así que buscar por nombre
    // desde el detalle de una solicitud devolvía null siempre. El error solo se
    // veía en la consola del navegador.
    if (buscaPorNombre(type, userParam)) {
      const porNombre = await getDocs(query(coll, where('name', '==', userParam.name)))

      // El nombre no es único en `users`: nada impide dos personas homónimas.
      // Se devuelve el primero -como se hacía antes- pero queda registrado,
      // porque aquí un homónimo significa atribuirle la solicitud a otro.
      if (porNombre.size > 1) {
        console.warn(`Hay ${porNombre.size} usuarios llamados "${userParam.name}": se usa el primero.`)
      }

      return porNombre.empty ? null : porNombre.docs[0].data()
    }

    // Sin el dato que la consulta necesita no se consulta: Firestore rechaza
    // un `where()` con undefined y la excepción se comía el catch de abajo.
    const falta = faltaDatoPara(type, plant, userParam)
    if (falta) {
      console.warn(`getUserData('${type}') sin ${falta}: no se consulta y se devuelve la lista vacía.`)

      return allDocs
    }

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
      // La búsqueda por nombre estaba aquí y se movió arriba, antes de la
      // consulta por planta: era inalcanzable.
      // Verificar el tipo de usuario actual y agregarlo al arreglo si corresponde
      if (userParam.plant === 'allPlants') {
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
      // CONTAR NO ES BAJAR.
      //
      // Estos dos casos devuelven NÚMEROS, y hasta ahora los conseguían
      // bajando la colección entera y midiendo el arreglo con `.size`. Las
      // solicitudes pesan ~8,6 MB —30 campos con arreglos de mapas, medido
      // contra producción—, y `byPlants` lo hacía SEIS veces más, una por
      // planta: unos 60 MB desde `nam5`, en Estados Unidos, para pintar siete
      // números en la portada.
      //
      // `getCountFromServer` los cuenta en el servidor y trae solo la cifra:
      // medido contra producción, **1,3 s y 0 kB** contra 1,2 s y 8,6 MB. La
      // latencia es la misma; lo que desaparece es la descarga, que es lo que
      // ahogaba el canal con la gente en faena.
      //
      // No es un patrón nuevo en este archivo: `consultObjetives` y
      // `consultBluePrints` ya cuentan así.
      case 'all':
        const snapshotAll = await getCountFromServer(query(coll))

        return snapshotAll.data().count

      case 'byPlants':
        const resultsByPlants = await Promise.all(
          options.plants.map(async plant => {
            const snapshotPlant = await getCountFromServer(query(coll, where('plant', '==', plant)))

            return snapshotPlant.data().count
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

/**
 * Consultas sobre los entregables de TODAS las solicitudes.
 *
 * Los entregables viven en subcolecciones (`solicitudes/{id}/blueprints`), y
 * los tres casos de aquí recorrían las solicitudes una por una pidiendo la
 * suya: con 486 solicitudes eran 487 viajes a us-central1 —486 de ellos
 * disparados a la vez con un solo Promise.all— y 1567 documentos bajados
 * enteros para mostrar un número. Es lo que dejaba la portada en "Cargando
 * datos...".
 *
 * `collectionGroup` consulta las subcolecciones de una sola vez y
 * `getCountFromServer` cuenta en el servidor sin traer un documento: Firestore
 * cobra una lectura por cada mil contadas.
 *
 * Una consulta de grupo alcanza a CUALQUIER subcolección llamada `blueprints`,
 * no solo a las que cuelgan de `solicitudes`. Hoy los 1567 entregables están
 * bajo `/solicitudes/{id}/blueprints/` y no hay ninguno en otra parte —medido
 * en BigQuery—, pero si algún día se crea otra colección con ese nombre, estos
 * tres indicadores la contarían.
 *
 * OJO CON EL ORDEN DE DESPLIEGUE. Los índices de alcance COLLECTION_GROUP no
 * se crean solos —Firestore solo genera automáticamente los de alcance
 * COLLECTION—, así que las tres consultas de aquí responden
 * `failed-precondition` hasta que se despliegan los `fieldOverrides` de
 * firestore.indexes.json:
 *
 *     firebase deploy --only firestore:indexes --project procureterrenoweb
 *
 * Van ANTES que el sitio. No hay camino de respaldo a propósito: el recorrido
 * viejo se limitaba a solicitudes con `state >= 8` mientras que el grupo mira
 * todos los entregables, así que convivir con los dos hacía que el número
 * cambiara solo por desplegar un índice, sin que cambiaran los datos.
 */
const consultBluePrints = async (type, options = {}) => {
  const entregables = collectionGroup(db, 'blueprints')
  let queryFunc

  switch (type) {
    case 'finished':
      queryFunc = async () => {
        // Antes se sumaba `counterBlueprintCompleted` de cada solicitud, un
        // campo que no escribe nadie —ni el sitio ni las Cloud Functions—: el
        // `|| 0` lo volvía cero y la portada mostraba "0 Entregables
        // Finalizados" como si fuera un dato. Son 12.
        const snapshot = await getCountFromServer(query(entregables, where('blueprintCompleted', '==', true)))

        return snapshot.data().count
      }
      break

    case 'last30daysRevisions':
      queryFunc = async () => {
        const thirtyDaysAgo = Timestamp.fromDate(moment().subtract(30, 'days').toDate())

        // Aquí sí hacen falta los documentos: la portada los agrupa por
        // revisión y por turno. El turno sale de la fecha del propio
        // entregable —determineShift(doc.date)—, no de la solicitud, así que
        // el filtro va sobre el entregable. El recorrido viejo filtraba por la
        // fecha de la SOLICITUD, que es otra cosa: una solicitud de hace dos
        // meses con una revisión de ayer no entraba.
        const snapshot = await getDocs(query(entregables, where('date', '>=', thirtyDaysAgo)))

        return snapshot.docs.map(doc => doc.data())
      }
      break

    case 'existingBlueprints':
      queryFunc = async () => {
        // Los borrados se restan en vez de excluirse con
        // where('deleted','!=',true): en Firestore un `!=` deja fuera a los
        // documentos que NO tienen el campo, y 1554 de los 1567 entregables no
        // lo tienen. Esa consulta habría devuelto 13 —los borrados— en lugar
        // de 1554.
        const [total, borrados] = await Promise.all([
          getCountFromServer(entregables),
          getCountFromServer(query(entregables, where('deleted', '==', true)))
        ])

        // Son dos agregaciones independientes, sin instante común: si alguien
        // borra un entregable entre una y otra, la resta puede quedar corta o
        // incluso negativa. Un contador a la vista nunca muestra -1.
        return Math.max(0, total.data().count - borrados.data().count)
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

    // Los dos gráficos de levantamientos, de UNA consulta.
    //
    // Eran siete: 'week' pedía `where('state','>=',6)` sin ventana de fechas
    // —las 1622 solicitudes enteras, ~7,4 MB, para pintar siete barras que
    // suman 7— y 'lastSixMonths' pedía cada mes por su cuenta. El porqué del
    // reemplazo y el reparto en meses y días están en `actividadReciente.js`.
    case 'actividadReciente':
      queryFunc = async () => {
        // UNA sola hora para pedir y para repartir. Con dos `moment()` —uno
        // antes del await y otro después— una carga que cruce la medianoche del
        // último día del mes pide marzo-agosto y reparte abril-septiembre: el
        // mes más viejo se descarta entero y el más nuevo sale a medias.
        const ahora = moment()
        const { desde, hasta } = ventanaActividadReciente(ahora)

        const snapshot = await getDocs(query(coll, where('start', '>=', desde), where('start', '<', hasta)))

        return agruparActividadReciente(
          snapshot.docs.map(documento => documento.data()),
          ahora
        )
      }
      break

    case 'byPlants':
      // Consulta para obtener el número de documentos por planta
      queryFunc = async () => {
        // Doce consultas que devuelven NÚMEROS —dos por planta— y que hasta
        // ahora bajaban los documentos enteros para medir el arreglo con
        // `.size`. Igual que en `consultDocs`: se cuentan en el servidor.
        const queries = options.plants.map(async plant => {
          const query1 = query(coll, where('plant', '==', plant), where('state', '>=', 6))
          const query2 = query(coll, where('plant', '==', plant), where('state', '==', 7))

          const [snapshot1, snapshot2] = await Promise.all([
            getCountFromServer(query1),
            getCountFromServer(query2)
          ])

          return {
            query1: snapshot1.data().count,
            query2: snapshot2.data().count
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

// El top 10 mira los ÚLTIMOS TRES MESES, no toda la historia.
//
// Antes contaba las solicitudes desde el principio de los tiempos, y eso tenía
// dos problemas a la vez:
//
// - Costaba **8,6 MB** por carga. Es la única consulta de la portada que baja
//   documentos —agrupar por autor no se puede hacer en el servidor: Firestore
//   no tiene agrupación por campo, y el SDK del navegador no tiene `select()`
//   para pedir solo el `uid`, eso vive en el SDK de administrador—. El resto
//   de la portada ya no baja nada, son conteos.
// - Y mostraba a gente que ya no trabaja aquí. Un ranking histórico no cambia
//   nunca: quien pidió mucho hace tres años se queda arriba para siempre.
//
// Con la ventana se arreglan los dos: pasa a **1,1 MB** medidos contra
// producción —seis meses; tres es todavía menos— y responde a «quién está
// pidiendo más ahora», que es lo que se espera de un panel.
//
// ponytail: la ventana es la perilla. Si algún día quieren ver más atrás, se
// sube este número y se paga en descarga; el techo está aquí escrito.
const MESES_DEL_RANKING = 3

const getUsersWithSolicitudes = async () => {
  const desde = Timestamp.fromDate(moment().subtract(MESES_DEL_RANKING, 'months').toDate())

  const collSolicitudes = collection(db, 'solicitudes') // Obtener referencia a la colección 'solicitudes'
  const qSolicitudes = query(collSolicitudes, where('date', '>=', desde))
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

  // Se piden los DIEZ que se van a mostrar, no los ~240 que hay. Antes se
  // bajaba la colección `users` entera para después buscar diez ids dentro.
  // Diez cabe de sobra en un `in`, cuyo tope real es 30 —probado contra el
  // servidor, que responde «'IN' supports up to 30 comparison values»—, así
  // que sigue siendo UNA consulta.
  const usersSnapshot = limitedUsers.length
    ? await getDocs(query(collection(db, 'users'), where(documentId(), 'in', limitedUsers.map(u => u.id))))
    : { docs: [] }

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

/**
 * Todos los Proyectistas y Supervisores habilitados, de CUALQUIER turno, para
 * poder reasignarles un entregable.
 *
 * Incidencias Gabinete 5 y Solicitudes 2. Hasta ahora el diálogo de reasignar
 * solo ofrecía `gabineteDraftmen`: los proyectistas que ya estaban en esa OT.
 * Con eso no se podía sacar un entregable de alguien que se fue de la empresa
 * —la lista se hereda de cuando se creó la OT— ni pasárselo al turno contrario
 * cuando algo es urgente, que es justo lo que reportaron.
 *
 * Las consultas que ya existían para esto, getUserProyectistas y
 * getUserSupervisor, filtran por el turno de quien consulta, así que tampoco
 * servían: el turno contrario es el caso que hay que resolver.
 *
 * No se filtra por planta a propósito: un entregable puede necesitar a alguien
 * de otra planta, y el gabinete es transversal.
 */
const getUsuariosParaReasignar = async () => {
  const coll = collection(db, 'users')

  try {
    const snapshot = await getDocs(query(coll, where('role', 'in', [7, 8])))

    return snapshot.docs
      .map(documento => {
        const datos = documento.data()

        return {
          userId: documento.id,
          name: datos.name,
          email: datos.email,
          role: datos.role,
          shift: datos.shift,
          enabled: datos.enabled
        }
      })
      // Un usuario deshabilitado no puede recibir trabajo. `enabled` ausente se
      // toma como habilitado: es lo que hace el resto de la aplicación, y dejar
      // fuera a todos los que no tienen el campo vaciaría la lista.
      .filter(usuario => usuario.enabled !== false)
      // Number() por si algún documento guardó el rol como texto: una resta con
      // NaN devuelve NaN y sort deja la lista en cualquier orden, sin avisar.
      .sort((a, b) => Number(a.role) - Number(b.role) || String(a.name).localeCompare(String(b.name), 'es'))
  } catch (error) {
    console.error('Error al obtener los usuarios para reasignar:', error)
    throw error
  }
}


export {
  getUsuariosParaReasignar,
  useEvents,
  useSnapshot,
  useSolicitudesEnRango,
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
