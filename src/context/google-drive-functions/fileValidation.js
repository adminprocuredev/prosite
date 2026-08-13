export const MAX_SIZE_MB = 50

// ponytail: lista blanca única para toda la aplicación. Antes había tres copias con reglas
// distintas (5 MB, 10 MB y 50 MB), y las dos locales rechazaban nubes de punto.
const ALLOWED_EXTENSIONS = [
  // imágenes
  'jpeg', 'jpg', 'png', 'webp', 'bmp', 'tiff', 'svg', 'heif',
  // documentos
  'xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'pdf', 'csv', 'txt',
  // nubes de punto y nativos CAD
  'rcs', 'rcp', 'e57', 'dwg'
]

// El tamaño máximo queda como parámetro porque cada pantalla lo tenía distinto (5, 10 y 50 MB)
// y no hay evidencia de que fuera un descuido: puede depender del flujo de subida.
// Lo que sí era un defecto es que las extensiones permitidas variaran entre pantallas.
export const validateFiles = (acceptedFiles, maxSizeMB = MAX_SIZE_MB) =>
  acceptedFiles.map(file => {
    const partes = file.name.split('.')
    const extension = partes.length > 1 ? partes.pop().toLowerCase() : ''
    const extensionOk = ALLOWED_EXTENSIONS.includes(extension)
    const sizeOk = file.size <= maxSizeMB * 1024 * 1024

    // Se enumeran TODOS los motivos. Antes el mensaje decía "tamaño y/o extensión" y el
    // usuario no podía saber cuál de los dos lo bloqueó; informar solo uno lo obliga a
    // corregir, reintentar y descubrir el otro.
    const motivos = []
    if (!extensionOk) {
      motivos.push(extension ? `la extensión .${extension} no está permitida` : 'el archivo no tiene extensión')
    }
    if (!sizeOk) motivos.push(`excede el tamaño máximo de ${maxSizeMB} MB`)

    return {
      name: file.name,
      isValid: extensionOk && sizeOk,
      msj: motivos.length ? `${file.name} - ${motivos.join(' y ')}.` : file.name
    }
  })

export const getFileIcon = fileType => {
  const iconMap = {
    'application/pdf': 'mdi:file-pdf',
    'application/msword': 'mdi:file-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'mdi:file-word',
    'application/vnd.ms-excel': 'mdi:file-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'mdi:file-excel'
  }

  return iconMap[fileType] || 'mdi:file-document-outline'
}
