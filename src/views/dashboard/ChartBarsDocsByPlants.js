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

const ChartBarsDocsByPlants = ({ docsByPlants, loading }) => {
  // ** Hook
  const theme = useTheme()

  const options = {
    tooltip: {
      x: {
        formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
          const plants = [
            'Los Colorados',
            'Laguna Seca 1',
            'Laguna Seca 2',
            'Chancado y Correas',
            'Puerto Coloso',
            'Instalaciones Cátodo'
          ]

          if (dataPointIndex >= 0 && dataPointIndex < plants.length) {
            return plants[dataPointIndex];
          } else {
            // Devuelve un valor por defecto o una cadena vacía si dataPointIndex no es válido
            return 'N/A';
          }
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
        distributed: true,
        columnWidth: '51%',
        endingShape: 'rounded',
        startingShape: 'rounded',
      }
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: [
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1)
    ],
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    xaxis: {
      axisTicks: { show: false },
      axisBorder: { show: false },
      categories: ['PCLC', 'LSL1', 'LSL2', 'CHCO', 'PCOL', 'ICAT'],
      labels: {
        style: { colors: theme.palette.text.disabled }
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
        title='Solicitudes por Plantas'

        //subheader='Total semanal: 20'
        subheaderTypographyProps={{ sx: { lineHeight: 1.429 } }}
        titleTypographyProps={{ sx: { letterSpacing: '0.15px' } }}
      />
      <CardContent sx={{  pt: { xs: `${theme.spacing(6)} !important`, md: `${theme.spacing(0)} !important` } }}>
        {loading ? (
          <CargandoGrafico alto={150} />
        ) : (
        <ReactApexcharts
          type='bar'
          height={150}
          options={options}
          series={[{ name: 'Solicitudes', data: docsByPlants || [] }]}
        />
        )}
      </CardContent>
    </Card>
  )
}

export default ChartBarsDocsByPlants
