export const getEmailTemplate = (
  userName,
  mainMessage,
  title,
  engineering,
  otProcure,
  supervisor,
  start,
  end,
  plant,
  area,
  costCenter,
  functionalLocation,
  contractOperator,
  petitioner,
  sapNumber,
  operationalType,
  machineDetention,
  jobType,
  deliverable,
  receiver,
  description,
  lastMessage,
  attachedDocuments
) => {

  return `<h2>Estimad@ ${userName}:</h2>
      <p>${mainMessage}. A continuación puede encontrar el detalle de la solicitud:</p>
      <table style="width:100%;">
        <tr>
        <td style="text-align:left; padding-left:15px; width:20%;"><strong>Título:</strong></td>
          <td>${title}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Ingeniería integrada:</strong></td>
          <td>${engineering}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>N° OT Procure:</strong></td>
          <td>${otProcure}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Supervisor Procure a cargo:</strong></td>
          <td>${supervisor}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Fecha de inicio de levantamiento:</strong></td>
          <td>${start}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Fecha de término de levantamiento:</strong></td>
          <td>${end}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Planta:</strong></td>
          <td>${plant}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Área:</strong></td>
          <td>${area}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Centro de Costos:</strong></td>
          <td>${costCenter}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Functional Location:</strong></td>
          <td>${functionalLocation}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Contract Operator:</strong></td>
          <td>${contractOperator}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Solicitante:</strong></td>
          <td>${petitioner}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>N° SAP:</strong></td>
          <td>${sapNumber}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Estado operacional:</strong></td>
          <td>${operationalType}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Máquina detenida:</strong></td>
          <td>${machineDetention}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Tipo de levantamiento:</strong></td>
          <td>${jobType}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Entregables esperados:</strong></td>
          <td>${deliverable}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Destinatarios:</strong></td>
          <td>${receiver}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Descripción del requerimiento:</strong></td>
          <td>${description}</td>
        </tr>
        <tr>
          <td style="text-align:left; padding-left:15px;"><strong>Documentos adjuntos:</strong></td>
          <td>${attachedDocuments}</td>
        </tr>
      </table
      <p>${lastMessage}</p>
      <p>Para mayor información revise la solicitud en nuestra página web</p>
      <p>Saludos,<br><a href="https://www.prosite.cl/">Prosite</a></p>
      `
}
