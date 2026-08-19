// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Hooks
import { getAllUsersData } from 'src/context/firebase-functions/firestoreQuerys'
import { useFirebase } from 'src/context/useFirebase'

// ** MUI Imports
import { Box, Grid } from '@mui/material'

// ** Custom Components Imports
import TableEditUsers from 'src/views/table/data-grid/TableEditUsers'

const DataGrid = () => {
  const [usersData, setUsersData] = useState([])
  const [cargando, setCargando] = useState(true)
  const { authUser } = useFirebase()

  // Esta pantalla llamaba a `useSnapshot(true, authUser)`, que abre un listener
  // sobre la colección SOLICITUDES entera —para un administrador son las 1.849,
  // ~8,6 MB— y despues TIRABA las filas: de todo eso solo se usaba `cargando`,
  // que ademas hablaba de otra consulta. Esa era la razon de que «la lista de
  // usuarios carga lento». Ahora el indicador es el de esta lista.
  //
  // `getAllUsersData` se traga sus errores y devuelve `undefined`; sin el
  // `Array.isArray` el DataGrid recibe `undefined` como `rows` y lanza.
  const cargarUsuarios = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getAllUsersData()
      setUsersData(Array.isArray(data) ? data : [])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarUsuarios()
  }, [cargarUsuarios])

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <Grid item xs={12}>
        <TableEditUsers
          rows={usersData}
          roleData={authUser.role}
          role={authUser.role}
          cargando={cargando}
          recargarUsuarios={cargarUsuarios}
        />
      </Grid>
    </Box>
  )
}

export default DataGrid
