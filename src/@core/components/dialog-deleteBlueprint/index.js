import React from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import { useFirebase } from 'src/context/useFirebase'

const DialogDeleteBlueprint = ({ open, onClose, selectedRows, doc: mainDoc, setSelectedRows /* onDelete */ }) => {
  const { getProcureCounter, deleteBlueprintAndDecrementCounters, markBlueprintAsDeleted } = useFirebase()

  if (selectedRows.length === 0) {
    return null // No hay filas seleccionadas, no mostramos el diálogo
  }

  const selectedDocument = selectedRows[0]
  const { id: procureId, clientCode } = selectedDocument

  const handleDelete = async () => {
    try {
      // Extrae los valores necesarios del id de Procure
      const [_, procureDiscipline, procureDeliverable, procureCounter] = procureId.split('-')

      // Extrae los valores necesarios del clientCode (MEL)
      const [__, otNumber, instalacion, areaNumber, melDiscipline, melDeliverable, melCounter] = clientCode.split('-')

      // Obtiene el contador de Procure desde Firestore
      const procureCounterField = `${procureDiscipline}-${procureDeliverable}-counter`
      const currentProcureCounter = await getProcureCounter(procureCounterField)

      if (currentProcureCounter === Number(procureCounter)) {
        // Elimina el documento y decrementa ambos contadores
        await deleteBlueprintAndDecrementCounters(
          mainDoc.id,
          procureId,
          procureCounterField,
          currentProcureCounter,
          Number(melCounter),
          melDiscipline,
          melDeliverable
        )
      } else {
        // Marca el documento como eliminado
        await markBlueprintAsDeleted(mainDoc.id, procureId, clientCode)
        setSelectedRows([])
      }

      onClose() // Cierra el diálogo
      //onDelete(); // Realiza cualquier acción adicional necesaria después del borrado
    } catch (error) {
      console.error('Error al eliminar el documento:', error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ mx: 4 }}>Confirmar Eliminación</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mx: 4 }}>
          ¿Estás segur@ de que quieres eliminar el siguiente documento? <br /> Esta acción no se puede deshacer.
        </DialogContentText>
        <List>
          <ListItem>
            <ListItemText primary='ID del Documento (Procure)' secondary={procureId} />
          </ListItem>
          <ListItem>
            <ListItemText primary='Código del Cliente' secondary={clientCode} />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='primary'>
          Cancelar
        </Button>
        <Button onClick={handleDelete} color='error'>
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogDeleteBlueprint
