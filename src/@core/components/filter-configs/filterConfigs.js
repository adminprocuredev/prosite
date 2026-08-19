// Import the moment library for date manipulation
const moment = require('moment')

import { estaPorAprobar } from 'src/views/pages/solicitudes/estadosPorAprobar'

// This file contains the filter config for the requests page
// It recieves the authUser object as a parameter for differentiating the filters by role
// The filter config is an object with the following structure:

const generateFilterConfig = authUser => {
  // This function returns true if the week of the date is even
  const otherWeek = date => {
    let dateFormatted = new Date(date * 1000)
    let week = moment(dateFormatted).isoWeek()

    return week % 2 == 0
  }

  // This is the object that contains the filter config and is recieved by the filter component
  // TODO: Review if the status filters are correct
  return {
    all: {
      label: 'Todas las solicitudes',
      canSee: [],
      type: 'General', // Ejemplo de números permitidos para ver este filtro
      filterFunction: doc => true // Mostrar todos los documentos
    },
    pendingApproval: {
      label: 'Por aprobar',
      canSee: [2, 3, 5], // Ejemplo de números permitidos para ver este filtro
      type: 'Estado',
      // Estaba escrito `doc.state === 3 || 4`, que por precedencia es
      // `(doc.state === 3) || 4`: como 4 es verdadero, el filtro «Por aprobar»
      // devolvía TODAS las solicitudes para el Planificador. Y la otra rama era
      // la misma resta `role - 1` que rompía la pestaña.
      //
      // Ahora los dos —el filtro y la pestaña— salen de `estadosPorAprobar`.
      filterFunction: doc => estaPorAprobar(doc, authUser.role)
    },
    approved: {
      label: 'Aprobadas',
      canSee: [1, 2, 3, 11], // Ejemplo de números permitidos para ver este filtro
      type: 'Estado',
      filterFunction: doc => doc.state >= 6 && doc.state < 10
    },
    rejected: {
      label: 'Rechazadas',
      canSee: [3, 4, 5], // Ejemplo de números permitidos para ver este filtro
      type: 'Estado',
      filterFunction: doc => doc.state === 0
    },
    inReviewByMEL: {
      label: 'En revisión por MEL',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'Estado',
      filterFunction: doc => doc.state === 2
    },
    inReviewByProcure: {
      label: 'En revisión por Procure',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'Estado',
      filterFunction: doc => doc.state === 5
    },
    approvedByMEL: {
      label: 'Aprobadas por MEL',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'Estado',
      filterFunction: doc => doc.state === 5
    },
    approvedByProcure: {
      label: 'Aprobadas por Procure',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'Estado',
      filterFunction: doc => doc.state >= 6 && doc.state < 10
    },
    scheduled: {
      label: 'Agendadas',
      canSee: [1, 5, 6, 7, 8, 9, 10, 11, 12],
      type: 'Estado',
      filterFunction: doc => doc.state === 6
    },
    countryWorkInProcess: {
      label: 'En Levantamiento',
      canSee: [1, 5, 6, 7, 8, 9, 10, 11, 12],
      type: 'Estado',
      filterFunction: doc => doc.state === 7
    },
    drawInProcess: {
      label: 'Levantamiento Finalizado',
      canSee: [1, 5, 6, 7, 8, 9, 10, 11, 12],
      type: 'Estado',
      filterFunction: doc => doc.state === 8
    },
    myRequests: {
      label: 'Mis solicitudes',
      canSee: [1, 2, 3],
      type: 'Autor',
      filterFunction: doc => doc.uid === authUser.uid
    },
    withOT: {
      label: 'Tiene OT',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'OT',
      filterFunction: doc => doc.hasOwnProperty('ot')
    },
    withoutOT: {
      label: 'Sin OT',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'OT',
      filterFunction: doc => !doc.hasOwnProperty('ot')
    },
    shiftA: {
      label: [5, 6, 7, 8, 9, 10].includes(authUser.role) ? 'Turno A' : 'Turno P',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'Turno',
      filterFunction: doc => otherWeek(doc.start.seconds)
    },
    shiftB: {
      label: [5, 6, 7, 8, 9, 10].includes(authUser.role) ? 'Turno B' : 'Turno Q',
      canSee: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      type: 'Turno',
      filterFunction: doc => !otherWeek(doc.start.seconds)
    },
    myWeek: {
      label: 'Aprobadas por Procure en mi semana',
      type: 'Estado',
      canSee: [1, 7],
      filterFunction: Boolean(authUser.shift === 'A')
        ? doc => otherWeek(doc.start.seconds)
        : doc => !otherWeek(doc.start.seconds)
    }
  }
}

export default generateFilterConfig
