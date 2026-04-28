import { getApmConfig } from './config'

const ADAPTER_KEYS = [
  '__NOTE_WEB_APM__',
  '__HUAWEI_APM__',
  '__HuaweiAPM__',
  '__rum',
  'HuaweiAPM',
  'apm',
  '__apm__',
]

const state = {
  initialized: false,
  config: null,
  adapter: null,
  user: null,
  route: '',
  context: {},
  queue: [],
  scriptPromise: null,
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizeConfig(overrides = {}) {
  const baseConfig = getApmConfig()
  return {
    ...baseConfig,
    ...overrides,
  }
}

function findAdapter() {
  if (!isBrowser()) {
    return null
  }

  for (const key of ADAPTER_KEYS) {
    const candidate = window[key]
    if (candidate) {
      return candidate
    }
  }

  return null
}

function isRumAdapter(adapter) {
  if (!adapter || !isBrowser()) {
    return false
  }

  return Boolean(
    adapter === window.__rum
    || typeof adapter.setUid === 'function'
    || typeof adapter.setTag === 'function'
  )
}

function normalizeSampleRate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return 1
  }

  return Math.max(0, Math.min(1, numeric))
}

function buildIdentity(user = state.user) {
  const source = user && typeof user === 'object' ? user : {}

  return {
    uid: source.userId || source.id || source.user_id || '',
    tag: source.nickName || source.name || source.realName || '',
  }
}

function buildRumInitPayload() {
  const config = state.config || {}
  const identity = buildIdentity(state.user)

  return {
    appId: config.appId || '',
    serviceName: config.serviceName || '',
    domain: config.domain || '',
    apiRepo: config.apiRepo ?? config.captureApi ?? true,
    thirdApi: config.thirdApi ?? true,
    hashMode: config.hashMode ?? true,
    JsErrorClear: config.JsErrorClear ?? (config.captureJsError ?? true),
    smartJsErr: config.smartJsErr ?? true,
    webResource: config.webResource ?? (config.captureResource ?? true),
    traceType: config.traceType || 'apm',
    enableInp: config.enableInp ?? Boolean(config.capturePerformance),
    pushState: config.pushState ?? Boolean(config.captureRoute),
    sampleRate: normalizeSampleRate(config.sampleRate),
    uid: identity.uid,
    tag: identity.tag,
  }
}

function shouldCapture(kind) {
  const config = state.config || {}

  switch (kind) {
    case 'error':
      return config.captureJsError !== false
    case 'resource':
      return config.captureResource !== false
    case 'api':
      return config.captureApi !== false
    case 'pageView':
      return config.captureRoute !== false
    case 'timing':
      return config.capturePerformance !== false
    case 'event':
      return config.captureCustomEvent !== false
    case 'log':
    default:
      return true
  }
}

function callAdapterMethod(adapter, methodName, payload) {
  if (!adapter) {
    return false
  }

  const method = adapter[methodName]
  if (typeof method !== 'function') {
    return false
  }

  try {
    if (methodName === 'log' && isRumAdapter(adapter)) {
      method.call(adapter, payload?.eventName || payload?.type || 'custom_event', payload)
      return true
    }

    if (methodName === 'track' || methodName === 'customEvent' || methodName === 'logEvent') {
      method.call(adapter, payload?.eventName || payload?.type || methodName, payload)
      return true
    }

    if (methodName === 'log') {
      method.call(adapter, payload?.level || 'info', payload?.message || '', payload)
      return true
    }

    method.call(adapter, payload)
    return true
  } catch {
    return false
  }
}

function applyRumIdentity(adapter = state.adapter, user = state.user) {
  if (!isRumAdapter(adapter)) {
    return false
  }

  const identity = buildIdentity(user)
  let applied = false

  if (typeof adapter.setUid === 'function') {
    try {
      adapter.setUid(identity.uid || '')
      applied = true
    } catch {
      // keep trying tag updates
    }
  }

  if (typeof adapter.setTag === 'function') {
    try {
      adapter.setTag(identity.tag || '')
      applied = true
    } catch {
      // ignore
    }
  }

  return applied
}

function dispatchToRumAdapter(kind, payload) {
  const adapter = state.adapter || findAdapter()
  if (!isRumAdapter(adapter) || !shouldCapture(kind)) {
    return false
  }

  const eventName = payload?.eventName || payload?.type || kind
  const eventPayload = {
    ...payload,
    appId: state.config?.appId || '',
    serviceName: state.config?.serviceName || '',
    route: payload.route || state.route || '',
    user: state.user || undefined,
    context: {
      ...state.context,
      ...(payload.context && typeof payload.context === 'object' ? payload.context : {}),
    },
    timestamp: Date.now(),
    type: payload.type || kind,
  }

  try {
    switch (kind) {
      case 'error':
        adapter.log('js_error', eventPayload)
        return true
      case 'api':
        adapter.log('api_request', eventPayload)
        return true
      case 'resource':
        adapter.log('resource_error', eventPayload)
        return true
      case 'pageView':
        adapter.log('page_view', eventPayload)
        return true
      case 'timing':
        adapter.log(eventName, eventPayload)
        return true
      case 'event':
        adapter.log(eventName, eventPayload)
        return true
      case 'log':
        adapter.log(eventPayload.level || 'log', eventPayload)
        return true
      default:
        adapter.log(eventName, eventPayload)
        return true
    }
  } catch {
    return false
  }
}

function initializeAdapter(adapter = state.adapter) {
  if (!adapter || !state.config?.appId) {
    return false
  }

  const payload = buildRumInitPayload()
  const initialized = callAdapterMethod(adapter, 'init', payload)

  if (initialized && isRumAdapter(adapter)) {
    applyRumIdentity(adapter, state.user)
  }

  return initialized
}

function flushQueue() {
  if (!state.adapter || state.queue.length === 0) {
    return
  }

  const pending = state.queue.splice(0, state.queue.length)
  pending.forEach((item) => {
    if (item?.kind) {
      dispatch(item.kind, item.payload, true)
      return
    }

    if (item?.methodName) {
      if (item.methodName === 'setUser' && isRumAdapter(state.adapter)) {
        applyRumIdentity(state.adapter, item.payload?.user || state.user)
        return
      }

      callAdapterMethod(state.adapter, item.methodName, item.payload)
    }
  })
}

function loadScriptIfNeeded() {
  if (!isBrowser() || !state.config?.scriptUrl) {
    return
  }

  if (state.scriptPromise) {
    return
  }

  const existingScript = document.querySelector('script[data-note-web-apm="true"]')
  if (existingScript) {
    state.scriptPromise = Promise.resolve()
    return
  }

  state.scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = state.config.scriptUrl
    script.dataset.noteWebApm = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load APM SDK script'))
    document.head.appendChild(script)
  }).catch(() => undefined).finally(() => {
    state.adapter = findAdapter()
    initializeAdapter(state.adapter)
    flushQueue()
  })
}

export function initializeApm(overrides = {}) {
  state.config = normalizeConfig(overrides)
  state.initialized = true

  if (!state.config?.enabled || !state.config?.appId) {
    return state
  }

  state.adapter = state.adapter || findAdapter()
  loadScriptIfNeeded()

  if (state.adapter) {
    initializeAdapter(state.adapter)
    flushQueue()
  }

  return state
}

export function isApmEnabled() {
  return Boolean(state.config?.enabled && state.config?.appId)
}

export function setUser(user) {
  state.user = user && typeof user === 'object' ? { ...user } : null
  if (!state.initialized) {
    initializeApm()
  }

  if (!isApmEnabled()) {
    return false
  }

  const payload = {
    user: state.user,
    userId: state.user?.userId || state.user?.id || '',
  }

  if (!state.adapter) {
    state.queue.push({ methodName: 'setUser', payload })
    return false
  }

  if (isRumAdapter(state.adapter)) {
    return applyRumIdentity(state.adapter, state.user)
  }

  return (
    callAdapterMethod(state.adapter, 'setUser', payload)
    || callAdapterMethod(state.adapter, 'identify', payload)
    || callAdapterMethod(state.adapter, 'setUserInfo', payload)
  )
}

export function setRoute(route) {
  state.route = String(route || '')
  if (!state.initialized) {
    initializeApm()
  }

  if (!isApmEnabled()) {
    return false
  }

  const payload = {
    route: state.route,
  }

  if (!state.adapter) {
    state.queue.push({ methodName: 'setRoute', payload })
    return false
  }

  if (isRumAdapter(state.adapter)) {
    return callAdapterMethod(state.adapter, 'setContext', payload)
  }

  return (
    callAdapterMethod(state.adapter, 'setRoute', payload)
    || callAdapterMethod(state.adapter, 'setPage', payload)
    || callAdapterMethod(state.adapter, 'setContext', payload)
  )
}

export function setContext(context = {}) {
  state.context = {
    ...state.context,
    ...(context && typeof context === 'object' ? context : {}),
  }

  if (!state.initialized) {
    initializeApm()
  }

  if (!isApmEnabled()) {
    return false
  }

  if (!state.adapter) {
    state.queue.push({ methodName: 'setContext', payload: { ...state.context } })
    return false
  }

  return callAdapterMethod(state.adapter, 'setContext', { ...state.context })
}

export function dispatch(kind, payload = {}, fromQueue = false) {
  if (!state.initialized) {
    initializeApm()
  }

  if (!isApmEnabled() || !shouldCapture(kind)) {
    return false
  }

  const eventPayload = {
    ...payload,
    appId: state.config?.appId || '',
    serviceName: state.config?.serviceName || '',
    route: payload.route || state.route || '',
    user: state.user || undefined,
    context: {
      ...state.context,
      ...(payload.context && typeof payload.context === 'object' ? payload.context : {}),
    },
    timestamp: Date.now(),
    type: payload.type || kind,
  }

  const adapter = state.adapter || findAdapter()
  if (adapter) {
    state.adapter = adapter

    if (dispatchToRumAdapter(kind, eventPayload)) {
      return true
    }

    const methodCandidates = {
      error: ['captureError', 'captureException', 'reportError', 'error', 'trackError'],
      event: ['trackEvent', 'track', 'customEvent', 'reportEvent', 'logEvent'],
      timing: ['trackTiming', 'timing', 'reportTiming', 'captureTiming'],
      api: ['captureApi', 'api', 'reportApi', 'trackApi', 'recordApi'],
      pageView: ['pageView', 'trackPageView', 'setPageView', 'route'],
      resource: ['captureResource', 'resource', 'reportResource', 'trackResource'],
      log: ['log', 'info', 'warn', 'error', 'debug'],
      init: ['init', 'setup', 'configure'],
    }

    const candidates = methodCandidates[kind] || methodCandidates.event
    for (const methodName of candidates) {
      if (callAdapterMethod(adapter, methodName, eventPayload)) {
        return true
      }
    }
  }

  if (!fromQueue) {
    state.queue.push({ kind, payload: eventPayload })
  }
  if (state.queue.length > 200) {
    state.queue.splice(0, state.queue.length - 200)
  }

  return false
}

export function getApmSnapshot() {
  return {
    initialized: state.initialized,
    enabled: isApmEnabled(),
    config: state.config,
    user: state.user,
    route: state.route,
    context: { ...state.context },
  }
}
