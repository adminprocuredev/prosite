// Los dos gráficos de levantamientos de la portada —el de esta semana y el de
// los últimos seis meses— salen de UNA sola consulta.
//
// Antes eran siete. La de la semana pedía `where('state','>=',6)` SIN ventana
// de fechas: son 1622 solicitudes enteras, ~7,4 MB desde `nam5` —a 4,66 kB por
// documento, medido contra producción— para pintar siete barras que suman 7. Y
// la de los seis meses pedía cada mes por separado, seis viajes más.
//
// La semana en curso está DENTRO de los seis meses, así que una ventana sobre
// `start` sirve para los dos gráficos: siete viajes pasan a uno y la descarga
// se limita a los meses que de verdad se muestran.
//
// El `state >= 6` se filtra aquí y no en la consulta porque Firestore no acepta
// dos campos distintos con desigualdad en la misma consulta —`start` ya ocupa
// el rango—. Bajar seis meses y descartar en memoria sigue siendo mucho menos
// que bajarlo todo.

import moment from 'moment'

export const MESES_DEL_GRAFICO = 6

// La ventana que hay que pedirle a Firestore. `hasta` es EXCLUSIVO.
//
// El extremo derecho no es el fin del mes a secas: la semana en curso puede
// cruzar al mes siguiente —un miércoles 31—, y esos días saldrían del gráfico
// semanal sin aparecer en ninguna parte. Se toma el más lejano de los dos.
//
// Y es exclusivo porque `endOf()` da 23:59:59.999 mientras que un Timestamp de
// Firestore guarda nanosegundos: con `<=` se perdería un documento escrito en
// los últimos microsegundos del domingo. Con el instante siguiente y `<` no hay
// rendija.
export const ventanaActividadReciente = (ahora = moment()) => {
  const referencia = moment(ahora)

  return {
    desde: referencia
      .clone()
      .subtract(MESES_DEL_GRAFICO - 1, 'months')
      .startOf('month')
      .toDate(),
    hasta: moment
      .max(referencia.clone().endOf('month'), referencia.clone().endOf('isoWeek'))
      .add(1, 'millisecond')
      .toDate()
  }
}

// Firestore devuelve `start` como Timestamp; los tests lo pasan como Date.
const aFecha = valor => (valor && typeof valor.toDate === 'function' ? valor.toDate() : valor)

const conMayuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1)

/**
 * Agrupa las solicitudes de la ventana en los dos gráficos de la portada.
 *
 * @param {Array} solicitudes - Datos crudos de las solicitudes de la ventana.
 * @param {Object} ahora - Momento de referencia (inyectable para los tests).
 * @returns {{porDia: number[], porMes: Array<{month: string, cant: number}>}}
 */
export const agruparActividadReciente = (solicitudes, ahora = moment()) => {
  const referencia = moment(ahora)
  const inicioSemana = referencia.clone().startOf('isoWeek')
  const finSemana = referencia.clone().endOf('isoWeek')

  const porDia = Array(7).fill(0)

  // Los seis meses se crean vacíos y en orden: un mes sin levantamientos tiene
  // que salir en el gráfico con un cero, no desaparecer del eje.
  const porMes = []
  for (let atras = MESES_DEL_GRAFICO - 1; atras >= 0; atras--) {
    const mes = referencia.clone().subtract(atras, 'months')
    porMes.push({ clave: mes.format('YYYY-MM'), month: conMayuscula(mes.locale('es').format('MMM')), cant: 0 })
  }
  const mesPorClave = new Map(porMes.map(mes => [mes.clave, mes]))

  for (const solicitud of solicitudes) {
    // Un levantamiento es `state >= 6`, y se comprueba por lo que SÍ tiene que
    // cumplir, no descartando lo que falla: escrito al revés —`state < 6`— un
    // NaN pasaba, porque `NaN < 6` es false y `typeof NaN` es 'number'.
    //
    // El `typeof` tampoco es adorno: la consulta vieja filtraba con
    // `where('state','>=',6)` y Firestore ordena por tipo, así que un `state`
    // de texto NO entraba. En JavaScript '7' >= 6 es true, y el número de la
    // portada cambiaría solo por haber movido el filtro al cliente. Es el mismo
    // criterio que usa `useSolicitudesEnRango`.
    if (!(typeof solicitud.state === 'number' && solicitud.state >= 6)) continue

    // `moment(undefined)` es AHORA, no una fecha inválida: sin este corte, una
    // solicitud sin `start` se contaría como del día de hoy. Ya hay solicitudes
    // sin fecha en producción —de ahí el comparador defensivo de la tabla—; el
    // recorrido viejo reventaba con ellas en vez de inventarlas.
    const fecha = aFecha(solicitud.start)
    if (!fecha) continue

    const inicio = moment(fecha)
    if (!inicio.isValid()) continue

    const mes = mesPorClave.get(inicio.format('YYYY-MM'))
    if (mes) mes.cant++

    if (inicio.isSameOrAfter(inicioSemana) && inicio.isSameOrBefore(finSemana)) {
      porDia[inicio.isoWeekday() - 1]++
    }
  }

  return { porDia, porMes: porMes.map(({ month, cant }) => ({ month, cant })) }
}
