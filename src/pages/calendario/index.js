// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'

// ** Tooltip
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'

const moment = require('moment')

// ** Hooks
import { useTheme } from '@mui/material/styles'
import { useSettings } from 'src/@core/hooks/useSettings'
import { useFirebase } from 'src/context/useFirebase'

// ** FullCalendar & App Components Imports
import CalendarWrapper from 'src/@core/styles/libs/fullcalendar'

// ** React Import
import { useEffect, useRef, useState } from 'react'

// ** Full Calendar & it's Plugins
import FullCalendar from '@fullcalendar/react'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'

// ** Component Imports
import { Typography } from '@mui/material'
import filterByLabel from 'src/@core/components/custom-filters/customFilters'
import { FullScreenDialog } from 'src/@core/components/dialog-fullsize'
import FilterComponent from 'src/@core/components/filter-component'
import generateFilterConfig from 'src/@core/components/filter-configs/filterConfigs'

const AppCalendar = () => {
  // ** Añade el ref para el calendario, para poder acceder a sus métodos en calendarOptions
  const calendarRef = useRef()

  // ** Initial Event format
  const initialEvent = {
    title: 'title',
    state: 'state',
    description: 'desc',
    start: 'start',
    user: 'user',
    date: 'date',
    area: 'area',
    id: 'id'
  }

  // ** Hooks
  const { settings } = useSettings()

  // ** Vars
  const { skin, direction } = settings

  const {
    authUser,
    useSolicitudesEnRango,
    getRoleData,
    getDomainData,
    consultBlockDayInDB,
    blockDayInDatabase,
    subscribeToBlockDayChanges
  } = useFirebase()

  // ** Rango visible del calendario. `datesSet` lo actualiza cada vez que
  // cambias de mes o de vista; hasta que FullCalendar lo informe, no se
  // consulta nada.
  const [rangoVisible, setRangoVisible] = useState({ desde: null, hasta: null })

  // ** Hook para obtener los datos de la base de datos
  //
  // Antes era useSnapshot(false, authUser), que baja las 1.844 solicitudes
  // completas -unos 3,5 MB desde Estados Unidos- para pintar los ~54 eventos
  // de un mes: el 97% no se veía. Ahora se pide solo el rango visible.
  const data = useSolicitudesEnRango(authUser, rangoVisible.desde, rangoVisible.hasta)
  // ** Hook para obtener el tema
  const theme = useTheme()

  // ** State
  const [roleData, setRoleData] = useState({ name: 'admin' })
  const [open, setOpen] = useState(false)
  const [doc, setDoc] = useState(initialEvent)
  const [filterConfig, setFilterConfig] = useState({})
  const [filters, setFilters] = useState({})
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [blockResult, setBlockResult] = useState([])
  const [consultationResult, setConsultationResult] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [domainData, setDomainData] = useState({})

  // useEffect para buscar la información de la Tabla de Dominio cuando se monta el componente
  useEffect(() => {
    const getAllDomainData = async () => {
      try {
        // Se llama a toda la información disponible en colección domain (tabla de dominio)
        const domain = await getDomainData()

        // Manejo de errores para evitar Warning en Consola
        if (!domain) {
          console.error('No se encontraron los datos o datos son indefinidos o null.')

          return
        }

        // Se almacena la información de Tabla de Dominio en una variable de Entorno
        setDomainData(domain)
      } catch (error) {
        console.error('Error buscando los datos:', error)
      }
    }

    getAllDomainData()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToBlockDayChanges(setBlockResult)

    return () => {
      unsubscribe()
    }
  }, [])

  // ** Función para abrir el modal al hacer click en un evento
  const handleModalToggle = clickedEvent => {
    let document = data.find(doc => doc.id === clickedEvent.id)
    setDoc(document)
    setOpen(true)

    //setModalOpen(!modalOpen)
  }

  const handleClose = () => {
    setOpen(false)
    setDoc(initialEvent)
  }

  // ** Función para generar la configuración de los filtros
  useEffect(() => {
    setFilterConfig(generateFilterConfig(authUser))
  }, [authUser])

  // ** Función para obtener el rol del usuario
  useEffect(() => {
    const role = async () => {
      if (authUser) {
        const role = await getDomainData('roles', authUser.role.toString())
        setRoleData(role)
      }
    }

    role()
  }, [])

  // ** Función para cambiar de filtro
  const handleFilterChange = (key, value) => {
    setFilters(prevValues => ({
      ...prevValues,
      [key]: value
    }))
  }

  // Adds data-based filters
  const filterByPlant = () => filterByLabel('plant', 'Planta', data)
  const filterByJobType = () => filterByLabel('objective', 'Objetivo', data)
  // Updates filter config when data changes
  useEffect(() => {
    let jobType = filterByJobType()
    let plant = filterByPlant()
    setFilterConfig(prevConfig => ({
      ...prevConfig,
      ...jobType,
      ...plant
    }))
  }, [data])
  // Applies filters to data

  const applyFilters = (events, activeFilters) => {
    return events.filter(event => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true // Mantener si el filtro no está seleccionado

        return filterConfig[value].filterFunction(event)
      })
    })
  }

  // ** Función para agregar un motivo al bloquear un día
  const handleBlockReasonChange = event => {
    setBlockReason(event.target.value)
  }

  // ** Función para bloquear un día en la base de datos
  const handleBlockConfirmation = async () => {
    await blockDayInDatabase(dayDialogOpen, blockReason)
    setOpen(false)
    setDayDialogOpen(false)
    setBlockReason('')
    setDoc(initialEvent)
  }

  // ** Función para establecer el color de los eventos
  const setColor = doc => {
    let color
    switch (doc.type) {
      case undefined:
        color = theme.palette.secondary.main
        break
      case 'Shutdown':
        color = theme.palette.error.main
        break
      case 'Outage':
        color = theme.palette.warning.main
        break
      case 'Normal':
      default:
        color = theme.palette.primary.main
        break
    }

    if (doc.userRole === 7) {
      color = theme.palette.black.main
    }

    return color
  }

  // ** Función para establecer el título de los eventos
  const eventResume = doc => {
    let ot = ''
    let n_request = ''
    let plant = ''
    let realTitle = ''

    if (doc.ot) {
      ot = doc.ot
    }

    if (doc.n_request) {
      n_request = doc.n_request
    }

    if (doc.title) {
      realTitle = doc.title
    }

    if (doc.plant) {
      plant = doc.plant
    }

    let title = doc.ot ? `OT ${doc.ot} - ${doc.title}` : doc.title

    return { resume: { realTitle: realTitle, ot: ot, n_request: n_request, plant: plant }, title: title }
  }

  // ** Opciones de configuración del calendario
  const calendarOptions = {
    ref: calendarRef,
    // ** Formato eventos filtrados
    events: applyFilters(data, filters).map(a => ({
      title: eventResume(a).title,
      start: a.start.seconds * 1000,
      ...(a.end && { end: (a.end.seconds + 1 * 24 * 60 * 60) * 1000 }),
      allDay: true,
      id: a.id,
      description: a.description,
      backgroundColor: setColor(a),
      borderColor: 'transparent',
      resume: eventResume(a).resume
    })),
    // ** Agregar tooltip a los eventos
    eventDidMount: function (info) {
      tippy(info.el, {
        content: `
        OT Procure: ${info.event.extendedProps.resume.ot || 'No definida'}<br />
        N° Solicitud: ${info.event.extendedProps.resume.n_request}<br />
        Título: ${info.event.extendedProps.resume.realTitle}<br />
        Planta: ${info.event.extendedProps.resume.plant}<br />
      `,
        allowHTML: true,
        theme: 'light' // O el tema que desees
      })
    },
    eventWillUnmount: function (info) {
      if (info.el.tooltip) {
        info.el.tooltip.dispose()
      }
    },
    // ** Vistas del calendario
    plugins: [interactionPlugin, dayGridPlugin, timeGridPlugin, listPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      start: 'sidebarToggle, prev, next, title, showFilters,',
      end: 'dayGridMonth,listMonth'
    },
    // ** Función para abrir el modal al hacer click en un evento
    eventClick: ({ event: clickedEvent }) => {
      handleModalToggle(clickedEvent)
    },
    views: {
      week: {
        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' }
      }
    },
    locale: 'es',
    buttonText: {
      month: 'mes',
      list: 'lista'
    },
    height: 'auto',
    contentHeight: 'auto',
    eventDisplay: 'block',
    nextDayThreshold: '00:00:00',
    firstDay: 1,
    // ** Función para establecer el color de los días según la semana
    dayCellClassNames: function (date) {
      const foundObject = blockResult.find(obj => {
        const objTimestamp = new Date(obj.timestamp).setHours(0, 0, 0, 0) // Establece los segundos, milisegundos a 0
        const objDate = date.date.setHours(0, 0, 0, 0) // Establece los segundos, milisegundos a 0

        return objTimestamp === objDate
      })

      if (foundObject && foundObject.value.blocked) {
        return 'blocked' // Retorna 'week' si el día está bloqueado
      } else {
        const week = moment(date.date).isoWeek()
        let color = week % 2 == 0 && !date.isToday && 'week'

        return color
      }
    },
    fixedWeekCount: false,
    dateClick: async function (info) {
      const result = await consultBlockDayInDB(new Date(info.date).getTime())
      if (result.blocked || authUser.role === 5) {
        setConsultationResult(result)
        setDayDialogOpen(info.date)
      }
    },
    datesSet: async function (params) {
      // Cambió el mes o la vista: se pide ese rango y no la colección entera.
      setRangoVisible({ desde: params.start, hasta: params.end })

      const startDate = params.start.getTime()
      const endDate = params.end.getTime()

      const timestamps = []

      let currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        const timestamp = Math.floor(currentDate.getTime())
        timestamps.push(timestamp)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Realizar todas las consultas de forma asíncrona
      const results = await Promise.all(
        timestamps.map(async timestamp => {
          const value = await consultBlockDayInDB(timestamp)

          return { timestamp, value }
        })
      )

      // Filtrar y agregar los resultados bloqueados al estado (evitando duplicados)
      const blockedResults = results.filter(result => result.value.blocked)
      // Verificar y agregar los resultados bloqueados al estado (evitando duplicados)
      setBlockResult(prevResults => {
        const existingTimestamps = prevResults.map(result => result.timestamp)
        const newResults = blockedResults.filter(result => !existingTimestamps.includes(result.timestamp))

        return [...prevResults, ...newResults]
      })
    }
  }

  return (
    <>
      <FilterComponent
        filterConfig={filterConfig}
        activeFilters={filters}
        handleFilterChange={handleFilterChange}
        handleClearFilters={setFilters}
        authUser={authUser}
      />

      <CalendarWrapper
        className='app-calendar'
        sx={{
          boxShadow: skin === 'bordered' ? 0 : 6,
          ...(skin === 'bordered' && { border: theme => `1px solid ${theme.palette.divider}` })
        }}
      >
        <Box
          sx={{
            px: 5,
            pt: 3.75,
            flexGrow: 1,
            borderRadius: 1,
            boxShadow: 'none',
            backgroundColor: 'background.paper'

            //si tiene barra en el lado derecho, para que los bordes no sean redondos
            /* ...(mdAbove ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } : {}) */
          }}
        >
          <FullCalendar {...calendarOptions} />
          {open && (
            <FullScreenDialog
              open={open}
              handleClose={handleClose}
              doc={doc}
              roleData={roleData}
              domainData={domainData}
              canComment={authUser.role === 7}
            />
          )}
          {dayDialogOpen && (
            <Dialog sx={{ '.MuiPaper-root': { minWidth: '30%' } }} open={dayDialogOpen}>
              <DialogTitle id='alert-dialog-title'>Información</DialogTitle>
              <DialogContent>
                <DialogContentText id='alert-dialog-description'>{consultationResult.msj}</DialogContentText>
                {authUser.role === 5 && !consultationResult.blocked && (
                  <>
                    <DialogContentText id='alert-dialog-description'>
                      <p>Si quieres bloquear esta fecha, ingresa un motivo:</p>
                    </DialogContentText>
                    <TextField
                      autoFocus
                      margin='dense'
                      id='block-reason'
                      label='Motivo'
                      type='text'
                      fullWidth
                      value={blockReason}
                      onChange={handleBlockReasonChange}
                    />
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDayDialogOpen(false)}>Cerrar</Button>
                {authUser.role === 5 && (
                  <Button
                    autoFocus
                    onClick={handleBlockConfirmation}
                    disabled={!blockReason && !consultationResult.blocked}
                  >
                    {consultationResult.blocked ? 'Desbloquear' : 'Bloquear'}
                  </Button>
                )}
              </DialogActions>
            </Dialog>
          )}
        </Box>
      </CalendarWrapper>
      <Box
        sx={{
          mt: 4,
          px: 5,
          py: 4,
          flexGrow: 1,
          borderRadius: 1,
          boxShadow: 'none',
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant='h6'>Simbología de colores:</Typography>
        <Chip label='Shutdown' sx={{ mx: 1.5, my: 3, bgcolor: theme.palette.error.main }} />
        <Chip label='Outage' sx={{ mx: 1.5, my: 3, bgcolor: theme.palette.warning.main }} />
        <Chip label='Normal' sx={{ mx: 1.5, my: 3, bgcolor: theme.palette.primary.main }} />
        <Chip label='Urgencia' sx={{ mx: 1.5, my: 3, bgcolor: theme.palette.black.main }} />
      </Box>
    </>
  )
}

AppCalendar.acl = {
  subject: 'calendario'
}

export default AppCalendar
