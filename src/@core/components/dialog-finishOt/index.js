import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { CircularProgress } from '@mui/material'

export default function DialogFinishOt({ open, handleClose, callback, isLoading, state }) {

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby='alert-dialog-title'
      aria-describedby='alert-dialog-description'
    >
      <DialogTitle id='alert-dialog-title'>
        {`${state === 9 ? 'Reanudar' : 'Finalizar'} flujo de la solicitud`}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <DialogContentText id='alert-dialog-description'>
            {`¿Estás segur@ de que quieres ${state === 9 ? 'Reanudar' : 'Finalizar'} la solicitud?`}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>No</Button>
        <Button onClick={callback} autoFocus>
          Sí
        </Button>
      </DialogActions>
    </Dialog>
  )
}
