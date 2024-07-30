import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField
} from '@mui/material'
import { useEffect, useState } from 'react'


// ** React Import

export default function AlertDialog({ authUser, state, open, handleClose, onSubmit, approves = null, loading = false, cancelReason = null, handleCancelReasonChange = null, domainData = null }) {

  let result

  const [errors, setErrors] = useState({option: '', details: ''})

  if (approves === undefined) {
    result = authUser.role === 5 && state === (3 || 4) ? 'aprobar' : 'modificar'
  } else if (approves) {
    result = approves.pendingReschedule ? 'pausar' : 'aprobar'
  } else {
    result = 'rechazar'
  }

  function capitalize(text) {
    const firstLetter = text.charAt(0)
    const rest = text.slice(1)

    return firstLetter.toUpperCase() + rest
  }

  // Función que revisa que se haya indicado una opción para 'option' y un texto para 'details'.
  const validateCancelReason = cancelReason => {

    let newErrors = {
      option: '',
      details: ''
    }

    if (!Boolean(cancelReason.option)) {
      newErrors.option = 'Por favor, especifica una opción válida para Motivo de Cancelación.'
    }

    if (!Boolean(cancelReason.details)) {
      newErrors.details = 'Por favor, detalle el motivo de la cancelación.'
    }

    setErrors(newErrors)

    return newErrors
  }

  // useEffect para que actualice el estado de 'errors' cuando el usuario seleccione una Opción o indique Detalles.
  useEffect(() => {

    if (cancelReason && cancelReason.option) {
      setErrors(prevState => ({
        ...prevState,
        option: ''
      }))
    }

    if (cancelReason && cancelReason.details) {
      setErrors(prevState => ({
        ...prevState,
        details: ''
      }))
    }

  },[cancelReason])

  // función onSubmit(), que se encargará de revisar si hay errores, en caso de que hayan se detiene su ejecución; si no se continúa.
  const handleOnSubmit = async () => {

    console.log(cancelReason)
    console.log(approves)
    console.log(Boolean(cancelReason))
    console.log(Boolean(approves))

    if (Boolean(approves)) {

      onSubmit()
      setErrors({option: '', details: ''})

    } else {

      // Se ejecuta y define formErrors que definirá cuáles son los errores o campos vacíos del formulario
      try {
        validateCancelReason(cancelReason)
      } catch (error) {
        console.log(error)
      }

      // Si no se han dado motivos de Cancelación o falta indicar uno de ellos se detiene la ejecución del onSubmit.
      if (cancelReason && (cancelReason.option === '' || cancelReason.details === '') || errors.option !== '' || errors.details !== '') {

        return

      } else {

        onSubmit()
        setErrors({option: '', details: ''})

      }

    }

  }

  // Función para manejar el cierre del dialog.
  const handleCloseDialog = () => {
    setErrors({option: '', details: ''})
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
    >
      <DialogTitle id='alert-dialog-title'>{capitalize(result)} estado de la solicitud</DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <DialogContentText id='alert-dialog-description'>
              ¿Estás segur@ de que quieres {result} la solicitud? {result === 'rechazar' && 'Deberás indicar la razón por la cual se está cancelando este Levantamiento:'}
            </DialogContentText>
            {result === 'rechazar' && cancelReason && (
              <>
              {/* Proyectista de Gabinete */}
              <FormControl fullWidth sx={{mt:4, '& .MuiInputBase-root ': { width: '100%' }}} error={Boolean(errors.option)}>
                <InputLabel>
                  {'Motivo de Cancelación'}
                </InputLabel>
                <Box display='flex' alignItems='center'>
                  <Select
                    value={cancelReason.option || ''}
                    input={<OutlinedInput label={'Motivo de Cancelación'} />}
                    onChange={(event) => handleCancelReasonChange({ target: { id: 'cancel-reason-option', value: event.target.value } })}
                    error={Boolean(errors.option)}
                  >
                    {Object.keys(domainData.cancelReasonOptions) &&
                      Object.keys(domainData.cancelReasonOptions).map(option => {
                        return (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        )
                      })}
                  </Select>
                </Box>
                {errors.option && <FormHelperText>{errors.option}</FormHelperText>}
              </FormControl>


              {/* Descripción del motivo de cancelamiento */}
              <TextField
                sx={{mt: 4}}
                id='cancel-reason-details'
                label='Detalle'
                error={!!errors.details}
                helperText={errors.details}
                type='text'
                fullWidth
                value={cancelReason.details}
                onChange={handleCancelReasonChange}
              />
            </>
          )}

        </>


        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>No</Button>
        <Button onClick={handleOnSubmit}>
          Sí
        </Button>
      </DialogActions>
    </Dialog>
  )
}
