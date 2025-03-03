import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import base64Image from 'src/views/pages/gabinete/base64Image'
import base64MEL from 'src/views/pages/gabinete/base64MEL'

const callAddRegular = require('public/fonts/calibri-normal.js')
const callAddBold = require('public/fonts/calibri-bold.js')

export const generateTransmittal = async (
  tableElement,
  selected,
  setTransmittalGenerated,
  newCode,
  petition,
  uploadFile,
  findOrCreateFolder,
  createFolderStructure,
  setIsLoading,
  setOpenTransmittalDialog
) => {
  const doc = new jsPDF('p', 'mm', 'letter', true, true)

  callAddRegular.call(doc)
  callAddBold.call(doc)

  doc.setFont('Calibri', 'normal')
  doc.setFontSize(11)

  doc.addImage(base64Image, 'PNG', 15, 10, 50, 20, undefined, 'FAST')
  doc.addImage(base64MEL, 'PNG', 140, 23, 50, 4.14, undefined, 'FAST')
  // Define las columnas de la tabla
  const columns = ['ÍTEM', 'CÓDIGO CLIENTE', 'DESCRIPCIÓN', 'REV']
  // Define las filas de la tabla
  let rows = []
  let newSelected = []

  Array.from(selected).forEach((value, index) => {
    newSelected.push(value)

    if (value[1].storageHlcDocuments) {
      newSelected.push([
        `${value[1].id}_REV_${value[1].revision}_HLC`,
        {
          id: `${value[1].clientCode}_REV_${value[1].revision}_HLC`,
          description: `Hoja de Levantamiento de Comentarios ${value[1].description}`,
          revision: '-'
        }
      ])
    }
  })

  const data = newSelected.map(([key, value], index) => {
    if (value.storageBlueprints) {
      console.log('value.storageBlueprints', value.storageBlueprints)
      // Divide la URL en segmentos separados por '%2F'
      //*const urlSegments = value.storageBlueprints[0].split('%2F')

      // Obtiene el último segmento, que debería ser el nombre del archivo
      //*const encodedFileName = urlSegments[urlSegments.length - 1]

      // Divide el nombre del archivo en segmentos separados por '?'
      //*const fileNameSegments = encodedFileName.split('?')

      // Obtiene el primer segmento, que debería ser el nombre del archivo
      //*const fileName = decodeURIComponent(fileNameSegments[0])
      const fileName = value.storageBlueprints[0].name

      rows = [index + 1, value.clientCode, value.description, value.revision]
    } else {
      // Devuelve valores predeterminados o vacíos para los objetos que no tienen `storageBlueprints`
      rows = [index + 1, value.id, value.description, value.revision]
    }

    return rows
  })

  doc.autoTable({
    startY: 50,
    html: tableElement,
    theme: 'plain',
    styles: {
      font: 'Calibri',
      cellPadding: 1,
      lineColor: 'black',
      lineWidth: 0.1
    },
    columnStyles: {
      0: { fillColor: [191, 191, 191] },
      2: { fillColor: [191, 191, 191] }
    }
  })

  doc.text(
    'Sírvase recibir adjunto (1) copia(s) de los entregables que lista a continuación',
    15,
    doc.lastAutoTable.finalY + 10
  )

  // Agrega la tabla al documento
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 20,
    head: [columns],
    body: data,
    theme: 'plain',
    styles: {
      font: 'Calibri',
      halign: 'center',
      lineColor: 'black',
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [191, 191, 191]
    }
  })

  const pageHeight = doc.internal.pageSize.getHeight()
  const signatureY = doc.lastAutoTable.finalY
  const estimatedContentHeight = 75 // Estimar la altura del contenido que sigue

  // Evaluar si el contenido que sigue se ajusta en la página actual
  const pageBreak = signatureY + estimatedContentHeight > pageHeight

  if (pageBreak) {
    doc.addPage('p', 'mm', 'letter', true, true)
  }

  doc.setFont('Calibri', 'bold')
  doc.text(
    '1. Como acuso de su recepción, devuelva una copia de esta firmada a Procure - Administrador de Contrato',
    15,
    pageBreak ? 20 : doc.lastAutoTable.finalY + 10
  )

  doc.autoTable({
    startY: pageBreak ? 40 : signatureY + 30,
    body: [['Control Documentos Servicios Procure SpA']],
    useCss: true,
    styles: {
      font: 'Calibri',
      fontStyle: 'bold',
      valign: 'bottom',
      halign: 'center',
      lineColor: 'black',
      lineWidth: 0.1,
      minCellHeight: 30
    },
    margin: { left: 35, right: 120 }
  })

  doc.autoTable({
    startY: pageBreak ? 40 : signatureY + 30,
    body: [['Receptor']],
    useCss: true,
    styles: {
      font: 'Calibri',
      fontStyle: 'bold',
      valign: 'bottom',
      halign: 'center',
      lineColor: 'black',
      lineWidth: 0.1,
      minCellHeight: 30
    },
    margin: { left: 120, right: 35 }
  })

  // Descarga el documento
  doc.save(`${newCode}.pdf`)

  const pdfBlob = doc.output('blob') // Genera el blob del documento PDF

  // Crear Estructura de Carpetas en caso de que no exista previamente.
  const projectFolder = await createFolderStructure(petition, ["EMITIDOS"])

  // Ubica la carpeta "EMITIDOS"
  const targetFolder = await findOrCreateFolder(projectFolder.id, "EMITIDOS", "EMITIDOS")

  let fileLink

  if (targetFolder) {
    const fileData = await uploadFile(`${newCode}.pdf`, pdfBlob, targetFolder.id)

    if (fileData && fileData.id) {

      fileLink = `https://drive.google.com/file/d/${fileData.id}/view`

      console.log('Transmittal almacenado en Google Drive con éxito:', fileLink)

    }
  }

  setTransmittalGenerated(true)
  setOpenTransmittalDialog(false)
  setIsLoading(false)

  if (fileLink) {
    return fileLink
  }

}
