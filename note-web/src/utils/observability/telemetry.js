import { buildObservabilityContext, normalizeUserContext } from './context'
import {
  dispatch,
  setContext,
  setRoute as setApmRoute,
  setUser as setApmUser,
} from './apmClient'

function buildEventContext(extra = {}) {
  return {
    ...buildObservabilityContext(),
    ...extra,
  }
}

function serializeError(error) {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    }
  }

  return {
    name: 'Error',
    message: typeof error === 'string' ? error : 'Unknown error',
    stack: '',
  }
}

export function setUser(user) {
  const normalizedUser = normalizeUserContext(user)
  setApmUser(normalizedUser)
  setContext({ user: normalizedUser })
}

export function clearUser() {
  setApmUser(null)
  setContext({ user: null })
}

export function setRoute(route) {
  const normalizedRoute = String(route || '')
  setApmRoute(normalizedRoute)
  setContext({ route: normalizedRoute })
}

export function track(eventName, payload = {}) {
  dispatch('event', buildEventContext({
    eventName,
    type: 'custom_event',
    ...payload,
  }))
}

export function timing(eventName, duration, payload = {}) {
  dispatch('timing', buildEventContext({
    eventName,
    type: 'timing',
    duration: Number.isFinite(duration) ? duration : 0,
    ...payload,
  }))
}

export function pageView(route, payload = {}) {
  const normalizedRoute = String(route || '')
  setRoute(normalizedRoute)
  dispatch('pageView', buildEventContext({
    type: 'page_view',
    route: normalizedRoute,
    ...payload,
  }))
}

export function api(requestMeta = {}, responseMeta = {}) {
  dispatch('api', buildEventContext({
    type: 'api_request',
    ...requestMeta,
    ...responseMeta,
  }))
}

export function resource(resourceMeta = {}) {
  dispatch('resource', buildEventContext({
    type: 'resource_error',
    ...resourceMeta,
  }))
}

export function error(errorValue, payload = {}) {
  const serializedError = serializeError(errorValue)
  dispatch('error', buildEventContext({
    type: 'js_error',
    error: serializedError,
    ...payload,
  }))
}

export function log(level, message, payload = {}) {
  dispatch('log', buildEventContext({
    type: 'log',
    level,
    message,
    ...payload,
  }))
}

export function performance(name, duration, payload = {}) {
  dispatch('timing', buildEventContext({
    type: 'performance',
    eventName: name,
    duration: Number.isFinite(duration) ? duration : 0,
    ...payload,
  }))
}
