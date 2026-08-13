// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Avatar from 'src/@core/components/mui/avatar'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

// Cargos que se muestran, en el orden en que aparecen.
const CARGOS = {
  6: { orden: 1, nombre: 'Administrador de Contrato' },
  7: { orden: 2, nombre: 'Supervisor de Terreno' },
  5: { orden: 3, nombre: 'Planificador' },
  8: { orden: 4, nombre: 'Proyectista de Terreno' }
}

// Iniciales para quien no tiene foto.
const iniciales = nombre =>
  (nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0])
    .join('')
    .toUpperCase()

const FilaPersona = ({ persona, mostrarDivisor }) => {
  // urlFoto puede venir como string, como array vacio o no venir.
  const foto = typeof persona.photo === 'string' && persona.photo ? persona.photo : null

  return (
    <>
      {mostrarDivisor && <Divider component='li' sx={{ m: '0 !important' }} />}
    <ListItem
      secondaryAction={
        persona.linkedin ? (
          <IconButton
            edge='end'
            component='a'
            href={persona.linkedin}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`LinkedIn de ${persona.name}`}
          >
            <LinkedInIcon />
          </IconButton>
        ) : null
      }
    >
      <ListItemAvatar>
        {foto ? (
          <Avatar src={foto} alt={persona.name} sx={{ width: 44, height: 44 }} />
        ) : (
          <Avatar skin='light' color='primary' sx={{ width: 44, height: 44 }}>
            {iniciales(persona.name)}
          </Avatar>
        )}
      </ListItemAvatar>
      <ListItemText
        primary={<Typography sx={{ fontWeight: 500 }}>{persona.name}</Typography>}
        secondary={
          <Typography variant='body2' color='text.secondary'>
            {persona.job}
            {persona.description
              ? ` — ${persona.description.length > 150 ? persona.description.slice(0, 150) + '…' : persona.description}`
              : ''}
          </Typography>
        }
      />
    </ListItem>
    </>
  )
}

const Equipo = () => {
  const [procureUsers, setProcureUsers] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const { getUserData } = useFirebase()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // getUserData devuelve null si la consulta falla: sin el `|| []` el
        // filter revienta y la pantalla queda en blanco.
        const users = await getUserData('getAllProcureUsers')
        if (!users) throw new Error('No se pudo obtener el equipo')
        setProcureUsers(users.filter(user => user.enabled !== false))
      } catch (errorConsulta) {
        console.error('Error al obtener los usuarios de Procure:', errorConsulta)
        setError(true)
      } finally {
        setCargando(false)
      }
    }

    fetchUsers()
  }, [])

  const personas = procureUsers
    .filter(usuario => CARGOS[usuario.role])
    .map(usuario => ({
      id: usuario.id,
      name: usuario.name,
      job: CARGOS[usuario.role].nombre,
      orden: CARGOS[usuario.role].orden,
      photo: usuario.urlFoto,
      description: usuario.description,
      linkedin: usuario.linkedin
    }))
    .sort((a, b) => a.orden - b.orden || (a.name || '').localeCompare(b.name || ''))

  if (cargando) {
    return <Typography variant='body1'>Cargando usuarios…</Typography>
  }

  // Un fallo de consulta no es lo mismo que un equipo vacio: antes ambos casos
  // se veian igual y no habia forma de distinguirlos.
  if (error) {
    return <Typography variant='body1'>No se pudo cargar el equipo. Recarga la página.</Typography>
  }

  if (personas.length === 0) {
    return <Typography variant='body1'>No hay personas para mostrar.</Typography>
  }

  return (
    <Card>
      <Box sx={{ px: 5, pt: 4, pb: 2 }}>
        <Typography variant='h6'>Equipo</Typography>
        <Typography variant='body2' color='text.secondary'>
          {personas.length} {personas.length === 1 ? 'persona' : 'personas'}
        </Typography>
      </Box>
      <Divider sx={{ m: '0 !important' }} />
      <List disablePadding>
        {personas.map((persona, index) => (
          <FilaPersona key={persona.id || persona.name} persona={persona} mostrarDivisor={index > 0} />
        ))}
      </List>
    </Card>
  )
}

Equipo.acl = {
  subject: 'nuestro-equipo'
}

export default Equipo
