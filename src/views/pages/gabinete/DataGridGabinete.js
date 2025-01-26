// ** React Imports
import { useEffect, useRef, useState } from 'react'

// ** Hooks
import { useGoogleAuth } from 'src/context/google-drive-functions/useGoogleDriveAuth'
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
import DialogDeleteBlueprint from 'src/@core/components/dialog-deleteBlueprint'
import ReasignarDialog from 'src/@core/components/dialog-deliverableReassign'
import DialogErrorTransmittal from 'src/@core/components/dialog-errorTransmittal'
import DialogFinishOt from 'src/@core/components/dialog-finishOt'
import { generateTransmittal } from 'src/context/google-drive-functions/generate-transmittal'
import TableGabinete from 'src/views/table/data-grid/TableGabinete'

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
  const [gabineteDraftmenState, setGabineteDraftmenState] = useState([])

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
    finishPetition,
    subscribeToPetition
  } = useFirebase()

  let petitions = useSnapshot(false, authUser, true)

  if (authUser.role === 8) {
    petitions = petitions.filter(petition =>
      petition.gabineteDraftmen?.find(item => item.hasOwnProperty('userId') && item['userId'] === authUser.uid)
    )
  }

  const [blueprints, projectistData, otPercent, setBlueprints] = useBlueprints(currentPetition?.id)

  const theme = useTheme()
  const smDown = useMediaQuery(theme.breakpoints.down('sm'))
  const mdDown = useMediaQuery(theme.breakpoints.down('md'))
  const lgDown = useMediaQuery(theme.breakpoints.down('lg'))
  const xlDown = useMediaQuery(theme.breakpoints.down('xl'))

  const handleClickOpenCodeGenerator = doc => {
    setOpenCodeGenerator(true)
  }

  const finishOtCallback = () => {
    setIsLoading(true)
    finishPetition(currentPetition, authUser)
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

  const handleGenerateTransmittal = (tableElement, selected, newCode) => {
    generateTransmittal(
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

  const handleClickTransmittalGenerator = async currentPetition => {
    try {
      // Actualiza el campo lastTransmittal en cada uno de los documentos seleccionados
      const selected = apiRef.current.getSelectedRows()

      // Ahora, añade este contador al final de tu newCode
      const newCode = await generateTransmittalCounter(currentPetition)

      await updateSelectedDocuments(newCode, selected, currentPetition, authUser)

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
        handleGenerateTransmittal(tableElement, selected, newCode)
      }
    } catch (error) {
      console.error('Error al generar Transmittal:', error)
      throw new Error('Error al generar Transmittal')
    }
  }

  const petitionFinished = currentPetition?.otFinished

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
        if (authUser) {
          // Carga los proyectistas
          const resProyectistas = await getUserData('getUserProyectistas', null, authUser)
          const resSupervisor = await getUserData('getUserSupervisor', null, authUser)
          setProyectistas([...resProyectistas, ...resSupervisor])
        }
      }

      authUser.role === 7 && fetchRoleAndProyectistas()
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

  return (
    <Box id='main' sx={{ display: 'flex', width: '100%', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex' }}>
        <Autocomplete
          options={petitions.map(doc => ({ value: doc.ot, title: doc.title }))}
          getOptionLabel={option => option.value + ' - ' + option.title + ' '}
          sx={{ mx: 6.5, flexGrow: '9' }}
          onChange={(event, value) => handleChange(value)}
          onInputChange={(event, value) => setCurrentAutoComplete(value)}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderInput={params => <TextField {...params} label='OT' />}
        />

        <TextField
          sx={{ mr: 6.5, flexGrow: '0.2' }}
          label={otPercent ? 'Porcentaje Promedio de Avance' : ''}
          value={otPercent ? `${otPercent} %` : ''}
          id='form-props-read-only-input'
          InputProps={{ readOnly: true }}
        />

        {authUser.role === 7 && (
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
      </Box>
      <Box sx={{ m: 4, display: 'flex' }}>
        <TextField
          sx={{ m: 2.5, width: '50%' }}
          label='Tipo de levantamiento'
          value={currentPetition ? currentPetition.objective : ''}
          id='form-props-read-only-input'
          InputProps={{ readOnly: true }}
        />
        <TextField
          sx={{ m: 2.5, width: '50%' }}
          label='Entregable'
          value={currentPetition && currentPetition.deliverable ? currentPetition.deliverable.map(item => item) : ''}
          id='form-props-read-only-input'
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
          currentPetition?.otFinished ? (
            <Button
              sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
              variant='contained'
              disabled={!currentPetition?.otReadyToFinish}
              onClick={() => currentPetition && handleClickOpenFinishOt(currentPetition)}
              color='info'
            >
              Reanudar OT
            </Button>
          ) : (
            <Button
              sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
              variant='contained'
              disabled={!currentPetition?.otReadyToFinish}
              onClick={() => currentPetition && handleClickOpenFinishOt(currentPetition)}
            >
              Finalizar OT
            </Button>
          )
        ) : authUser.role === 7 ? (
          <>
            <Button
              sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
              variant='contained'
              disabled={currentPetition?.otFinished}
              onClick={() => currentPetition && handleClickOpen(currentPetition)}
            >
              Modificar proyectista
            </Button>
          </>
        ) : authUser.role === 9 ? (
          <Button
            sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
            variant='contained'
            disabled={currentPetition?.otFinished || !currentPetition}
            onClick={handleOpenTransmittalDialog}
          >
            Generar Transmittal
          </Button>
        ) : (
          ''
        )}

        {authUser.role === 7 ? (
          <Button
            sx={{ width: '50%', m: 2.5, fontSize: xlDown ? '0.7rem' : '0.8rem' }}
            variant='contained'
            disabled={currentPetition?.otFinished}
            onClick={() => currentPetition && handleClickOpenCodeGenerator(currentPetition)}
          >
            Generar nuevo documento
          </Button>
        ) : (
          ''
        )}
      </Box>
      {authUser.role === 7 && currentPetition && showReasignarSection && (
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
          petitionFinished={petitionFinished}
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
      {errorTransmittal && <DialogErrorTransmittal open={errorTransmittal} handleClose={handleCloseErrorTransmittal} />}
    </Box>
  )
}

export default DataGridGabinete
