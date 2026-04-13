const setItem = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value)
    localStorage.setItem(key, serializedValue)
    return true
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    return false
  }
}

const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    
    if (item === null) return defaultValue
    
    return JSON.parse(item)
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return defaultValue
  }
}

const removeItem = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('Error removing from localStorage:', error)
    return false
  }
}

const clearAll = () => {
  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.error('Error clearing localStorage:', error)
    return false
  }
}

const hasItem = (key) => {
  return localStorage.getItem(key) !== null
}

export {
  setItem,
  getItem,
  removeItem,
  clearAll,
  hasItem,
}
