// ** React Imports
import { useState } from 'react'

// ** Next Imports
import Link from 'next/link'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import MuiFormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import OutlinedInput from '@mui/material/OutlinedInput'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { styled, useTheme } from '@mui/material/styles'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party Imports
import { yupResolver } from '@hookform/resolvers/yup'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

// ** Hooks
import { useSettings } from 'src/@core/hooks/useSettings'
import { useFirebase } from 'src/context/useFirebase'

// ** Configs
import themeConfig from 'src/configs/themeConfig'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Logo Procure
import LogoProcure from 'src/images/logoProcure'

// ** Styled Components

// Styled component RightWrapper: Estiliza el contenedor Box y adapta su diseño dependiendo del tamaño de la pantalla.
const RightWrapper = styled(Box)(({ theme }) => ({
  width: '100%', // Establece el ancho a 100% del contenedor padre.
  [theme.breakpoints.down('sm')]: { // Cuando el tamaño de la pantalla sea pequeño (menor que 'sm' en el theme).
    margin: 20 // Aplica un margen de 20px.
  },
  [theme.breakpoints.up('sm')]: { // Cuando el tamaño de la pantalla sea mayor o igual a 'sm'.
    maxWidth: 400 // Limita el ancho máximo a 400px.
  }
}))

// Styled component BoxWrapper: Estiliza el contenedor Box para tener un ancho máximo ajustado según el tamaño de la pantalla.
const BoxWrapper = styled(Box)(({ theme }) => ({
  width: '100%', // Establece el ancho a 100% del contenedor padre.
  [theme.breakpoints.down('md')]: { // Cuando el tamaño de la pantalla sea menor que 'md' en el theme.
    maxWidth: 400 // Limita el ancho máximo a 400px.
  }
}))

// Styled component TypographyStyled: Personaliza la tipografía para que tenga un estilo particular.
const TypographyStyled = styled(Typography)(() => ({
  fontWeight: 600, // Establece un peso de fuente de 600 (negrita).
  textAlign: 'center', // Centra el texto.
  letterSpacing: '0.18px' // Aplica un espaciado entre letras de 0.18px.
}))

// Styled component FormControlLabel: Personaliza el componente MuiFormControlLabel de Material-UI.
const FormControlLabel = styled(MuiFormControlLabel)(({ theme }) => ({
  '& .MuiFormControlLabel-label': { // Estiliza específicamente la etiqueta dentro de FormControlLabel.
    fontSize: '0.875rem', // Define el tamaño de la fuente de la etiqueta.
    color: theme.palette.text.secondary // Usa el color secundario del texto desde el tema de Material-UI.
  }
}))

// Esquema de validación usando Yup para los campos 'email' y 'password'.
const schema = yup.object().shape({
  email: yup.string().email('Ingresa un mail válido').required('Por favor, ingresa tu correo'), // Valida que el correo sea una cadena, sea un correo válido y sea obligatorio.
  password: yup
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres') // La contraseña debe tener al menos 6 caracteres.
    .required('Por favor, ingresa tu contraseña') // La contraseña es obligatoria.
})


