// Correr con: node src/context/firebase-functions/actividadReciente.test.mjs
import assertOriginal from 'node:assert/strict'
import moment from 'moment'
import { agruparActividadReciente, ventanaActividadReciente } from './actividadReciente.js'

// El total se cuenta solo: escrito a mano se desincroniza.
let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// Una solicitud de mentira: solo los dos campos que mira el reparto.
const solicitud = (fecha, state = 7) => ({ state, start: new Date(`${fecha}T12:00:00`) })

// Como las devuelve Firestore.
const conTimestamp = (fecha, state = 7) => ({ state, start: { toDate: () => new Date(`${fecha}T12:00:00`) } })

// --- lo que el arreglo viene a cerrar ----------------------------------------

// La semana en curso puede cruzar al mes siguiente. Miércoles 31 de diciembre
// de 2025: la semana ISO va del lunes 29 de diciembre al domingo 4 de enero.
// Con la ventana cortada en `endOf('month')`, el 1, 2, 3 y 4 de enero no los
// traía nadie y el gráfico semanal mostraba menos de lo que hubo.
{
  const miercoles31 = moment('2025-12-31T09:00:00')
  const { desde, hasta } = ventanaActividadReciente(miercoles31)

  assert.equal(moment(desde).format('YYYY-MM-DD'), '2025-07-01', 'la ventana parte el 1° del sexto mes hacia atrás')

  // Exclusivo y sin rendija: el instante siguiente al último del domingo. Con
  // `<=` sobre 23:59:59.999 se perdería un Timestamp con nanosegundos.
  assert.equal(
    moment(hasta).format('YYYY-MM-DD HH:mm:ss.SSS'),
    '2026-01-05 00:00:00.000',
    'la ventana termina justo después del domingo de la semana en curso'
  )

  const { porDia } = agruparActividadReciente(
    [solicitud('2025-12-29'), solicitud('2025-12-31'), solicitud('2026-01-01'), solicitud('2026-01-04')],
    miercoles31
  )

  assert.deepEqual(porDia, [1, 0, 1, 1, 0, 0, 1], 'los días de enero de esta misma semana también cuentan')
}

// Un documento que la ventana arrastra del mes siguiente NO entra en ningún mes
// del gráfico: los seis meses son los seis que se dibujan.
{
  const miercoles31 = moment('2025-12-31T09:00:00')
  const { porMes } = agruparActividadReciente([solicitud('2026-01-01'), solicitud('2025-12-05')], miercoles31)

  assert.equal(porMes.length, 6, 'siempre seis meses')
  assert.equal(porMes[5].cant, 1, 'diciembre cuenta el suyo')
  assert.equal(
    porMes.reduce((total, mes) => total + mes.cant, 0),
    1,
    'el de enero no se cuela en ningún mes'
  )
}

// --- lo que ya hacía y tiene que seguir haciendo -----------------------------

// Un levantamiento es `state >= 6`. Lo de abajo se descarta.
{
  const jueves = moment('2026-08-13T09:00:00')
  const { porDia, porMes } = agruparActividadReciente(
    [
      solicitud('2026-08-13', 6),
      solicitud('2026-08-13', 9),
      solicitud('2026-08-13', 5),
      solicitud('2026-08-13', 0),
      // Firestore ordena por tipo: `where('state','>=',6)` nunca trajo textos.
      // Al filtrar en el cliente hay que seguir dejándolos fuera, o el número
      // cambiaría solo por haber movido el filtro.
      solicitud('2026-08-13', '7'),
      // `NaN < 6` es false y `typeof NaN` es 'number': escrito como descarte,
      // este pasaba. Firestore nunca lo trajo con `where('state','>=',6)`.
      solicitud('2026-08-13', NaN),
      { state: 7 },
      { state: 7, start: null },
      { start: new Date('2026-08-13T12:00:00') }
    ],
    jueves
  )

  assert.deepEqual(porDia, [0, 0, 0, 2, 0, 0, 0], 'solo los dos con state >= 6, y en el jueves')
  assert.equal(porMes[5].cant, 2, 'los mismos dos en el mes')
}

// Los Timestamp de Firestore se leen igual que las Date.
{
  const jueves = moment('2026-08-13T09:00:00')
  const { porDia } = agruparActividadReciente([conTimestamp('2026-08-13')], jueves)

  assert.deepEqual(porDia, [0, 0, 0, 1, 0, 0, 0], 'un Timestamp cuenta igual que una Date')
}

// Los seis meses salen en orden, del más viejo al más nuevo, y un mes sin nada
// aparece con cero en vez de desaparecer del eje.
{
  const agosto = moment('2026-08-13T09:00:00')
  const { porMes } = agruparActividadReciente([solicitud('2026-03-10'), solicitud('2026-08-01')], agosto)

  assert.deepEqual(
    porMes.map(mes => mes.cant),
    [1, 0, 0, 0, 0, 1],
    'marzo y agosto con uno, los cuatro del medio en cero'
  )
  assert.equal(porMes.length, new Set(porMes.map(mes => mes.month)).size, 'seis etiquetas distintas')
}

// Una semana sin nada son siete ceros, no un arreglo vacío: el gráfico dibuja
// los siete días igual.
{
  const { porDia } = agruparActividadReciente([], moment('2026-08-13T09:00:00'))

  assert.deepEqual(porDia, [0, 0, 0, 0, 0, 0, 0], 'sin datos, siete ceros')
}

