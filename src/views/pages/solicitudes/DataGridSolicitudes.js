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
import { estaPorAprobar, infoPorAprobar } from 'src/views/pages/solicitudes/estadosPorAprobar'

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
          // Esto era `doc.state === authUser.role - 1`, con el rol 5 parchado
          // aparte. Para un Administrador -rol 1- la resta da estado 0, que es
          // RECHAZADO: la pestaña mostraba las mismas solicitudes que
          // «Rechazadas». Los números de rol y los de estado son dos escalas
          // distintas que solo coinciden en el medio de la cadena.
          data: data.filter(doc => estaPorAprobar(doc, authUser.role)),
          label: 'Por aprobar',
          info: infoPorAprobar(authUser.role)
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

  // Cada pestaña con sus filas ya filtradas, una sola vez: el número que se
  // muestra en el rótulo tiene que ser exactamente el de la tabla de abajo, o
  // es otra cosa que miente.
  //
  // Los números están porque Mario Mella no tenía cómo saber si «Aprobadas»
  // mostraba lo mismo que «Todas las solicitudes» -no lo mostraba: son 1.622 de
  // 1.849- y tuvo que preguntarlo. Con el conteo a la vista se responde solo.
  const pestanas = tabContent.map(pestana => ({ ...pestana, filas: applyFilters(pestana.data, values) }))

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
            {pestanas.map((element, index) => (
              <Tab
                label={
                  <Tooltip arrow title={element.info} placement='top-end' key={element.label}>
                    {/* El conteo aparece cuando terminó de cargar. Un «(0)»
                        mientras llegan los datos se lee como «no hay», que es
                        el mismo vacío-usado-como-respuesta de la tabla y del
                        desplegable del Gabinete. */}
                    <span>{cargando ? element.label : `${element.label} (${element.filas.length})`}</span>
                  </Tooltip>
                }
                value={`${index + 1}`}
                key={index}
              />
            ))}
          </TabList>
        </Box>
        {pestanas.map((element, index) => (
          <Grid item xs={12} key={index}>
            <TabPanel key={index} value={`${index + 1}`}>
              <TableBasic rows={element.filas} roleData={roleData} role={authUser.role} cargando={cargando} />
            </TabPanel>
          </Grid>
        ))}
      </TabContext>
    </Box>
  )
}

export default DataGrid
