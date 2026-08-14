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

const ObjetivesByDay = ({ objetivesOfActualWeek, loading = false }) => {
  // ** Hooks
  const theme = useTheme()

  const options = {
    tooltip: {
      x: {
        formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
          const daysOfWeek = [
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
            'Sábado',
            'Domingo'
          ]

          return daysOfWeek[dataPointIndex]
        }
      },
      y: {
        formatter: function (value) {
          return Math.round(value); // Redondea el valor para asegurar que se muestre como un entero
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
        startingShape: 'rounded'
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
      categories: ['Lun.', 'Mar.', 'Mie.', 'Jue.', 'Vie.', 'Sab.', 'Dom.'],
      labels: {
        style: { colors: theme.palette.text.disabled }
      }
    },
    yaxis: {  show: false },
    grid: {
      show: false,
      padding: {
        top: -30,
        left: -7,
        right: -4
      }
    }
  }

  const totalDocuments = objetivesOfActualWeek.reduce((total, count) => total + count, 0)
  const totalSemanal = `Total semanal: ${totalDocuments}`

  return (
    <Card>
      <CardHeader
        title='Levantamientos de esta semana'
        subheader={totalSemanal}
        subheaderTypographyProps={{ sx: { lineHeight: 1.429 } }}
        titleTypographyProps={{ sx: { letterSpacing: '0.15px' } }}
      />
      <CardContent sx={{ pt: { xs: `${theme.spacing(6)} !important`, md: `${theme.spacing(0)} !important` } }}>
        {loading ? (
          <CargandoGrafico alto={120} />
        ) : (
        <ReactApexcharts
          type='bar'
          height={120}
          options={options}
          series={[{ name: 'Levantamientos', data: objetivesOfActualWeek }]}
        />
        )}
      </CardContent>
    </Card>
  )
}

export default ObjetivesByDay
