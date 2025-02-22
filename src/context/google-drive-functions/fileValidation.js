export const validateFiles = acceptedFiles => {
  const imageExtensions = ['jpeg', 'jpg', 'png', 'webp', 'bmp', 'tiff', 'svg', 'heif', 'HEIF']
  const documentExtensions = ['xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'pdf', 'csv', 'txt']
  const maxSizeBytes = 5 * 1024 * 1024

  const isValidFile = file => {
    const extension = file.name.split('.').pop().toLowerCase()

    return (imageExtensions.includes(extension) || documentExtensions.includes(extension)) && file.size <= maxSizeBytes
  }

  return acceptedFiles.map(file => ({
    name: file.name,
    isValid: isValidFile(file),
    msj: isValidFile(file) ? file.name : `${file.name} - El archivo excede el tamaño máximo de 5 MB`
  }))
}

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
