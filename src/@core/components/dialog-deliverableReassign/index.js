import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material'
import { useState } from 'react'
// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

const ReasignarDialog = ({ open, onClose, selectedRows, doc }) => {
  //const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  const { updateBlueprintAssignment } = useFirebase()

  if (!doc) {
    return null // No renderizar nada si doc es null
  }

  const handleUserChange = e => {
    const selectedUserId = e.target.value
    const selectedUser = doc.gabineteDraftmen.find(user => user.userId === selectedUserId)
    setSelectedUser(selectedUser)
  }

  const handleConfirm = async () => {
    try {
      const promises = selectedRows.map(row => {
        // Actualiza cada documento de `selectedRows` con el nuevo objeto `selectedUser`
        return updateBlueprintAssignment(doc.id, row, selectedUser)
      })

      // Esperamos a que todas las actualizaciones se completen
      await Promise.all(promises)
      setSelectedUser(null)
      onClose()
    } catch (error) {
      console.error('Error reassigning blueprints:', error)
    }
  }

  const handleCloseDialog = () => {
    setSelectedUser(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleCloseDialog} fullWidth>
      <Box sx={{ mx: 5 }}>
        <DialogTitle>Reasignar entregables</DialogTitle>
        <DialogContent>
          <FormControl sx={{ my: 2 }} fullWidth>
            <InputLabel>Seleccionar el nuevo encargado</InputLabel>
            <Select value={selectedUser?.userId || ''} onChange={handleUserChange} label='Seleccionar Usuario'>
              {doc.gabineteDraftmen
                .filter(user => selectedRows.every(row => row.userId !== user.userId)) // Filtramos para excluir usuarios ya asignados
                .map(user => (
                  <MenuItem key={user.userId} value={user.userId}>
                    {user.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 4 }}>
            {selectedRows.map(row => (
              <Typography key={row.id} sx={{ my: 2 }}>
                {row.userName} - {row.id}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color='primary'>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} color='primary' disabled={!selectedUser}>
            Confirmar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default ReasignarDialog
