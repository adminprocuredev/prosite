// nextRevisorName es el Nombre del siguiente Revisor.
// petitionData es la información de la Solicitud de Levantamiento / OT.
// blueprint es la información del Entregable.
// updateData es un objeto que contiene datos del siguiente revisor ("attentive" Rol del siguiente revisor , bla, bla)
export const getEmailTemplate = (
  nextRevisorName,
  petitionData,
  blueprint,
  updateData
) => {

  const revisorsNames = nextRevisorName.join(', ')

  return `<h2>Estimad@ ${revisorsNames}:</h2>
      <p>Es tu turno de revisar un Entregable de la OT ${petitionData.ot}:</p>
      <ul>
        <li>Código Procure: ${blueprint.id}</li>
        <li>Código MEL: ${blueprint.clientCode}</li>
      </ul>
      <p>Para mayor información revise la información disponible en Gabinete en nuestra página web</p>
      <p>Saludos,<br><a href="https://www.prosite.cl/gabinete">Gabinete Prosite</a></p>`;
};