const LoginPage = () => {

  // Estados de React
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  // ** Hooks
  const theme = useTheme()
  const { settings } = useSettings()

  // ** Vars
  const { signInWithEmailAndPassword, signGoogle } = useFirebase()
  const { control, handleSubmit, formState: { errors } } = useForm({ mode: 'onBlur', resolver: yupResolver(schema) })

  // Función onSubmit.
  // Se ejecuta cuando el usuario hace click en 'Entrar'.
  const onSubmit = async data => {
    const { email, password } = data
    try {
      await signInWithEmailAndPassword(email, password, rememberMe)
    } catch (error) {
      const errorMessage = error.message
      setAlertMessage(errorMessage)
    }
  }

  // Función para manejar el login con Google SSO.
  // const handleSignGoogle = e => {
  //   e.preventDefault()
  //   signGoogle()
  //     .then(token => {
  //       // Manejar la respuesta exitosa
  //     })
  //     .catch(error => {
  //       console.log(error)
  //     })
  // }

  // Se retorna de forma gráfica.
  return (
    <Box className='content-right'>

      {/* Dialog de Errores */}
      <Dialog sx={{ '.MuiDialog-paper': { minWidth: '20%' } }} open={!!alertMessage} maxWidth={false}>
        <DialogTitle sx={{ ml: 2, mt: 4 }} id='alert-dialog-title'>
          Atención
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ m: 2, whiteSpace: 'pre-line' }} id='alert-dialog-description'>
            {alertMessage}
          </DialogContentText>
          <DialogActions>
            <Button size='small'onClick={() => {setAlertMessage('')}}>
              Cerrar
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      {/* Contenedor de elementos en el centro de la página de login */}
      <RightWrapper sx={{ margin: 'auto' }}>
        <Paper elevation={9} sx={{margin: 'auto', p: 7, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.paper'}}>
          <BoxWrapper>

            {/* Contenedor de parte de arriba: Logo y Mensaje de Bienvenida */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

              {/* Logo de la empresa */}
              <Box sx={{ width: '65%', m: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <LogoProcure sx={{ width: '100%', height: 'auto' }} theme={theme}/>
              </Box>

              {/* Mensaje de bienvenida */}
              <TypographyStyled variant='h7'sx={{ m: 2 }}>
                {`¡Bienvenid@ a ${themeConfig.templateName}!`}
              </TypographyStyled>

            </Box>

            {/* Formulario de parámetros de Login: e-mail y Contraseña */}
            <form noValidate onSubmit={handleSubmit(onSubmit)}>

              {/* e-mail de usuario */}
              <FormControl fullWidth sx={{ mb: 4 }}>
                <Controller
                  name='email'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      label='e-mail'
                      value={value ? value : ''}
                      onBlur={onBlur}
                      onChange={onChange}
                      error={Boolean(errors.email)}
                      autoComplete='username'
                    />
                  )}
                />
                {errors.email && <FormHelperText sx={{ color: 'error.main' }}>{errors.email.message}</FormHelperText>}
              </FormControl>

              {/* Contraseña */}
              <FormControl fullWidth>
                <InputLabel htmlFor='password' error={Boolean(errors.password)}>
                  Contraseña
                </InputLabel>
                <Controller
                  name='password'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { onChange, onBlur } }) => (
                    <OutlinedInput
                      onBlur={onBlur}
                      label='Password'
                      onChange={onChange}
                      id='password'
                      error={Boolean(errors.password)}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      endAdornment={
                        <InputAdornment position='end'>
                          <IconButton edge='end' onMouseDown={e => e.preventDefault()} onClick={() => setShowPassword(!showPassword)}>
                            <Icon icon={showPassword ? 'mdi:eye-outline' : 'mdi:eye-off-outline'} fontSize={20} />
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                  )}
                />
                {errors.password && (
                  <FormHelperText sx={{ color: 'error.main' }} id=''>
                    {errors.password.message}
                  </FormHelperText>
                )}
              </FormControl>

              {/* Contenedor de Recordarme y ¿Olvidaste tu Contraseña? */}
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>

                {/* Checkbox 'Recordarme' */}
                <FormControlLabel
                  label='Recordarme'
                  control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}/>}
                />

                {/* Link '¿Olvidaste tu contraseña?' */}
                <Typography
                  variant='body2'
                  component={Link}
                  href='/forgot-password'
                  sx={{ color: 'primary.main', textDecoration: 'none' }}
                >
                  ¿Olvidaste tu contraseña?
                </Typography>

              </Box>

              {/* Botón 'Entrar' */}
              <Button fullWidth size='large' type='submit' variant='contained' sx={{ mb: 5 }}>
                Entrar
              </Button>

              {/* <Button fullWidth size='large' onClick={(e) => handleSignGoogle(e)} variant='contained' sx={{ mb:3}}>
                Entrar con Google
              </Button>
              <Typography variant='body1' fontSize={12} align='center'>Solo disponible para usuarios registrados Procure</Typography> */}
            </form>
          </BoxWrapper>
        </Paper>
      </RightWrapper>
    </Box>
  )
}

LoginPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
LoginPage.guestGuard = true

export default LoginPage
