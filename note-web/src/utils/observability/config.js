import { getAppConfig } from '../config'

function getEnvValue(name) {
  if (typeof process !== 'undefined' && process.env && process.env[name] != null) {
    return process.env[name]
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name] != null) {
    return import.meta.env[name]
  }

  return ''
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

function parseNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function getObservabilityConfig() {
  return getAppConfig()?.observability || {}
}

export function getLoggingConfig() {
  return getObservabilityConfig()?.logging || {}
}

export function getApmConfig() {
  const apm = getObservabilityConfig()?.apm || {}
  const enabledFromEnv = parseBoolean(getEnvValue('VITE_APM_ENABLED'))
  const sampleRateFromEnv = parseNumber(getEnvValue('VITE_APM_SAMPLE_RATE'))

  return {
    ...apm,
    enabled: enabledFromEnv ?? apm.enabled,
    appId: apm.appId || getEnvValue('VITE_APM_APP_ID') || '',
    domain: apm.domain || getEnvValue('VITE_APM_DOMAIN') || '',
    serviceName: apm.serviceName || getEnvValue('VITE_APM_SERVICE_NAME') || '',
    scriptUrl: apm.scriptUrl || getEnvValue('VITE_APM_SCRIPT_URL') || '',
    sampleRate: Number.isFinite(sampleRateFromEnv) ? sampleRateFromEnv : (apm.sampleRate ?? 1),
  }
}
