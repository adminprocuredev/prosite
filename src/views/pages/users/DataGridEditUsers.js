// ** React Imports
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'
// ** Hooks
import { getAllUsersData } from 'src/context/firebase-functions/firestoreQuerys'
import { useFirebase } from 'src/context/useFirebase'

// ** MUI Imports
import { Box, Grid } from '@mui/material'

// ** Custom Components Imports
import TableEditUsers from 'src/views/table/data-grid/TableEditUsers'

const DataGrid = () => {
  const [usersData, setUsersData] = useState({})
  const [values, setValues] = useState({})
  const [roleData, setRoleData] = useState({ name: 'admin' })
  const { useSnapshot, authUser, getDomainData } = useFirebase()
  const { filas: data, cargando } = useSnapshot(true, authUser)


  const theme = useTheme()
  const xs = useMediaQuery(theme.breakpoints.up('xs')) //0-600
  const sm = useMediaQuery(theme.breakpoints.up('sm')) //600-960
  const md = useMediaQuery(theme.breakpoints.up('md')) //960-1280
  const lg = useMediaQuery(theme.breakpoints.up('lg')) //1280-1920
  const xl = useMediaQuery(theme.breakpoints.up('xl')) //1920+


  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllUsersData()
      setUsersData(data)
    }
    fetchData()
  }, [])

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <Grid item xs={12}>
        <TableEditUsers rows={usersData} roleData={authUser.role} role={authUser.role} cargando={cargando} />
      </Grid>
    </Box>
  )
}

export default DataGrid
