import 'moment/locale/es'
import React, { useEffect, useState } from 'react'

import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slide,
  TextField
} from '@mui/material'
import InputAdornment from '@mui/material/InputAdornment'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import {
  Timeline,
  timelineOppositeContentClasses
} from '@mui/lab'

import { Close } from '@mui/icons-material'
//* import DialogErrorOt from 'src/@core/components/dialog-error-ot'
import { useFirebase } from 'src/context/useFirebase'

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

export const EditUserDialog = ({ open, handleClose, doc, roleData, editButtonVisible, canComment = false, plantNames, allowableDomains, userRoles, userTypes, recargarUsuarios }) => {

  console.log(doc)

  const initialValues = {
    id: doc.id || '',
    name: doc.name || '',
    firstName: doc.firstName || '',
    fatherLastName: doc.fatherLastName || '',
    motherLastName: doc.motherLastName || '',
    rut: doc.rut || '',
    email: doc.email || '',
    phone: doc.phone || '',
    plant: doc.plant || [],
    role: doc.role || '',
    enabled: doc.enabled || false,
    company: doc.company || '',
    shift: doc.shift || [],
    subtype: doc.subtype || ''
  }

  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingDialogOpen, setLoadingDialogOpen] = useState(false) // Estado mientras se actualiza el usuario
  const [loading, setLoading] = useState(false) // Estado para abrir o cerrar el Dialog luego de que se actualiza el usuario

  const [hasChanges, setHasChanges] = useState({
    id: false,
    name: false,
    firstName: false,
    fatherLastName: false,
    motherLastName: false,
    rut: false,
    email: false,
    phone: false,
    plant: false,
    role: false,
    enabled: false,
    company: false,
    shift: false,
    subtype: false
  })

  const theme = useTheme()
  const xs = useMediaQuery(theme.breakpoints.up('xs')) //0-600
  const sm = useMediaQuery(theme.breakpoints.up('sm')) //600-960
  const md = useMediaQuery(theme.breakpoints.up('md')) //960-1280
  const lg = useMediaQuery(theme.breakpoints.up('lg')) //1280-1920
  const xl = useMediaQuery(theme.breakpoints.up('xl')) //1920+

  const { updateUserInDatabase } = useFirebase()

  const handleChange = prop => (event, data) => {
    let newValue
    switch (prop) {
      case 'phone':
        newValue = event.target.value.replace(/[^0-9]/g, '')
        newValue = `${newValue[0] || ''} ${newValue.slice(1, 5) || ''} ${newValue.slice(5, 10) || ''}`
        newValue = newValue.trim()
        break
      case 'email':
        newValue = event.target.value.replace(/[^a-zA-Z0-9\-_@.]+/g, '').trim()
        break
      case 'name':
        // Eliminar cualquier caracter que no sea una letra, tilde, guion o "ñ"
        newValue = event.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\-\s]/g, '')
        break

      case 'firstName':
        // Eliminar cualquier caracter que no sea una letra, tilde, guion o "ñ"
        newValue = event.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\-\s]/g, '')
        break

      case 'fatherLastName':
        // Eliminar cualquier caracter que no sea una letra, tilde, guion o "ñ"
        newValue = event.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\-\s]/g, '')
        break

      case 'motherLastName':
        // Eliminar cualquier caracter que no sea una letra, tilde, guion o "ñ"
        newValue = event.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑ\-\s]/g, '')
        break

      case 'rut':
        // Eliminar cualquier caracter que no sea un número o letra k
        let cv = event.target.value.replace(/[^0-9kK]/g, '')

        // Formatea RUT
        newValue = `${cv.length > 7 ? cv.slice(-9, -7) + '.' : ''}${cv.length > 4 ? cv.slice(-7, -4) + '.' : ''}${
          cv.length >= 2 ? cv.slice(-4, -1) + '-' : ''
        }${cv[cv.length - 1] || ''}`
        newValue = newValue.trim()
        break
      case 'plant':
        newValue = data
        if (!Array.isArray(newValue)) {
          newValue = newValue.split(',')
        }
        //getOptions(newValue)
        break

      case 'shift':
        newValue = Array.isArray(event) ? event : [event]
        let plantArray = values.plant
        if (!Array.isArray(values.plant)) {
          plantArray = values.plant.split(',')
        }
        // getOptions(plantArray, newValue)
        break

      case 'role':
        newValue = event.target.value
        values.plant = []
        values.shift = []
        // values.opshift = ''
        break

      case 'subtype':
        newValue = event.target.value
        break

      case 'company':
        newValue = event.target.value
        values.role = ''
        break

      default:
        newValue = event.target.value
        break
    }

    setValues(prevValues => ({ ...prevValues, [prop]: newValue }))

    // Deshacer errores al dar formato correcto
    if (newValue && validationRegex[prop] && validationRegex[prop].test(newValue) && errors[prop]) {
      setErrors(current => {
        const updatedErrors = Object.keys(current).reduce((obj, key) => {
          if (key !== prop) {
            obj[key] = current[key]
          }

          return obj
        }, {})

        return updatedErrors
      })
    }
  }

  // useEffect para formatear los campos Rut y teléfono en caso de que ya exista el dato.
  useEffect(() => {

    // Caso para el RUT
    if (values.rut) {
      // Eliminar cualquier caracter que no sea un número o letra k
      let cv = values.rut.replace(/[^0-9kK]/g, '')

      // Formatea RUT
      let newValue
      newValue = `${cv.length > 7 ? cv.slice(-9, -7) + '.' : ''}${cv.length > 4 ? cv.slice(-7, -4) + '.' : ''}${cv.length >= 2 ? cv.slice(-4, -1) + '-' : ''}${cv[cv.length - 1] || ''}`
      newValue = newValue.trim()

      setValues(prevValues => ({ ...prevValues, ['rut']: newValue }))

    }

    // Caso para el Teléfono
    if (values.phone) {

      // Formatea Teléfono
      let newValue
      newValue = values.phone.replace(/[^0-9]/g, '')
      newValue = `${newValue[0] || ''} ${newValue.slice(1, 5) || ''} ${newValue.slice(5, 10) || ''}`
      newValue = newValue.trim()

      setValues(prevValues => ({ ...prevValues, ['phone']: newValue }))

    }

  }, [])

  const validationRegex = {
    name: /^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s-]+$/,
    email: /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
    phone: /^\d\s\d{4}\s\d{4}$/
  }

  const enabledArray = [
    {id: true, name: 'Si'},
    {id: false, name: 'No'}
  ]

  const handleAccept = async () => {
    setLoading(false)

    // Antes esto era `window.location.reload()`. Es el mismo defecto que
    // reporto Mario Mella con el interruptor de habilitado -"se reinicia
    // Prosite, me borra los filtros y me saca del modulo"-: recargar la pagina
    // remonta la aplicacion entera, se lleva los filtros y el orden de la tabla
    // y el arranque deja al usuario en la portada.
    //
    // La lista de usuarios no escucha en vivo, asi que algo hay que hacer para
    // que la fila editada se vea actualizada; ese algo es volver a pedir SOLO
    // la lista.
    await recargarUsuarios?.()
    handleClose()
  }

  const onSubmit = async event => {

    event.preventDefault()
    setIsSubmitting(true)
    setLoading(true)
    setLoadingDialogOpen(true)

    // Primero que todo, se deberán formatear los campos rut y phone para guardarlos correctamten
    if (values.rut) {
      let formattedRut = values.rut.replace(/[.]/g, '')
      values.rut = formattedRut
      //console.log(formattedRut)
    }

    if (values.phone) {
      let formattedPhone = values.phone.replace(/[' ']/g, '')
      values.phone = formattedPhone
    }

    if (values.name) {
      let formattedName = values.firstName + (values.fatherLastName.length > 0 ? ' ' : '') + values.fatherLastName + (values.motherLastName.length > 0 ? ' ' : '') + values.motherLastName
      values.name = formattedName
    }

    await updateUserInDatabase(values, values.id)

    setLoadingDialogOpen(false)
    setLoading(true)
    setIsSubmitting(false)

  }

  return (
    <Dialog
      sx={{ '& .MuiPaper-root': { maxWidth: '800px', width: '100%' } }}
      open={open}
      onClose={() => handleClose()}
      TransitionComponent={Transition}
      scroll='body'
    >
      <Paper sx={{ margin: 'auto', padding: sm ? 0 : '30px', overflowY: 'hidden' }}>
          <Box>
            <Timeline sx={{ [`& .${timelineOppositeContentClasses.root}`]: { flex: 0.2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <Box>
                  <IconButton
                    onClick={() => {
                      handleClose()
                    }}
                    color='primary'
                    aria-label='close'
                    component='button'
                  >
                    <Close />
                  </IconButton>
                </Box>
              </Box>

              <Grid container spacing={5}>

                {/* Primer Nombre */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required={true}
                    label='Primer Nombre'
                    type='text'
                    placeholder='Primer Nombre'
                    onChange={handleChange('firstName')}
                    value={values.firstName}
                    // error={errors.name ? true : false}
                    // helperText={errors.name}
                    // inputProps={{ maxLength: 45 }}
                  />
                </Grid>

                {/* Apellido Paterno */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required={true}
                    label='Apellido Paterno'
                    type='text'
                    placeholder='Apellido Paterno'
                    onChange={handleChange('fatherLastName')}
                    value={values.fatherLastName}
                    // error={errors.name ? true : false}
                    // helperText={errors.name}
                    // inputProps={{ maxLength: 45 }}
                  />
                </Grid>

                {/* Apellido Materno */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Apellido Materno'
                    type='text'
                    placeholder='Apellido Materno'
                    onChange={handleChange('motherLastName')}
                    value={values.motherLastName}
                    // error={errors.name ? true : false}
                    // helperText={errors.name}
                    // inputProps={{ maxLength: 45 }}
                  />
                </Grid>

                {/* RUT */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type='tel'
                    label='RUT'
                    placeholder='RUT'
                    onChange={handleChange('rut')}
                    value={values.rut}
                    // error={errors.rut ? true : false}
                    // helperText={errors.rut}
                    inputProps={{ maxLength: 12 }}
                  />
                </Grid>

                {/* e-mail */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    disabled={true}
                    label='e-mail'
                    type='text'
                    placeholder='e-mail'
                    onChange={handleChange('email')}
                    value={values.email}
                    // error={errors.name ? true : false}
                    // helperText={errors.name}
                    // sinputProps={{ maxLength: 45 }}
                  />
                </Grid>

                {/* Teléfono */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Teléfono'
                    type='tel'
                    placeholder='Teléfono'
                    onChange={handleChange('phone')}
                    value={values.phone}
                    // error={errors.phone ? true : false}
                    // helperText={errors.phone}
                    inputProps={{ maxLength: 11 }}
                    InputProps={{ startAdornment: <InputAdornment position='start'>(+56)</InputAdornment> }}
                  />
                </Grid>

                {/* Rol */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Rol</InputLabel>
                    <Select
                      // Estaba `disabled={true}` fijo, escrito a mano: el rol se
                      // mostraba pero no se podia cambiar NUNCA, ni siendo
                      // administrador. Y no hay motivo: esta pantalla es de rol
                      // 1 y punto -en src/configs/acl.js solo ese rol alcanza
                      // 'editar-usuarios'-, asi que quien la ve ya es quien
                      // corresponde. Sin esto, cambiar el rol de alguien pedia
                      // entrar a la base de datos a mano.
                      label='Rol'
                      value={values.role}
                      onChange={handleChange('role')}
                      // error={errors.role ? true : false}
                    >
                      {userRoles.map(role => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Subtipo */}
                {values.company === 'Procure' && (
                  <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Subtipo</InputLabel>
                    <Select
                      disabled={values.company !== 'Procure'}
                      label='Subtipo'
                      value={values.subtype}
                      onChange={handleChange('subtype')}
                      // error={errors.role ? true : false}
                    >
                      {userTypes.map(element => (
                        <MenuItem value={element} key={element}>
                          {element}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                )}

                {/* Turno */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Turno</InputLabel>
                    <Select
                      label='Turno'
                      value={values.shift}
                      onChange={(event) => {
                        const selectedShifts = event.target.value
                        handleChange('shift')(selectedShifts)
                      }}
                      multiple
                      error={errors.shift ? true : false}
                    >
                      {values.company === 'MEL' && <MenuItem value={'P'}>P</MenuItem>}
                      {values.company === 'MEL' && <MenuItem value={'Q'}>Q</MenuItem>}
                      {values.company === 'Procure' && <MenuItem value={'A'}>A</MenuItem>}
                      {values.company === 'Procure' && <MenuItem value={'B'}>B</MenuItem>}
                    </Select>
                    {/* {errors.shift && <FormHelperText error>{errors.shift}</FormHelperText>} */}
                  </FormControl>
                </Grid>

                {/* Planta */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <Autocomplete
                      multiple={true}
                      fullWidth
                      options={plantNames}
                      value={values.plant}
                      onChange={handleChange('plant')}
                      renderInput={params => (
                        <TextField
                          {...params}
                          label='Planta'
                          InputLabelProps={{ required: false }}
                          error={errors.plant ? true : false}
                          helperText={errors.plant}
                        />
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Habilitado */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Habilitado</InputLabel>
                    <Select
                      label='Habilitado'
                      value={values.enabled}
                      onChange={handleChange('enabled')}
                      // error={errors.role ? true : false}
                    >
                      {enabledArray.map(element => (
                        <MenuItem key={element.id} value={element.id}>
                          {element.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

                <Button
                  sx={{ mt: 3, mb: 5 }}
                  // disabled={!Object.values(hasChanges).some(hasChange => hasChange) && !doc.end}
                  disabled={isSubmitting}
                  onClick={onSubmit}
                  variant='contained'
                >
                  {'Guardar'}
                </Button>
            </Timeline>
          </Box>
      </Paper>

      {/* Dialog de carga */}
      <Dialog
        sx={{ '.MuiDialog-paper': { minWidth: '20%' } }}
        open={loading}
        //closeAfterTransition={true}
        maxWidth={false}
      >
        <DialogTitle sx={{ mt: 2, textAlign: 'center' }} id='spinner-dialog-title'>
          { loadingDialogOpen ? 'Actualizando Usuario' : 'Usuario actualizado con éxito'}
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center' }}>
          { loadingDialogOpen ? (
            <CircularProgress size={40} />
          ) : (
            <Button variant="contained" color="primary" onClick={handleAccept}>
              Aceptar
            </Button>
          )}
        </DialogContent>

      </Dialog>

    </Dialog>
  )
}
