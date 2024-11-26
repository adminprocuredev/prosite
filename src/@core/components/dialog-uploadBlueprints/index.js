import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  Paper,
  Slide,
  Typography,
  CircularProgress,
  Tooltip
} from '@mui/material'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Box from '@mui/system/Box'
import React, { Fragment, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import DialogErrorFile from 'src/@core/components/dialog-errorFile'
import AlertDialog from 'src/@core/components/dialog-warning'
import Icon from 'src/@core/components/icon'
import { useFirebase } from 'src/context/useFirebase'
import { useGoogleDriveFolder } from 'src/@core/hooks/useGoogleDriveFolder'

import 'moment/locale/es'

import { InputAdornment } from '@mui/material'
import DateListItem from 'src/@core/components/custom-date'
import CustomListItem from 'src/@core/components/custom-list'

//esta función se usa para establecer los iconos de los documentos que se van a adjuntar al documento, previo a cargarlos.
const getFileIcon = fileType => {
  switch (fileType) {
    case 'application/pdf':
      return 'mdi:file-pdf'
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'mdi:file-word'
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'mdi:file-excel'
    // ... agregar más tipos de archivo según sea necesario
    default:
      return 'mdi:file-document-outline'
  }
}

let rootFolder

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'www.prosite.cl' || window.location.hostname === 'procureterrenoweb.vercel.app') {
    rootFolder = '180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt' //* carpeta original "72336"
  } else {
    rootFolder = '1kKCLEpiN3E-gleNVR8jz_9mZ7dpSY8jw' //* carpeta TEST
  }
} else {
  rootFolder = '1kKCLEpiN3E-gleNVR8jz_9mZ7dpSY8jw' //* carpeta TEST
}

