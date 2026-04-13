const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)

  return `${size.toFixed(2)} ${units[i]}`
}

const getFileExtension = (filename) => {
  if (!filename) return ''
  
  const lastDotIndex = filename.lastIndexOf('.')
  
  if (lastDotIndex === -1 || lastDotIndex === 0) return ''
  
  return filename.slice(lastDotIndex).toLowerCase()
}

const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const ext = getFileExtension(filename)
  
  return imageExtensions.includes(ext)
}

const isValidFileType = (filename, allowedTypes = []) => {
  if (!allowedTypes || allowedTypes.length === 0) return true
  
  const ext = getFileExtension(filename)
  
  return allowedTypes.includes(ext)
}

export {
  formatFileSize,
  getFileExtension,
  isImageFile,
  isValidFileType,
}