// La semana ISO empieza el lunes: el domingo es el séptimo casillero, no el
// primero.
{
  const domingo = moment('2026-08-16T09:00:00')
  const { porDia } = agruparActividadReciente([solicitud('2026-08-10'), solicitud('2026-08-16')], domingo)

  assert.deepEqual(porDia, [1, 0, 0, 0, 0, 0, 1], 'lunes en el primero, domingo en el séptimo')
}

// La hora de referencia se inyecta en las DOS funciones. Si el llamador dejara
// que cada una tomara la suya, una carga que cruce la medianoche del último día
// del mes pediría una ventana y repartiría otra.
{
  const finDeAgosto = moment('2025-08-31T23:59:59.900')
  const inicioDeSeptiembre = moment('2025-09-01T00:00:00.100')

  const { desde } = ventanaActividadReciente(finDeAgosto)
  const enElMesMasViejo = [solicitud('2025-03-15')]

  assert.equal(moment(desde).format('YYYY-MM'), '2025-03', 'agosto pide desde marzo')
  assert.equal(
    agruparActividadReciente(enElMesMasViejo, finDeAgosto).porMes[0].cant,
    1,
    'con la misma hora, lo de marzo se cuenta'
  )
  assert.equal(
    agruparActividadReciente(enElMesMasViejo, inicioDeSeptiembre).porMes[0].cant,
    0,
    'con la hora corrida un segundo, marzo ya no existe: por eso va una sola'
  )
}

// --- los números tienen que salir IGUALES que antes ---------------------------
//
// Toda la PR se apoya en una promesa: se baja muchísimo menos y la portada
// muestra lo mismo. Aquí está comprobada contra el algoritmo viejo, copiado tal
// cual, sobre un revoltijo de solicitudes repartidas en dos años.
//
// El viejo pedía a Firestore `where('state','>=',6)` sin fechas y recortaba la
// semana en el navegador; el nuevo pide la ventana y recorta el estado. Lo que
// se compara es el resultado de los dos caminos completos, con el filtro del
// servidor simulado en cada uno.
{
  const ahora = moment('2026-08-13T09:00:00')

  // Firestore ordena por tipo: `>= 6` solo alcanza a los números.
  const comoFirestoreFiltraElEstado = docs => docs.filter(d => typeof d.state === 'number' && d.state >= 6)
  const comoFirestoreFiltraLaVentana = (docs, desde, hasta) =>
    docs.filter(d => d.start instanceof Date && d.start >= desde && d.start < hasta)

  const semanaALaVieja = docs => {
    const inicio = ahora.clone().startOf('isoWeek').toDate()
    const fin = ahora.clone().endOf('isoWeek').toDate()
    const porDia = Array(7).fill(0)

    for (const doc of docs) {
      const start = doc.start
      if (moment(start).isSameOrAfter(inicio) && moment(start).isSameOrBefore(fin)) {
        porDia[moment(start).isoWeekday() - 1]++
      }
    }

    return porDia
  }

  const mesesALaVieja = docs => {
    const meses = []
    for (let i = 0; i < 6; i++) {
      const desde = ahora.clone().subtract(i, 'months').startOf('month').toDate()
      const hasta = ahora.clone().subtract(i, 'months').endOf('month').toDate()
      const delMes = docs.filter(d => d.start instanceof Date && d.start >= desde && d.start <= hasta)
      meses.unshift(comoFirestoreFiltraElEstado(delMes).length)
    }

    return meses
  }

  // 600 solicitudes repartidas en dos años, con estados de todo tipo y algunas
  // rotas a propósito. Semilla fija: un test que cambia solo no prueba nada.
  let semilla = 20260813
  const alAzar = tope => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648

    return semilla % tope
  }

  const estados = [0, 1, 5, 6, 7, 8, 9, 12, '7', NaN, undefined, null]
  const revoltijo = Array.from({ length: 600 }, () => ({
    state: estados[alAzar(estados.length)],
    start: alAzar(40) === 0 ? undefined : ahora.clone().subtract(alAzar(730), 'days').toDate()
  }))

  const { desde, hasta } = ventanaActividadReciente(ahora)
  const nuevo = agruparActividadReciente(comoFirestoreFiltraLaVentana(revoltijo, desde, hasta), ahora)
  const soloLevantamientos = comoFirestoreFiltraElEstado(revoltijo).filter(d => d.start instanceof Date)

  assert.deepEqual(nuevo.porDia, semanaALaVieja(soloLevantamientos), 'la semana da lo mismo que el algoritmo viejo')
  assert.deepEqual(
    nuevo.porMes.map(mes => mes.cant),
    mesesALaVieja(revoltijo),
    'los seis meses dan lo mismo que el algoritmo viejo'
  )

  // Y que el revoltijo no sea todo ceros, o el deepEqual no probaría nada.
  assert.ok(nuevo.porDia.reduce((a, b) => a + b) > 0, 'la semana de prueba tiene datos')
  assert.ok(
    nuevo.porMes.reduce((total, mes) => total + mes.cant, 0) > 20,
    'los seis meses de prueba tienen datos'
  )
}

console.log(`ok — actividadReciente: ${comprobaciones} comprobaciones`)
