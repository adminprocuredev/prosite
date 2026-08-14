// La ventana de fechas de la tabla de Solicitudes.
//
// La tabla traía las 1.849 solicitudes en un listener en vivo —unos 8,6 MB
// desde `nam5`— y las 1.849 arrancan en septiembre de 2022: casi cuatro años de
// historia bajados enteros para mirar, casi siempre, lo de este mes.
//
// POR QUÉ UNA VENTANA Y NO PAGINACIÓN DEL LADO DEL SERVIDOR. La página filtra
// TODO en el cliente: las cinco pestañas son `data.filter(state === …)`, los
// desplegables de Filtros se construyen con los datos cargados
// —`filterByLabel('plant', …)`—, y el buscador, el orden y EXPORTAR del
// DataGrid también miran lo que hay cargado. Con páginas, las opciones de los
// filtros serían las de la página actual y buscar dejaría de encontrar lo que
// no está en ella. Además Firestore no tiene `offset`: sería paginación por
// cursor, que se reinicia con cada cambio de filtro y exige un índice compuesto
// por cada combinación de filtro y orden.
//
// Acotar por fecha no rompe ninguno de esos mecanismos: pestañas, filtros,
// buscador, orden y EXPORTAR siguen funcionando exactamente igual. Lo que sí
// cambia —y hay que decirlo, porque no es lo mismo— es el CONJUNTO sobre el que
// trabajan. Con 12 meses, una planta que solo aparece en solicitudes de hace 18
// desaparece del desplegable, el buscador no la encuentra y el export no la
// incluye. Es lo mismo que ya se hizo en el calendario y en el ranking de la
// portada.
//
// Por eso el selector está a la vista y con su texto: no alcanza con que se
// pueda ampliar, tiene que ser evidente que lo que se está mirando es un
// periodo y no todo.
//
// ponytail: el corte se calcula al suscribirse y no se mueve solo. Una pantalla
// dejada abierta de un día para otro sigue con el corte de ayer, así que
// muestra un día de más en el borde más viejo de la ventana. Corregirlo pedía un
// temporizador a medianoche y volver a bajar la ventana entera; enseñar de más
// en el extremo que nadie mira no lo justifica. Si algún día importa, el arreglo
// es reprogramar el efecto al próximo inicio de día.

import moment from 'moment'

export const MESES_POR_DEFECTO = 12

export const VENTANAS = [
  { meses: 12, etiqueta: 'Últimos 12 meses' },
  { meses: 24, etiqueta: 'Últimos 24 meses' },
  { meses: null, etiqueta: 'Todas' }
]

/**
 * A qué roles se les puede acotar la consulta.
 *
 * Solo a los que hoy traen la colección ENTERA, que son justamente los que
 * esperan. Los demás quedan fuera por una razón de Firestore, no de producto:
 *
 * - rol 2 consulta `where('uid','==',…)` y rol 3 `where('plant','in',…)`;
 *   sumarles el rango sobre `date` pide un índice compuesto que no existe. Y no
 *   hace falta: sus consultas ya devuelven un subconjunto chico.
 * - rol 7 consulta `or(state >= 6, state == 0)`, que ya trae una desigualdad, y
 *   Firestore 10.5 no admite dos campos con desigualdad en la misma consulta.
 *
 * Para 1, 4, 5 y 6 la consulta es la colección pelada, así que el rango sobre
 * `date` usa el índice de campo único que Firestore mantiene solo: no hay nada
 * que desplegar.
 */
export const laVentanaAplicaA = role => [1, 4, 5, 6].includes(role)

/**
 * Desde cuándo pedir. `null` cuando no hay ventana, que es "todas".
 *
 * Corta al INICIO del día y no a la hora exacta: si no, el borde se mueve solo
 * con el reloj y una solicitud del límite entra o sale según el minuto en que
 * se abra la pantalla.
 */
export const desdeCuando = (meses, ahora = moment()) =>
  meses ? moment(ahora).subtract(meses, 'months').startOf('day').toDate() : null
