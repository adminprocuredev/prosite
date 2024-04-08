import * as React from 'react'
import { useState, useEffect } from 'react'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useFirebase } from 'src/context/useFirebase'
import { unixToDate } from 'src/@core/components/unixToDate'

// ** MUI Imports
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import Select from '@mui/material/Select'
import CustomChip from 'src/@core/components/mui/chip'
import { Typography, IconButton, Dialog, CircularProgress, DialogContent } from '@mui/material'
import { Button } from '@mui/material'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import { DataGrid, esES } from '@mui/x-data-grid'
import {
  DataGridPremium,
  GridToolbarContainer,
  GridToolbarExport,
  GridColDef,
  GridRowsProp
} from '@mui/x-data-grid-premium'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import { Container } from '@mui/system'
import AlertDialog from 'src/@core/components/dialog-warning'
import { FullScreenDialog } from 'src/@core/components/dialog-fullsize'
import { DialogDoneProject } from 'src/@core/components/dialog-doneProject'

import { DialogAssignProject } from 'src/@core/components/dialog-assignProject'

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import EngineeringIcon from '@mui/icons-material/Engineering'
import { Pause } from '@mui/icons-material'

const TableLevantamiento = ({ rows, role, roleData }) => {
  const [open, setOpen] = useState(false)
  const [openEvents, setOpenEvents] = useState(false)
  const [openDone, setOpenDone] = useState(false)
  const [openAlert, setOpenAlert] = useState(false)
  const [doc, setDoc] = useState({})
  const [proyectistas, setProyectistas] = useState([])
  const [loadingProyectistas, setLoadingProyectistas] = useState(true)
  const [approve, setApprove] = useState(true)
  const { updateDocs, authUser, getUserData, domainDictionary } = useFirebase()
  const [isLoading, setIsLoading] = useState(false)

  const defaultSortingModel = [{ field: 'date', sort: 'desc' }]

  const handleClickOpen = doc => {
    setDoc(doc)
    setOpen(true)
  }

  const handleClickOpenEvents = doc => {
    setDoc(doc)
    setOpenEvents(true)
  }

  const handleClickOpenDone = doc => {
    setDoc(doc)
    setOpenDone(true)
  }

  const handleCloseEvents = () => {
    setOpenEvents(false)
  }

  const handleCloseDone = () => {
    setOpenDone(false)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleClickOpenAlert = (doc, isApproved) => {
    setDoc(doc)
    setOpenAlert(true)
    setApprove(isApproved)
  }

  const handlePause = doc => {
    setDoc(doc)
    setApprove({ pendingReschedule: true })
    setOpenAlert(true)
  }

  const writeCallback = () => {
    setIsLoading(true)
    updateDocs(doc.id, approve, authUser)
      .then(() => {
        setIsLoading(false)
        setOpenAlert(false)
      })
      .catch(error => {
        setIsLoading(false)
        console.error(error)
      })
  }

  const handleCloseAlert = () => {
    setOpenAlert(false)
  }

  const theme = useTheme()
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const md = useMediaQuery(theme.breakpoints.up('md'))
  const xl = useMediaQuery(theme.breakpoints.up('xl'))

  //const resultProyectistas = getUserProyectistas(authUser.shift)

  useEffect(() => {
    // Busca el documento actualizado en rows
    const updatedDoc = rows.find(row => row.id === doc.id)

    // Actualiza el estado de doc con el documento actualizado
    if (updatedDoc) {
      setDoc(updatedDoc)
    }
  }, [rows])

  useEffect(() => {
    const fetchProyectistas = async () => {
      const resProyectistas = await getUserData('getUserProyectistas', null, authUser)
      setProyectistas(resProyectistas)
      setLoadingProyectistas(false)
    }

    fetchProyectistas()
  }, [authUser.shift])

  const titleLocalWidth = Number(localStorage.getItem('titleLevantamientosWidthColumn'))
  const otLocalWidth = Number(localStorage.getItem('otLevantamientosWidthColumn'))
  const stateLocalWidth = Number(localStorage.getItem('stateLevantamientosWidthColumn'))
  const plantLocalWidth = Number(localStorage.getItem('plantLevantamientosWidthColumn'))
  const dateLocalWidth = Number(localStorage.getItem('dateLevantamientosWidthColumn'))
  const startLocalWidth = Number(localStorage.getItem('startLevantamientosWidthColumn'))
  const endLocalWidth = Number(localStorage.getItem('endLevantamientosWidthColumn'))
  const deadlineLocalWidth = Number(localStorage.getItem('deadLineLevantamientosWidthColumn'))
  const daysToDeadlineLocalWidth = Number(localStorage.getItem('daysToDeadLineLevantamientosWidthColumn'))
  const assignLocalWidth = Number(localStorage.getItem('assignLevantamientosWidthColumn'))
  const doneLocalWidth = Number(localStorage.getItem('doneLevantamientosWidthColumn'))

  const columns = [
    {
      field: 'title',
      headerName: 'Solicitud',
      width: titleLocalWidth ? titleLocalWidth : 220,
      minWidth: 180,
      maxWidth: 460,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('titleLevantamientosWidthColumn', params.colDef.computedWidth)

        return (
          <Tooltip
            title={row.title}
            placement='bottom-end'
            key={row.title}
            leaveTouchDelay={0}
            //TransitionComponent={Fade}
            TransitionProps={{ timeout: 0 }}
          >
            <Box sx={{ overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => handleClickOpenEvents(row)}>
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
      field: 'ot',
      headerName: 'OT',
      width: otLocalWidth ? otLocalWidth : 50,
      minWidth: 50,
      maxWidth: 80,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('otLevantamientosWidthColumn', params.colDef.computedWidth)

        return <div>{row.ot || 'N/A'}</div>
      }
    },
    {
      field: 'state',
      headerName: 'Estado',
      width: stateLocalWidth ? stateLocalWidth : 120,
      minWidth: 80,
      maxWidth: 240,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('stateLevantamientosWidthColumn', params.colDef.computedWidth)
        let state = (row.state || row.state === 0) && typeof row.state === 'number' ? row.state : 100

        return (
          <CustomChip
            size='small'
            color={domainDictionary[state].color}
            label={domainDictionary[state].title}
            sx={{ '& .MuiChip-label': { textTransform: 'capitalize' } }}
          />
        )
      }
    },
    {
      field: 'plant',
      headerName: 'Planta',
      width: plantLocalWidth ? plantLocalWidth : 120,
      minWidth: 80,
      maxWidth: 320,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('plantLevantamientosWidthColumn', params.colDef.computedWidth)

        return <div>{row.plant || 'N/A'}</div>
      }
    },
    {
      field: 'date',
      headerName: 'Creación',
      width: dateLocalWidth ? dateLocalWidth : 90,
      minWidth: 60,
      maxWidth: 120,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('dateLevantamientosWidthColumn', params.colDef.computedWidth)

        return <div>{unixToDate(row.date.seconds)[0]}</div>
      }
    },
    {
      field: 'start',
      headerName: 'Inicio de Levantamiento',
      width: startLocalWidth ? startLocalWidth : 120,
      minWidth: 80,
      maxWidth: 190,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('startLevantamientosWidthColumn', params.colDef.computedWidth)

        return <div>{unixToDate(row.start.seconds)[0]}</div>
      }
    },
    {
      field: 'end',
      headerName: 'Fin de Levantamiento',
      width: endLocalWidth ? endLocalWidth : 120,
      minWidth: 80,
      maxWidth: 180,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('endLevantamientosWidthColumn', params.colDef.computedWidth)

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
        localStorage.setItem('deadLineLevantamientosWidthColumn', params.colDef.computedWidth)

        return <div>{(row.deadline && unixToDate(row.deadline.seconds)[0]) || 'Pendiente'}</div>
      }
    },
    {
      field: 'daysToDeadline',
      headerName: 'Días por Vencer',
      width: daysToDeadlineLocalWidth ? daysToDeadlineLocalWidth : 120,
      minWidth: 90,
      maxWidth: 180,
      valueGetter: params => params.row.daysToDeadline,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('daysToDeadLineLevantamientosWidthColumn', params.colDef.computedWidth)

        return <div>{row.daysToDeadline || 'Pendiente'}</div>
      }
    },
    {
      field: 'assign',
      headerName: 'Asignar',
      width: assignLocalWidth ? assignLocalWidth : 90,
      minWidth: 60,
      maxWidth: 120,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('assignLevantamientosWidthColumn', params.colDef.computedWidth)

        return (
          <>
            {md ? (
              row.state === 6 ? (
                <>
                  <Button
                    onClick={role === 7 ? () => handleClickOpen(row) : null}
                    variant='contained'
                    color='secondary'
                    sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
                  >
                    <EngineeringIcon sx={{ fontSize: 18 }} />
                  </Button>
                </>
              ) : row.state === 7 ? (
                'Asignado'
              ) : (
                'Terminado'
              )
            ) : row.state === 6 ? (
              <>
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
                  <Container sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Button
                      onClick={role === 7 ? () => handleClickOpen(row) : null}
                      variant='contained'
                      color='secondary'
                      sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
                    >
                      <EngineeringIcon sx={{ fontSize: 18 }} />
                    </Button>
                  </Container>
                </Select>
              </>
            ) : row.state === 7 ? (
              'Asignado'
            ) : (
              'Terminado'
            )}
          </>
        )
      }
    },
    {
      width: doneLocalWidth ? doneLocalWidth : 120,
      minWidth: 60,
      maxWidth: 160,
      field: 'done',
      headerName: 'Terminar / pausar',
      renderCell: params => {
        const { row } = params
        localStorage.setItem('doneLevantamientosWidthColumn', params.colDef.computedWidth)

        const RenderButtons = () => {
          return (
            role === 7 && (
              <>
                <Button
                  onClick={() => handleClickOpenDone(row)}
                  variant='contained'
                  color='success'
                  sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
                >
                  <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                </Button>
                {!row.pendingReschedule && (
                  <Button
                    onClick={() => handlePause(row)}
                    variant='contained'
                    color='secondary'
                    sx={{ margin: '5px', maxWidth: '25px', maxHeight: '25px', minWidth: '25px', minHeight: '25px' }}
                  >
                    <Pause sx={{ fontSize: 18 }} />
                  </Button>
                )}
              </>
            )
          )
        }

        return (
          <>
            {md ? (
              row.state === 7 ? (
                <>
                  <RenderButtons />
                </>
              ) : row.state === 6 ? (
                'Sin asignar'
              ) : (
                'Terminado'
              )
            ) : row.state === 7 ? (
              <>
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
                  <Container sx={{ display: 'flex', flexDirection: 'column' }}>
                    <RenderButtons />
                  </Container>
                </Select>
              </>
            ) : row.state === 6 ? (
              'Sin asignar'
            ) : (
              'Terminado'
            )}
          </>
        )
      }
    }
  ]

  return (
    <Card>
      <Box sx={{ height: 500 }}>
        <DataGridPremium
          hideFooterSelectedRowCount
          rows={rows}
          columns={columns}
          columnVisibilityModel={{
            ot: md,
            end: md,
            assign: md,
            done: md,

            actions: roleData.canApprove,
            assign: authUser.role === 7,
            done: authUser.role === 7
          }}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          sortingModel={defaultSortingModel}
        />
        <AlertDialog
          open={openAlert}
          handleClose={handleCloseAlert}
          callback={writeCallback}
          approves={approve}
        ></AlertDialog>
        {loadingProyectistas ? (
          <p>Loading...</p>
        ) : (
          <DialogAssignProject open={open} handleClose={handleClose} doc={doc} proyectistas={proyectistas} />
        )}
        {
          <Dialog open={isLoading}>
            <DialogContent>
              <CircularProgress />
            </DialogContent>
          </Dialog>
        }
        {openEvents && (
          <FullScreenDialog
            open={openEvents}
            handleClose={handleCloseEvents}
            doc={doc}
            roleData={roleData}
            editButtonVisible={false}
            canComment={authUser.role === 7}
          />
        )}
        {openDone && <DialogDoneProject open={openDone} handleClose={handleCloseDone} doc={doc} roleData={roleData} />}
      </Box>
    </Card>
  )
}

export default TableLevantamiento
