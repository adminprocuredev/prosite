import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  TextField,
  Typography
} from '@mui/material'
import { Fragment, useEffect, useRef, useState } from 'react'
import Icon from 'src/@core/components/icon'

import { useDropzone } from 'react-dropzone'
import DialogErrorFile from 'src/@core/components/dialog-errorFile'
import FileList from 'src/@core/components/file-list'
import { validateFiles } from 'src/context/google-drive-functions/fileValidation'
import { useGoogleDriveFolder } from 'src/context/google-drive-functions/useGoogleDriveFolder'
import { useFirebase } from 'src/context/useFirebase'

// Importación de funciones útiles para este componente
import { getApprovalStatus, getButtonDisabledState, getDialogText, getRemarkFieldConfig, getUploadFolder, shouldShowRemarkCheckbox } from './conditions'

export default function AlertDialogGabinete({
  open,
  setOpenAlert,
  buttonClicked,
  setButtonClicked,
  handleClose,
  approves,
  authUser,
  setRemarksState,
  remarksState,
  blueprint,
  petitionId,
  petition,
  error,
  setError,
  setDoc
}) {

  // Desestructuración de Objetos
  const { revision, approvedByDocumentaryControl, storageBlueprints } = blueprint

  // Uso de Hooks
  const { deleteReferenceOfLastDocumentAttached, updateBlueprint } = useFirebase()
  const { handleFileUpload, validateFileName } = useGoogleDriveFolder()

  // Constantes booleanas
  const isRole9 = authUser.role === 9 // Control Documental
  const isRole8 = authUser.role === 8 // Proyectista
  const isRole7 = authUser.role === 7 // Suervisor
  const isRole6 = authUser.role === 6 // Contract Owner
  const isRevisor = isRole6 || isRole7 || isRole9
  const isInitialRevision = revision === "Iniciado"
  const isRevA = revision === "A"
  const isRevisionAtLeastB = !isInitialRevision && !isRevA
  const storageInEmitidos = isRevisionAtLeastB && isRole9 && approves && !approvedByDocumentaryControl
  const storageInComentByCLient = isRevisionAtLeastB && isRole9 && (approves || !approves) && approvedByDocumentaryControl
  const showOptionsInRejected = !approves && !approvedByDocumentaryControl
  const showUploadFile = storageInEmitidos || showOptionsInRejected

  // Estado formState
  const [formState, setFormState] = useState({
    values: {},
    toggleRemarks: showOptionsInRejected,
    toggleAttach: showUploadFile,
    files: null,
    isLoading: false,
    isUploading: false,
    errorDialog: false,
    errorFileMsj: ''
  })
  const previousBlueprintRef = useRef(blueprint)

  // Desestructuración de formState
  const { values, toggleRemarks, toggleAttach, files, isLoading, isUploading, errorDialog, errorFileMsj } = formState

  const updateFormState = (key, value) => {
    setFormState(prev => ({ ...prev, [key]: value }))
  }

  // Maneja el reset de estados
  const resetFormState = () => {
    setFormState({
      values: {},
      toggleRemarks: showOptionsInRejected,
      toggleAttach: showUploadFile,
      files: null,
      isLoading: false,
      isUploading: false,
      errorDialog: false,
      errorFileMsj: ''
    })
    setRemarksState('')
    setError('')
  }


  const canApprove = getApprovalStatus({storageInEmitidos, storageBlueprints, toggleRemarks, toggleAttach, approves, remarksState})
  const canRejectedByClient = isRevisionAtLeastB && isRole9 && !approves && approvedByDocumentaryControl
  // Condición para habilitar el botón de rechazo si hay más de un blueprint y el campo de observaciones está lleno
  const canReject = storageBlueprints?.length > 1 && remarksState.length > 0

  useEffect(() => {
    const { storageBlueprints, ...otherBlueprintFields } = blueprint || {}
    updateFormState('values', otherBlueprintFields)
  }, [blueprint])

  useEffect(() => {

    if (previousBlueprintRef.current?.storageBlueprints !== storageBlueprints) {
      updateFormState('values', prev => ({
        ...prev,
        storageBlueprints: storageBlueprints
      }))
      previousBlueprintRef.current = blueprint
    }
  }, [storageBlueprints])

  // Actualiza estados en caso de aprobación
  useEffect(() => {
    updateFormState('toggleRemarks', showOptionsInRejected)
    updateFormState('toggleAttach', showUploadFile)
  }, [approves])

  // Dropzone para manejar la carga de archivos
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: acceptedFiles => {
      const invalidFiles = validateFiles(acceptedFiles).filter(file => !file.isValid)
      if (invalidFiles.length > 0) {
        handleOpenErrorDialog(invalidFiles[0].msj)

        return
      }

      const invalidFileNames = validateFileName(acceptedFiles, blueprint, authUser, approves).filter(file => !file.isValid)

      if (invalidFileNames.length > 0) {
        handleOpenErrorDialog(invalidFileNames[0].msj)

        return
      }

      if (toggleAttach) updateFormState('files', acceptedFiles[0])
    },
    multiple: false
  })

  const handleClickDeleteDocumentReturned = async () => {
    try {
      updateFormState('isUploading', true)
      await deleteReferenceOfLastDocumentAttached(petitionId, blueprint.id)

      // Actualiza el estado de `values` directamente para reflejar la eliminación
      setDoc(prevValues => ({
        ...prevValues,
        storageBlueprints: storageBlueprints.slice(0, -1) // elimina el último archivo localmente
      }))
      updateFormState('isUploading', false)
    } catch (error) {
      console.error('Error al cargar el ultimo archivo:', error)
      setError('Error al cargar el ultimo archivo. Intente nuevamente.')
    }
  }

  // Extraer la función de carga de archivos
  const handleUploadFile = async () => {
    try {
      updateFormState('isUploading', true)
      const uploadedFile = await handleFileUpload(files, blueprint, petitionId, petition, getUploadFolder({storageInEmitidos, storageInComentByCLient}))

      // Función para actualizar `doc` con un nuevo archivo en storageBlueprints
      setDoc(prevDoc => ({
        ...prevDoc,
        storageBlueprints: [...(prevDoc.storageBlueprints || []), { url: uploadedFile.fileLink, name: uploadedFile.fileName }]
      }))

      updateFormState('files', null)

    } catch (error) {
      console.error('Error al subir el archivo:', error)
    } finally {
      updateFormState('isUploading', false)
    }
  }

  const handleUpdateFirestore = async () => {
    // Bloquea botones mientras se actualiza la información en Firestore
    setButtonClicked(true)

    // Determina el valor de `remarks`
    const remarks = remarksState.length > 0 ? remarksState : false

    console.log("handleUpdateFirestore")
    console.log(petitionId)
    console.log(blueprint)
    console.log(approves)
    console.log(authUser)
    console.log(remarks)

    try {
      if (authUser.role === 8) {
        // Lógica para el rol 8
        await updateBlueprint(petitionId, blueprint, approves, authUser, false)
      } else if (authUser.role === 9) {
        // Lógica para el rol 9
        await updateBlueprint(petitionId, blueprint, approves, authUser, remarks)
        setRemarksState('');
      } else {
        // Lógica para otros roles
        await updateBlueprint(petitionId, blueprint, approves, authUser, remarks)
        setRemarksState('');
      }
    } catch (err) {
      console.error(err)
      setOpenAlert(false)
    } finally {
      // Desbloquea botones al terminar la actualización
      setOpenAlert(false)
      setButtonClicked(false)
    }
  }


  // Función para manejar el diálogo de error
  const handleOpenErrorDialog = msj => {
    updateFormState('errorDialog', true)
    updateFormState('errorFileMsj', msj)
  }

  const handleDialogClose = () => {
    resetFormState()
    handleClose()
  }

  const handleCloseErrorDialog = () => {
    updateFormState('errorDialog', false)
  }

  const handleRemoveFile = () => {
    updateFormState('files', null)
  }

  // TODO: REVISAR ESTO...CREO QUE ACÁ HAY QUE AGREGAR UN setDoc({})
  const handleOnCloseDialog = () => {
    setDoc({})
    handleDialogClose()
    updateFormState('files', null)
    updateFormState('toggleRemarks', showOptionsInRejected)
    updateFormState('toggleAttach', showUploadFile)
    setRemarksState('')
    updateFormState('errorDialog', false)
    setError('')
  }

  const handleOnClickNo = () => {
    setDoc({})
    setRemarksState('')
    updateFormState('toggleRemarks', showOptionsInRejected)
    updateFormState('toggleAttach', showUploadFile)
    updateFormState('errorDialog', false)
    setError('')
    updateFormState('files', null)
    handleDialogClose()
  }

  const getAttachmentConfig = () => {

    const configs = {
      showCheckbox: {
        condition: (approves && toggleRemarks) || (canRejectedByClient && toggleRemarks),
        component: (
          <FormControlLabel
            control={
              <Checkbox
                disabled={showOptionsInRejected}
                checked={toggleAttach}
                onChange={() => updateFormState('toggleAttach', !toggleAttach)}
              />
            }
            label='Agregar Archivo Adjunto'
          />
        )
      },
      showUploadedFile: {
        condition: storageBlueprints?.length === 2,
        component: (
          <Box sx={{ mt: 6 }}>
            <Typography variant='body2'>
              Documento de corrección cargado: <br />
            </Typography>
            <List dense sx={{ py: 4 }}>
              <ListItem key={storageBlueprints?.[1]?.name}>
                <ListItemText primary={storageBlueprints?.[1]?.name} />
                <ListItemSecondaryAction sx={{ right: 0, my: 'auto' }}>
                  <IconButton
                    size='small'
                    sx={{ display: 'flex' }}
                    aria-haspopup='true'
                    onClick={handleClickDeleteDocumentReturned}
                    aria-controls='modal-share-examples'
                  >
                    <Icon icon='mdi:delete-forever' color='#f44336' />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Box>
        )
      }
    }

    return Object.values(configs).filter(({ condition }) => condition).map(({ component }) => component)
  }

  const getFileUploadSection = () => {
    const sections = {
      fileList: {
        condition: toggleAttach && files,
        component: (
          <Fragment>
            <List>
              <FileList files={files} handleRemoveFile={handleRemoveFile} />
            </List>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button color='error' sx={{ m: 2 }} variant='outlined' onClick={handleRemoveFile}>
                Quitar
              </Button>
              <Button color='primary' sx={{ m: 2 }} variant='outlined' onClick={handleUploadFile} disabled={isLoading}>
                Subir archivo
              </Button>
            </Box>
          </Fragment>
        )
      },
      dropzone: {
        condition: storageBlueprints?.length < 2 && toggleAttach && !files,
        component: (
          <div {...getRootProps({ className: 'dropzone' })}>
            <input {...getInputProps()} />
            <Box
              sx={{
                my: 5,
                mx: 'auto',
                p: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                borderRadius: '10px'
              }}
            >
              <Typography color='textSecondary'>
                <Link onClick={() => {}}>Haz click acá</Link> para adjuntar archivo
              </Typography>
            </Box>
          </div>
        )
      }
    }

    return Object.values(sections).filter(({ condition }) => condition).map(({ component }) => component)
  }

  return (
    <Dialog open={open} onClose={() => {handleOnCloseDialog()}} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
      <DialogTitle id='alert-dialog-title'>{getDialogText({blueprint, authUser, approves})} entregable de la solicitud</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', width: 600 }}>
        <DialogContentText>¿Estás segur@ de que quieres {getDialogText({blueprint, authUser, approves})} el entregable?</DialogContentText>

        {shouldShowRemarkCheckbox({authUser, approves, approvedByDocumentaryControl, blueprint, storageInEmitidos, showOptionsInRejected}) && (
          <FormControlLabel
            control={<Checkbox onChange={() => updateFormState('toggleRemarks', !toggleRemarks)} />}
            sx={{ mt: 4 }}
            label='Agregar Comentario'
          />
        )}

        {getRemarkFieldConfig({toggleRemarks, approves, error}) && (
          <TextField sx={{ mt: 4 }} {...getRemarkFieldConfig({toggleRemarks, approves, error})} onBlur={e => setRemarksState(e.target.value)} />
        )}

        {isRevisor ? (
          <Fragment>
            {!isUploading ? (
              <Fragment>
                {getAttachmentConfig()}
                {getFileUploadSection()}
              </Fragment>
            ) : (
              <CircularProgress sx={{ m: 5 }}/>
            )}
          </Fragment>
        ) : (
          ''
        )}

        <Fragment>
          {buttonClicked && <CircularProgress sx={{ m: 5 }}/>}
        </Fragment>

      </DialogContent>
      <DialogActions>
        <Button onClick={() => {handleOnClickNo()}} disabled={buttonClicked} >
          No
        </Button>
        <Button onClick={() => handleUpdateFirestore()} autoFocus disabled={buttonClicked || getButtonDisabledState({canRejectedByClient, toggleAttach, toggleRemarks, storageBlueprints, remarksState, approves, canReject, canApprove})}>
          Sí
        </Button>
      </DialogActions>
      {errorDialog && <DialogErrorFile open={errorDialog} handleClose={handleCloseErrorDialog} msj={errorFileMsj} />}
    </Dialog>
  )
}
