// ** React Imports
import { useEffect, useState } from 'react'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'
import { useGoogleAuth } from 'src/context/google-drive-functions/useGoogleDriveAuth'

// ** MUI Imports
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'

// ** Custom Components Imports

// ** Demo Components Imports
import TableLevantamiento from 'src/views/table/data-grid/TableLevantamiento'

const DataGridLevantamientos = () => {
  const [value, setValue] = useState('1')
  const [roleData, setRoleData] = useState({ name: 'admin' })

  const { useSnapshot, authUser, getDomainData } = useFirebase()
  const data = useSnapshot(true, authUser)

  useEffect(() => {
    const role = async () => {
      if (authUser) {
        const role = await getDomainData('roles', authUser.role.toString())
        setRoleData(role)
      }
    }

    role()
  }, [])

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

  const tabContent =
    authUser.role === 1
      ? [
          {
            data: data.filter(doc => doc.state >= 6 && doc.state < 10),
            label: 'Todos los levantamientos'
          },
          {
            data: data.filter(doc => doc.state === 6),
            label: 'Agendados'
          },
          {
            data: data.filter(doc => doc.state === 7),
            label: 'En Proceso'
          },
          {
            data: data.filter(doc => doc.state === 8),
            label: 'Terminados'
          }
        ]
      : [
          {
            data: data.filter(doc => doc.state >= 6 && doc.state < 10 && doc.supervisorShift === authUser.shift[0]),
            label: 'Todos los levantamientos'
          },
          {
            data: data.filter(doc => doc.state === 6 && doc.supervisorShift === authUser.shift[0]),
            label: 'Por Revisar'
          },
          {
            data: data.filter(doc => doc.state === 7 && doc.supervisorShift === authUser.shift[0]),
            label: 'En Proceso'
          },
          {
            data: data.filter(doc => doc.state === 8 && doc.supervisorShift === authUser.shift[0]),
            label: 'Terminados'
          }
        ]

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={handleChange} aria-label='lab API tabs example'>
            {tabContent.map((element, index) => (
              <Tab label={element.label} value={`${index + 1}`} key={index} />
            ))}
          </TabList>
        </Box>
        {tabContent.map((element, index) => (
          <Grid item xs={12} key={index}>
            <TabPanel key={index} value={`${index + 1}`}>
              <TableLevantamiento rows={element.data} roleData={roleData} role={authUser.role} />
            </TabPanel>
          </Grid>
        ))}
      </TabContext>
    </Box>
  )
}

export default DataGridLevantamientos
