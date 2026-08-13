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

console.log(`ok — actividadReciente: ${comprobaciones} comprobaciones`)
