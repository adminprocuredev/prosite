// ** React Imports
import { useState, useEffect } from 'react'

import moment from 'moment'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Icon from 'src/@core/components/icon'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'

// ** Custom Component Import
import ObjetivesByDay from 'src/views/dashboard/ObjetivesByDay'
import ObjetivesByMonth from 'src/views/dashboard/objetivesByMonth'
import ChartBarsDocsByPlants from 'src/views/dashboard/ChartBarsDocsByPlants'
import ChartBarsObjetivesByPlants from 'src/views/dashboard/ChartBarsObjetivesByPlants'
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Demo Components Imports
import ChartDonutObjetivesLast30days from 'src/views/charts/apex-charts/ChartDonutObjetivesLast30days'
import ChartDonutBlueprintsLast30daysByShift from 'src/views/charts/apex-charts/ChartDonutBlueprintsLast30daysByShift'
import ChartDonutDocsLast30days from 'src/views/charts/apex-charts/ChartDonutDocsLast30days'
import Top10UsersWihitMostDocs from 'src/views/dashboard/ecommerce/Top10UsersWihitMostDocs'
import TopPositionCharts from 'src/views/dashboard/ecommerce/TopPositionCharts'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

const Home = () => {
  // ** Hooks
  const { consultDocs, consultObjetives, getUsersWithSolicitudes, consultBluePrints } = useFirebase()

  const [allDocs, setAllDocs] = useState(null)
  const [docsByPlants, setDocsByPlants] = useState(null)
  const [docsByState, setDocsByState] = useState([0, 0, 0])
  const [allObjetives, setAllObjetives] = useState(null)
  const [allBlueprintsFinished, setAllBlueprintsFinished] = useState(null)
  const [allBlueprintsExisting, setAllBlueprintsExisting] = useState(null)
  const [objetivesOfActualWeek, setObjetivesOfActualWeek] = useState([0, 0, 0, 0, 0, 0, 0])
  const [objetivesOfLastSixMonths, setObjetivesOfLastSixMonths] = useState([0, 0, 0, 0, 0, 0])
  const [monthsOfLastSixMonths, setMonthssOfLastSixMonths] = useState(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'])

  const [objetivesByPlants, setObjetivesByPlants] = useState([
    { query1: 0, query2: 0 },
    { query1: 0, query2: 0 },
    { query1: 0, query2: 0 },
    { query1: 0, query2: 0 },
    { query1: 0, query2: 0 },
    { query1: 0, query2: 0 }
  ])
  const [objetivesByState, setObjetivesByState] = useState([0, 0, 0])
  const [top10, setTop10] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [revisionDataInBlueprintA, setRevisionDataInBlueprintA] = useState([0, 0, 0, 0, 0, 0])
  const [revisionDataInBlueprintB, setRevisionDataInBlueprintB] = useState([0, 0, 0, 0, 0, 0])

  const plants = [
    'Planta Concentradora Los Colorados',
    'Planta Concentradora Laguna Seca | Línea 1',
    'Planta Concentradora Laguna Seca | Línea 2',
    'Chancado y Correas',
    'Puerto Coloso',
    'Instalaciones Cátodo'
  ]

  useEffect(() => {
    const fetchData = async () => {
      // UNA consulta que falle no puede llevarse las otras diez.
      //
      // Las tres de entregables son consultas de GRUPO de colecciones, y esas
      // se evalúan contra una regla propia: `match /{path=**}/blueprints/{id}`.
      // Hoy producción solo tiene la anidada —`/solicitudes/{s}/blueprints/{c}`,
      // que no aplica a las de grupo—, así que las tres vuelven con
      // `permission-denied`. Dentro de un `Promise.all` a secas eso dejaba la
      // portada ENTERA sin un solo número, incluidas las ocho consultas que sí
      // funcionan.
      //
      // Con esto, lo que falle se queda en su casilla y el resto se pinta. El
      // aviso dice QUÉ falta, no un "algo salió mal" que no lleva a ninguna
      // parte.
      const loQueFallo = []

      const sinLlevarseElResto = (queEs, promesa, siFalla) =>
        promesa.catch(error => {
          console.error(`Falló "${queEs}" en la portada:`, error.code || '', error.message || error)
          loQueFallo.push(queEs)

          return siFalla
        })

      // El top 10 va POR SU CUENTA, fuera del `Promise.all`.
      //
      // Es la única consulta de la portada que sigue bajando documentos: para
      // ordenar por autor tiene que leer las solicitudes enteras, 8,6 MB desde
      // `nam5`. Dentro del conjunto, esos 8,6 MB retrasaban TODO —los diez
      // números y los seis gráficos esperaban a la tabla del fondo, que es lo
      // último que alguien mira—. Medido en producción: los datos aparecían a
      // los 19,7 s, y el tramo largo era este.
      //
      // Aparte, cada cosa aparece cuando está lista. Su propio `catch` porque
      // ya no lo cubre el `try` de abajo: si falla, se queda la tabla vacía y
      // el resto de la portada ni se entera.
      getUsersWithSolicitudes()
        .then(setTop10)
        .catch(error => console.error('No se pudo armar el top 10 de usuarios:', error))

      try {
        const [
          allDocsCount,
          allBlueprintsFinished,
          allBlueprintsExisting,
          allObjCount,
          weekObj,
          lastSixMonthsObjetives,
          byStateDocs,
          byPlantsDocs,
          byPlantsObj,
          blueprintsLast30days
        ] = await Promise.all([
          consultDocs('all'),
          sinLlevarseElResto('entregables finalizados', consultBluePrints('finished'), null),
          sinLlevarseElResto('entregables existentes', consultBluePrints('existingBlueprints'), null),
          consultObjetives('all'),
          consultObjetives('week'),
          consultObjetives('lastSixMonths'),
          consultDocs('byState'),
          consultDocs('byPlants', { plants }),
          consultObjetives('byPlants', { plants }),
          sinLlevarseElResto('revisiones de los últimos 30 días', consultBluePrints('last30daysRevisions'), [])
        ])

        const [monthArray, cantArray] = lastSixMonthsObjetives.reduce(
          (acc, item) => {
            acc[0].push(item.month)
            acc[1].push(item.cant)

            return acc
          },
          [[], []]
        )

        const statesDoc = [
          [1, 5],
          [6, 9],
          [0, 0]
        ]

        const filteredByStateDocs = statesDoc.map(([start, end]) => {
          const filteredDocs = byStateDocs.filter(doc => {
            const state = doc.state

            return state >= start && state <= end
          })

          return filteredDocs.length
        })

        const statesObj = [6, 7, 8] // valor previo delcarado: [6, [7, 8], 9] - Es el motivo por el que 'filteredByStateObj' implementa: Array.isArray(state)

        const filteredByStateObj = statesObj.map(state => {
          let filteredDocs
          if (Array.isArray(state)) {
            // Si el estado es un array, filtrar los documentos que tienen un estado que está en ese array
            filteredDocs = byStateDocs.filter(doc => state.includes(doc.state))
          } else {
            // Si el estado no es un array, filtrar los documentos que tienen ese estado
            filteredDocs = byStateDocs.filter(doc => doc.state === state)
          }

          return filteredDocs.length
        })

        // Función para determinar si una fecha es turno A o turno B
        const determineShift = date => {
          // el inicio de semana comienza el martes y termine el lunes
          const adjustedDate = moment(date).subtract(1, 'day')
          // Obtener el número de la semana ISO
          const week = moment(adjustedDate).isoWeek()
          // Turno A para semanas pares, Turno B para semanas impares

          return week % 2 === 0 ? 'A' : 'B'
        }

        // Separar los blueprints por turno
        const blueprintsShiftA = blueprintsLast30days.filter(doc => {
          const docDate = doc.date.toDate() // Convierte el timestamp de Firestore a objeto Date

          return determineShift(docDate) === 'A'
        })

        const blueprintsShiftB = blueprintsLast30days.filter(doc => {
          const docDate = doc.date.toDate() // Convierte el timestamp de Firestore a objeto Date

          return determineShift(docDate) === 'B'
        })

        // Filtrar por revisión para turno A
        const revisions = ['Iniciado', 'A', 'B', 'C', '0', '1']

        const filteredByRevisionA = revisions.map(revision => {
          return blueprintsShiftA.filter(doc => doc.revision === revision).length
        })

        // Filtrar por revisión para turno B
        const filteredByRevisionB = revisions.map(revision => {
          return blueprintsShiftB.filter(doc => doc.revision === revision).length
        })

        setAllDocs(allDocsCount)
        setAllObjetives(allObjCount)
        setAllBlueprintsFinished(allBlueprintsFinished)
        setAllBlueprintsExisting(allBlueprintsExisting)
        setObjetivesOfActualWeek(weekObj)
        setObjetivesOfLastSixMonths(lastSixMonthsObjetives)
        setObjetivesOfLastSixMonths(cantArray)
        setMonthssOfLastSixMonths(monthArray)
        setObjetivesByPlants(byPlantsObj)
        setDocsByPlants(byPlantsDocs)
        setDocsByState(filteredByStateDocs)
        setObjetivesByState(filteredByStateObj)
        //setRevisionDataInBlueprint(filteredByRevision)
        // Datos para los gráficos por turno
        setRevisionDataInBlueprintA(filteredByRevisionA)
        setRevisionDataInBlueprintB(filteredByRevisionB)

        setLoading(false)

        if (loQueFallo.length) {
          setErrorCarga(
            `No se pudieron cargar: ${loQueFallo.join(', ')}. El resto del resumen sí está al día. ` +
              'Avisa a soporte; no es un problema de tu conexión.'
          )
        }
      } catch (error) {
        console.error('Error fetching data:', error)

        // Las once consultas van en un solo Promise.all: si UNA falla, fallan
        // todas, y sin esto `loading` se quedaba en true para siempre. La
        // portada mostraba "Cargando datos..." indefinidamente, que se lee
        // como lentitud y no como error. Se apaga el spinner y se avisa.
        setLoading(false)
        setErrorCarga('No se pudieron cargar los datos del resumen. Vuelve a intentarlo o avisa a soporte.')
      }
    }

    fetchData()
  }, [])

  return (
    <Grid container spacing={6} alignItems='stretch' className='match-height' sx={{ display: 'flex' }}>
      {errorCarga && (
        <Grid item xs={12} md={12}>
          <Alert severity='error'>{errorCarga}</Alert>
        </Grid>
      )}
      <Grid item xs={12} md={12}>
        <Card>
          <CardHeader sx={{ pb: 3.25 }} title='Resumen Estadístico' titleTypographyProps={{ variant: 'h6' }} />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CustomAvatar skin='light' variant='rounded' color='primary' sx={{ mr: 4 }}>
                    <Icon icon='mdi:text-box-outline' />
                  </CustomAvatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {allDocs}
                    </Typography>
                    <Typography variant='caption'>Solicitudes</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CustomAvatar skin='light' variant='rounded' color='warning' sx={{ mr: 4 }}>
                    <Icon icon='mdi:progress-upload' />
                  </CustomAvatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {allObjetives}
                    </Typography>
                    <Typography variant='caption'>Levantamientos</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CustomAvatar skin='light' variant='rounded' color='info' sx={{ mr: 4 }}>
                    <Icon icon='mdi:tooltip-edit-outline' />
                  </CustomAvatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {allBlueprintsExisting}
                    </Typography>
                    <Typography variant='caption'> Entregables Existentes</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CustomAvatar skin='light' variant='rounded' color='success' sx={{ mr: 4 }}>
                    <Icon icon='mdi:file-cad' />
                  </CustomAvatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {allBlueprintsFinished}
                    </Typography>
                    <Typography variant='caption'> Entregables Finalizados</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={6}>
        <ObjetivesByDay objetivesOfActualWeek={objetivesOfActualWeek} />
      </Grid>

      <Grid item xs={12} sm={6} md={6}>
        <ObjetivesByMonth
          objetivesOfLastSixMonths={objetivesOfLastSixMonths}
          monthsOfLastSixMonths={monthsOfLastSixMonths}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartDonutBlueprintsLast30daysByShift
          filteredByRevisionBlueprint={revisionDataInBlueprintA}
          shift='A'
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartDonutBlueprintsLast30daysByShift
          filteredByRevisionBlueprint={revisionDataInBlueprintB}
          shift='B'
          loading={loading}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartDonutDocsLast30days docsByState={docsByState} loading={loading} />
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartDonutObjetivesLast30days objetivesByState={objetivesByState} loading={loading} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <ChartBarsDocsByPlants docsByPlants={docsByPlants} loading={loading} />
      </Grid>

      <Grid item xs={12} sm={6} md={6}>
        <ChartBarsObjetivesByPlants objetivesByPlants={objetivesByPlants} />
      </Grid>

      <Grid item xs={12} sm={12} md={12}>
        <Top10UsersWihitMostDocs top10={top10} />
      </Grid>
    </Grid>
  )
}

Home.acl = {
  subject: 'home'
}

export default Home
