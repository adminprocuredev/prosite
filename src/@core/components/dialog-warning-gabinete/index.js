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

export default function AlertDialogGabinete({
  open,
  handleClose,
  callback,
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

  const isRole9 = authUser.role === 9 // Ctrl. Documental : C-Doc
  const isRole8 = authUser.role === 8 // Proyectista
  const isRole7 = authUser.role === 7 // Suervisor
  const isRole6 = authUser.role === 6 // C. Owner : C-Ow

  const isRevisor = isRole6 || isRole7 || isRole9

  const isRevisionAtLeastB = blueprint && blueprint.revision && blueprint?.revision?.charCodeAt(0) >= 66

  const isRevisionAtLeast0 =
    blueprint &&
    blueprint.revision &&
    blueprint?.revision?.charCodeAt(0) >= 48 &&
    blueprint?.revision?.charCodeAt(0) <= 57

  const storageInEmitidos =
    (isRevisionAtLeastB || isRevisionAtLeast0) && isRole9 && approves && !blueprint.approvedByDocumentaryControl

  const storageInComentByCLient =
    (isRevisionAtLeastB || isRevisionAtLeast0) &&
    isRole9 &&
    (approves || !approves) &&
    blueprint.approvedByDocumentaryControl

  const showOptionsInRejected = !approves && !blueprint.approvedByDocumentaryControl

  const showUploadFile = storageInEmitidos || showOptionsInRejected

  const getUploadFolder = () => {
    const folderTypes = {
      emitidos: {
        condition: storageInEmitidos,
        folder: 'EMITIDOS'
      },
      comentariosCliente: {
        condition: storageInComentByCLient,
        folder: 'COMENTARIOS CLIENTE'
      },
      revisionesComentarios: {
        condition: true,
        folder: 'REVISIONES & COMENTARIOS'
      }
    }

    const { folder } = Object.values(folderTypes).find(({ condition }) => condition)

    return [folder]
  }

  const uploadInFolder = getUploadFolder()

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

  const getApprovalStatus = () => {
    const approvalConditions = {
      emitidosWithMultipleBlueprints: {
        condition: storageInEmitidos && blueprint.storageBlueprints?.length > 1,
        value: true
      },
      remarksWithoutAttach: {
        condition: toggleRemarks && !toggleAttach,
        value: approves && remarksState.length > 0 && blueprint.storageBlueprints?.length < 2
      },
      noRemarksWithMultipleBlueprints: {
        condition: !toggleRemarks && blueprint.storageBlueprints?.length > 1,
        value: false
      },
      remarksOnlyWithMultipleBlueprints: {
        condition: toggleRemarks && !toggleAttach && blueprint.storageBlueprints?.length > 1,
        value: false
      },
      withAttachment: {
        condition: toggleAttach,
        value: blueprint.storageBlueprints?.length > 1 && remarksState.length > 0
      },
      default: {
        condition: true,
        value: approves
      }
    }

    const { value } = Object.values(approvalConditions).find(({ condition }) => condition)

    return value
  }

  const canAprove = getApprovalStatus()

  const canRejectedByClient = (isRevisionAtLeastB || isRevisionAtLeast0) && isRole9 && !approves && blueprint.approvedByDocumentaryControl

  const { deleteReferenceOfLastDocumentAttached } = useFirebase()
  const { handleFileUpload, validateFileName } = useGoogleDriveFolder()

  // Condición para habilitar el botón de rechazo si hay más de un blueprint y el campo de observaciones está lleno
  const canReject = blueprint.storageBlueprints?.length > 1 && remarksState.length > 0

  useEffect(() => {
    const { storageBlueprints, ...otherBlueprintFields } = blueprint || {}
    updateFormState('values', otherBlueprintFields)
  }, [
    blueprint.id,
    blueprint.clientCode,
    blueprint.userId,
    blueprint.userName,
    blueprint.userEmail,
    blueprint.revision,
    blueprint.storageHlcDocuments,
    blueprint.description,
    blueprint.date
  ])

  useEffect(() => {
    if (previousBlueprintRef.current?.storageBlueprints !== blueprint.storageBlueprints) {
      updateFormState('values', prev => ({
        ...prev,
        storageBlueprints: blueprint.storageBlueprints
      }))
      previousBlueprintRef.current = blueprint
    }
  }, [blueprint.storageBlueprints])

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

      const invalidFileNames = validateFileName(acceptedFiles, blueprint, authUser).filter(file => !file.isValid)

      if (invalidFileNames.length > 0) {
        handleOpenErrorDialog(invalidFileNames[0].msj)

        return
      }

      if (toggleAttach) updateFormState('files', acceptedFiles[0])
    },
    multiple: false
  })

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

  const handleClickDeleteDocumentReturned = async () => {
    try {
      updateFormState('isUploading', true)
      await deleteReferenceOfLastDocumentAttached(petitionId, blueprint.id)

      // Actualiza el estado de `values` directamente para reflejar la eliminación
      setDoc(prevValues => ({
        ...prevValues,
        storageBlueprints: blueprint.storageBlueprints.slice(0, -1) // elimina el último archivo localmente
      }))
      updateFormState('isUploading', false)
    } catch (error) {
      console.error('Error al cargar el ultimo archivo:', error)
      setError('Error al cargar el ultimo archivo. Intente nuevamente.')
    }
  }

  const getButtonDisabledState = () => {
    const conditions = {
      clientRejectionWithAttachAndRemarks: {
        condition: canRejectedByClient && toggleAttach && toggleRemarks,
        value: blueprint.storageBlueprints?.length === 1
      },
      clientRejectionWithRemarksOnly: {
        condition: canRejectedByClient && toggleRemarks && !toggleAttach,
        value: remarksState.length === 0
      },

      clientRejectionOnly: {
        condition: canRejectedByClient,
        value: false
      },
      default: {
        condition: true,
        value: (!approves && !canReject) || !canAprove
      }
    }

    const matchingCondition = Object.values(conditions).find(({ condition }) => condition)

    return matchingCondition.value
  }

  const getDialogText = () => {
    const textTypes = {
      userOwner: {
        condition: blueprint.userId === authUser.uid,
        text: 'Enviar'
      },
      approve: {
        condition: approves,
        text: 'Aprobar'
      },
      rejectByDocControl: {
        condition: !approves && authUser.role === 9,
        text: 'Rechazar'
      },
      return: {
        condition: true,
        text: 'Devolver'
      }
    }

    const { text } = Object.values(textTypes).find(({ condition }) => condition)

    return text
  }

  const shouldShowRemarkCheckbox = () => {
    const conditions = {
      approvedByDocControl: {
        condition: approves && authUser.role === 9 && blueprint.approvedByDocumentaryControl === true,
        show: true
      },
      revisionA: {
        condition: approves && authUser.role === 9 && blueprint.revision === 'A',
        show: true
      },
      hiden: {
        condition: storageInEmitidos || ((isRole6 || isRole7 || isRole8) && approves),
        show: false
      },
      noRejectedOptions: {
        condition: !showOptionsInRejected,
        show: true
      },
      default: {
        condition: true,
        show: false
      }
    }

    const { show } = Object.values(conditions).find(({ condition }) => condition)

    return show
  }

  const getRemarkFieldConfig = () => {
    const configs = {
      rejection: {
        condition: toggleRemarks && !approves,
        config: {
          label: 'Observación',
          error: Boolean(error),
          helperText: error
        }
      },
      comment: {
        condition: toggleRemarks,
        config: {
          label: 'Comentario',
          error: Boolean(error),
          helperText: error
        }
      },
      hidden: {
        condition: true,
        config: null
      }
    }

    const { config } = Object.values(configs).find(({ condition }) => condition)

    return config
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
        condition: blueprint.storageBlueprints?.length === 2,
        component: (
          <Box sx={{ mt: 6 }}>
            <Typography variant='body2'>
              Documento de corrección cargado: <br />
            </Typography>
            <List dense sx={{ py: 4 }}>
              <ListItem key={blueprint.storageBlueprints[1]?.name}>
                <ListItemText primary={blueprint.storageBlueprints[1]?.name} />
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

    return Object.values(configs)
      .filter(({ condition }) => condition)
      .map(({ component }) => component)
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
        condition: blueprint.storageBlueprints?.length < 2 && toggleAttach && !files,
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

    return Object.values(sections)
      .filter(({ condition }) => condition)
      .map(({ component }) => component)
  }

  // Extraer la función de carga de archivos
  const handleUploadFile = async () => {
    try {
      updateFormState('isUploading', true)
      await handleFileUpload(files, blueprint, petitionId, petition, uploadInFolder)
      updateFormState('files', null)
    } catch (error) {
      console.error('Error al subir el archivo:', error)
    } finally {
      updateFormState('isUploading', false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        handleDialogClose()
        updateFormState('files', null)
        updateFormState('toggleRemarks', showOptionsInRejected)
        updateFormState('toggleAttach', showUploadFile)
        setRemarksState('')
        updateFormState('errorDialog', false)
        setError('')
      }}
      aria-labelledby='alert-dialog-title'
      aria-describedby='alert-dialog-description'
    >
      <DialogTitle id='alert-dialog-title'>{getDialogText()} entregable de la solicitud</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', width: 600 }}>
        <DialogContentText>¿Estás segur@ de que quieres {getDialogText()} el entregable?</DialogContentText>

        {shouldShowRemarkCheckbox() && (
          <FormControlLabel
            control={<Checkbox onChange={() => updateFormState('toggleRemarks', !toggleRemarks)} />}
            sx={{ mt: 4 }}
            label='Agregar Comentario'
          />
        )}

        {getRemarkFieldConfig() && (
          <TextField sx={{ mt: 4 }} {...getRemarkFieldConfig()} onChange={e => setRemarksState(e.target.value)} />
        )}

        {isRevisor ? (
          <Fragment>
            {!isUploading ? (
              <Fragment>
                {getAttachmentConfig()}

                {getFileUploadSection()}
              </Fragment>
            ) : (
              <CircularProgress sx={{ m: 5 }} />
            )}
          </Fragment>
        ) : (
          ''
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setRemarksState('')
            updateFormState('toggleRemarks', showOptionsInRejected)
            updateFormState('toggleAttach', showUploadFile)
            updateFormState('errorDialog', false)
            setError('')
            updateFormState('files', null)
            handleDialogClose()
          }}
        >
          No
        </Button>
        <Button onClick={callback} autoFocus disabled={getButtonDisabledState()}>
          Sí
        </Button>
      </DialogActions>
      {errorDialog && <DialogErrorFile open={errorDialog} handleClose={handleCloseErrorDialog} msj={errorFileMsj} />}
    </Dialog>
  )
}
