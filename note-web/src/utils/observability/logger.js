import { getLoggingConfig } from './config'
import { error as captureError, log as captureLog } from './telemetry'

function shouldLog(level) {
  const loggingConfig = getLoggingConfig()
  if (!loggingConfig.enabled) {
    return false
  }

  const configuredLevel = String(loggingConfig.level || 'warn').toLowerCase()
  const levelOrder = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  return (levelOrder[level] ?? 3) >= (levelOrder[configuredLevel] ?? 2)
}

function emitConsole(level, args) {
  const logger = console[level] || console.log
  logger.apply(console, args)
}

function normalizeMeta(args) {
  if (args.length === 0) {
    return {}
  }

  if (args.length === 1) {
    return { meta: args[0] }
  }

  return {
    meta: args[0],
    extra: args[1],
  }
}

export const logger = {
  debug(message, meta) {
    if (!shouldLog('debug')) {
      return
    }

    emitConsole('debug', meta === undefined ? [message] : [message, meta])
  },

  info(message, meta) {
    if (!shouldLog('info')) {
      return
    }

    emitConsole('info', meta === undefined ? [message] : [message, meta])
  },

  warn(message, meta) {
    if (!shouldLog('warn')) {
      return
    }

    emitConsole('warn', meta === undefined ? [message] : [message, meta])
    captureLog('warn', message, normalizeMeta([meta]))
  },

  error(message, errorOrMeta, meta) {
    const hasErrorObject = errorOrMeta instanceof Error
    const errorObject = hasErrorObject ? errorOrMeta : (message instanceof Error ? message : new Error(String(message || 'Unknown error')))
    const errorMeta = hasErrorObject ? meta : errorOrMeta

    emitConsole('error', hasErrorObject
      ? [message, errorObject, meta]
      : [message, errorMeta])

    captureError(errorObject, {
      message: typeof message === 'string' ? message : errorObject.message,
      ...(errorMeta && typeof errorMeta === 'object' ? errorMeta : {}),
    })
  },
}

export default logger
