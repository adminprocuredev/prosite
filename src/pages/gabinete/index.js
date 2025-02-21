// Hola
// Hola
// Hola

// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Styled Component

// ** Demo Components Imports
import DataGridGabinete from 'src/views/pages/gabinete/DataGridGabinete'

const Gabinete = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} sx={{ pt: theme => `${theme.spacing(4)} !important` }}>
        <DataGridGabinete />
      </Grid>
    </Grid>
  )
}

Gabinete.acl = {
  subject: 'gabinete'
}

export default Gabinete
