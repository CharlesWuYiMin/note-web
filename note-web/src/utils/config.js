import config from '../../config.json'

const env = (
  (typeof process !== 'undefined' && process.env && process.env.VITE_APP_ENV)
  || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_ENV)
  || 'development'
)
const baseConfig = config.development || {}
const envConfig = config[env] || {}

function isPlainObject(value) {
  return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]'
}

function mergeConfig(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return isPlainObject(override) ? { ...override } : { ...base }
  }

  const merged = { ...base }

  Object.keys(override).forEach((key) => {
    const baseValue = base[key]
    const overrideValue = override[key]
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      merged[key] = mergeConfig(baseValue, overrideValue)
      return
    }

    merged[key] = overrideValue
  })

  return merged
}

export const getAppConfig = () => mergeConfig(baseConfig, envConfig)

export default getAppConfig
