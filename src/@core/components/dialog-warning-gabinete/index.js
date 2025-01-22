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

  // Desestructuración de Objetos
  const { revision, approvedByDocumentaryControl, storageBlueprints } = blueprint

  // Constantes booleanas
  const isRole9 = authUser.role === 9 // Control Documental
  const isRole8 = authUser.role === 8 // Proyectista
  const isRole7 = authUser.role === 7 // Suervisor
  const isRole6 = authUser.role === 6 // Contract Owner
  const isRevisor = isRole6 || isRole7 || isRole9
  const isRevisionAtLeastB = revision?.charCodeAt(0) >= 66
  const isRevisionAtLeast0 = revision?.charCodeAt(0) >= 48 && revision?.charCodeAt(0) <= 57
  const storageInEmitidos = (isRevisionAtLeastB || isRevisionAtLeast0) && isRole9 && approves && !approvedByDocumentaryControl
  const storageInComentByCLient = (isRevisionAtLeastB || isRevisionAtLeast0) && isRole9 && (approves || !approves) && approvedByDocumentaryControl
  const showOptionsInRejected = !approves && !approvedByDocumentaryControl
  const showUploadFile = storageInEmitidos || showOptionsInRejected

  // Función para determinar la carpeta de carga con base en ciertas condiciones
  const getUploadFolder = () => {

    // Definición de los tipos de carpetas y las condiciones asociadas
    const folderTypes = {
        // Opción 1: Carpeta "EMITIDOS"
        emitidos: {
            condition: storageInEmitidos,
            folder: 'EMITIDOS'
        },
        // Opción 2: Carpeta "COMENTARIOS CLIENTE"
        comentariosCliente: {
            condition: storageInComentByCLient,
            folder: 'COMENTARIOS CLIENTE'
        },
        // Opción 3: Carpeta "REVISIONES & COMENTARIOS"
        revisionesComentarios: {
            condition: true,
            folder: 'REVISIONES & COMENTARIOS'
        }
    }

    // Busca la primera carpeta cuyo campo `condition` sea verdadero
    const { folder } = Object.values(folderTypes).find(({ condition }) => condition)

    // Devuelve un array con el nombre de la carpeta seleccionada
    return [folder]
  }


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

  // Función que determina el estado de aprobación basado en diversas condiciones
  const getApprovalStatus = () => {

    // Definición de las condiciones para determinar el estado de aprobación
    const approvalConditions = {

      // Caso 1: "Emitidos con múltiples planos"
      emitidosWithMultipleBlueprints: {
          condition: storageInEmitidos && storageBlueprints?.length > 1, // Se cumple si `storageInEmitidos` es true y hay más de un plano
          value: true // Valor devuelto si se cumple la condición
      },
      // Caso 2: "Observaciones sin adjuntar archivos"
      remarksWithoutAttach: {
          condition: toggleRemarks && !toggleAttach, // Se cumple si hay observaciones activas y no hay archivos adjuntos
          value: approves && remarksState.length > 0 && storageBlueprints?.length < 2 // Evalúa si se aprueba en función de las observaciones y el número de planos
      },
      // Caso 3: "Sin observaciones, pero con múltiples planos"
      noRemarksWithMultipleBlueprints: {
          condition: !toggleRemarks && storageBlueprints?.length > 1, // Se cumple si no hay observaciones y hay más de un plano
          value: false // Valor devuelto si se cumple la condición
      },
      // Caso 4: "Solo observaciones con múltiples planos"
      remarksOnlyWithMultipleBlueprints: {
          condition: toggleRemarks && !toggleAttach && storageBlueprints?.length > 1, // Se cumple si hay observaciones, no hay adjuntos y hay más de un plano
          value: false // Valor devuelto si se cumple la condición
      },
      // Caso 5: "Con archivo adjunto"
      withAttachment: {
          condition: toggleAttach, // Se cumple si hay un archivo adjunto
          value: storageBlueprints?.length > 1 && remarksState.length > 0 // Evalúa si se cumplen las condiciones de aprobación con base en los planos y las observaciones
      },
      // Caso predeterminado: "Default"
      default: {
          condition: true, // Siempre se cumple si ninguna de las condiciones anteriores es verdadera
          value: approves // Devuelve el estado de aprobación general
      }

    }

    // Busca el primer caso cuyo campo `condition` sea verdadero
    const { value } = Object.values(approvalConditions).find(({ condition }) => condition)

    // Devuelve el valor asociado al caso que cumple la condición
    return value
  }


  const canApprove = getApprovalStatus()

  const canRejectedByClient = (isRevisionAtLeastB || isRevisionAtLeast0) && isRole9 && !approves && approvedByDocumentaryControl

  const { deleteReferenceOfLastDocumentAttached } = useFirebase()
  const { handleFileUpload, validateFileName } = useGoogleDriveFolder()

  // Condición para habilitar el botón de rechazo si hay más de un blueprint y el campo de observaciones está lleno
  const canReject = storageBlueprints?.length > 1 && remarksState.length > 0

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
    if (previousBlueprintRef.current?.storageBlueprints !== storageBlueprints) {
      updateFormState('values', prev => ({
        ...prev,
        storageBlueprints: storageBlueprints
      }))
      previousBlueprintRef.current = blueprint
    }
  }, [storageBlueprints])

  useEffect(() => {
    console.log(formState)
  }, [formState])

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
        storageBlueprints: storageBlueprints.slice(0, -1) // elimina el último archivo localmente
      }))
      updateFormState('isUploading', false)
    } catch (error) {
      console.error('Error al cargar el ultimo archivo:', error)
      setError('Error al cargar el ultimo archivo. Intente nuevamente.')
    }
  }

  // Determina si un botón debe estar deshabilitado, basado en varias condiciones.
  const getButtonDisabledState = () => {

    const conditions = {
      // Caso 1: Rechazo del cliente con adjuntos y observaciones
      clientRejectionWithAttachAndRemarks: {
          condition: canRejectedByClient && toggleAttach && toggleRemarks, // El cliente puede rechazar, tiene adjuntos y observaciones
          value: storageBlueprints?.length === 1 // Deshabilitado si solo hay un plano
      },
      // Caso 2: Rechazo del cliente solo con observaciones
      clientRejectionWithRemarksOnly: {
          condition: canRejectedByClient && toggleRemarks && !toggleAttach, // El cliente puede rechazar, solo tiene observaciones, sin adjuntos
          value: remarksState.length === 0 // Deshabilitado si no hay observaciones
      },
      // Caso 3: Solo rechazo del cliente
      clientRejectionOnly: {
          condition: canRejectedByClient, // El cliente puede rechazar
          value: false // Botón habilitado
      },
      // Caso predeterminado
      default: {
          condition: true, // Siempre se evalúa si ninguna condición anterior se cumple
          value: (!approves && !canReject) || !canApprove // Deshabilitado si no se puede aprobar o rechazar
      }
    }

    // Busca la primera condición que se cumpla
    const matchingCondition = Object.values(conditions).find(({ condition }) => condition)

    // Devuelve el valor asociado a esa condición
    return matchingCondition.value
  }


  // Determina el texto que debe mostrarse en un botón de un diálogo.
  const getDialogText = () => {

    const textTypes = {
      // Caso 1: Usuario propietario
      userOwner: {
          condition: blueprint.userId === authUser.uid, // El usuario conectado es el Autor del plano
          text: 'Enviar' // Texto del botón
      },
      // Caso 2: Aprobación
      approve: {
          condition: approves, // El plano está aprobado
          text: 'Aprobar'
      },
      // Caso 3: Rechazo por control documental
      rejectByDocControl: {
          condition: !approves && isRole9 === 9, // El plano no está aprobado y el usuario tiene rol 9
          text: 'Rechazar'
      },
      // Caso predeterminado: Devolver
      return: {
          condition: true, // Siempre aplica si ninguna condición anterior es válida
          text: 'Devolver'
      }
    }

    // Busca la primera condición que se cumpla
    const { text } = Object.values(textTypes).find(({ condition }) => condition);

    // Devuelve el texto asociado a esa condición
    return text
  }


  // Determina si se debe mostrar un checkbox para observaciones, basado en condiciones.
  const shouldShowRemarkCheckbox = () => {

    const conditions = {
      // Caso 1: Aprobado por control documental
      approvedByDocControl: {
          condition: approves && isRole9 === 9 && approvedByDocumentaryControl === true, // Plano aprobado, rol 9, y aprobado por control documental
          show: true // Mostrar el checkbox
      },
      // Caso 2: Revisión "A"
      revisionA: {
          condition: approves && isRole9 === 9 && blueprint.revision === 'A', // Plano aprobado, rol 9, y revisión "A"
          show: true
      },
      // Caso 3: Oculto
      hiden: {
          condition: storageInEmitidos || ((isRole6 || isRole7 || isRole8) && approves), // Plano emitido o aprobado por roles 6, 7, u 8
          show: false // No mostrar el checkbox
      },
      // Caso 4: Sin opciones de rechazado
      noRejectedOptions: {
          condition: !showOptionsInRejected, // No se muestran opciones de rechazado
          show: true
      },
      // Caso predeterminado
      default: {
          condition: true, // Siempre aplica si ninguna condición anterior se cumple
          show: false // No mostrar el checkbox
      }
    }

    // Busca la primera condición que se cumpla
    const { show } = Object.values(conditions).find(({ condition }) => condition)

    // Devuelve si se debe mostrar o no el checkbox
    return show
  }

  // Configura el campo de observaciones según el contexto actual.
  const getRemarkFieldConfig = () => {

    const configs = {
      // Caso 1: Rechazo
      rejection: {
        condition: toggleRemarks && !approves, // Observaciones activas y el plano no está aprobado
        config: {
          label: 'Observación', // Etiqueta del campo
          error: Boolean(error), // Indica si hay un error
          helperText: error // Texto de ayuda con el mensaje de error
        }
      },
      // Caso 2: Comentario
      comment: {
        condition: toggleRemarks, // Observaciones activas
        config: {
          label: 'Comentario', // Etiqueta del campo
          error: Boolean(error), // Indica si hay un error
          helperText: error // Texto de ayuda con el mensaje de error
        }
      },
      // Caso predeterminado: Campo oculto
      hidden: {
        condition: true, // Siempre aplica si ninguna condición anterior se cumple
        config: null // No se configura el campo
      }
    }

    // Busca la primera condición que se cumpla
    const { config } = Object.values(configs).find(({ condition }) => condition)

    // Devuelve la configuración asociada a esa condición
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
        condition: storageBlueprints?.length === 2,
        component: (
          <Box sx={{ mt: 6 }}>
            <Typography variant='body2'>
              Documento de corrección cargado: <br />
            </Typography>
            <List dense sx={{ py: 4 }}>
              <ListItem key={storageBlueprints[1]?.name}>
                <ListItemText primary={storageBlueprints[1]?.name} />
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

    return Object.values(sections)
      .filter(({ condition }) => condition)
      .map(({ component }) => component)
  }

  const handleOnCloseDialog = () => {
    handleDialogClose()
    updateFormState('files', null)
    updateFormState('toggleRemarks', showOptionsInRejected)
    updateFormState('toggleAttach', showUploadFile)
    setRemarksState('')
    updateFormState('errorDialog', false)
    setError('')
  }

  const handleOnClickNo = () => {
    setRemarksState('')
    updateFormState('toggleRemarks', showOptionsInRejected)
    updateFormState('toggleAttach', showUploadFile)
    updateFormState('errorDialog', false)
    setError('')
    updateFormState('files', null)
    handleDialogClose()
  }

  // Extraer la función de carga de archivos
  const handleUploadFile = async () => {
    try {
      updateFormState('isUploading', true)
      const asd = await handleFileUpload(files, blueprint, petitionId, petition, getUploadFolder())
      console.log(asd)
      updateFormState('files', null)
    } catch (error) {
      console.error('Error al subir el archivo:', error)
    } finally {
      updateFormState('isUploading', false)
    }
  }

  return (
    <Dialog open={open} onClose={() => {handleOnCloseDialog()}} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
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
        <Button onClick={() => {handleOnClickNo()}}>
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
