// ** React Imports
import { useEffect, useRef, useState } from 'react'

// ** Hooks
import { useGoogleDriveFolder } from 'src/context/google-drive-functions/useGoogleDriveFolder'
import { useFirebase } from 'src/context/useFirebase'

// ** MUI Imports
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useGridApiRef } from '@mui/x-data-grid'

// ** Demo Components Imports
import tableBody from 'public/html/table.js'
import { DialogAssignGabineteDraftmen } from 'src/@core/components/dialog-assignGabineteDraftmen'
import { DialogCodeGenerator } from 'src/@core/components/dialog-codeGenerator'
import DialogCargaMasiva from 'src/@core/components/dialog-cargaMasiva'
import DialogDeleteBlueprint from 'src/@core/components/dialog-deleteBlueprint'
import ReasignarDialog from 'src/@core/components/dialog-deliverableReassign'
import DialogErrorTransmittal from 'src/@core/components/dialog-errorTransmittal'
import DialogFinishOt from 'src/@core/components/dialog-finishOt'
import TableGabinete from 'src/views/table/data-grid/TableGabinete'
import { COLUMNAS_MAESTRO, armarMaestro } from 'src/views/pages/gabinete/maestroDeEntregables'
import { saveAs } from 'file-saver'

const DataGridGabinete = () => {
  const [currentPetition, setCurrentPetition] = useState(null)
  const [currentOT, setCurrentOT] = useState(null)
  const [currentAutoComplete, setCurrentAutoComplete] = useState(null)
  const [roleData, setRoleData] = useState({ name: 'admin' })
  const [open, setOpen] = useState(false)
  const [proyectistas, setProyectistas] = useState([])
  const [openCodeGenerator, setOpenCodeGenerator] = useState(false)
  const [openFinishOt, setOpenFinishOt] = useState(false)
  const [transmittalGenerated, setTransmittalGenerated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorTransmittal, setErrorTransmittal] = useState(false)
  const [openTransmittalDialog, setOpenTransmittalDialog] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [checkedTypes, setCheckedTypes] = useState({})
  const [showReasignarSection, setShowReasignarSection] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [openCargaMasiva, setOpenCargaMasiva] = useState(false)
  const [gabineteDraftmenState, setGabineteDraftmenState] = useState([])
  const [transmittalNumber, setTransmittalNumber] = useState("")

  const apiRef = useGridApiRef()

  const { uploadFile, findOrCreateFolder, createFolderStructure } = useGoogleDriveFolder()

  const currentPetitionRef = useRef()

  const {
    useSnapshot,
    authUser,
    getUserData,
    useBlueprints,
    generateTransmittalCounter,
    updateSelectedDocuments,
    updateTransmittalCollection,
    finishPetition,
    subscribeToPetition,
    getMaestroDeEntregables
  } = useFirebase()

  let { filas: petitions, cargando } = useSnapshot(false, authUser, true)

  if (authUser.role === 8) {
    petitions = petitions.filter(petition =>
      petition.gabineteDraftmen?.find(item => item.hasOwnProperty('userId') && item['userId'] === authUser.uid)
    )
  }

  const [blueprints, projectistData, otPercent, otReadyToFinish, setBlueprints] = useBlueprints(currentPetition?.id)

  const theme = useTheme()
  const smDown = useMediaQuery(theme.breakpoints.down('sm'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))
  const lgDown = useMediaQuery(theme.breakpoints.down('lg'))
  const xlDown = useMediaQuery(theme.breakpoints.down('xl'))

  const handleClickOpenCodeGenerator = doc => {
    setOpenCodeGenerator(true)
  }

  const finishOtCallback = async () => {
    setIsLoading(true)
    await finishPetition(currentPetition, authUser)
      .then(() => {
        setIsLoading(false)
        setOpenFinishOt(false)
      })
      .catch(error => {
        setIsLoading(false)
        console.error(error)
      })
  }

  // Abre el diálogo de eliminación
  const handleDeleteClick = () => {
    if (selectedRows.length === 1) {
      setIsDeleteDialogOpen(true)
    } else {
      alert('Por favor, selecciona una única fila para borrar.')
    }
  }

  // Cierra el diálogo de eliminación
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
  }

  const handleCloseCodeGenerator = () => {
    setOpenCodeGenerator(false)
  }

  const handleClickOpenFinishOt = doc => {
    setOpenFinishOt(true)
  }

  const handleCloseFinishOt = () => {
    setOpenFinishOt(false)
  }

  const handleClickOpen = doc => {
    setOpen(true)
  }

  const handleClose = () => {
    const doc = petitions.find(petition => petition.ot == currentOT)
    setGabineteDraftmenState(doc.gabineteDraftmen)
    setOpen(false)
  }

  const handleReasignarClick = () => {
    setDialogOpen(true)
  }

  const handleChange = value => {
    setCurrentOT(value?.value)
    const currentDoc = petitions.find(doc => doc.ot == value?.value)
    setCurrentPetition(currentDoc)
  }

  const handleCloseErrorTransmittal = () => {
    setErrorTransmittal(false)
  }

  const handleGenerateTransmittal = async (tableElement, selected, newCode) => {
    // Se carga aqui y no arriba: generate-transmittal arrastra jsPDF y las dos
    // fuentes Calibri, que suman 4,2 MB sin comprimir. Con el import estatico
    // los pagaba todo el que abriera Gabinete, generara un transmittal o no.
    const { generateTransmittal } = await import('src/context/google-drive-functions/generate-transmittal')

    const transmittalLink = await generateTransmittal(
      tableElement,
      selected,
      setTransmittalGenerated,
      newCode,
      currentPetition,
      uploadFile,
      findOrCreateFolder,
      createFolderStructure,
      setIsLoading,
      setOpenTransmittalDialog
    )

    return transmittalLink

  }

  const handleOpenTransmittalDialog = () => {
    // Obtiene los documentos seleccionados del apiRef de DataGrid
    const selectedDocuments = apiRef.current.getSelectedRows()
    setSelectedDocs(Array.from(selectedDocuments.values()))
    // console.log(selectedDocuments)
    if (selectedDocuments.size === 0) {
      setErrorTransmittal(true)
    } else {
      setOpenTransmittalDialog(true)
    }
  }

  const handleClickTransmittalGenerator = async (currentPetition) => {
    try {
      // Actualiza el campo lastTransmittal en cada uno de los documentos seleccionados
      const selected = apiRef.current.getSelectedRows()

      // generateTransmittalCounter ya devuelve el codigo completo y correlativo
      // (21286-000-TT-NNNN), incrementado dentro de una transaccion. Antes se
      // llamaba, se descartaba lo que devolvia, y el codigo se rearmaba con el
      // campo manual: si venia vacio el PDF salia "21286-000-TT-" sin numero, y
      // el contador quedaba con huecos igual. Incidencia Gabinete 2.
      // Se respeta el numero manual cuando el usuario escribe uno, porque ese
      // campo parece intencional; si lo deja vacio, usa el correlativo generado.
      //
      // El contador se pide SOLO cuando no hay numero manual. Pedirlo siempre y
      // descartarlo -como se hacia- gasta un correlativo por cada transmittal
      // escrito a mano: es el mismo hueco que esta incidencia venia a cerrar,
      // por la otra puerta.
      const numeroManual = transmittalNumber?.trim()

      const newCode = numeroManual
        ? `21286-000-TT-${numeroManual}`
        : await generateTransmittalCounter(currentPetition)

      let tableElement = document.createElement('table')
      let numberOfDocuments = selected.size

      selected.forEach((value, key) => {
        if (value.hasOwnProperty('storageHlcDocuments') && value.storageHlcDocuments !== null) {
          numberOfDocuments++
        }
      })

      tableElement.innerHTML = tableBody(newCode, numberOfDocuments)

      if (selected.size === 0) {
        setErrorTransmittal(true)
      } else {
        const transmittalLink = await handleGenerateTransmittal(tableElement, selected, newCode)
        await updateTransmittalCollection (newCode, transmittalLink, selected, currentPetition, authUser)
        await updateSelectedDocuments(newCode, transmittalLink, selected, currentPetition, authUser)
      }
    } catch (error) {
      console.error('Error al generar Transmittal:', error)
      throw new Error('Error al generar Transmittal')
    }
  }

  useEffect(() => {
    if (currentPetition && currentPetition.id) {
      const idDoc = currentPetition.id

      const unsubscribe = subscribeToPetition(idDoc, newPetition => {
        // Compara el nuevo valor con el ref actual
        if (JSON.stringify(newPetition) !== JSON.stringify(currentPetitionRef.current)) {
          setCurrentPetition(newPetition)
          currentPetitionRef.current = newPetition // Actualiza el ref
        }
      })

      // Devuelve una función para limpiar la suscripción
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    }
  }, [currentPetition])

  // Actualiza el ref cuando `currentPetition` cambie
  useEffect(() => {
    currentPetitionRef.current = currentPetition
  }, [currentPetition])

  useEffect(() => {
    if (currentPetition) {
      const fetchRoleAndProyectistas = async () => {
        if (authUser.role === 7) {
          // Carga los proyectistas
          const resProyectistas = await getUserData('getUserProyectistas', null, authUser)
          const resSupervisor = await getUserData('getUserSupervisor', null, authUser)

          // Filtramos solo los que tienen enabled = true
          const filteredProyectistas = resProyectistas.filter(user => user.enabled)
          const filteredSupervisores = resSupervisor.filter(user => user.enabled)

          setProyectistas([...filteredProyectistas, ...filteredSupervisores])
        } else {
          // Carga los proyectistas
          const resProyectistas = await getUserData('getUserProyectistas', null, {shift: [currentPetition.supervisorShift]})
          const resSupervisor = await getUserData('getUserSupervisor', null, {shift: [currentPetition.supervisorShift]})

          // Filtramos solo los que tienen enabled = true
          const filteredProyectistas = resProyectistas.filter(user => user.enabled)
          const filteredSupervisores = resSupervisor.filter(user => user.enabled)

          setProyectistas([...filteredProyectistas, ...filteredSupervisores])
        }
      }

      fetchRoleAndProyectistas()
    }
  }, [authUser, currentPetition])

  useEffect(() => {
    if (transmittalGenerated) {
      // Actualiza 'blueprints'.
      setBlueprints([...blueprints])

      // Luego, restablece el estado a false para estar listo para la próxima generación de transmittal
      setTransmittalGenerated(false)
    }
  }, [transmittalGenerated, setBlueprints])

  const handleCheckboxChange = (projectist, type) => {
    const key = `${projectist}-${type}`

    // Filtra los documentos correspondientes al `projectist` y `type`
    const filteredDocs = blueprints.filter(
      doc => !doc.deleted && doc.userName === projectist && `${doc.id.split('-')[1]}-${doc.id.split('-')[2]}` === type
    )

    // Guardamos el estado actual antes de actualizar
    setCheckedTypes(prevCheckedTypes => {
      const updatedCheckedTypes = { ...prevCheckedTypes }

      // Si el checkbox está marcado, lo agregamos o lo mantenemos en el estado
      if (!updatedCheckedTypes[key]) {
        updatedCheckedTypes[key] = true
      } else {
        // Si el checkbox está desmarcado, lo eliminamos del estado
        delete updatedCheckedTypes[key]
      }

      // Actualiza la selección de filas en la tabla
      setSelectedRows(prevSelectedRows => {
        let updatedRows

        if (updatedCheckedTypes[key]) {
          // Si se selecciona el checkbox grupal, agrega todos los documentos relacionados
          updatedRows = [
            ...prevSelectedRows,
            ...filteredDocs.filter(doc => !prevSelectedRows.some(row => row.id === doc.id))
          ]
        } else {
          // Si se deselecciona el checkbox grupal, elimina todos los documentos relacionados
          updatedRows = prevSelectedRows.filter(row => !filteredDocs.some(doc => doc.id === row.id))
        }

        return updatedRows
      })

      return updatedCheckedTypes
    })
  }

  const renderProjectistSummary = () => {
    return Object.entries(projectistData).map(([projectist, types]) => {
      return (
        <Box key={projectist} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>{projectist}:</Typography>
          {Object.entries(types).map(([type, count]) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={!!checkedTypes[`${projectist}-${type}`]}
                onChange={() => handleCheckboxChange(projectist, type)}
              />
              <Typography>
                {type} ({count} doc{count > 1 ? 's' : ''})
              </Typography>
            </Box>
          ))}
        </Box>
      )
    })
  }

  const handleReasignarToggle = () => {
    setShowReasignarSection(prevState => {
      if (prevState) {
        // Si se está desmarcando el checkbox, limpia la variables de estado: `selectedRows` y `checkedTypes`
        setSelectedRows([])
        setCheckedTypes({})
      }

      return !prevState
    })
  }

  // Incidencia Gabinete 9 — «Permitir descargar un Maestro de los entregables.
  // Se requiere acceder al listado completo de entregables independiente del
  // usuario asignado».
  //
  // La exportacion de la tabla de abajo baja UNA OT por archivo
  // (`Entregables-OT-1216`), asi que el catalogo completo salia de pegar
  // planillas a mano. Cristina Bustamante, de Control Documental, lo volvio a
  // pedir el 20-ago-2026.
  //
  // Los 1567 entregables se piden al APRETAR el boton, no al abrir la pantalla:
  // es una descarga puntual y no tiene por que costarle nada a quien entra a
  // revisar una OT.
  const [descargandoMaestro, setDescargandoMaestro] = useState(false)

  const descargarMaestro = async () => {
    setDescargandoMaestro(true)
    try {
      const entregables = await getMaestroDeEntregables()

      // La OT no vive en el entregable, sino en la solicitud de la que cuelga.
      // `petitions` ya esta en memoria -es la lista del selector de arriba-,
      // asi que traducirla no cuesta un viaje mas.
      const otsPorSolicitud = new Map(petitions.map(solicitud => [solicitud.id, solicitud.ot]))
      const filas = armarMaestro(entregables, otsPorSolicitud)

      if (filas.length === 0) {
        alert('No se encontraron entregables para exportar.')

        return
      }

      // ExcelJS se carga aqui y no arriba: son unos 300 KB comprimidos que si
      // no descargaria todo el que abra el Gabinete, exporte o no.
      const modulo = await import('exceljs')
      const ExcelJS = modulo.default ?? modulo

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Entregables')
      worksheet.columns = COLUMNAS_MAESTRO
      filas.forEach(fila => worksheet.addRow(fila))
      worksheet.getRow(1).font = { bold: true, size: 13 }
      worksheet.views = [{ state: 'frozen', ySplit: 1 }]
      worksheet.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNAS_MAESTRO.length } }

      const buffer = await workbook.xlsx.writeBuffer()
      const hoy = new Date()
      const sello = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Maestro de entregables ${sello}.xlsx`
      )
    } catch (error) {
      console.error('No se pudo descargar el maestro de entregables:', error)
      alert('No se pudo generar el maestro de entregables. Intenta de nuevo o avisa a soporte.')
    } finally {
      setDescargandoMaestro(false)
    }
  }

  return (
    <Box id='main' sx={{ display: 'flex', width: '100%', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex' }}>
        <Autocomplete
          options={petitions.map(doc => ({ value: doc.ot, title: doc.title }))}
          getOptionLabel={option => option.value + ' - ' + option.title + ' '}
          // Mientras la consulta no llega, `petitions` esta vacio y el
          // Autocomplete mostraba «No options»: una respuesta -equivocada- a la
          // pregunta de quien lo abre, no un aviso de que esta trabajando. Es lo
          // mismo que hacia la tabla de solicitudes con «Sin filas», y aqui pesa
          // mas porque la consulta de gabinete trae casi toda la coleccion -1490
          // de 1849, medido contra produccion el 13-ago-2026- y no tiene foto
          // rapida que tape el hueco.
          //
          // MUI solo cambia el texto cuando ademas NO hay opciones
          // (`loading && groupedOptions.length === 0`), asi que esto no esconde
          // nada una vez que llegaron.
          loading={cargando}
          loadingText='Cargando OT…'
          sx={{ mx: 6.5, flexGrow: '9' }}
          onChange={(event, value) => handleChange(value)}
          onInputChange={(event, value) => setCurrentAutoComplete(value)}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderInput={params => <TextField {...params} label='OT' />}
        />

        {/* El rotulo se pintaba solo cuando ya habia un valor
            (`label={otPercent ? '...' : ''}`), asi que mientras no hubiera una
            OT elegida esto era una caja vacia sin nada adentro: nadie podia
            saber que era. Es el mismo vacio-usado-como-respuesta del «Sin
            filas» de la tabla y del «No options» del selector.
            El rotulo ahora esta siempre; lo que falta hasta elegir una OT es el
            numero, y eso se ve. «Avance promedio» y no «Porcentaje Promedio de
            Avance» porque el campo mide 0.2 de flex y el texto largo se corta. */}
        <TextField
          sx={{ mr: 6.5, flexGrow: '0.2' }}
          label='Avance promedio'
          value={otPercent ? `${otPercent} %` : ''}
          id='average'
          InputProps={{ readOnly: true }}
        />

        {/* El maestro NO depende de la OT elegida: es el catalogo completo.
            Se esconde para el rol 8 -proyectista-, que es el unico cuyo listado
            de OT esta acotado a lo suyo unas lineas mas arriba; para el resto
            no muestra nada que no pudiera ver abriendo OT por OT. */}
        {authUser.role !== 8 && (
          <Button
            variant='outlined'
            sx={{ mr: 6.5, whiteSpace: 'nowrap' }}
            onClick={descargarMaestro}
            // Mientras `cargando`, la lista de OT todavia no llego y el mapa
            // solicitud->OT esta vacio. La primera version no esperaba y la
            // columna OT salio en blanco en las 1.500 filas. Hay ademas un
            // respaldo que saca la OT del codigo MEL, pero la fuente buena es
            // esta y no cuesta nada esperarla.
            disabled={descargandoMaestro || cargando}
            startIcon={descargandoMaestro ? <CircularProgress size={16} color='inherit' /> : null}
          >
            {descargandoMaestro ? 'Preparando…' : cargando ? 'Cargando OT…' : 'Maestro de entregables'}
          </Button>
        )}

        {[5, 6, 7].includes(authUser.role) && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'row', m: 0, p: 0 }}>
              <Checkbox checked={showReasignarSection} onChange={handleReasignarToggle} color='info' />
              <Typography sx={{ alignContent: 'center' }}>REASIGNAR</Typography>
            </Box>

            <Button
              variant='contained'
              color='error'
              sx={{ mx: 6.5, flexGrow: '1' }}
              onClick={handleDeleteClick}
              disabled={selectedRows.length === 0 || (selectedRows.length > 0 && showReasignarSection)}
            >
              Borrar
            </Button>
          </>
        )}

        {/* Carga masiva por OT: incidencia Gabinete 11. Sin esto hay que abrir
            cada entregable y subir su archivo de a uno, que es lo que hace lento
            el cierre de una OT con muchos entregables. El diálogo solo ofrece
            los entregables que este usuario podría subir de a uno. */}
        {[7, 8, 9].includes(authUser.role) && (
          <Button
            variant='outlined'
            sx={{ mx: 2, flexGrow: '1' }}
            onClick={() => setOpenCargaMasiva(true)}
            disabled={!currentPetition}
          >
            Carga masiva
          </Button>
        )}
      </Box>

      <Box sx={{ m: 4, display: 'flex' }}>
        <TextField
          sx={{ m: 2.5, width: '50%' }}
          label='Tipo de levantamiento'
          value={currentPetition ? currentPetition.objective : ''}
          id='type'
          InputProps={{ readOnly: true }}
        />
        <TextField
          sx={{ m: 2.5, width: '50%' }}
          label='Entregable'
          value={currentPetition && currentPetition.deliverable ? currentPetition.deliverable.map(item => item) : ''}
          id='deliverables'
          InputProps={{ readOnly: true }}
        />
        <Autocomplete
          multiple
          readOnly
          sx={{ m: 2.5, width: '100%' }}
          value={
            (currentOT && petitions.find(doc => doc.ot == currentOT)?.gabineteDraftmen?.map(item => item.name)) || []
          }
          options={[]}
          renderInput={params => (
            <TextField
              {...params}
              label='Proyectistas asignados'
              readOnly={true}
              sx={{
                '& .MuiInputBase-inputAdornedStart': { display: 'none' },
                '& .MuiSvgIcon-root': { display: 'none' }
              }}
            />
          )}
        />

        {authUser.role === 5 || authUser.role === 6 ? (
          currentPetition?.state === 9 ? (
            <Button
              sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
              variant='contained'
              disabled={currentPetition?.state !== 9}
              onClick={() => currentPetition && handleClickOpenFinishOt(currentPetition)}
              color='info'
            >
              Reanudar OT
            </Button>
          ) : (
            <Button
              sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
              variant='contained'
              disabled={!otReadyToFinish && currentPetition?.state !== 9}
              onClick={() => currentPetition && handleClickOpenFinishOt(currentPetition)}
            >
              Finalizar OT
            </Button>
          )
        ) : authUser.role === 9 ? (
          <Button
            sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
            variant='contained'
            disabled={currentPetition?.state === 9 || !currentPetition || isLoading}
            onClick={handleOpenTransmittalDialog}
          >
            Generar Transmittal
          </Button>
        ) : (
          ''
        )}

        {[5, 6, 7].includes(authUser.role) ? (
          <Button
            sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
            variant='contained'
            disabled={currentPetition?.state === 9}
            onClick={() => currentPetition && handleClickOpen(currentPetition)}
          >
            Modificar proyectista
          </Button>
        ) : (
          ''
        )}

        {[5, 6, 7].includes(authUser.role) ? (
          <Button
            sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
            variant='contained'
            disabled={currentPetition?.state === 9}
            onClick={() => currentPetition && handleClickOpenCodeGenerator(currentPetition)}
          >
            Generar nuevo documento
          </Button>
        ) : (
          ''
        )}
      </Box>

      {[5, 6, 7].includes(authUser.role) && currentPetition && showReasignarSection && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 6.5 }}>{renderProjectistSummary()}</Box>
          <Box sx={{ mr: 6.5 }}>
            <Button
              variant='contained'
              color='info'
              disabled={
                selectedRows.length === 0 ||
                (currentOT && petitions.find(doc => doc.ot == currentOT)?.gabineteDraftmen.length < 2)
              }
              sx={{ flexGrow: '1' }}
              onClick={handleReasignarClick}
            >
              Reasignar
            </Button>
          </Box>
        </Box>
      )}

      <Box sx={{ m: 6.5, height: '100%' }}>
        <TableGabinete
          rows={blueprints ? blueprints : []}
          roleData={roleData}
          role={authUser.role}
          petitionId={currentPetition ? currentPetition.id : null}
          petition={currentPetition ? currentPetition : null}
          apiRef={apiRef}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          showReasignarSection={showReasignarSection}
        />
      </Box>

      {blueprints && (
        <DialogAssignGabineteDraftmen
          open={open}
          handleClose={handleClose}
          doc={petitions.find(petition => petition.ot == currentOT)}
          proyectistas={proyectistas}
          gabineteDraftmenState={gabineteDraftmenState}
          setGabineteDraftmenState={setGabineteDraftmenState}
          blueprints={blueprints}
        />
      )}

      <Dialog
        open={openTransmittalDialog}
        onClose={() => setOpenTransmittalDialog(false)}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
      >
        <DialogTitle id='alert-dialog-title'>{'Generar Transmittal'}</DialogTitle>
        <Box width={600}>
          {isLoading ? (
            <CircularProgress sx={{ m: 5 }} />
          ) : (
            <DialogContent>

              {/* Campo de texto para ingresar una descripción */}
              <TextField
                label='Número de Transmittal'
                sx={{mb: 5}}
                fullWidth
                type='number'
                value={transmittalNumber}
                onChange={e => setTransmittalNumber(e.target.value)}
              />

              <DialogContentText id='alert-dialog-description'>
                ¿Está seguro de que desea generar un transmittal para los siguientes documentos?
              </DialogContentText>
              <List>
                {Array.from(selectedDocs.values()).map(doc => (
                  <Box key={doc.clientCode}>
                    <ListItem key={doc.clientCode}>
                      <ListItemText primary={doc.id} secondary={doc.clientCode} />
                    </ListItem>
                    {doc.storageHlcDocuments &&
                      doc.storageHlcDocuments.map(hlc => (
                        <ListItem key={hlc.name}>
                          <ListItemText primary={hlc.name} />
                        </ListItem>
                      ))}
                  </Box>
                ))}
              </List>
            </DialogContent>
          )}
        </Box>

        <DialogActions>
          <Button onClick={() => setOpenTransmittalDialog(false)} color='primary' disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              handleClickTransmittalGenerator(currentPetition)
              setIsLoading(true)
            }}
            color='primary'
            disabled={isLoading}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {openCodeGenerator && (
        <DialogCodeGenerator
          open={openCodeGenerator}
          handleClose={handleCloseCodeGenerator}
          doc={currentPetition}
          roleData={roleData}
        />
      )}

      {openFinishOt && (
        <DialogFinishOt
          open={openFinishOt}
          handleClose={handleCloseFinishOt}
          callback={finishOtCallback}
          isLoading={isLoading}
          state={currentPetition.state}
        />
      )}

      <ReasignarDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedRows={selectedRows}
        doc={petitions && currentOT && petitions.find(petition => petition.ot == currentOT)}
      />

      <DialogDeleteBlueprint
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        selectedRows={selectedRows}
        doc={petitions && currentOT && petitions.find(petition => petition.ot == currentOT)}
        setSelectedRows={setSelectedRows}
      />

      {openCargaMasiva && (
        <DialogCargaMasiva
          open={openCargaMasiva}
          onClose={() => setOpenCargaMasiva(false)}
          petition={currentPetition}
          blueprints={blueprints}
        />
      )}
      {errorTransmittal && <DialogErrorTransmittal open={errorTransmittal} handleClose={handleCloseErrorTransmittal} />}
    </Box>
  )
}

export default DataGridGabinete
