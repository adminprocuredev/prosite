// ** React Imports
import { forwardRef, useEffect, useState } from 'react'

// ** MUI Imports
import EngineeringIcon from '@mui/icons-material/Engineering'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { LocalizationProvider, MobileDatePicker } from '@mui/x-date-pickers'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Firebase Imports
import { Timestamp } from 'firebase/firestore'

// ** Date Library
//import moment from 'moment'
import moment from 'moment-timezone'
import 'moment/locale/es'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Hooks Imports
import { CircularProgress, FormControl } from '@mui/material'
import { useGoogleDriveFolder } from 'src/context/google-drive-functions/useGoogleDriveFolder'
import { useFirebase } from 'src/context/useFirebase'

// ** Configuración de Google Drive
import googleAuthConfig from 'src/configs/googleDrive'

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

export const DialogDoneProject = ({ open, petition, handleClose, proyectistas }) => {

  // ** States

  const [draftmen, setDraftmen] = useState([])
  const [loading, setLoading] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState(proyectistas)

  const [uprisingTimeSelected, setUprisingTimeSelected] = useState({
    hours: 0,
    minutes: 0
  })

  const [error, setError] = useState('')
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState(moment())

  // ** Hooks
  const { updateDocs, authUser } = useFirebase()
  const { uploadFile, findOrCreateFolder, createFolderStructure } = useGoogleDriveFolder()

  const handleClickDelete = name => {
    // Filtramos el array draftmen para mantener todos los elementos excepto aquel con el nombre proporcionado
    const updatedDraftmen = draftmen.filter(draftman => draftman.name !== name)

    // Actualizamos el estado con el nuevo array actualizado
    setDraftmen(updatedDraftmen)
  }

  const handleKeyDown = event => {
    if (event.key === '.' || event.key === ',' || event.key === '-' || event.key === '+') {
      event.preventDefault()
    }
  }

  const handlePaste = event => {
    event.preventDefault()
    setError('No se permite pegar valores en este campo.')
  }

  const handleInputChange = e => {
    let inputValue = e.target.value

    // Verifica si el valor ingresado es un número y si es mayor a 1
    if (!isNaN(inputValue) && Number(inputValue) > 0 && !inputValue.startsWith('0')) {
      setUprisingTimeSelected({ hours: Number(inputValue), minutes: 0 })
      setError('') // Limpia el mensaje de error si existe
    } else {
      setUprisingTimeSelected('')
      setError('Por favor, ingrese un número mayor a 1.')
    }
  }

  const handleDateChange = dateField => async date => {
    const fieldValue = moment(date.toDate()).startOf('day')
    setDeadlineDate(fieldValue)
  }

  const filterOptions = options => {
    // Convierte las opciones seleccionadas en un array de nombres
    const selectedNames = draftmen.map(draftman => draftman.name)

    // Filtra las opciones y devuelve solo las que no están en el array de nombres seleccionados
    return options.filter(option => !selectedNames.includes(option.name))
  }

  const handleListItemClick = option => {
    // Verificamos si el option ya existe en el array draftmen
    if (!draftmen.some(draftman => draftman.name === option.name)) {
      // Si no existe, actualizamos el estado añadiendo el nuevo valor al array
      setDraftmen(prevDraftmen => [
        ...prevDraftmen,
        {
          name: option.name,
          userId: option.userId,
          shift: option.shift,
          enabled: option.enabled,
          email: option.email,
          role: option.role
        }
      ])
      document.getElementById('add-members').blur() // Oculta el componente al hacer clic en el ListItem
    }
  }

  // useEffect que definirá si el botón "Guardar" estará habilitado o no.
  useEffect(() => {
    const initialUprisingTime = {
      hours: 0,
      minutes: 0
    }
    const initialDeadlineDate = moment()
    const initialDraftmen = []

    const timeChanged =
      initialUprisingTime.hours !== uprisingTimeSelected.hours ||
      initialUprisingTime.minutes !== uprisingTimeSelected.minutes
    const dateChanged = !initialDeadlineDate.isSame(deadlineDate, 'day')

    const draftmenChanged =
      initialDraftmen.length !== draftmen.length ||
      initialDraftmen.some((draftman, index) => draftman.name !== draftmen[index]?.name)

    if (timeChanged && dateChanged && draftmenChanged && !error && uprisingTimeSelected.hours > 0) {
      setIsSubmitDisabled(false)
    } else {
      setIsSubmitDisabled(true)
    }
  }, [uprisingTimeSelected, deadlineDate, draftmen, error])

  /**
   * Función para obtener las iniciales del nombre del usuario.
   * @param {string} string - Nombre del Usuario
   * @returns {string} - string con las iniciales del usuario
   */
  const getInitials = string => string.split(/\s/).reduce((response, word) => (response += word.slice(0, 1)), '')

  // Función onSubmit que se encargará de ejecutar el almacenamiento de datos en la Base de Datos.
  const onSubmit = async() => {

    if (uprisingTimeSelected.hours > 0) {
      setLoading(true)
      try {

        const subfolders = [
          'ANTECEDENTES',
          'SOLICITUD DE REQUERIMIENTO',
          'LEVANTAMIENTO',
          'EN TRABAJO',
          'REVISIONES & COMENTARIOS',
          'EMITIDOS',
          'COMENTARIOS CLIENTE'
        ]

        // Se crea la estructura de carpetas.
        const projectFolder = await createFolderStructure(petition, subfolders)

        // Buscar o crear la carpeta "LEVANTAMIENTO".
        const targetFolder = await findOrCreateFolder(projectFolder.id, "LEVANTAMIENTO", "LEVANTAMIENTO")

        // Subir archivo a la carpeta "LEVANTAMIENTO".
        const fileContent = `levantamiento de OT ${petition.ot} - ${petition.title} TERMINADO`
        const file = new Blob([fileContent], { type: 'text/plain' })
        const fileName = `levantamiento de OT ${petition.ot} terminado.txt`
        await uploadFile(fileName, file, targetFolder.id)

        // Actualizar Firestore.
        const updatedDraftmen = draftmen.map(designer => ({
          name: designer.name,
          userId: designer.userId,
          allocationTime: Timestamp.fromDate(new Date())
        }))

        await updateDocs(petition.id, {
          uprisingInvestedHours: uprisingTimeSelected,
          deadline: deadlineDate,
          gabineteDraftmen: updatedDraftmen
        }, authUser)

        setDraftmen([])
        handleClose()

      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    } else {
      setError('Por favor, indique fecha de inicio y fecha de término.')
    }

  }

  return (
    <Dialog
      fullWidth
      open={open}
      maxWidth='xs'
      scroll='body'
      onClose={() => handleClose()}
      TransitionComponent={Transition}
      onBackdropClick={() => handleClose()}
    >
      <DialogContent sx={{ px: { xs: 8, sm: 15 }, py: { xs: 8, sm: 12.5 }, position: 'relative' }}>
        <IconButton
          size='small'
          onClick={() => handleClose()}
          sx={{ position: 'absolute', right: '1rem', top: '1rem' }}
        >
          <Icon icon='mdi:close' />
        </IconButton>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant='h5' sx={{ mb: 3, lineHeight: '2rem' }}>
            Terminar Levantamiento
          </Typography>
          <Typography variant='body2'>Establece el total de horas</Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <CircularProgress /> <Typography sx={{ ml: 3 }}>Creando estructura de carpetas...</Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            {/* Horas invertidas en Levantamiento */}
            <TextField
              type='number'
              value={uprisingTimeSelected.hours}
              label='Horas de trabajo del Levantamiento'
              error={error !== ''}
              helperText={error}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              fullWidth
              sx={{ mb: 6 }} // Ajusta el espacio entre los dos campos
            />

            {/* Fecha Límite */}
            <FormControl fullWidth>
              <LocalizationProvider
                dateAdapter={AdapterMoment}
                adapterLocale='es'
                localeText={{
                  okButtonLabel: 'Aceptar',
                  cancelButtonLabel: 'Cancelar',
                  datePickerToolbarTitle: 'Selecciona Fecha'
                }}
              >
                <MobileDatePicker
                  dayOfWeekFormatter={day => day.substring(0, 2).toUpperCase()}
                  minDate={moment().subtract(1, 'year')}
                  maxDate={moment().add(1, 'year')}
                  label='Fecha Límite (Entrega de Gabinete)'
                  value={deadlineDate && moment.isMoment(deadlineDate) ? deadlineDate : moment(deadlineDate)}
                  onChange={handleDateChange(deadlineDate)}
                  InputLabelProps={{ shrink: true, required: true }}
                  viewRenderers={{ minutes: null }}
                  slotProps={{ toolbar: { hidden: false } }}
                  sx={{ mb: 6 }} // Ajusta el espacio entre los dos campos
                />
              </LocalizationProvider>
            </FormControl>

            {/* Proyectista de Gabinete */}
            <Box>
              <Autocomplete
                autoHighlight
                sx={{ mb: 8 }}
                id='add-members'
                options={filteredOptions} // Usa las opciones filtradas en lugar de 'proyectistas'
                ListboxComponent={List}
                getOptionLabel={option => option.name}
                renderInput={params => (
                  <TextField {...params} size='small' label='Seleccionar Proyectistas de Gabinete' />
                )}
                filterOptions={filterOptions} // Agrega este prop
                renderOption={(props, option) => (
                  <ListItem {...props} onClick={() => handleListItemClick(option)}>
                    <ListItemAvatar>
                      {option.avatar ? (
                        <Avatar
                          src={`/images/avatars/${option.avatar}`}
                          alt={option.name}
                          sx={{ height: 28, width: 28 }}
                        />
                      ) : (
                        <CustomAvatar
                          skin='light'
                          sx={{
                            mr: 3,
                            width: 28,
                            height: 28,
                            objectFit: 'contain',
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontSize: '.8rem'
                          }}
                        >
                          {getInitials(option.name ? option.name : 'John Doe')}
                        </CustomAvatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText primary={option.name} />
                  </ListItem>
                )}
              />
              <Typography variant='h6'>{`${draftmen.length} Proyectista${
                draftmen.length === 1 ? '' : 's'
              } de Gabinete seleccionado${draftmen.length === 1 ? '' : 's'}`}</Typography>
              <List dense sx={{ py: 4 }}>
                {draftmen.map(draftman => {
                  return (
                    <ListItem
                      key={draftman.name}
                      sx={{
                        p: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        '.MuiListItem-container:not(:last-child) &': { mb: 4 }
                      }}
                    >
                      <ListItemAvatar>
                        {draftman.avatar ? (
                          <Avatar src={`/images/avatars/${draftman.avatar}`} alt={draftman.name} />
                        ) : (
                          <CustomAvatar
                            skin='light'
                            sx={{
                              mr: 3,
                              width: 34,
                              height: 34,
                              objectFit: 'contain',
                              bgcolor: 'primary.main',
                              color: 'white',
                              fontSize: '.8rem'
                            }}
                          >
                            {getInitials(draftman.name ? draftman.name : 'John Doe')}
                          </CustomAvatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={draftman.name}
                        secondary={draftman.email}
                        sx={{
                          m: 0,
                          '& .MuiListItemText-primary, & .MuiListItemText-secondary': { lineHeight: '1.25rem' }
                        }}
                      />
                      <ListItemSecondaryAction sx={{ right: 0 }}>
                        <IconButton
                          size='small'
                          aria-haspopup='true'
                          onClick={() => handleClickDelete(draftman.name)}
                          aria-controls='modal-share-examples'
                        >
                          <Icon icon='mdi:delete-forever' fontSize={20} color='#f44336' />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  )
                })}
              </List>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <Button
            sx={{ lineHeight: '1.5rem', '& svg': { mr: 2 } }}
            disabled={isSubmitDisabled || loading}
            onClick={() => onSubmit()}
          >
            <EngineeringIcon sx={{ fontSize: 18 }} />
            Guardar
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
