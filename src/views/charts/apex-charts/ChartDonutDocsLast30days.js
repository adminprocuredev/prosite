// ** MUI Imports
import Card from '@mui/material/Card'
import { useTheme } from '@mui/material/styles'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'

// ** Component Import
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import CargandoGrafico from 'src/views/dashboard/CargandoGrafico'

const donutColors = {
  series1: '#fdd835',
  series2: '#00d4bd',
  series3: '#826bf8',
  series4: '#40CDFA',
  series5: '#ffa1a1'
}

const ChartDonutDocsLast30days = ({ docsByState, loading }) => {
  // ** Hook
  const theme = useTheme()

  const totalDocuments = docsByState.reduce((total, count) => total + count, 0)
  const total = `Recibidas: ${totalDocuments}`

  const options = {
    stroke: { width: 0 },
    labels: ['En Proceso', 'Aceptadas', 'Rechazadas'],
    colors: [donutColors.series1, donutColors.series2, donutColors.series5],
    dataLabels: {
      enabled: true,
      formatter: function (val, opt) {
        return opt.w.config.series[opt.seriesIndex]
      }
    },
    legend: {
      position: 'bottom',
      markers: { offsetX: -3 },
      labels: { colors: theme.palette.text.secondary },
      itemMargin: {
        vertical: 3,
        horizontal: 10
      }
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: {
              fontSize: '1.2rem'
            },
            value: {
              fontSize: '1.2rem',
              color: theme.palette.text.secondary,
              formatter: val => `${parseInt(val, 10)}`
            },
            total: {
              show: true,
              fontSize: '1.2rem',
              label: 'Recibidas',
              color: theme.palette.text.primary
            }
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 992,
        options: {
          chart: {
            height: 380
          },
          legend: {
            position: 'bottom'
          }
        }
      },
      {
        breakpoint: 576,
        options: {
          chart: {
            height: 320
          },
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  show: true,
                  name: {
                    fontSize: '1rem'
                  },
                  value: {
                    fontSize: '1rem'
                  },
                  total: {
                    fontSize: '1rem'
                  }
                }
              }
            }
          }
        }
      }
    ]
  }

  return (
    <Card>
      <CardHeader
        title='Solicitudes últimos 30 días'

        //subheader='Spending on various categories'
        subheaderTypographyProps={{ sx: { color: theme => `${theme.palette.text.disabled} !important` } }}
      />
      <CardContent>
        {loading ? (
          <CargandoGrafico alto={400} />
        ) : (
          <ReactApexcharts type='donut' height={400} options={options} series={docsByState} />
        )}
      </CardContent>
    </Card>
  )
}

export default ChartDonutDocsLast30days
