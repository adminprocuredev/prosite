import { useEffect, useState } from 'react'
import { useFirebase } from 'src/context/useFirebase'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { DataGridPremium } from '@mui/x-data-grid-premium'
import { esES } from '@mui/x-data-grid-pro'
import EditIcon from '@mui/icons-material/Edit'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import Tooltip from '@mui/material/Tooltip'
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Switch } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import { EditUserDialog } from 'src/@core/components/dialog-editUser'
import LinearProgress from '@mui/material/LinearProgress'

const TableEditUsers = ({ rows, role, roleData, cargando = false }) => {

  // Definición de Estados.
  const [editingUser, setEditingUser] = useState({})
  const [dialogEditUserOpen, setDialogEditUserOpen] = useState(false)
  const [plantNames, setPlantNames] = useState([])
  const [allowableEmails, setAllowableEmails] = useState([])
  const [roles, setRoles] = useState([])
  const [userTypes, setUserTypes] = useState([])

  // Habilitar o deshabilitar SIEMPRE pregunta antes. Es una acción de un clic
  // sobre una fila de una tabla larga, o sea la clase de cosa que se aprieta
  // sin querer al pasar el dedo. `porConfirmar` guarda a quién y hacia dónde;
  // en null, el diálogo está cerrado.
  const [porConfirmar, setPorConfirmar] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Importación de funciones de Firebase.
  const { getDomainData, updateUserData, resetPassword } = useFirebase()

  // Reenviar la invitacion.
  //
  // El enlace que Firebase manda para definir la contrasena dura UNA HORA y no
  // es configurable. Para una invitacion es poquisimo: si la persona lo abre al
  // dia siguiente ve "la peticion ha caducado", y hasta ahora no habia forma de
  // mandarle otro -crear el usuario de nuevo falla con "ya se encuentra
  // registrado"-. Quedaba atascada sin poder entrar nunca.
  //
  // Es el mismo correo que se envia al crear la cuenta.
  const [reenviando, setReenviando] = useState(null)

  const reenviarInvitacion = async (email, nombre) => {
    setReenviando(email)
    try {
      await resetPassword(email)
      alert(`Se le envió un correo a ${nombre || email} para que defina su contraseña. El enlace dura una hora.`)
    } catch (error) {
      console.error('No se pudo reenviar la invitación:', error)
      alert('No se pudo enviar el correo. Revisa que la dirección esté bien escrita.')
    } finally {
      setReenviando(null)
    }
  }

  const confirmarCambioDeHabilitado = async () => {
    if (!porConfirmar) return

    setGuardando(true)
    try {
      await updateUserData(porConfirmar.id, { enabled: porConfirmar.quedaraHabilitado })

      setPorConfirmar(null)

      // Recarga, y no es pereza: la lista de usuarios NO escucha en vivo. Se
      // pide una sola vez al abrir la pantalla, con `getAllUsersData` dentro de
      // un `useEffect` (`DataGridEditUsers.js:33`), y las filas llegan aquí como
      // una prop que este componente no puede tocar. Sin esto el cambio se
      // guardaba en la base y el interruptor se quedaba como estaba: parecía que
      // no había funcionado.
      //
      // Es lo mismo que ya hace el diálogo de editar usuario al guardar.
      //
      // ponytail: la salida limpia es que la pantalla escuche en vivo, o que le
      // pase una función para recargar su propia lista. Las dos son cambios en
      // el componente de arriba y aquí lo que urgía era que el botón no mintiera.
      window.location.reload()
    } catch (error) {
      console.error('No se pudo cambiar el estado del usuario:', error)
      alert('No se pudo cambiar el estado del usuario. Intenta de nuevo o avisa a soporte.')
    } finally {
      setGuardando(false)
    }
  }

  // Función para obtener las Plantas desde Firestore.
  const getPlantNames = async () => {
    const plantsData = await getDomainData('plants')

    const plants = Object.entries(plantsData)
      .filter(([_, value]) => value.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([key]) => key)

    setPlantNames(plants)
  }

  // Función para obtener los dominios permitidos para e-mails (@blablabla.com) desde Firestore.
  const getAllowableEmailDomains = async () => {
    const domains = await getDomainData('allowableDomains')
    const array = Object.keys(domains)
    setAllowableEmails(array)
  }

  // Función para obtener los roles y sus funcionalidades desde Firestore.
  const getRolesDomains = async () => {
    const roles = await getDomainData('roles')
    const rolesArray = Object.keys(roles).map(key => ({ id: Number(key), ...roles[key] }))
    setRoles(rolesArray)
  }

  // Función para obtener los tipos de Modalidad de Trabajo desde Firestore.
  // Modalidad de Trabajo = [Teletrabajo, Terreno, Oficina]
  const getUserTypes = async () => {
    const types = await getDomainData('userType')
    const typesArray = Object.keys(types)
    setUserTypes(typesArray)
  }


  // Se define Plantas, Dominios Permitidos, Roles y Modalidade de trabajo, cuando el componente se monta.
  useEffect(() => {
    getPlantNames()
    getAllowableEmailDomains()
    getRolesDomains()
    getUserTypes()
  }, [])

  // Función para que maneja el efecto luego de hacer click en el botón "Editar" (ícono lápiz).
  const handleEditClick = (user) => {
    setEditingUser(user)
    setDialogEditUserOpen(true)
  }

  // Función que maneja el efecto al hacer click fuera del Dialog o cerrar el Dialog de edición de usuario.
  const handleCloseDialog = () => {
    setDialogEditUserOpen(false)
  }

  const theme = useTheme()
  // const sm = useMediaQuery(theme.breakpoints.up('sm'))
  // const md = useMediaQuery(theme.breakpoints.up('md'))
  // const xl = useMediaQuery(theme.breakpoints.up('xl'))

  // Objeto para traducir el nombre de la Planta a su sigla.
  const plantsObject = {
    'Planta Concentradora Los Colorados': 'PCLC',
    'Planta Concentradora Laguna Seca | Línea 1': 'LSL1',
    'Planta Concentradora Laguna Seca | Línea 2': 'LSL2',
    'Chancado y Correas': 'CHCO',
    'Puerto Coloso': 'PCOL',
    'Instalaciones Cátodo': 'ICAT',
    'Instalaciones Mina': 'IMIN',
    'Instalaciones Lixiviación Sulfuros': 'SLIX',
    'Instalaciones Escondida Water Supply': 'IEWS',
    'Instalaciones Concentraducto': 'ICON',
    'Instalaciones Monturaqui': 'IMON',
    'Instalaciones Auxiliares': 'IAUX',
    'Subestaciones Eléctricas': 'SUBE',
    'Tranque y Relaves': 'TREL',
    'Campamento Villa San Lorenzo': 'CVSL',
    'Campamento Villa Cerro Alegre': 'CVCA'
  }

  // Definición de columns. Éste arreglo contiene todas las columnas que se desplegarán en la tabla.
  // Cada columna tendrá las siguientes variables:
  // - field: nombre en inglés de la columna.
  // - headerName: nombre visible del encabezado de la columna.
  // - width: (oculto) ancho permitido de la columna.
  // - rederCell: valores que serán mostrados en cada fila de esa columna.
  // - row: representa el objeto que corresponde a la fila completa del DataGrid. Este objeto contiene todos los datos asociados con esa fila en particular
  const columns = [
    {
      field: 'name',
      headerName: 'Nombre',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 200,
      maxWidth: 250,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.name || ''}</div>

      }
    },
    {
      field: 'rut',
      headerName: 'RUT',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 110,
      maxWidth: 150,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.rut || ''}</div>

      }
    },
    {
      field: 'email',
      headerName: 'e-mail',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 250,
      maxWidth: 350,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.email || ''}</div>

      }
    },
    {
      field: 'phone',
      headerName: 'Teléfono',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 100,
      maxWidth: 250,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.phone || ''}</div>

      }
    },
    {
      field: 'company',
      headerName: 'Empresa',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 100,
      maxWidth: 150,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.company || ''}</div>

      }
    },
    {
      field: 'role',
      headerName: 'Rol',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 150,
      maxWidth: 200,
      renderCell: params => {
        const { row } = params
        const role = roles.find(role => role.id === row.role)
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{role?.name || ''}</div>

      }
    },
    {
      field: 'subtype',
      headerName: 'Subtipo',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 50,
      maxWidth: 100,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.subtype || 'N/A'}</div>

      }
    },
    {
      field: 'shift',
      headerName: 'Turno',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 50,
      maxWidth: 70,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.shift && row.shift.length > 0 ? row.shift.join(', ') : ['N/A']}</div>

      }
    },
    {
      field: 'plant',
      headerName: 'Planta',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 150,
      maxWidth: 600,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)
        const plantDescriptions = row.plant && row.plant.length > 0 ? row.plant.map(plantKey => plantsObject[plantKey]) : ['N/A']

        return <div>{plantDescriptions.join(', ')}</div>

      }
    },
    {
      field: 'completedProfile',
      headerName: 'Perfil Completado',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 100,
      maxWidth: 150,
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{row.completedProfile ? 'Si' : 'No'}</div>

      }
    },
    {
      field: 'enabled',
      headerName: 'Habilitado',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 100,
      maxWidth: 150,
      renderCell: params => {
        const { row } = params

        // `enabled` falta en muchas fichas antiguas, y ausente significa
        // HABILITADO -mismo criterio que en el login-. Sin este `!== false`,
        // toda esa gente se vería en rojo como si estuviera bloqueada.
        const habilitado = row.enabled !== false

        return (
          <Switch
            checked={habilitado}
            color={habilitado ? 'success' : 'error'}
            onClick={event => event.stopPropagation()}
            onChange={() =>
              setPorConfirmar({ id: row.id, nombre: row.name, quedaraHabilitado: !habilitado })
            }
            inputProps={{ 'aria-label': habilitado ? 'Deshabilitar usuario' : 'Habilitar usuario' }}
            sx={{
              '& .MuiSwitch-switchBase:not(.Mui-checked)': { color: theme.palette.error.main },
              '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': {
                backgroundColor: theme.palette.error.main
              }
            }}
          />
        )
      }
    },
    {
      field: 'invitacion',
      headerName: 'Reenviar invitación',
      minWidth: 150,
      maxWidth: 160,
      sortable: false,
      renderCell: params => {
        const { row } = params

        return (
          <Tooltip title='Enviar un correo para que defina su contraseña'>
            <span>
              <IconButton
                onClick={event => {
                  event.stopPropagation()
                  reenviarInvitacion(row.email, row.name)
                }}
                disabled={reenviando === row.email}
              >
                <MailOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>
        )
      }
    },
    {
      field: 'edit',
      headerName: 'Editar Usuario',
      minWidth: 150,
      maxWidth: 150,
      renderCell: params => {
        const { row } = params

        return (
          <IconButton onClick={() => handleEditClick(row)}>
            <EditIcon />
          </IconButton>
        )

      }
    }
  ]

  // Se retorna el objeto visible (DataGridPremium).
  return (
    <Card>
      <Box sx={{ height: 500 }}>
        <DataGridPremium
          initialState={{
            sorting: {
              sortModel: [{ field: 'company', sort: 'desc' }]
            }
          }}
          loading={cargando}
          slots={{ loadingOverlay: LinearProgress }}
          rows={rows}
          columns={columns}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
        />
        { dialogEditUserOpen && (
          <EditUserDialog
            open={dialogEditUserOpen}
            handleClose={handleCloseDialog}
            doc={editingUser}
            plantNames={plantNames}
            allowableDomains={allowableEmails}
            userRoles={roles}
            userTypes={userTypes}
          />
        )}

        {/* Confirmación antes de habilitar o deshabilitar. El texto dice el
            NOMBRE y qué va a pasar, no un "¿estás seguro?" a secas: en una
            tabla larga hay que poder confirmar que se apretó la fila correcta. */}
        <Dialog open={Boolean(porConfirmar)} onClose={() => !guardando && setPorConfirmar(null)}>
          <DialogTitle>
            {porConfirmar?.quedaraHabilitado ? 'Habilitar usuario' : 'Deshabilitar usuario'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {porConfirmar?.quedaraHabilitado
                ? `${porConfirmar?.nombre || 'Este usuario'} podrá volver a ingresar a Prosite.`
                : `${porConfirmar?.nombre || 'Este usuario'} no podrá volver a ingresar a Prosite. Si tiene la sesión abierta, seguirá dentro hasta que la cierre.`}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPorConfirmar(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarCambioDeHabilitado}
              disabled={guardando}
              color={porConfirmar?.quedaraHabilitado ? 'success' : 'error'}
              variant='contained'
            >
              {guardando ? 'Guardando...' : porConfirmar?.quedaraHabilitado ? 'Habilitar' : 'Deshabilitar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Card>
  )
}

export default TableEditUsers
