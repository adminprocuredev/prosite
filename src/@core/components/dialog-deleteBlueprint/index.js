import React, { useState } from 'react'
import {
  Alert,
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

  // El error se muestra en el propio diálogo. Antes solo se escribía en la
  // consola: si la transacción fallaba, el usuario apretaba Eliminar y no
  // pasaba nada — ni borrado, ni aviso, ni cierre.
  const [error, setError] = useState(null)
  const [borrando, setBorrando] = useState(false)

  // El useState va antes de este return: los hooks no pueden quedar detrás de
  // una salida condicional.
  if (selectedRows.length === 0) {
    return null // No hay filas seleccionadas, no mostramos el diálogo
  }

  const selectedDocument = selectedRows[0]
  const { id: procureId, clientCode } = selectedDocument

  // Cerrar mientras Firestore está pendiente escondería justamente el error que
  // se quiere mostrar, así que el cierre se bloquea durante el borrado. Y el
  // error se limpia al cerrar: si no, el fallo de un entregable reaparecía al
  // abrir el diálogo del siguiente.
  const handleClose = () => {
    if (borrando) return
    setError(null)
    onClose()
  }

  const handleDelete = async () => {
    setError(null)
    setBorrando(true)
    try {
      // Extrae los valores necesarios del id de Procure
      const [_, procureDiscipline, procureDeliverable, procureCounter] = procureId.split('-')

      // Obtiene el contador de Procure desde Firestore
      const procureCounterField = `${procureDiscipline}-${procureDeliverable}-counter`
      const currentProcureCounter = await getProcureCounter(procureCounterField)

      // El clientCode no se parte aquí: cada función deriva lo que necesita del
      // documento que lee dentro de su transacción.
      if (currentProcureCounter === Number(procureCounter)) {
        // Elimina el documento y decrementa los contadores que correspondan.
        await deleteBlueprintAndDecrementCounters(mainDoc.id, procureId, procureCounterField)
      } else {
        // Marca el documento como eliminado: conserva su código MEL, así que no
        // hay contador que tocar.
        await markBlueprintAsDeleted(mainDoc.id, procureId)
      }

      // La fila borrada deja de estar seleccionada en los dos caminos. Antes
      // solo se limpiaba en uno, y el diálogo podía reabrirse mostrando un
      // entregable que ya no existía.
      setSelectedRows([])

      onClose() // Cierra el diálogo
      //onDelete(); // Realiza cualquier acción adicional necesaria después del borrado
    } catch (err) {
      console.error('Error al eliminar el documento:', err)
      setError(err.message || 'No se pudo eliminar el documento. Vuelve a intentarlo.')
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
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
        {error && (
          <Alert severity='error' sx={{ mx: 4 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color='primary' disabled={borrando}>
          Cancelar
        </Button>
        <Button onClick={handleDelete} color='error' disabled={borrando}>
          {borrando ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogDeleteBlueprint
