// ** MUI Imports
import Card from '@mui/material/Card'
import { useTheme } from '@mui/material/styles'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'

// ** Custom Components Imports
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// ** Util Import
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'
import CargandoGrafico from 'src/views/dashboard/CargandoGrafico'

const ChartBarsObjetivesByPlants = ({ objetivesByPlants, loading = false }) => {
  // ** Hook
  const theme = useTheme()

  const plants = [
    { name: 'Los Colorados', initial: 'PCLC' },
    { name: 'Laguna Seca 1', initial: 'LSL1' },
    { name: 'Laguna Seca 2', initial: 'LSL2' },
    { name: 'Chancado y Correas', initial: 'CHCO' },
    { name: 'Puerto Coloso', initial: 'PCOL' },
    { name: 'Instalacones Cátodo', initial: 'ICAT' }
  ]

  const query1Results = objetivesByPlants.map(result => result.query1)
  const query2Results = objetivesByPlants.map(result => result.query2)
  const resObjByPlants2 = query1Results.map((el, index) => ({ x: plants[index], y: el }))

  const chartData = plants.map((plant, index) => ({
    name: plant.name,
    initial: plant.initial,
    query1: query1Results && query1Results[index],
    query2: query2Results && query2Results[index]
  }))

  const options = {
    tooltip: {
      x: {
        formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
          //const value = series[seriesIndex][dataPointIndex];
          const plants = [
            'Los Colorados',
            'Laguna Seca 1',
            'Laguna Seca 2',
            'Chancado y Correas',
            'Puerto Coloso',
            'Instalacones Cátodo'
          ]

          return plants[dataPointIndex]
        }
      }
    },
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        distributed: false,
        columnWidth: '51%',
        endingShape: 'rounded',
        startingShape: 'rounded'
      }
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: [theme.palette.primary.main, theme.palette.warning.main],
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    series: [
      {
        name: 'Total de Levantamientos',
        data: chartData.map(item => item.query1)
      },
      {
        name: 'Levantamientos activos',
        data: chartData.map(item => item.query2)
      }
    ],
    xaxis: {
      categories: chartData.map(item => item.initial),
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: {
        style: {
          colors: theme.palette.text.disabled
        }
      }
    },
    yaxis: { show: false },
    grid: {
      show: false,
      padding: {
        top: -30,
        left: -7,
        right: -4
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title='Levantamientos por Planta'
        subheaderTypographyProps={{ sx: { lineHeight: 1.429 } }}
        titleTypographyProps={{ sx: { letterSpacing: '0.15px' } }}
      />
      <CardContent sx={{ pt: { xs: `${theme.spacing(6)} !important`, md: `${theme.spacing(0)} !important` } }}>
        {loading ? (
          <CargandoGrafico alto={150} />
        ) : (
        <ReactApexcharts type='bar' height={150} options={options} series={options.series} />
        )}
      </CardContent>
    </Card>
  )
}

export default ChartBarsObjetivesByPlants
