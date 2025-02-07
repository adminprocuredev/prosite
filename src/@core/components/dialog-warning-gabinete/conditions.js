// Función que determina el estado de aprobación basado en diversas condiciones
export const getApprovalStatus = (props) => {

  const {storageInEmitidos, storageBlueprints, toggleRemarks, toggleAttach, approves, remarksState} = props

  // Definición de las condiciones para determinar el estado de aprobación
  const approvalConditions = {

    // Caso 1: "Emitidos con múltiples planos"
    emitidosWithMultipleBlueprints: {
        condition: storageInEmitidos && storageBlueprints?.length > 1, // Se cumple si `storageInEmitidos` es true y hay más de un plano
        value: true // Valor devuelto si se cumple la condición
    },
    // Caso 2: "Observaciones sin adjuntar archivos"
    remarksWithoutAttach: {
        condition: toggleRemarks && !toggleAttach, // Se cumple si hay observaciones activas y no hay archivos adjuntos
        value: approves && remarksState.length > 0 && storageBlueprints?.length < 2 // Evalúa si se aprueba en función de las observaciones y el número de planos
    },
    // Caso 3: "Sin observaciones, pero con múltiples planos"
    noRemarksWithMultipleBlueprints: {
        condition: !toggleRemarks && storageBlueprints?.length > 1, // Se cumple si no hay observaciones y hay más de un plano
        value: false // Valor devuelto si se cumple la condición
    },
    // Caso 4: "Solo observaciones con múltiples planos"
    remarksOnlyWithMultipleBlueprints: {
        condition: toggleRemarks && !toggleAttach && storageBlueprints?.length > 1, // Se cumple si hay observaciones, no hay adjuntos y hay más de un plano
        value: false // Valor devuelto si se cumple la condición
    },
    // Caso 5: "Con archivo adjunto"
    withAttachment: {
        condition: toggleAttach, // Se cumple si hay un archivo adjunto
        value: storageBlueprints?.length > 1 && remarksState.length > 0 // Evalúa si se cumplen las condiciones de aprobación con base en los planos y las observaciones
    },
    // Caso predeterminado: "Default"
    default: {
        condition: true, // Siempre se cumple si ninguna de las condiciones anteriores es verdadera
        value: approves // Devuelve el estado de aprobación general
    }

  }

  // Busca el primer caso cuyo campo `condition` sea verdadero
  const { value } = Object.values(approvalConditions).find(({ condition }) => condition)

  // Devuelve el valor asociado al caso que cumple la condición
  return value
}

// Función para determinar la carpeta de carga con base en ciertas condiciones
export const getUploadFolder = (params) => {

  const {storageInEmitidos, storageInComentByCLient} = params

  // Definición de los tipos de carpetas y las condiciones asociadas
  const folderTypes = {
      // Opción 1: Carpeta "EMITIDOS"
      emitidos: {
          condition: storageInEmitidos,
          folder: 'EMITIDOS'
      },
      // Opción 2: Carpeta "COMENTARIOS CLIENTE"
      comentariosCliente: {
          condition: storageInComentByCLient,
          folder: 'COMENTARIOS CLIENTE'
      },
      // Opción 3: Carpeta "REVISIONES & COMENTARIOS"
      revisionesComentarios: {
          condition: true,
          folder: 'REVISIONES & COMENTARIOS'
      }
  }

  // Busca la primera carpeta cuyo campo `condition` sea verdadero
  const { folder } = Object.values(folderTypes).find(({ condition }) => condition)

  // Devuelve un array con el nombre de la carpeta seleccionada
  return [folder]
}

// Determina si un botón debe estar deshabilitado, basado en varias condiciones.
export const getButtonDisabledState = (props) => {

  const {canRejectedByClient, toggleAttach, toggleRemarks, storageBlueprints, remarksState, approves, canReject, canApprove} = props

  const conditions = {
    // Caso 1: Rechazo del cliente con adjuntos y observaciones
    clientRejectionWithAttachAndRemarks: {
        condition: canRejectedByClient && toggleAttach && toggleRemarks, // El cliente puede rechazar, tiene adjuntos y observaciones
        value: storageBlueprints?.length === 1 // Deshabilitado si solo hay un plano
    },
    // Caso 2: Rechazo del cliente solo con observaciones
    clientRejectionWithRemarksOnly: {
        condition: canRejectedByClient && toggleRemarks && !toggleAttach, // El cliente puede rechazar, solo tiene observaciones, sin adjuntos
        value: remarksState.length === 0 // Deshabilitado si no hay observaciones
    },
    // Caso 3: Solo rechazo del cliente
    clientRejectionOnly: {
        condition: canRejectedByClient, // El cliente puede rechazar
        value: false // Botón habilitado
    },
    // Caso predeterminado
    default: {
        condition: true, // Siempre se evalúa si ninguna condición anterior se cumple
        value: (!approves && !canReject) || !canApprove // Deshabilitado si no se puede aprobar o rechazar
    }
  }

  // Busca la primera condición que se cumpla
  const matchingCondition = Object.values(conditions).find(({ condition }) => condition)

  // Devuelve el valor asociado a esa condición
  return matchingCondition.value
}

