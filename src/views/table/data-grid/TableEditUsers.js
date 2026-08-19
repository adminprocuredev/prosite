import { useEffect, useState } from 'react'
import { useFirebase } from 'src/context/useFirebase'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { DataGridPremium, GridToolbar } from '@mui/x-data-grid-premium'
import { esES } from '@mui/x-data-grid-pro'
import EditIcon from '@mui/icons-material/Edit'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import Tooltip from '@mui/material/Tooltip'
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Switch } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import { EditUserDialog } from 'src/@core/components/dialog-editUser'
import LinearProgress from '@mui/material/LinearProgress'
import {
  textoDeHabilitado,
  textoDePlantas,
  textoDeRol,
  textoDeSiNo,
  textoDeTurno
} from 'src/views/table/data-grid/textoDeUsuario'

const TableEditUsers = ({ rows, role, roleData, cargando = false, recargarUsuarios }) => {

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

      // Antes esto era un `window.location.reload()`: la lista no escucha en
      // vivo, así que sin recargar el interruptor se quedaba como estaba y
      // parecía que no había funcionado. El costo lo reportó Mario Mella —
      // «se reinicia Prosite, me borra los filtros y me saca del módulo»—,
      // porque recargar la página vuelve a montar la aplicación entera: se
      // pierden los filtros y el orden de la tabla, y el arranque deja al
      // usuario en la portada.
      //
      // Ahora el padre entrega `recargarUsuarios`, que vuelve a pedir SOLO la
      // lista de usuarios. El componente no se desmonta, así que los filtros,
      // el orden y la posición se quedan donde estaban.
      await recargarUsuarios?.()

      setPorConfirmar(null)
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

  // El diccionario de siglas de planta y el resto del texto legible de una fila
  // viven en `textoDeUsuario.js`. Se sacaron de aquí porque la tabla ahora se
  // descarga a Excel y a CSV, y la exportación de MUI NO pasa por `renderCell`:
  // usa `valueGetter`. Con las dos cosas apuntando al mismo lugar, lo que se ve
  // y lo que se descarga no pueden separarse.

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
      valueGetter: params => textoDeRol(params.row.role, roles),
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{textoDeRol(row.role, roles)}</div>

      }
    },
    {
      field: 'subtype',
      headerName: 'Subtipo',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 50,
      maxWidth: 100,
      valueGetter: params => params.row.subtype || 'N/A',
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
      valueGetter: params => textoDeTurno(params.row.shift),
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{textoDeTurno(row.shift)}</div>

      }
    },
    {
      field: 'plant',
      headerName: 'Planta',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 150,
      maxWidth: 600,
      valueGetter: params => textoDePlantas(params.row.plant),
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{textoDePlantas(row.plant)}</div>

      }
    },
    {
      field: 'completedProfile',
      headerName: 'Perfil Completado',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 100,
      maxWidth: 150,
      valueGetter: params => textoDeSiNo(params.row.completedProfile),
      renderCell: params => {
        const { row } = params
        // localStorage.setItem('userSolicitudesWidthColumn', params.colDef.computedWidth)

        return <div>{textoDeSiNo(row.completedProfile)}</div>

      }
    },
    {
      field: 'enabled',
      headerName: 'Habilitado',
      //width: userLocalWidth ? userLocalWidth : 190,
      minWidth: 100,
      maxWidth: 150,
      // En la pantalla es un interruptor; en la planilla descargada tiene que
      // decir «Habilitado» o «Deshabilitado», no true/false.
      valueGetter: params => textoDeHabilitado(params.row.enabled),
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
      disableExport: true,
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
      sortable: false,
      disableExport: true,
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
          // La barra trae Exportar -a CSV y a Excel-, que es lo que pidió Mario
          // Mella para bajar el maestro de usuarios; de paso deja a la vista
          // Columnas, Filtros y Densidad, que ya venían con la licencia MUI X
          // Premium que Procure paga y que nadie había encendido.
          //
          // Exporta lo que se está viendo: respeta el filtro y el orden de la
          // tabla, no la colección entera.
          slots={{ toolbar: GridToolbar, loadingOverlay: LinearProgress }}
          slotProps={{
            toolbar: {
              // `delimiter: ';'` y `utf8WithBom` son para el Excel en español:
              // con coma mete todo en una columna y sin BOM los acentos salen
              // como «Ã¡». El CSV se abre bien de un doble clic.
              csvOptions: { fileName: 'Usuarios Prosite', delimiter: ';', utf8WithBom: true },
              excelOptions: { fileName: 'Usuarios Prosite' }
            }
          }}
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
            recargarUsuarios={recargarUsuarios}
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
