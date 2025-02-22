// ** React Imports
import { Fragment, useEffect, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Context
import { useFirebase } from 'src/context/useFirebase'

const UserDropdown = props => {
  // ** Props
  const { settings } = props

  // ** States
  const [anchorEl, setAnchorEl] = useState(null)
  const [userObject, setUserObject] = useState({ name: '', email: '', role: '' })
  const [urlFoto, setUrlFoto] = useState('')

  // ** Hooks
  const router = useRouter()
  const { auth, authUser, signOut, domainRoles, subscribeToUserProfileChanges } = useFirebase()

  // ** Vars
  const { direction } = settings

  const handleDropdownOpen = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleDropdownClose = url => {
    if (url) {
      router.push(url)
    }
    setAnchorEl(null)
  }

  const styles = {
    py: 2,
    px: 4,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    color: 'text.primary',
    textDecoration: 'none',
    '& svg': {
      mr: 2,
      fontSize: '1.375rem',
      color: 'text.primary'
    }
  }

  // ** Función para revocar tokens en Google
  const revokeToken = async token => {
    const params = new URLSearchParams()
    params.append('token', token) // El token a revocar (puede ser el access_token o refresh_token)

    try {
      const response = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      if (!response.ok) {
        console.error('Error al intentar revocar el token en Google')
      } else {
        console.log('Token revocado exitosamente en Google')
      }
    } catch (error) {
      console.error('Error en la solicitud de revocación del token:', error)
    }
  }

  const handleLogout = async () => {
    const storedParams = JSON.parse(localStorage.getItem('oauth2-params'))

    if (storedParams) {
      const { access_token } = storedParams

      // Revoca el access_token si existe
      if (access_token) {
        await revokeToken(access_token)
      }
    }

    signOut(auth)
      .then(() => {
        setTimeout(() => {
          localStorage.removeItem('formData')
          localStorage.removeItem('user')
          localStorage.removeItem('oauth2-params')
          handleDropdownClose('/login')
        }, 500) // Retraso de 500 milisegundos antes de redireccionar
      })
      .catch(error => {
        console.log(error)
      })
  }

  useEffect(() => {
    let unsubscribe = () => {}

    if (authUser && authUser.uid) {
      unsubscribe = subscribeToUserProfileChanges(authUser.uid, userData => {
        setUrlFoto(userData.urlFoto)
      })
    }

    return () => unsubscribe() // Limpia la suscripción cuando el componente se desmonte
  }, [authUser])

  useEffect(() => {
    let thisName
    let thisEmail
    let thisRole

    if (authUser) {
      // Caso para el nombre
      if (authUser.displayName && authUser.displayName !== 'No definido' && authUser.displayName !== '') {
        thisName = authUser.displayName
      } else {
        thisName = 'Por definir'
      }

      // Caso para el email
      if (authUser.email && authUser.email !== 'No definido' && authUser.email !== '') {
        thisEmail = authUser.email
      } else {
        thisEmail = 'Por definir'
      }

      // Caso para el Rol
      if (authUser.role && authUser.role !== 'No definido' && authUser.role !== '' && domainRoles) {
        const role = domainRoles[authUser.role]
        if (role) {
          thisRole = role.name
        } else {
          thisRole = 'Por definir'
        }
      } else {
        thisRole = 'Por definir'
      }
    } else {
      thisName = 'Por definir'
      thisEmail = 'Por definir'
      thisRole = 'Por definir'
    }

    setUserObject({ name: thisName, email: thisEmail, role: thisRole })
  }, [authUser, domainRoles])

  const renderUserAvatar = () => {
    let avatarContent

    if (urlFoto && urlFoto !== 'Por definir') {
      avatarContent = (
        <Avatar
          src={urlFoto}
          alt={userObject.name}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            objectFit: 'contain',
            fontSize: '15px' // Tamaño de la fuente ajustado
          }}
        />
      )
    } else {
      // No hay `photo` proporcionada, usar avatar con iniciales del nombre
      const currentName = userObject.name

      const initials = currentName
        .toUpperCase()
        .split(' ')
        .map(word => word.charAt(0))
        .join('')

      avatarContent = (
        <Avatar
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            objectFit: 'contain',
            bgcolor: 'primary.main',
            fontSize: '15px' // Tamaño de la fuente ajustado
          }}
        >
          {initials}
        </Avatar>
      )
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 40 }}>{avatarContent}</Box>
    )
  }

  return (
    <Fragment>
      <Badge
        overlap='circular'
        onClick={handleDropdownOpen}
        sx={{ ml: 2, cursor: 'pointer' }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
      >
        {renderUserAvatar()}
      </Badge>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => handleDropdownClose()}
        sx={{ '& .MuiMenu-paper': { mt: 4 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: direction === 'ltr' ? 'right' : 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: direction === 'ltr' ? 'right' : 'left' }}
      >
        <Box sx={{ pt: 2, pb: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', ml: 3, alignItems: 'flex-start', flexDirection: 'column' }}>
              <Typography sx={{ fontWeight: 600 }}>{userObject.name}</Typography>
              <Typography variant='body2' sx={{ fontSize: '0.8rem', color: 'text.disabled' }}>
                {userObject.email}
              </Typography>
              <Typography variant='body2' sx={{ fontSize: '0.8rem', color: 'text.disabled' }}>
                {userObject.role}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider sx={{ mt: '0 !important' }} />
        <MenuItem sx={{ p: 0 }} onClick={() => handleDropdownClose('/user-profile')}>
          <Box sx={styles}>
            <Icon icon='mdi:account-outline' />
            Mi Perfil
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => handleLogout()}
          sx={{ py: 2, '& svg': { mr: 2, fontSize: '1.375rem', color: 'text.primary' } }}
        >
          <Icon icon='mdi:logout-variant' />
          Salir
        </MenuItem>
      </Menu>
    </Fragment>
  )
}

export default UserDropdown
