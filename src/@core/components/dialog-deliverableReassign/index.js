import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

const NOMBRE_DEL_ROL = { 7: 'Supervisor', 8: 'Proyectista' }

/** 'Turno A' / 'Turno A, Turno B' / '' — shift puede ser texto o arreglo. */
const turnoLegible = shift => {
  const turnos = Array.isArray(shift) ? shift : shift ? [shift] : []

  return turnos.filter(Boolean).join(', ')
}

/**
 * Reasignar entregables a otro encargado. Incidencias Gabinete 5 y
 * Solicitudes 2.
 *
 * Antes la lista salía de `doc.gabineteDraftmen`, o sea de los proyectistas que
 * ya estaban en la OT. Eso dejaba fuera los dos casos que reportaron: rescatar
 * un entregable de alguien que ya no está en la empresa, y pasarle un urgente
 * al turno contrario. Ahora se ofrecen todos los Proyectistas y Supervisores
 * habilitados, con su turno a la vista para que quien reasigna sepa a quién
 * está eligiendo.
 */
const ReasignarDialog = ({ open, onClose, selectedRows, doc }) => {
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false)
  const [error, setError] = useState(null)

  const { updateBlueprintAssignment, getUsuariosParaReasignar } = useFirebase()

  useEffect(() => {
    if (!open) return

    let vigente = true
    setCargandoUsuarios(true)
    setError(null)
    // La lista se vacía al empezar: si esta consulta falla, no puede quedar
    // utilizable la de la apertura anterior, que puede estar obsoleta.
    setUsuarios([])

    getUsuariosParaReasignar()
      .then(lista => {
        if (vigente) setUsuarios(lista)
      })
      .catch(err => {
        console.error('Error al cargar los usuarios para reasignar:', err)
        if (vigente) setError('No se pudo cargar la lista de usuarios. Vuelve a abrir esta ventana.')
      })
      .finally(() => {
        if (vigente) setCargandoUsuarios(false)
      })

    // Si el diálogo se cierra mientras la consulta viaja, lo que vuelva ya no se
    // aplica sobre un componente que quedó atrás.
    return () => {
      vigente = false
    }
  }, [open])

  if (!doc) {
    return null // No renderizar nada si doc es null
  }

  // Se excluye a quien ya tiene TODOS los entregables seleccionados, porque
  // para él la reasignación no haría nada. Con `every` se excluía a quien
  // tuviera ALGUNO, y eso impedía justo lo útil: juntar en una sola persona
  // entregables que hoy están repartidos entre varias.
  const candidatos = usuarios.filter(usuario => !selectedRows.every(row => row.userId === usuario.userId))

  const handleUserChange = e => {
    setSelectedUser(candidatos.find(usuario => usuario.userId === e.target.value) || null)
  }

  const handleConfirm = async () => {
    if (selectedRows.length === 0) {
      // Promise.all([]) resuelve al instante: sin esto, cerrar el diálogo se veía
      // igual que una reasignación hecha.
      setError('No hay entregables seleccionados.')

      return
    }

    setLoading(true)
    setError(null)

    try {
      const resultados = await Promise.all(
        selectedRows.map(row => updateBlueprintAssignment(doc.id, row, selectedUser))
      )

      // updateBlueprintAssignment no lanza: devuelve {success:false, error}. Sin
      // mirar eso, un fallo se veía igual que un éxito.
      //
      // Se exige el éxito EXPLÍCITO en vez de buscar success === false: si algún
      // día devuelve undefined o cambia de forma, esto lo cuenta como fallo y
      // avisa, en vez de dar por bueno lo que no pudo comprobar.
      const fallidos = resultados.filter(resultado => !resultado || resultado.success !== true)

      if (fallidos.length > 0) {
        setError(
          `No se pudieron reasignar ${fallidos.length} de ${selectedRows.length} entregables: ${fallidos[0].error}`
        )
        setLoading(false)

        return
      }

      setSelectedUser(null)
      onClose()
    } catch (err) {
      console.error('Error reassigning blueprints:', err)
      setError(err?.message || 'No se pudo reasignar. Vuelve a intentarlo.')
    }

    setLoading(false)
  }

  const handleCloseDialog = () => {
    if (loading) return
    setSelectedUser(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleCloseDialog} fullWidth>
      <Box sx={{ mx: 5 }}>
        <DialogTitle>Reasignar entregables</DialogTitle>
        <DialogContent>
          <FormControl sx={{ my: 2 }} fullWidth>
            <InputLabel>Seleccionar el nuevo encargado</InputLabel>
            <Select
              value={selectedUser?.userId || ''}
              onChange={handleUserChange}
              label='Seleccionar el nuevo encargado'
              disabled={cargandoUsuarios || candidatos.length === 0}
            >
              {candidatos.map(usuario => (
                <MenuItem key={usuario.userId} value={usuario.userId}>
                  <ListItemText
                    primary={usuario.name}
                    secondary={[NOMBRE_DEL_ROL[usuario.role], turnoLegible(usuario.shift)].filter(Boolean).join(' · ')}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {cargandoUsuarios && (
            <Typography variant='body2' color='text.secondary'>
              Cargando usuarios…
            </Typography>
          )}

          {!cargandoUsuarios && candidatos.length === 0 && !error && (
            <Alert severity='info'>No hay otros usuarios a quienes reasignar estos entregables.</Alert>
          )}

          {error && (
            <Alert severity='error' sx={{ my: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 4 }}>
            {selectedRows.map(row => (
              <Typography key={row.id} sx={{ my: 2 }}>
                {row.userName} - {row.id}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        {loading && (
          <DialogContent sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={handleCloseDialog} color='primary' disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} color='primary' disabled={!selectedUser || loading}>
            Confirmar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default ReasignarDialog
