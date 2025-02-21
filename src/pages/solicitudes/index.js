// ** MUI Imports
import Grid from '@mui/material/Grid'
import DataGridSolicitudes from 'src/views/pages/solicitudes/DataGridSolicitudes'

// ** Styled Component

// ** Demo Components Imports

const NuevaSolicitud = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} sx={{ pt: theme => `${theme.spacing(4)} !important` }}>
        <DataGridSolicitudes />
      </Grid>
    </Grid>
  )
}

NuevaSolicitud.acl = {
  subject: 'solicitudes'
}

export default NuevaSolicitud
