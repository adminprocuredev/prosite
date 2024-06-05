import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import moment from 'moment-timezone'
import 'moment/locale/es'
import React, { useState } from 'react'

import {
  Autocomplete,
  Box,
  Chip,
  Dialog,
  FormControl,
  Grid,
  IconButton,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Slide,
  TextField,
  Typography
} from '@mui/material'
import InputAdornment from '@mui/material/InputAdornment'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { LocalizationProvider, MobileDatePicker } from '@mui/x-date-pickers'

import {
  Timeline,
  timelineOppositeContentClasses
} from '@mui/lab'

import { Close } from '@mui/icons-material'
//* import DialogErrorOt from 'src/@core/components/dialog-error-ot'
import { unixToDate } from 'src/@core/components/unixToDate'
import { useFirebase } from 'src/context/useFirebase'

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />
})

const StyledFormControl = props => (
  <FormControl fullWidth sx={{ '& .MuiFormControl-root': { width: '100%' } }} {...props} />
)

function CustomListItem({
  editable,
  label,
  id,
  value,
  onChange,
  multiple,
  disabled = false,
  required = true,
  multiline = false,
  selectable = false,
  options = [],
  initialValue,
  inputProps
}) {
  return (
    <>
      {editable ? (
        <ListItem id={`list-${label}`} divider={!editable}>
          <StyledFormControl>
            {selectable ? (
              <>
                {/* <InputLabel variant='standard'>
                  {label} {required && <span>*</span>}
                </InputLabel> */}
                <Select
                  id={`${id}-input`}
                  defaultValue={initialValue}
                  multiple={multiple}
                  disabled={disabled}
                  required={required}
                  value={value}
                  size='small'
                  variant='standard'
                  fullWidth={true}
                  onChange={onChange}
                >
                  {options &&
                    options.map(option => {
                      return (
                        <MenuItem key={option.name || option} value={option.name || option}>
                          {option.name || option}
                        </MenuItem>
                      )
                    })}
                </Select>
              </>
            ) : (
              <TextField
                onChange={onChange}
                label={label}
                id={`${id}-input`}
                defaultValue={initialValue}
                disabled={disabled}
                required={required}
                value={value}
                size='small'
                variant='standard'
                fullWidth={true}
                multiline={multiline}
                inputProps={inputProps}
              />
            )}
          </StyledFormControl>
        </ListItem>
      ) : (
        initialValue && (
          <ListItem id={`list-${label}`} divider={!editable}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Typography component='div' sx={{ width: '40%' }}>
                {label}
              </Typography>
              <Typography component='div' sx={{ width: '60%' }}>
                {initialValue}
              </Typography>
            </Box>
          </ListItem>
        )
      )}
    </>
  )
}

function CustomAutocompleteItem({
  selectable,
  options,
  editable,
  label,
  value,
  onChange,
  error,
  required,
  multiple
}) {
  return (
    <Grid item xs={12}>
      <FormControl fullWidth>
        <Box display='flex' alignItems='center'>
          {editable && selectable ? (
            <Autocomplete
              multiple={multiple}
              fullWidth
              options={options}
              value={value}
              getOptionLabel={(option) => option}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(_, newValue) => onChange({ target: { value: newValue } })}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                  <Chip
                    key={index}
                    label={option}
                    {...getTagProps({ index })}
                    disabled={!editable}
                    clickable={editable}
                    onDelete={() => {
                      const newValue = value.filter((v, i) => i !== index)
                      onChange({ target: { value: newValue } })
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={label}
                  InputLabelProps={{ required: required }}
                  error={error ? true : false}
                  helperText={error}
                />
              )}
            />
          ) : (
            <ListItem id={`list-${label}`} divider={!editable}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography component='div' sx={{ width: '40%' }}>
                  {label}
                </Typography>
                <Typography component='div' sx={{ width: '60%' }}>
                  {value.join(', ')}
                </Typography>
              </Box>
            </ListItem>
          )}
        </Box>
      </FormControl>
    </Grid>
  )
}

