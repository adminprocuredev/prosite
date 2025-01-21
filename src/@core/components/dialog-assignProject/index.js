// ** React Imports
import { forwardRef, useState } from 'react'

import { useGoogleDriveFolder } from 'src/context/google-drive-functions/useGoogleDriveFolder' // Import the new hook

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
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Hooks Imports
import { CircularProgress } from '@mui/material'
import { useFirebase } from 'src/context/useFirebase'

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

export const DialogAssignProject = ({ open, doc, proyectistas, handleClose }) => {
  //TODO: evaluar la foto del proyectista

  // ** States
  const [draftmen, setDraftmen] = useState([])
  const [loading, setLoading] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState(proyectistas)

  // ** Hooks
  const { updateDocs, authUser } = useFirebase()

  const { isLoading: folderLoading } = useGoogleDriveFolder() // Use the new hook

  const handleClickDelete = name => {
    // Filtramos el array draftmen para mantener todos los elementos excepto aquel con el nombre proporcionado
    const updatedDraftmen = draftmen.filter(draftman => draftman.name !== name)

    // Actualizamos el estado con el nuevo array actualizado
    setDraftmen(updatedDraftmen)
  }

  const handleListItemClick = option => {
    // Verificamos si el option ya existe en el array draftmen
    if (!draftmen.some(draftman => draftman.name === option.name)) {
      // Si no existe, actualizamos el estado añadiendo el nuevo valor al array
      setDraftmen(prevDraftmen => [...prevDraftmen, { name: option.name, userId: option.userId }])
      document.getElementById('add-members').blur() // Oculta el componente al hacer clic en el ListItem
    }
  }

  const onSubmit = async id => {
    setLoading(true)
    if (draftmen.length > 0) {
      try {
        await updateDocs(id, { draftmen, pendingReschedule: false }, authUser)
        setDraftmen([])
        handleClose()
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
  }

  const filterOptions = options => {
    // Convierte las opciones seleccionadas en un array de nombres
    const selectedNames = draftmen.map(draftman => draftman.name)

    // Filtra las opciones y devuelve solo las que no están en el array de nombres seleccionados
    return options.filter(option => !selectedNames.includes(option.name))
  }

  const getInitials = string => string.split(/\s/).reduce((response, word) => (response += word.slice(0, 1)), '')

  return (
    <Dialog
      fullWidth
      open={open}
      maxWidth='xs'
      scroll='body'
      onClose={() => handleClose()}
      TransitionComponent={Transition}
      onBackdropClick={() => {
        setDraftmen([])
        handleClose()
      }}
    >
      <DialogContent sx={{ px: { xs: 8, sm: 15 }, py: { xs: 8, sm: 12.5 }, position: 'relative', textAlign: 'center' }}>
        <IconButton
          size='small'
          onClick={() => {
            setDraftmen([])
            handleClose()
          }}
          sx={{ position: 'absolute', right: '1rem', top: '1rem' }}
        >
          <Icon icon='mdi:close' />
        </IconButton>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant='h5' sx={{ mb: 3, lineHeight: '2rem' }}>
            Agregar Proyectistas
          </Typography>
          <Typography variant='body2'>{doc.title}</Typography>
        </Box>
        {loading || folderLoading ? (
          <CircularProgress sx={{ mb: 5 }} />
        ) : (
          <Box>
            <Autocomplete
              autoHighlight
              sx={{ mb: 8 }}
              id='add-members'
              options={filteredOptions} // Usa las opciones filtradas en lugar de 'proyectistas'
              ListboxComponent={List}
              getOptionLabel={option => option.name}
              renderInput={params => <TextField {...params} size='small' placeholder='Seleccionar proyectistas...' />}
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
            <Typography variant='h6'>{`${draftmen.length} Seleccionados`}</Typography>
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
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <Button sx={{ lineHeight: '1.5rem', '& svg': { mr: 2 } }} disabled={loading} onClick={() => onSubmit(doc.id)}>
            <EngineeringIcon sx={{ fontSize: 18 }} />
            Asignar Proyectistas
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
