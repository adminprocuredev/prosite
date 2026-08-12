import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

// El título es 'Tipo de archivo inválido' por omisión porque de ahí viene, pero
// este diálogo se usa también para avisos que no tienen nada que ver con el
// archivo —por ejemplo, que el entregable no puede avanzar—, y ahí el título
// contradecía al mensaje. Quien lo abra para otra cosa pasa el suyo.
export default function DialogErrorFile({ open, handleClose, msj, titulo = 'Tipo de archivo inválido' }) {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby='alert-dialog-title'
      aria-describedby='alert-dialog-description'
      maxWidth='xl'
    >
      <DialogTitle id='alert-dialog-title'>{titulo}</DialogTitle>
      <DialogContent>
        <div id='alert-dialog-description'>{msj}</div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