// Determina el texto que debe mostrarse en un botón de un diálogo.
export const getDialogText = (props) => {

  const { blueprint, authUser, approves } = props

  const textTypes = {
    // Caso 0: Reanudar Entregable
    resumeBlueprint: {
      condition: blueprint.blueprintCompleted,
      text: 'Reanudar'
    },
    // Caso 1: Usuario propietario
    userOwner: {
        condition: blueprint.userId === authUser.uid, // El usuario conectado es el Autor del plano
        text: 'Enviar' // Texto del botón
    },
    // Caso 2: Aprobación
    approve: {
        condition: approves, // El plano está aprobado
        text: 'Aprobar'
    },
    // Caso 3: Rechazo por control documental
    rejectByDocControl: {
        condition: !approves && authUser.role === 9, // El plano no está aprobado y el usuario tiene rol 9
        text: 'Rechazar'
    },
    // Caso predeterminado: Devolver
    return: {
        condition: true, // Siempre aplica si ninguna condición anterior es válida
        text: 'Devolver'
    }
  }

  // Busca la primera condición que se cumpla
  const { text } = Object.values(textTypes).find(({ condition }) => condition)

  // Devuelve el texto asociado a esa condición
  return text
}

// Determina si se debe mostrar un checkbox para observaciones, basado en condiciones.
export const shouldShowRemarkCheckbox = (props) => {

  const { authUser, approves, approvedByDocumentaryControl, blueprint, storageInEmitidos, showOptionsInRejected } = props

  const isRole6 = authUser.role === 6
  const isRole7 = authUser.role === 7
  const isRole8 = authUser.role === 8
  const isRole9 = authUser.role === 9

  const conditions = {
    // Caso 1: Aprobado por control documental
    approvedByDocControl: {
        condition: approves && isRole9 && approvedByDocumentaryControl === true, // Plano aprobado, rol 9, y aprobado por control documental
        show: true // Mostrar el checkbox
    },
    // Caso 2: Revisión "A"
    revisionA: {
        condition: approves && isRole9 && blueprint.revision === 'A', // Plano aprobado, rol 9, y revisión "A"
        show: true
    },
    // Caso 3: Oculto
    hiden: {
        condition: storageInEmitidos || ((isRole6 || isRole7 || isRole8) && approves), // Plano emitido o aprobado por roles 6, 7, u 8
        show: false // No mostrar el checkbox
    },
    // Caso 4: Sin opciones de rechazado
    noRejectedOptions: {
        condition: !showOptionsInRejected, // No se muestran opciones de rechazado
        show: true
    },
    // Caso predeterminado
    default: {
        condition: true, // Siempre aplica si ninguna condición anterior se cumple
        show: false // No mostrar el checkbox
    }
  }

  // Busca la primera condición que se cumpla
  const { show } = Object.values(conditions).find(({ condition }) => condition)

  // Devuelve si se debe mostrar o no el checkbox
  return show
}

// Configura el campo de observaciones según el contexto actual.
export const getRemarkFieldConfig = (props) => {

  const { toggleRemarks, approves, error } = props

  const configs = {
    // Caso 1: Rechazo
    rejection: {
      condition: toggleRemarks && !approves, // Observaciones activas y el plano no está aprobado
      config: {
        label: 'Observación', // Etiqueta del campo
        error: Boolean(error), // Indica si hay un error
        helperText: error // Texto de ayuda con el mensaje de error
      }
    },
    // Caso 2: Comentario
    comment: {
      condition: toggleRemarks, // Observaciones activas
      config: {
        label: 'Comentario', // Etiqueta del campo
        error: Boolean(error), // Indica si hay un error
        helperText: error // Texto de ayuda con el mensaje de error
      }
    },
    // Caso predeterminado: Campo oculto
    hidden: {
      condition: true, // Siempre aplica si ninguna condición anterior se cumple
      config: null // No se configura el campo
    }
  }

  // Busca la primera condición que se cumpla
  const { config } = Object.values(configs).find(({ condition }) => condition)

  // Devuelve la configuración asociada a esa condición
  return config
}