function DateListItem({ editable, label, value, onChange, initialValue, customMinDate = null }) {
  return (
    <>
      {editable ? (
        <ListItem id={`list-${label}`} divider={!editable}>
          <StyledFormControl>
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
                minDate={customMinDate || moment().subtract(1, 'year')}
                maxDate={moment().add(1, 'year')}
                label={label}
                value={value}
                onChange={onChange}
                inputFormat='dd/MM/yyyy' // Formato de fecha que no puede ser introducido manualmente
                slotProps={{
                  textField: {
                    size: 'small',
                    required: true,
                    variant: 'standard',
                    fullWidth: true
                  },
                  toolbar: { hidden: false }
                }}
              />
            </LocalizationProvider>
          </StyledFormControl>
        </ListItem>
      ) : (
        initialValue &&
        initialValue.seconds && (
          <ListItem id={`list-${label}`} divider={!editable}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Typography component='div' sx={{ width: '40%' }}>
                {label}
              </Typography>
              <Typography component='div' sx={{ width: '60%' }}>
                {initialValue && unixToDate(initialValue.seconds)[0]}
              </Typography>
            </Box>
          </ListItem>
        )
      )}
    </>
  )
}



export const EditUserDialog = ({ open, handleClose, doc, roleData, editButtonVisible, canComment = false, plantNames, allowableDomains, userRoles }) => {

  const initialValues = {
    name: doc.name || '',
    email: doc.email || '',
    phone: doc.phone || '',
    plant: doc.plant || [],
    role: doc.role || '',
    enabled: doc.enabled || ''
  }

  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [hasChanges, setHasChanges] = useState({
    name: false,
    email: false,
    phone: false,
    plant: false,
    enabled: false,
  })

  const theme = useTheme()
  const xs = useMediaQuery(theme.breakpoints.up('xs')) //0-600
  const sm = useMediaQuery(theme.breakpoints.up('sm')) //600-960
  const md = useMediaQuery(theme.breakpoints.up('md')) //960-1280
  const lg = useMediaQuery(theme.breakpoints.up('lg')) //1280-1920
  const xl = useMediaQuery(theme.breakpoints.up('xl')) //1920+

  const {
    updateDocs,
    useEvents,
    authUser,
    getUserData,
    getDomainData,
    domainDictionary,
    consultBlockDayInDB
  } = useFirebase()


  // Actualiza el estado al cambiar de documento, sólo valores obligatorios
  // useEffect(() => {
  //   setValues(initialValues)
  // }, [doc])


  // // Función onchange utilizando currying
  // const handleInputChange = field => event => {
  //   let fieldValue = event.target.value

  //   fieldValue = validationRegex[field] ? fieldValue.replace(validationRegex[field], '') : fieldValue

  //   setValues({ ...values, [field]: fieldValue })
  //   setHasChanges({ ...hasChanges, [field]: fieldValue !== initialValues[field] })
  // }


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
        getOptions(plantArray, newValue)
        break

      case 'role':
        newValue = event.target.value
        values.plant = []
        values.shift = []
        values.opshift = ''
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

  const validationRegex = {
    name: /^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s-]+$/,
    email: /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
    phone: /^\d\s\d{4}\s\d{4}$/
  }

  const enabledArray = [
    {id: true, name: 'Si'},
    {id: false, name: 'No'}
  ]

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
                      setEditable(false)
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Nombre'
                    type='text'
                    placeholder='Nombre'
                    onChange={handleChange('name')}
                    value={values.name}
                    // error={errors.name ? true : false}
                    // helperText={errors.name}
                    inputProps={{ maxLength: 45 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
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
                {/* <Grid item xs={12}>
                  <CustomAutocompleteItem
                    multiple={true}
                    selectable={true}
                    options={plantNames}
                    editable={true}
                    label='Plantas'
                    id='plants'
                    initialValue={values.plant}
                    value={values.plant}
                    onChange={handleChange('plant')}
                  />
                </Grid> */}
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
                {/* Rol */}
                {/* <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Rol</InputLabel>
                    <Select
                      label='Rol'
                      value={values.role}
                      onChange={handleInputChange('role')}
                      // error={errors.role ? true : false}
                    >
                      {userRoles.map(role => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid> */}
                {/* Rol */}
                {/* <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Habilitado</InputLabel>
                    <Select
                      label='Habilitado'
                      value={values.enabled}
                      onChange={handleInputChange('enabled')}
                      // error={errors.role ? true : false}
                    >
                      {enabledArray.map(element => (
                        <MenuItem key={element.id} value={element.id}>
                          {element.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid> */}
              </Grid>

              {/* {editable ? (
                <Button
                  sx={{ mt: 3, mb: 5 }}
                  disabled={!Object.values(hasChanges).some(hasChange => hasChange) && !doc.end}
                  onClick={() => handleOpenAlert()}
                  variant='contained'
                >
                  {isPlanner && state <= 4 ? 'Aprobar y guardar' : 'Guardar'}
                </Button>
              ) : null} */}

            </Timeline>
          </Box>
      </Paper>
    </Dialog>
  )
}