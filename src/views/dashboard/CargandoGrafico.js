import Skeleton from '@mui/material/Skeleton'

// El hueco que ocupa un gráfico mientras llegan sus datos.
//
// Existe porque la portada aparecía a saltos, y eran dos saltos distintos:
//
// - Tres componentes de dona —`ChartDonutDocsLast30days`,
//   `ChartDonutObjetivesLast30days` y `ChartDonutBlueprintsLast30daysByShift`,
//   que son CUATRO tarjetas porque el de turnos se dibuja dos veces— hacían
//   `{loading ? <p>Cargando datos...</p> : <chart height={400}/>}`. La tarjeta se
//   encogía de 400 px a una línea de texto y volvía a crecer al llegar los
//   datos: la página entera se movía debajo.
// - Tres no recibían `loading` siquiera —`ObjetivesByDay`, `ObjetivesByMonth` y
//   `ChartBarsObjetivesByPlants`— y dibujaban sus datos de relleno. El gráfico
//   mensual pintaba Ene-Jun con ceros y después saltaba a los seis meses de
//   verdad.
// - Y uno, `ChartBarsDocsByPlants`, sí tenía `loading` pero lo usaba para
//   dibujar seis barras en cero.
//
// Un gráfico con datos falsos no es un aviso de carga: es una respuesta
// equivocada, igual que el «Sin filas» de la tabla de solicitudes.
//
// Con esto el espacio se reserva desde el primer pintado y nunca se dibuja un
// número que no es. `alto` tiene que ser el MISMO que el del gráfico que viene,
// o el salto vuelve, más chico.
const CargandoGrafico = ({ alto }) => <Skeleton variant='rounded' animation='wave' height={alto} />

export default CargandoGrafico
