// ** React Imports
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useState } from 'react'
// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

// ** MUI Imports
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import { Box, Grid, MenuItem, Tab, TextField, Tooltip } from '@mui/material'

// ** Custom Components Imports
import filterByLabel from 'src/@core/components/custom-filters/customFilters'
import FilterComponent from 'src/@core/components/filter-component'
import generateFilterConfig from 'src/@core/components/filter-configs/filterConfigs'
import TableBasic from 'src/views/table/data-grid/TableBasic'
import {
  MESES_POR_DEFECTO,
  VENTANAS,
  laVentanaAplicaA
} from 'src/context/firebase-functions/ventanaDeSolicitudes'

const DataGrid = () => {
  const [values, setValues] = useState({})
  const [tabValue, setTabValue] = useState('1')
  const [filterConfig, setFilterConfig] = useState({})
  const [roleData, setRoleData] = useState({ name: 'admin' })
  const { useSnapshot, authUser, getDomainData } = useFirebase()
  // La tabla trae los ultimos 12 meses y no los cuatro anos completos. El
  // porque esta en `ventanaDeSolicitudes.js`; aqui solo queda a la vista, para
  // que quien necesite lo viejo lo pida y sepa que lo esta pidiendo.
  const [meses, setMeses] = useState(MESES_POR_DEFECTO)
  const { filas: data, cargando } = useSnapshot(true, authUser, false, meses)

  // Objeto de configuración de filtros
  useEffect(() => {
    setFilterConfig(generateFilterConfig(authUser))
  }, [authUser])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Function to handle changes when a filter is selected from Autocomplete or Select
  const handleFilterChange = (key, value) => {
    setValues(prevValues => ({
      ...prevValues,
      [key]: value
    }))
  }

  const theme = useTheme()
  const xs = useMediaQuery(theme.breakpoints.up('xs')) //0-600
  const sm = useMediaQuery(theme.breakpoints.up('sm')) //600-960
  const md = useMediaQuery(theme.breakpoints.up('md')) //960-1280
  const lg = useMediaQuery(theme.breakpoints.up('lg')) //1280-1920
  const xl = useMediaQuery(theme.breakpoints.up('xl')) //1920+

  // Tab content filters based on the user role
  const tabContent = authUser
    ? [
        {
          // Filters all rejected requests.
          // TODO: Delete filter for role 5
          data: data,
          label: 'Todas las solicitudes',
          info: 'Todas las solicitudes'
        },
        {
          data: data.filter(authUser.role === 5 ? doc => (doc.state === 3 || doc.state === 4) : doc => doc.state === authUser.role - 1), //TODO: revisar visibilidad
          label: 'Por aprobar',
          info: 'Solicitudes pendientes de mi aprobación'
        },
        {
          data: data.filter(doc => doc.state >= 6 && doc.state < 10),
          label: 'Aprobadas',
          info: 'Solicitudes aprobadas por Procure'
        },
        ...(authUser.role === 5 || authUser.role === 6 //se utiliza El operador de propagación para añadir un objeto adicional a tabContent solo si authUser.role es igual a 5
          ? [
              {
                data: data.filter(doc => doc.state === 2),
                label: 'En Revisión Por C. Operator',
                info: 'En Revisión Por C. Operator'
              }
            ]
          : []),
        {
          data: data.filter(doc => doc.state === 0),
          label: 'Rechazadas',
          info: 'Solicitudes rechazadas'
        }
      ]
    : []

  useEffect(() => {
    const role = async () => {
      if (authUser) {
        const role = await getDomainData('roles', authUser.role.toString())
        setRoleData({ ...role, id: authUser.role.toString() })
      }
    }

    role()
  }, [])

  // Adds data-based filters
  const filterByPlant = () => filterByLabel('plant', 'Planta', data)
  const filterByJobType = () => filterByLabel('objective', 'Objetivo', data)

  useEffect(() => {
    let jobType = filterByJobType()
    let plant = filterByPlant()
    setFilterConfig(prevConfig => ({
      ...prevConfig,
      ...jobType,
      ...plant
    }))
  }, [data])

  // Function to app filters to the data rows
  const applyFilters = (data, activeFilters) => {
    return data.filter(row => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true // Skip if the filter is not selected

        return filterConfig[value].filterFunction(row)
      })
    })
  }

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <FilterComponent
        authUser={authUser}
        filterConfig={filterConfig}
        activeFilters={values}
        handleFilterChange={handleFilterChange}
        handleClearFilters={setValues} // Usar setValues para limpiar los filtros
      />
      {laVentanaAplicaA(authUser?.role) && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <TextField
            select
            size='small'
            label='Periodo'
            value={meses === null ? 'todas' : meses}
            onChange={evento => setMeses(evento.target.value === 'todas' ? null : Number(evento.target.value))}
            sx={{ minWidth: 220 }}
            helperText='Pestañas, filtros, buscador y export trabajan sobre este periodo'
          >
            {VENTANAS.map(ventana => (
              <MenuItem key={ventana.etiqueta} value={ventana.meses === null ? 'todas' : ventana.meses}>
                {ventana.etiqueta}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}
      <TabContext value={tabValue}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList
            onChange={handleTabChange}
            aria-label='lab API tabs example'
            variant='scrollable'
            scrollButtons='auto'
          >
            {tabContent.map((element, index) => (
              <Tab
                label={
                  <Tooltip arrow title={element.info} placement='top-end' key={element.label}>
                    <span>{element.label}</span>
                  </Tooltip>
                }
                value={`${index + 1}`}
                key={index}
              />
            ))}
          </TabList>
        </Box>
        {tabContent.map((element, index) => (
          <Grid item xs={12} key={index}>
            <TabPanel key={index} value={`${index + 1}`}>
              <TableBasic rows={applyFilters(element.data, values)} roleData={roleData} role={authUser.role} cargando={cargando} />
            </TabPanel>
          </Grid>
        ))}
      </TabContext>
    </Box>
  )
}

export default DataGrid