export const UploadBlueprintsDialog = ({
  handleClose,
  doc,
  roleData,
  petitionId,
  currentRow,
  petition,
  checkRoleAndApproval
}) => {
  let id, userId, userName, userEmail, revision, storageBlueprints, description, date, clientCode, storageHlcDocuments

  if (doc) {
    ;({
      id,
      userId,
      userName,
      userEmail,
      revision,
      storageBlueprints,
      description,
      date,
      clientCode,
      storageHlcDocuments
    } = doc)
  } else {
    console.log('doc is undefined')
  }

  const [values, setValues] = useState({})
  const [message, setMessage] = useState('')

  const [openAlert, setOpenAlert] = useState(false)
  const [files, setFiles] = useState(null)
  const [hlcDocuments, setHlcDocuments] = useState(null)
  const [errorFileMsj, setErrorFileMsj] = useState('')
  const [errorDialog, setErrorDialog] = useState(false)

  const [isDescriptionSaved, setIsDescriptionSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const theme = useTheme()

  const {
    updateDocs,
    authUser,
    addDescription,
    uploadFilesToFirebaseStorage,
    updateBlueprintsWithStorageOrHlc
  } = useFirebase()
  const fullScreen = useMediaQuery(theme.breakpoints.down('xs'))

  // Verifica estado
  revision = typeof revision === 'string' ? revision : 100

  const initialValues = {
    id,
    clientCode,
    userId,
    userName,
    userEmail,
    revision,
    storageBlueprints,
    storageHlcDocuments,
    description,
    date
  }

  // Actualiza el estado al cambiar de documento, sólo valores obligatorios
  useEffect(() => {
    setValues(initialValues)
  }, [doc])

  const { uploadFile, createFolder, fetchFolders } = useGoogleDriveFolder()

  const writeCallback = () => {
    const newData = {}

    for (const key in values) {
      if (hasChanges[key]) {
        newData[key] = values[key]
      }
    }

    if (Object.keys(newData).length > 0) {
      updateDocs(id, newData, authUser)
    } else {
      console.log('No se escribió ningún documento')
    }

    handleCloseAlert()
  }

  const handleCloseAlert = () => {
    setOpenAlert(false)
    setEditable(false)
  }

  // Función onchange utilizando currying
  const handleInputChange = field => event => {
    const fieldValue = event.target.value
    setValues({ ...values, [field]: fieldValue })
  }

  const validateFileName = acceptedFiles => {
    const expectedClientCode = values.clientCode
    // console.log('authUser', authUser)

    const expectedRevision = getNextRevisionFolderName(doc, authUser)

    let expectedFileName = null

    if (authUser.role === 8 || (authUser.role === 7 && doc.userId === authUser.uid)) {
      expectedFileName = `${expectedClientCode}_REV_${expectedRevision}`
    } else if (authUser.role === 9 && doc.approvedByDocumentaryControl && !checkRoleAndApproval(authUser.role, doc)) {
      expectedFileName = `${expectedClientCode}_REV_${expectedRevision}_HLC`
    } else {
      const currentName = authUser.displayName

      const initials = currentName
        .toUpperCase()
        .split(' ')
        .map(word => word.charAt(0))
        .join('')

      expectedFileName = `${expectedClientCode}_REV_${expectedRevision}_${initials}`
    }

    const handleCopyToClipboard = text => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log('Texto copiado al portapapeles:', text)
        })
        .catch(err => {
          console.error('Error al copiar al portapapeles:', err)
        })
    }

    const validationResults = acceptedFiles.map(file => {
      const fileNameWithoutExtension = file.name.split('.').slice(0, -1).join('.') // Quita la extensión del archivo

      const isValid = fileNameWithoutExtension === expectedFileName

      return {
        name: file.name,
        isValid,
        msj: isValid ? (
          `${file.name}`
        ) : (
          <Typography variant='body2'>
            El nombre del archivo debe ser:{' '}
            <Typography variant='body2' component='span' color='primary'>
              {expectedFileName}
              <Tooltip title='Copiar'>
                <IconButton
                  sx={{ ml: 3 }}
                  size='small'
                  onClick={() => handleCopyToClipboard(expectedFileName)}
                  aria-label='copiar'
                >
                  <FileCopyIcon fontSize='small' />
                  <Typography>copiar</Typography>
                </IconButton>
              </Tooltip>
            </Typography>
            <br />
            <br />
            El nombre del archivo que intentó subir es:{' '}
            <Typography variant='body2' component='span' color='error'>
              {fileNameWithoutExtension}
            </Typography>
          </Typography>
        )
      }
    })

    return validationResults
  }

  const validateFiles = acceptedFiles => {
    const imageExtensions = ['jpeg', 'jpg', 'png', 'webp', 'bmp', 'tiff', 'svg', 'heif', 'HEIF']
    const documentExtensions = ['xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'pdf', 'csv', 'txt']
    const maxSizeBytes = 5 * 1024 * 1024 // 5 MB in bytes

    const isValidImage = file => {
      const extension = file.name.split('.').pop().toLowerCase()

      return imageExtensions.includes(extension) && file.size <= maxSizeBytes
    }

    const isValidDocument = file => {
      const extension = file.name.split('.').pop().toLowerCase()

      return documentExtensions.includes(extension) && file.size <= maxSizeBytes
    }

    const isValidFile = file => {
      return isValidImage(file) || isValidDocument(file)
    }

    const validationResults = acceptedFiles.map(file => {
      return {
        name: file.name,
        isValid: isValidFile(file),
        msj: isValidFile(file) ? `${file.name}` : `${file.name} - El archivo excede el tamaño máximo de 5 MB`
      }
    })

    return validationResults
  }

  const handleOpenErrorDialog = msj => {
    setErrorFileMsj(msj)
    setErrorDialog(true)
  }

  const handleCloseErrorDialog = () => {
    setErrorDialog(false)
  }

  const submitDescription = async () => {
    setIsSaving(true)
    try {
      await addDescription(petitionId, currentRow, values.description)
        .then(() => {
          setIsDescriptionSaved(true)
        })
        .catch(err => console.error(err))
      setIsDescriptionSaved(true)
    } catch (err) {
      console.error(err)
    }
    setIsSaving(false)
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: acceptedFiles => {
      // Valida los archivos con base en el tamaño y tipo
      const invalidFiles = validateFiles(acceptedFiles).filter(file => !file.isValid)
      if (invalidFiles.length > 0) {
        const res = validateFiles(invalidFiles)
        const msj = res[0].msj
        handleOpenErrorDialog(msj)

        return invalidFiles
      }

      // Valida los archivos con base en el nombre
      const invalidFileNames = validateFileName(acceptedFiles).filter(file => !file.isValid)
      if (invalidFileNames.length > 0) {
        const res = validateFileName(invalidFileNames)
        const msj = res[0].msj
        handleOpenErrorDialog(msj)

        return invalidFileNames
      }

      if (authUser.role === 9 && doc.approvedByDocumentaryControl && !checkRoleAndApproval(authUser.role, doc)) {
        setHlcDocuments(acceptedFiles[0])
      }

      if (
        (authUser.uid === doc.userId && !doc.sentByDesigner) ||
        ((authUser.role === 6 || authUser.role === 7) && doc.sentByDesigner && !doc.approvedByDocumentaryControl) ||
        (authUser.role === 9 && (doc.approvedBySupervisor || doc.approvedByContractAdmin)) ||
        (doc.approvedByDocumentaryControl && checkRoleAndApproval(authUser.role, doc))
      ) {
        setFiles(acceptedFiles[0])
      }
    },
    multiple: false // Esto limita a los usuarios a seleccionar solo un archivo a la vez
  })

  const handleRemoveFile = () => {
    setFiles(null)
  }

  const handleRemoveHLC = () => {
    setHlcDocuments(null)
  }

  const getPlantAbbreviation = plantName => {
    const plantMap = {
      'Planta Concentradora Laguna Seca | Línea 1': 'LSL1',
      'Planta Concentradora Laguna Seca | Línea 2': 'LSL2',
      'Instalaciones Escondida Water Supply': 'IEWS',
      'Planta Concentradora Los Colorados': 'PCLC',
      'Instalaciones Cátodo': 'ICAT',
      'Chancado y Correas': 'CHCO',
      'Puerto Coloso': 'PCOL'
    }

    return plantMap[plantName] || ''
  }

  const fileList = (
    <Grid container spacing={2} sx={{ justifyContent: 'center', m: 2 }}>
      {files && (
        <Grid item key={files.name}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              border: `4px solid ${theme.palette.primary.main}`,
              borderRadius: '4px',
              width: '220px',
              position: 'relative' // esta propiedad posiciona el icono correctamente
            }}
          >
            {files.type.startsWith('image') ? (
              <img width={50} height={50} alt={files.name} src={URL.createObjectURL(files)} />
            ) : (
              <Icon icon={getFileIcon(files.type)} fontSize={50} />
            )}
            <Typography
              variant='body2'
              sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', ml: '10px' }}
            >
              {`... ${files.name.slice(files.name.length - 15, files.name.length)}`}
            </Typography>
            <IconButton
              onClick={handleRemoveFile}
              sx={{
                position: 'absolute', // Posiciona el icono en relación al Paper
                top: '0px', // Ajusta el valor según la posición vertical deseada
                right: '0px' // Ajusta el valor según la posición horizontal deseada
              }}
            >
              <Icon icon='mdi:close' fontSize={20} />
            </IconButton>
          </Paper>
        </Grid>
      )}
    </Grid>
  )

  const hlcList = (
    <Grid container spacing={2} sx={{ justifyContent: 'center', m: 2 }}>
      {hlcDocuments && (
        <Grid item key={hlcDocuments.name}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              border: `4px solid ${theme.palette.primary.main}`,
              borderRadius: '4px',
              width: '220px',
              position: 'relative' // Agregamos esta propiedad para posicionar el icono correctamente
            }}
          >
            {hlcDocuments.type.startsWith('image') ? (
              <img width={50} height={50} alt={hlcDocuments.name} src={URL.createObjectURL(hlcDocuments)} />
            ) : (
              <Icon icon={getFileIcon(hlcDocuments.type)} fontSize={50} />
            )}
            <Typography
              variant='body2'
              sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', ml: '10px' }}
            >
              {`... ${hlcDocuments.name.slice(hlcDocuments.name.length - 15, hlcDocuments.name.length)}`}
            </Typography>
            <IconButton
              onClick={handleRemoveHLC}
              sx={{
                position: 'absolute', // Posicionamos el icono en relación al Paper
                top: '0px', // Ajusta el valor según la posición vertical deseada
                right: '0px' // Ajusta el valor según la posición horizontal deseada
              }}
            >
              <Icon icon='mdi:close' fontSize={20} />
            </IconButton>
          </Paper>
        </Grid>
      )}
    </Grid>
  )

  const getNextRevisionFolderName = (doc, authUser) => {
    let newRevision = doc.revision

    const nextCharCode = doc.revision.charCodeAt(0) + 1
    const nextChar = String.fromCharCode(nextCharCode)

    // Verifica si el id contiene "M3D" antes del último guion
    const isM3D = doc.id.split('-').slice(-2, -1)[0] === 'M3D'

    const isRole8 = authUser.role === 8
    const isRole7 = authUser.role === 7

    if (isRole8 || (isRole7 && doc.userId === authUser.uid)) {
      const actions = {
        keepRevision: {
          condition: () =>
            doc.revision.charCodeAt(0) >= 48 &&
            doc.approvedByClient === true &&
            doc.approvedByDocumentaryControl === false,
          action: () => (newRevision = doc.revision)
        },
        resetRevision: {
          condition: () => doc.revision.charCodeAt(0) >= 66 && doc.approvedByClient === true,
          action: () => (newRevision = '0')
        },
        incrementRevision: {
          condition: () =>
            (doc.revision.charCodeAt(0) >= 66 || doc.revision.charCodeAt(0) >= 48) &&
            doc.approvedByClient === false &&
            doc.approvedByDocumentaryControl === true,
          action: () => (newRevision = nextChar)
        },
        startRevision: {
          condition: () => doc.revision === 'iniciado' && !isM3D,
          action: () => (newRevision = 'A')
        },
        incrementRevisionInA: {
          condition: () => doc.revision === 'A',
          action: () => (newRevision = doc.approvedByDocumentaryControl ? nextChar : doc.revision)
        },
        dotCloud: {
          condition: () => doc.revision === 'iniciado' && isM3D,
          action: () => {
            newRevision = '0'
          }
        }
      }

      Object.values(actions).forEach(({ condition, action }) => {
        if (condition()) {
          action()
        }
      })
    }

    return newRevision
  }

  const handleSubmitAllFiles = async () => {
    try {
      setIsLoading(true)
      // Busca la carpeta de la planta.
      //const plantFolders = await fetchFolders('180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt') //* carpeta original "72336"
      const plantFolders = await fetchFolders('1kKCLEpiN3E-gleNVR8jz_9mZ7dpSY8jw') //* carpeta TEST
      let plantFolder = plantFolders.files.find(folder => folder.name.includes(getPlantAbbreviation(petition.plant)))

      // Si no existe la carpeta de la planta, se crea
      if (!plantFolder) {
        let plantName = getPlantAbbreviation(doc.plant)
        // plantFolder = await createFolder(plantName, '180lLMkkTSpFhHTYXBSBQjLsoejSmuXwt') //* carpeta original "72336"
        plantFolder = await createFolder(plantName, '1kKCLEpiN3E-gleNVR8jz_9mZ7dpSY8jw') //* carpeta TEST
      }

      if (plantFolder) {
        // Busca la carpeta del área.
        const areaFolders = await fetchFolders(plantFolder.id)
        let areaFolder = areaFolders.files.find(folder => folder.name === petition.area)

        // Si no existe la carpeta del área, se crea
        if (!areaFolder) {
          areaFolder = await createFolder(doc.area, plantFolder.id)
        }

        if (areaFolder) {
          const projectFolderName = `OT N°${petition.ot} - ${petition.title}`
          const existingProjectFolders = await fetchFolders(areaFolder.id)
          let projectFolder = existingProjectFolders.files.find(folder => folder.name === projectFolderName)

          // Si no existe la carpeta de la OT, se crea
          if (!projectFolder) {
            projectFolder = await createFolder(projectFolderName, areaFolder.id)
          }

          if (projectFolder) {
            // Ubica la carpeta "EN TRABAJO"
            const trabajoFolders = await fetchFolders(projectFolder.id)
            let trabajoFolder = trabajoFolders.files.find(folder => folder.name === 'EN TRABAJO')

            // Si no existe la carpeta 'EN TRABAJO', se crea
            if (!trabajoFolder) {
              trabajoFolder = await createFolder('EN TRABAJO', projectFolder.id)
            }

            if (trabajoFolder) {
              const fileData = await uploadFile(files.name, files, trabajoFolder.id)

              if (fileData && fileData.id) {
                const fileLink = `https://drive.google.com/file/d/${fileData.id}/view`

                // Actualiza el campo storageBlueprints del blueprint en Firestore
                await updateBlueprintsWithStorageOrHlc(petitionId, doc.id, fileLink, fileData.name, 'storage')
              }
            }
          }
        }
      }

      setFiles(null)
      setIsLoading(false)
    } catch (error) {
      console.log(error)
    }
  }

  const handleSubmitHlcDocuments = async () => {
    try {
      setIsLoading(true)
      // Busca la carpeta de la planta.
      const plantFolders = await fetchFolders(rootFolder)
      let plantFolder = plantFolders.files.find(folder => folder.name.includes(getPlantAbbreviation(petition.plant)))

      // Si no existe la carpeta de la planta, se crea
      if (!plantFolder) {
        const plantName = getPlantAbbreviation(doc.plant)
        plantFolder = await createFolder(plantName, rootFolder)
      }

      if (plantFolder) {
        // Busca la carpeta del área.
        const areaFolders = await fetchFolders(plantFolder.id)
        let areaFolder = areaFolders.files.find(folder => folder.name === petition.area)

        // Si no existe la carpeta del área, se crea
        if (!areaFolder) {
          areaFolder = await createFolder(doc.area, plantFolder.id)
        }

        if (areaFolder) {
          const projectFolderName = `OT N°${petition.ot} - ${petition.title}`
          const existingProjectFolders = await fetchFolders(areaFolder.id)
          let projectFolder = existingProjectFolders.files.find(folder => folder.name === projectFolderName)

          // Si no existe la carpeta de la OT, se crea
          if (!projectFolder) {
            projectFolder = await createFolder(projectFolderName, areaFolder.id)
          }

          if (projectFolder) {
            // Ubica la carpeta "EMITIDOS"
            const issuedFolders = await fetchFolders(projectFolder.id)
            let issuedFolder = issuedFolders.files.find(folder => folder.name === 'EMITIDOS')

            // Si no existe la carpeta 'EMITIDOS', se crea
            if (!issuedFolder) {
              trabajoFolder = await createFolder('EMITIDOS', projectFolder.id)
            }

            if (issuedFolder) {
              // Crear o encontrar la subcarpeta de la revisión, por ejemplo: "REV_A"
              const revisionFolderName = `REV_${doc.revision}`
              const revisionFolders = await fetchFolders(issuedFolder.id)
              let revisionFolder = revisionFolders.files.find(folder => folder.name === revisionFolderName)

              if (!revisionFolder) {
                revisionFolder = await createFolder(revisionFolderName, issuedFolder.id)
              }

              if (revisionFolder) {
                const fileData = await uploadFile(hlcDocuments.name, hlcDocuments, revisionFolder.id)

                if (fileData && fileData.id) {
                  const fileLink = `https://drive.google.com/file/d/${fileData.id}/view`

                  // Actualiza el campo storageBlueprints del blueprint en Firestore
                  await updateBlueprintsWithStorageOrHlc(petitionId, doc.id, fileLink, fileData.name, 'hlc')
                }
              }
            }
          }
        }
      }

      setHlcDocuments(null)
      setIsLoading(false)
    } catch (error) {
      console.log(error)
    }
  }

  const handleRemoveAllFiles = () => {
    setFiles(null)
    setHlcDocuments(null)
  }

  const handleLinkClick = event => {
    event.preventDefault()
  }

  return (
    <Box>
      <AlertDialog open={openAlert} handleClose={handleCloseAlert} onSubmit={() => writeCallback()}></AlertDialog>
      <Box sx={{ margin: 'auto' }}>
        {
          <Box>
            <List>
              {values && values.revision && (
                <ListItem divider={true}>
                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography component='div' sx={{ width: '30%', pr: 2 }}>
                      Revisión
                    </Typography>
                    <Box>{values.revision}</Box>
                  </Box>
                </ListItem>
              )}

              <DateListItem
                editable={false}
                label='Fecha de Creación'
                id='date'
                initialValue={date}
                value={values.date}
                onChange={handleInputChange('date')}
                required={false}
              />
              <CustomListItem
                editable={false}
                label='Encargado'
                id='userName'
                initialValue={userName}
                value={values.userName}
                onChange={handleInputChange('userName')}
                required={false}
              />
              <CustomListItem
                editable={false}
                label='Contacto'
                id='userEmail'
                initialValue={userEmail}
                value={values.userEmail}
                onChange={handleInputChange('userEmail')}
                required={false}
              />
              {values && values.id && (
                <ListItem divider={true}>
                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography component='div' sx={{ width: '30%', pr: 2 }}>
                      Código Procure
                    </Typography>
                    <Box>{values.id}</Box>
                  </Box>
                </ListItem>
              )}
              {values && values.clientCode && (
                <ListItem divider={true}>
                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography component='div' sx={{ width: '30%', pr: 2 }}>
                      Código MEL
                    </Typography>
                    <Box>{values.clientCode}</Box>
                  </Box>
                </ListItem>
              )}

              {doc && authUser.uid === doc.userId ? (
                <CustomListItem
                  editable={doc && authUser.uid === doc.userId}
                  label='Descripción'
                  placeholder='Agregue la descripción del documento'
                  InputLabelProps={{
                    shrink: true
                  }}
                  id='description'
                  value={values?.description || ''}
                  onChange={e => {
                    handleInputChange('description')(e)
                    setIsDescriptionSaved(false) // Restablecer el estado al cambiar la descripción
                  }}
                  required={false}
                  inputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        {!isDescriptionSaved && (
                          <Button
                            onClick={submitDescription}
                            disabled={isSaving}
                            color={storageBlueprints?.length > 0 && !description ? 'error' : 'primary'}
                          >
                            {isSaving ? 'Guardando...' : 'Guardar descripción'}
                          </Button>
                        )}
                      </InputAdornment>
                    )
                  }}
                />
              ) : (
                <ListItem divider={true}>
                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography component='div' sx={{ width: '30%', pr: 2 }}>
                      Descripción
                    </Typography>
                    <Box>{values.description}</Box>
                  </Box>
                </ListItem>
              )}

              {!isSaving && doc && doc.storageBlueprints && doc.storageBlueprints.length > 0 && !isLoading && (
                <ListItem>
                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography component='div' sx={{ width: '30%', pr: 2 }}>
                      Plano adjunto
                    </Typography>
                    <Box>
                      {doc.storageBlueprints.map(file => (
                        <Fragment key={file.url}>
                          <Link href={file.url} target='_blank' rel='noreferrer'>
                            {file.name}
                          </Link>
                          <br />
                        </Fragment>
                      ))}
                    </Box>
                  </Box>
                </ListItem>
              )}

              {doc && doc.storageHlcDocuments && doc.storageHlcDocuments.length > 0 && !isLoading && (
                <ListItem>
                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography component='div' sx={{ width: '30%', pr: 2 }}>
                      HLC adjunto
                    </Typography>
                    <Box>
                      <Link href={doc.storageHlcDocuments[0].url} target='_blank' rel='noreferrer'>
                        {doc.storageHlcDocuments[0].name}
                      </Link>
                    </Box>
                  </Box>
                </ListItem>
              )}

              {isLoading === false ? (
                <Fragment>
                  <ListItem>
                    <FormControl fullWidth>
                      <Fragment>
                        {(!doc.storageBlueprints &&
                          !files &&
                          doc &&
                          authUser.uid === doc.userId &&
                          !doc.sentByDesigner) ||
                        (doc &&
                          (authUser.role === 6 || authUser.role === 7) &&
                          doc.sentByDesigner &&
                          !doc.approvedByDocumentaryControl &&
                          doc.storageBlueprints?.length < 2 &&
                          !doc.approvedBySupervisor &&
                          !doc.approvedByContractAdmin) ||
                        (doc &&
                          authUser.role === 9 &&
                          (doc.approvedBySupervisor || doc.approvedByContractAdmin) &&
                          doc.storageBlueprints?.length < 2 &&
                          !checkRoleAndApproval(authUser.role, doc)) ? (
                          <div {...getRootProps({ className: 'dropzone' })}>
                            <input {...getInputProps()} />
                            <Box
                              sx={{
                                my: 5,
                                mx: 'auto',
                                p: 5,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: ['center'],
                                backdropFilter: 'contrast(0.8)',
                                width: '100%',
                                borderRadius: '10px',
                                justifyContent: 'center'
                              }}
                            >
                              <Icon icon='mdi:file-document-outline' />
                              <Typography sx={{ mt: 5 }} color='textSecondary'>
                                <Link onClick={() => handleLinkClick}>Haz click acá</Link> para adjuntar Plano.
                              </Typography>
                            </Box>
                          </div>
                        ) : (
                          ''
                        )}
                        {files && (
                          <Fragment>
                            <List>{fileList}</List>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                              <Button color='error' sx={{ m: 2 }} variant='outlined' onClick={handleRemoveAllFiles}>
                                Quitar
                              </Button>
                              <Button color='primary' sx={{ m: 2 }} variant='outlined' onClick={handleSubmitAllFiles}>
                                Subir archivo
                              </Button>
                            </Box>
                          </Fragment>
                        )}
                      </Fragment>
                    </FormControl>
                  </ListItem>

                  <ListItem>
                    <FormControl fullWidth>
                      <Fragment>
                        {authUser.role === 9 &&
                        (doc.sentByDesigner || doc.sentBySupervisor) &&
                        doc.approvedByDocumentaryControl &&
                        !checkRoleAndApproval(authUser.role, doc) ? (
                          <div {...getRootProps({ className: 'dropzone' })}>
                            <input {...getInputProps()} />
                            <Box
                              sx={{
                                my: 5,
                                mx: 'auto',
                                p: 5,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: ['center'],
                                backdropFilter: 'contrast(0.8)',
                                width: '100%',
                                borderRadius: '10px',
                                justifyContent: 'center'
                              }}
                            >
                              <Icon icon='mdi:file-document-outline' />
                              <Typography sx={{ mt: 5 }} color='textSecondary'>
                                <Link onClick={() => handleLinkClick}>Haz click acá</Link> para adjuntar archivo HLC.
                              </Typography>
                            </Box>
                          </div>
                        ) : (
                          ''
                        )}
                        {hlcDocuments && doc.approvedByDocumentaryControl && !checkRoleAndApproval(authUser.role, doc) && (
                          <Fragment>
                            <List>{hlcList}</List>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                              <Button color='error' sx={{ m: 2 }} variant='outlined' onClick={handleRemoveAllFiles}>
                                Quitar
                              </Button>
                              <Button
                                color='primary'
                                sx={{ m: 2 }}
                                variant='outlined'
                                onClick={handleSubmitHlcDocuments}
                              >
                                Subir archivo HLC
                              </Button>
                            </Box>
                          </Fragment>
                        )}
                      </Fragment>
                    </FormControl>
                  </ListItem>
                </Fragment>
              ) : (
                <CircularProgress sx={{ m: 5 }} />
              )}
            </List>
          </Box>
        }
      </Box>
      {errorDialog && <DialogErrorFile open={errorDialog} handleClose={handleCloseErrorDialog} msj={errorFileMsj} />}
      <Dialog open={!!message} aria-labelledby='message-dialog-title' aria-describedby='message-dialog-description'>
        <DialogTitle id='message-dialog-title'>Creando solicitud</DialogTitle>
        <DialogContent>
          <DialogContentText id='message-dialog-description'>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessage('')}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
