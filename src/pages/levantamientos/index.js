// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Styled Component

// ** Demo Components Imports
import DataGridLevantamientos from 'src/views/pages/solicitudes/DataGridLevantamientos'

const Levantamientos = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} sx={{ pt: theme => `${theme.spacing(4)} !important` }}>
        <DataGridLevantamientos />
      </Grid>
    </Grid>
  )
}

Levantamientos.acl = {
  subject: 'levantamientos'
}

export default Levantamientos
