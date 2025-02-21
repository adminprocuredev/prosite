import { useEffect, useState } from 'react'

import { Timestamp } from 'firebase/firestore'
import { unixToDate } from 'src/@core/components/unixToDate'
import { useFirebase } from 'src/context/useFirebase'
// import useColumnResizer from 'src/@core/hooks/useColumnResizer'

import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { DataGridPremium, GridToolbarContainer } from '@mui/x-data-grid-premium'
import { esES } from '@mui/x-data-grid-pro'
import { addDays, differenceInDays, format, getWeek } from 'date-fns'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

import { Check, Clear, Edit, MoreHoriz as MoreHorizIcon, OpenInNewOutlined } from '@mui/icons-material'
import { Box, Button, Card, Container, Fade, IconButton, Select, Tooltip, Typography } from '@mui/material'
import { GridColumnMenu, GridColumnMenuPinningItem, GridSortMenuItem } from '@mui/x-data-grid-pro'

import { FullScreenDialog } from 'src/@core/components/dialog-fullsize'
import AlertDialog from 'src/@core/components/dialog-warning'
import CustomChip from 'src/@core/components/mui/chip'

//import moment from 'moment'
import moment from 'moment-timezone'
import 'moment/locale/es'

const TableBasic = ({ rows, role, roleData }) => {
  const [open, setOpen] = useState(false)
  const [openAlert, setOpenAlert] = useState(false)
  const [doc, setDoc] = useState('')
  const [approve, setApprove] = useState(true)
  const [loading, setLoading] = useState(false)
  const [today, setToday] = useState(Timestamp.fromDate(moment().startOf('day').toDate()))

  const [cancelReason, setCancelReason] = useState({
    option: '',
    details: ''
  })

  const [domainData, setDomainData] = useState({})

  const { updateDocs, authUser, domainDictionary, getDomainData } = useFirebase()

  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    // ... otros estados de visibilidad de columnas ...
    end: [1, 5, 6, 7, 8, 9, 10].includes(role),
    supervisorShift: [1, 5, 6, 7, 8, 9, 10].includes(role),
    deadline: [1, 5, 6, 7, 8, 9, 10].includes(role),
    daysToDeadline: [1, 5, 6, 7, 8, 9, 10].includes(role),
    actions: roleData.canApprove,
    plant: false,
    area: false
  })

  const defaultSortingModel = [{ field: 'date', sort: 'desc' }]

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

  const findCurrentDoc = rows => {
    return rows.find(row => row.id === doc.id)
  }

  const handleClickOpen = doc => {
    setDoc(doc)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleClickOpenAlert = (doc, isApproved) => {
    setDoc(doc)
    setOpenAlert(true)
    setApprove(isApproved)
  }

  const onSubmit = async () => {
    setLoading(true)

    let canceled
    if (cancelReason.option === '' && cancelReason.details === '') {
      canceled = false
    } else {
      canceled = true
    }

    const objectToUpload =
      typeof approve === 'boolean' && canceled ? { ...approve, cancelReason: cancelReason } : approve

    await updateDocs(doc.id, objectToUpload, authUser)
      .then(() => {
        setLoading(false)
        setOpenAlert(false)
        setCancelReason({
          option: '',
          details: ''
        })
      })
      .catch(error => {
        setLoading(false)
        alert(error), console.log(error)
      })
  }

  // const writeCallback = () => {
  //   updateDocs(doc.id, approve, authUser)
  //   setOpenAlert(false)
  // }

  const handleCloseAlert = () => {
    setOpenAlert(false)
    setCancelReason({
      option: '',
      details: ''
    })
  }

  const handleCancelReasonChange = event => {
    const { id, value } = event.target

    if (id === 'cancel-reason-option') {
      setCancelReason(prevState => ({
        ...prevState,
        option: value
      }))
    } else if (id === 'cancel-reason-details') {
      // const value = event.target.value
      const trimmedValue = value.trimStart()
      setCancelReason(prevState => ({
        ...prevState,
        details: trimmedValue
      }))
    }
  }

  // Componente personalizado para el menú de columna
  const CustomColumnMenu = props => {
    return (
      <GridColumnMenu
        {...props}
        slots={{
          // opciones que se muestran
          columnMenuSortingItem: GridSortMenuItem,
          columnMenuPinningItem: GridColumnMenuPinningItem,

          // Oculta se ocultan
          columnMenuColumnsItem: null,
          //columnMenuFilterItem: null,
          columnMenuAggregationItem: null,
          columnMenuGroupingItem: null
        }}
      />
    )
  }

  const permissions = (row, role) => {
    if (!row) return

    const isMyRequest = authUser.uid === row.uid
    const isOwnReturned = isMyRequest && row.state === 1
    const hasPrevState = row.state === role - 1
    const createdByPetitioner = row.userRole === 2
    const createdByContOp = row.userRole === 3
    const createdByPlanner = row.userRole === 5
    const createdBySupervisor = row.userRole === 7
    const hasOTEnd = row.ot && row.end
    const isPetitionMadeByMelPetitioner = row.userRole === 2 || row.userRole === 3

    const isPetitionMakeByPlaner =
      role === 3 &&
      row.contop === authUser.displayName &&
      row.state === 8 &&
      createdByPlanner &&
      row.plannerPetitionApprovedByContop === false

    const isContopEmergency =
      role === 3 &&
      row.contop === authUser.displayName &&
      row.state === 8 &&
      row.emergencyApprovedByContop === false &&
      createdBySupervisor

    const dictionary = {
      1: {
        approve: row.state <= 6,
        edit: row.state <= 6,
        reject: row.state <= 6
      },
      2: {
        approve: isOwnReturned,
        edit: isOwnReturned || ([2, 6].includes(row.state) && isMyRequest),
        reject: isMyRequest && row.state <= 6
      },
      3: {
        approve: hasPrevState || isOwnReturned || isContopEmergency || isPetitionMakeByPlaner,
        edit:
          (isOwnReturned || hasPrevState || row.state === 6 || (isMyRequest && row.state === 3)) &&
          !createdBySupervisor &&
          !createdByPlanner,
        reject: row.state <= 6 && !createdBySupervisor && !createdByPlanner
      },
      4: {
        approve: false, // hasPrevState && !createdBySupervisor,
        edit: false, // [3, 6].includes(row.state) && !createdBySupervisor,
        reject: false // row.state <= 6 && !createdBySupervisor
      },
      5: {
        approve:
          hasOTEnd && [1, 3, 4].includes(row.state) && createdByPlanner && !createdBySupervisor && row.state !== 0,
        edit:
          !createdBySupervisor &&
          (createdByPlanner ||
            (createdByPetitioner && [3, 4].includes(row.state)) ||
            (createdByContOp && [3, 4].includes(row.state))) &&
          row.state !== 0,
        reject:
          !createdBySupervisor &&
          (createdByPlanner ||
            (createdByPetitioner && [3, 4].includes(row.state)) ||
            (createdByContOp && [3, 4].includes(row.state))) &&
          row.state !== 0
      },
      6: {
        approve:
          !createdBySupervisor &&
          isPetitionMadeByMelPetitioner &&
          row.state !== 3 &&
          row.state !== 6 &&
          row.state <= 7 &&
          row.state !== 0,
        edit: !createdBySupervisor && isPetitionMadeByMelPetitioner && row.state <= 7 && row.state !== 0,
        reject: [2, 3, 4, 5, 6].includes(row.state) && !createdBySupervisor && row.state <= 7 && row.state !== 0
      },
      7: {
        approve: false,
        edit: false,
        reject: false
      },
      8: {
        approve: hasPrevState,
        edit: false,
        reject: false
      },
      9: {
        approve: false,
        edit: false,
        reject: false
      },
      10: {
        approve: false,
        edit: false,
        reject: false
      }
    }

    return dictionary[role]
  }

  const theme = useTheme()
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const md = useMediaQuery(theme.breakpoints.up('md'))
  const xl = useMediaQuery(theme.breakpoints.up('xl'))

  useEffect(() => {
    // Busca el documento actualizado en rows
    const updatedDoc = rows.find(row => row.id === doc.id)

    // Actualiza el estado de doc con el documento actualizado
    if (updatedDoc) {
      setDoc(updatedDoc)
    }
  }, [rows])

  const titleLocalWidth = Number(localStorage.getItem('titleSolicitudesWidthColumn'))
  const stateLocalWidth = Number(localStorage.getItem('stateSolicitudesWidthColumn'))
  const dateLocalWidth = Number(localStorage.getItem('dateSolicitudesWidthColumn'))
  const startLocalWidth = Number(localStorage.getItem('startSolicitudesWidthColumn'))
  const endLocalWidth = Number(localStorage.getItem('endSolicitudesWidthColumn'))
  const deadlineLocalWidth = Number(localStorage.getItem('deadlineSolicitudesWidthColumn'))
  const daysToDeadlineLocalWidth = Number(localStorage.getItem('daysToDeadlineSolicitudesWidthColumn'))
  const shiftLocalWidth = Number(localStorage.getItem('shiftSolicitudesWidthColumn'))
  const otLocalWidth = Number(localStorage.getItem('otSolicitudesWidthColumn'))
  const userLocalWidth = Number(localStorage.getItem('userSolicitudesWidthColumn'))
  const actionsLocalWidth = Number(localStorage.getItem('actionsSolicitudesWidthColumn'))

  const columns = [
    {
      field: 'title',
      headerName: 'Solicitud',
      width: titleLocalWidth ? titleLocalWidth : 350,
      minWidth: 200,
      maxWidth: 500,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('titleSolicitudesWidthColumn', params.colDef.computedWidth)

        return (
          <Tooltip
            title={row.title}
            placement='bottom-end'
            key={row.title}
            leaveTouchDelay={0}
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 0 }}
          >
            <Box sx={{ overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => handleClickOpen(row)}>
                <OpenInNewOutlined sx={{ fontSize: 18 }} />
              </IconButton>
              <Typography
                sx={{
                  textDecoration: 'none',
                  transition: 'text-decoration 0.2s',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                variant='string'
              >
                {row.title}
              </Typography>
            </Box>
          </Tooltip>
        )
      }
    },
    {
      field: 'state',
      headerName: 'Estado',
      width: stateLocalWidth ? stateLocalWidth : 200,
      minWidth: 100,
      maxWidth: 250,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('stateSolicitudesWidthColumn', params.colDef.computedWidth)
        let state = (row.state || row.state === 0) && typeof row.state === 'number' ? row.state : 100

        return (
          <CustomChip
            size='small'
            color={domainDictionary[state].color}
            label={domainDictionary[state].title}
            sx={{ '& .MuiChip-label': { textTransform: 'capitalize' } }}
          />
        )
      },
      valueGetter: params => {
        const stateValue = params.row.state
        // Utiliza el mismo diccionario para obtener el título correspondiente al valor del estado

        return domainDictionary[stateValue] ? domainDictionary[stateValue].title : 'Desconocido'
      }
    },
    {
      field: 'date',
      headerName: 'Creación',
      width: dateLocalWidth ? dateLocalWidth : 120,
      minWidth: 90,
      maxWidth: 120,
      valueGetter: params => new Date(params.row.date.seconds * 1000),
      //valueGetter: params => unixToDate(params.row.date.seconds)[0],
      renderCell: params => {
        const { row } = params
        localStorage.setItem('dateSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{unixToDate(row.date.seconds)[0]}</div>
      }
    },
    {
      field: 'start',
      headerName: 'Inicio de Levantamiento',
      width: startLocalWidth ? startLocalWidth : 170,
      minWidth: 90,
      maxWidth: 200,
      valueGetter: params => unixToDate(params.row.start.seconds)[0],
      renderCell: params => {
        const { row } = params
        localStorage.setItem('startSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{unixToDate(row.start.seconds)[0]}</div>
      }
    },
    {
      field: 'end',
      headerName: 'Término de Levantamiento',
      width: endLocalWidth ? endLocalWidth : 180,
      minWidth: 90,
      maxWidth: 220,
      valueGetter: params => unixToDate(params.row.end?.seconds)[0],
      renderCell: params => {
        const { row } = params
        localStorage.setItem('endSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{(row.end && unixToDate(row.end.seconds)[0]) || 'Pendiente'}</div>
      }
    },
    {
      field: 'deadline',
      headerName: 'Fecha Límite',
      width: deadlineLocalWidth ? deadlineLocalWidth : 120,
      minWidth: 90,
      maxWidth: 180,
      valueGetter: params => unixToDate(params.row.deadline?.seconds)[0],
      renderCell: params => {
        const { row } = params
        localStorage.setItem('deadlineSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{(row.deadline && unixToDate(row.deadline.seconds)[0]) || 'Pendiente'}</div>
      }
    },
    {
      field: 'daysToDeadline',
      headerName: 'Días por Vencer',
      width: daysToDeadlineLocalWidth ? daysToDeadlineLocalWidth : 120,
      minWidth: 90,
      maxWidth: 180,
      valueGetter: params => unixToDate(params.row.deadline?.seconds)[0], //Hola
      renderCell: params => {
        const { row } = params
        localStorage.setItem('daysToDeadlineSolicitudesWidthColumn', params.colDef.computedWidth)

        return (
          <div>
            {row.deadline
              ? Math.round((row.deadline.toDate().getTime() - today.toDate().getTime()) / (1000 * 24 * 60 * 60))
              : 'Pendiente'}
          </div>
        )
      }
    },
    {
      field: 'supervisorShift',
      maxWidth: 80,
      headerName: 'Turno',
      width: shiftLocalWidth ? shiftLocalWidth : 90,
      minWidth: 80,
      maxWidth: 100,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('shiftSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.supervisorShift || 'Por definir'}</div>
      }
    },
    {
      field: 'ot',
      headerName: 'OT',
      width: otLocalWidth ? otLocalWidth : 90,
      minWidth: 60,
      maxWidth: 100,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('otSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.ot || 'Por definir'}</div>
      }
    },
    {
      field: 'user',
      headerName: 'Autor',
      width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 120,
      maxWidth: 250,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.user}</div>
      }
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: actionsLocalWidth ? actionsLocalWidth : 190,
      minWidth: 120,
      maxWidth: 250,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('actionsSolicitudesWidthColumn', params.colDef.computedWidth)
        const permissionsData = permissions(row, role)
        const canApprove = permissionsData.approve
        const canEdit = permissionsData.edit
        const canReject = permissionsData.reject

        const approveWithChanges = role === 5 && row.state <= 4 && !canApprove && row.userRole !== 5
        //const isRevisado = row.state > role
        const flexDirection = md ? 'row' : 'column'

        const renderButtons = (
          <Container sx={{ display: 'flex', flexDirection: { flexDirection } }}>
            {canApprove && (
              <Button
                onClick={() => handleClickOpenAlert(row, true)}
                variant='contained'
                color='success'
                sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
              >
                <Check sx={{ fontSize: 18 }} />
              </Button>
            )}
            {canEdit && (
              <Button
                onClick={() => handleClickOpen(row)}
                variant='contained'
                color={approveWithChanges ? 'success' : 'secondary'}
                sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
              >
                {approveWithChanges ? <Check sx={{ fontSize: 18 }} /> : <Edit sx={{ fontSize: 18 }} />}
              </Button>
            )}
            {canReject && (
              <Button
                onClick={() => handleClickOpenAlert(row, false)}
                variant='contained'
                color='error'
                sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
              >
                <Clear sx={{ fontSize: 18 }} />
              </Button>
            )}
          </Container>
        )

        return (
          <>
            {(canApprove || canEdit || canReject) && row.state !== 0 ? (
              md ? (
                renderButtons
              ) : (
                <Select
                  labelId='demo-simple-select-label'
                  id='demo-simple-select'
                  size='small'
                  IconComponent={() => <MoreHorizIcon />}
                  sx={{
                    '& .MuiSvgIcon-root': { position: 'absolute', margin: '20%', pointerEvents: 'none !important' },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiSelect-select': { backgroundColor: theme.palette.customColors.tableHeaderBg },
                    '& .MuiList-root': { display: 'flex', flexDirection: 'column' }
                  }}
                >
                  {renderButtons}
                </Select>
              )
            ) : row.state === 0 ? (
              'Rechazado'
            ) : (
              ''
            )}
          </>
        )
      }
    }
  ]

  // Esta es una función que se utiliza para crear una barra de herramientas personalizada para el componente DataGrid.
  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <Button onClick={handleExport}>Exportar</Button>

        {/* <GridToolbarExport csvOptions={{ fileName: 'Data', utf8WithBom: true }} onExport={handleExport} /> */}
      </GridToolbarContainer>
    )
  }

  // handleExport es una función asíncrona que se utiliza para exportar los datos de la tabla a un archivo de Excel.
  const handleExport = async options => {
    // Se crea un nuevo libro de trabajo de Excel.
    const workbook = new ExcelJS.Workbook()
    // Se añade una nueva hoja de trabajo al libro de trabajo y se le asigna el nombre 'Hoja 1'.
    const worksheet = workbook.addWorksheet('Hoja 1')

    // Se definen las columnas de la hoja de trabajo.
    worksheet.columns = [
      // Cada objeto en este array define una columna. La propiedad 'header' es el nombre de la columna que se mostrará en la hoja de trabajo, y la propiedad 'key' es la clave que se utilizará para obtener el valor de la columna de cada fila de datos.
      { header: 'Semana', key: 'week', width: 10 },
      { header: 'Planta', key: 'plant', width: 40 },
      { header: 'Área', key: 'area', width: 50 },
      { header: 'OT', key: 'ot', width: 10 },
      { header: 'Turno', key: 'supervisorShift', width: 10 },
      { header: 'Creación', key: 'date', width: 12 },
      { header: 'Inicio', key: 'start', width: 12 },
      { header: 'Término', key: 'end', width: 12 },
      { header: 'Fecha Límite', key: 'deadline', width: 14 },
      { header: 'Días por Vencer', key: 'daysToDeadline', width: 18 },
      { header: 'Autor', key: 'user', width: 20 },
      { header: 'Solicitante', key: 'petitioner', width: 20 },
      { header: 'Centro de Costo', key: 'costCenter', width: 15 },
      { header: 'SAP', key: 'sap', width: 5 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Estado', key: 'state', width: 25 },
      { header: 'Estado Operacional', key: 'type', width: 15 },
      { header: 'Maquina Detenida', key: 'detention', width: 15 },
      { header: 'Tipo de Levantamiento', key: 'objective', width: 20 },
      { header: 'Entregables', key: 'deliverable', width: 20 },
      { header: 'Contract Operator', key: 'contop', width: 20 }
    ]

    // Se recorren todas las filas de datos.
    rows.forEach(row => {
      // Para cada fila, se crea un nuevo objeto con las propiedades correspondientes a las columnas definidas anteriormente.
      const stateValue = row.state
      const start = new Date(row.start.seconds * 1000)
      const week = getWeek(start)
      const deadline = addDays(start, 21)
      const daysToDeadline = differenceInDays(deadline, new Date())

      // Luego, este objeto se añade a la hoja de trabajo como una nueva fila.
      worksheet.addRow({
        week: week,
        plant: row.plant,
        area: row.area,
        ot: row.ot,
        supervisorShift: row.supervisorShift,
        date: format(new Date(row.date.seconds * 1000), 'dd-MM-yyyy'),
        start: format(new Date(row.start.seconds * 1000), 'dd-MM-yyyy'),
        end: row.end ? format(new Date(row.end.seconds * 1000), 'dd-MM-yyyy') : 'sin fecha de término',
        deadline: deadline,
        daysToDeadline: daysToDeadline,
        user: row.user,
        petitioner: row.petitioner,
        costCenter: row.costCenter,
        sap: row.sap,
        title: row.title,
        description: row.description,
        state: domainDictionary[stateValue].title,
        type: row.type,
        detention: row.detention,
        objective: row.objective,
        deliverable: row.deliverable ? row.deliverable.join(', ') : '',
        contop: row.contop
      })
    })

    // Se establece el formato de la primera fila (la fila de encabezado) a negrita y tamaño de fuente 13.
    worksheet.getRow(1).font = { bold: true, size: 13 }

    // Se escribe el libro de trabajo en un buffer y se guarda en el sistema de archivos local como un archivo .xlsx.
    const buffer = await workbook.xlsx.writeBuffer()
    const dateTime = format(new Date(), 'yyyy-MM-dd/HH:mm:ss')

    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Data${dateTime}.xlsx`
    )
  }

  return (
    <Card>
      <Box sx={{ height: 600 }}>
        <DataGridPremium
          initialState={{
            sorting: {
              sortModel: [{ field: 'date', sort: 'desc' }]
            }
          }}
          hideFooterSelectedRowCount
          rows={rows}
          columns={columns}
          columnVisibilityModel={columnVisibilityModel}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          sortingModel={defaultSortingModel}
          slots={{
            columnMenu: CustomColumnMenu,
            toolbar:
              authUser.role === 1 ||
              authUser.role === 5 ||
              authUser.role === 6 ||
              authUser.role === 7 ||
              authUser.role === 8 ||
              authUser.role === 9 ||
              authUser.role === 10
                ? CustomToolbar
                : null
          }}
        />
        <AlertDialog
          open={openAlert}
          handleClose={handleCloseAlert}
          onSubmit={onSubmit}
          approves={approve}
          loading={loading}
          cancelReason={cancelReason}
          handleCancelReasonChange={handleCancelReasonChange}
          domainData={domainData}
        ></AlertDialog>
        {open && (
          <FullScreenDialog
            open={Boolean(findCurrentDoc(rows), role)}
            handleClose={handleClose}
            doc={findCurrentDoc(rows)}
            roleData={roleData}
            editButtonVisible={permissions(findCurrentDoc(rows), role)?.edit || false}
            domainData={domainData}
            canComment={[5, 6, 7].includes(authUser.role)}
          />
        )}
      </Box>
    </Card>
  )
}

export default TableBasic
