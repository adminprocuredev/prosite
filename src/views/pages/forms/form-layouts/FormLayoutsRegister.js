// ** React Imports
import * as React from 'react';
import { useState } from 'react'

// ** Hooks Imports
import { useFirebase } from 'src/context/useFirebaseAuth'
import { useSnapshot } from 'src/hooks/useSnapshot'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CardHeader from '@mui/material/CardHeader'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputAdornment from '@mui/material/InputAdornment'
import FormHelperText from '@mui/material/FormHelperText'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'


// ** Icon Imports
import Icon from 'src/@core/components/icon'

import FreeSoloCreateOptionDialog from 'src/@core/components/textbox-search';

const FormLayoutsBasic = () => {
  // ** States
  const [values, setValues] = useState({
    name:'',
    rut:'',
    phone:'',
    email:'',
    plant:'',
    shift:'',
    company:'',
    role:'',
    contop:'',
    opshift:''
  })

  const handleChange = prop => event => {
    setValues({ ...values, [prop]: event.target.value })
  }

  return (
    <Card>
      <CardHeader title='Registrar usuario' />
      <CardContent>
        <form onSubmit={e => e.preventDefault()}>
          <Grid container spacing={5}>
            <Grid item xs={12}>
              <TextField fullWidth label='Nombre' placeholder='Nombres' onChange={handleChange('name')} />
            </Grid>
            {/* <Grid item xs={6}>
              <TextField fullWidth label='Apellidos' placeholder='Apellidos' />
            </Grid> */}
            <Grid item xs={6}>
              <TextField fullWidth label='RUT' placeholder='RUT' onChange={handleChange('rut')}/>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label='Teléfono' placeholder='Teléfono' onChange={handleChange('phone')}/>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type='email'
                label='Email'
                placeholder='email@ejemplo.com'
                onChange={handleChange('email')}
              />
            </Grid>
            <Grid item xs={12}>
            <FormControl fullWidth>
            <InputLabel id="id">Planta</InputLabel>
              <Select
                labelId="id"
                label="Planta"
                id="id"
                value={values.plant}
                onChange={handleChange('plant')}
              >
                <MenuItem value={'Los Colorados'}>Planta Concentradora Los Colorados</MenuItem>
                <MenuItem value={'Laguna Seca 1'}>Planta Concentradora Laguna Seca | Línea 1</MenuItem>
                <MenuItem value={'Laguna Seca 2'}>Planta Concentradora Laguna Seca | Línea 2</MenuItem>
                <MenuItem value={'Chancado y correas'}>Chancado y correas</MenuItem>
                <MenuItem value={'Puerto Coloso'}>Puerto Coloso</MenuItem>
                <MenuItem value={'Instalaciones Catodo'}>Instalaciones Cátodo</MenuItem>
              </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
            <FormControl fullWidth>
            <InputLabel id="id">Turno</InputLabel>
              <Select
                labelId="id"
                label="Turno"
                id="id"
                value={values.shift}
                onChange={handleChange('shift')}
              >
                <MenuItem value={'A'}>Turno A</MenuItem>
                <MenuItem value={'B'}>Turno B</MenuItem>
              </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
            <FormControl fullWidth>
            <InputLabel id="id">Empresa</InputLabel>
              <Select
                labelId="id"
                label="Empresa"
                id="id"
                value={values.company}
                onChange={handleChange('company')}
              >
                <MenuItem value={'MEL'}>MEL</MenuItem>
                <MenuItem value={'Procure'}>Procure</MenuItem>
              </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
            <FormControl fullWidth>
            <InputLabel id="id">Rol</InputLabel>
              <Select
                labelId="id"
                label="Rol"
                id="id"
                value={values.role}
                onChange={handleChange('role')}
              >
                <MenuItem value={'Solicitante'}>Solicitante</MenuItem>
                <MenuItem value={'Contract Operator'}>Contract Operator</MenuItem>
                <MenuItem value={'Contract Owner'}>Contract Owner</MenuItem>
                <MenuItem value={'Administrador de Contrato'}>Administrador de Contrato</MenuItem>
                <MenuItem value={'Supervisor'}>Supervisor</MenuItem>
                <MenuItem value={'Gerente'}>Gerente</MenuItem>
              </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FreeSoloCreateOptionDialog label='Contract Operator' placeholder='Contract Operator' onChange={handleChange('contop')} />
            </Grid>
            <Grid item xs={12}>
            <FreeSoloCreateOptionDialog label='Contraturno' placeholder='Contraturno' onChange={handleChange('opshift')} />
            </Grid>
            <Grid item xs={12}>
              <Box
                sx={{
                  gap: 5,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Button type='submit' variant='contained' size='large'>
                  Crear usuario
                </Button>
                {/* <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ mr: 2 }}>Already have an account?</Typography>
                  <Link href='/' onClick={e => e.preventDefault()}>
                    Log in
                  </Link>
                </Box> */}
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default FormLayoutsBasic