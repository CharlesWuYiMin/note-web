import { initializeApm } from './apmClient'
import { error as captureError, performance as capturePerformance, resource as captureResource, setRoute } from './telemetry'
import { logger } from './logger'

let bootstrapped = false
let cleanupFn = null

function isBrowser() {
  return typeof window !== 'undefined'
}

function captureNavigationPerformance() {
  if (!isBrowser() || typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return
  }

  const entry = performance.getEntriesByType('navigation')?.[0]
  if (!entry) {
    return
  }

  capturePerformance('navigation', entry.duration || 0, {
    domContentLoaded: entry.domContentLoadedEventEnd || 0,
    loadEventEnd: entry.loadEventEnd || 0,
    responseEnd: entry.responseEnd || 0,
    transferSize: entry.transferSize || 0,
    encodedBodySize: entry.encodedBodySize || 0,
    decodedBodySize: entry.decodedBodySize || 0,
  })
}

export function bootstrapObservability() {
  if (bootstrapped || !isBrowser()) {
    return cleanupFn
  }

  bootstrapped = true
  initializeApm()
  setRoute(`${window.location.pathname}${window.location.search}${window.location.hash}`)

  const handleWindowError = (event) => {
    const target = event?.target
    const isResourceTarget = target && target !== window && (target.src || target.href)

    if (isResourceTarget) {
      const resourceUrl = target.src || target.href || ''
      captureResource({
        resourceUrl,
        tagName: target.tagName || '',
        message: 'Resource load failed',
      })

      if (import.meta.env.DEV) {
        logger.warn('Resource load failed', {
          resourceUrl,
          tagName: target.tagName || '',
        })
      }

      return
    }

    const errorObject = event.error instanceof Error
      ? event.error
      : new Error(event.message || 'Window error')

    captureError(errorObject, {
      source: 'window.onerror',
      filename: event.filename || '',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
    })
  }

  const handleUnhandledRejection = (event) => {
    const reason = event.reason instanceof Error
      ? event.reason
      : new Error(typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection')

    captureError(reason, {
      source: 'unhandledrejection',
    })
  }

  window.addEventListener('error', handleWindowError, true)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  const schedulePerformanceCapture = () => {
    captureNavigationPerformance()
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(schedulePerformanceCapture, { timeout: 2000 })
    cleanupFn = () => {
      window.removeEventListener('error', handleWindowError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.cancelIdleCallback?.(idleId)
      bootstrapped = false
      cleanupFn = null
    }
  } else {
    const timeoutId = window.setTimeout(schedulePerformanceCapture, 16)
    cleanupFn = () => {
      window.removeEventListener('error', handleWindowError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.clearTimeout(timeoutId)
      bootstrapped = false
      cleanupFn = null
    }
  }

  return cleanupFn
}

export function resetObservabilityForTests() {
  bootstrapped = false
  cleanupFn = null
}
