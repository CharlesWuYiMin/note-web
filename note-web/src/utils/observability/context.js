import { getAppConfig } from '../config'

const SESSION_STORAGE_KEY = 'cloudnote:session-id'

function isBrowser() {
  return typeof window !== 'undefined'
}

function safeGetSessionStorage() {
  if (!isBrowser()) {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function safeGetLocalStorage() {
  if (!isBrowser()) {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readCookie(name) {
  if (!isBrowser()) {
    return ''
  }

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift() || ''
  }

  return ''
}

function getSessionId() {
  const storage = safeGetSessionStorage()
  if (!storage) {
    return 'session-unknown'
  }

  try {
    const existing = storage.getItem(SESSION_STORAGE_KEY)
    if (existing) {
      return existing
    }

    const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    storage.setItem(SESSION_STORAGE_KEY, generated)
    return generated
  } catch {
    return 'session-unknown'
  }
}

function readStoredUser() {
  const storage = safeGetLocalStorage()
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem('cloud_doc_user')
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function normalizeUserContext(user) {
  const source = user && typeof user === 'object' ? user : {}
  return {
    id: source.id || source.userId || source.user_id || '',
    userId: source.userId || source.user_id || source.id || '',
    name: source.name || source.realName || source.nickName || source.nickname || '',
    nickName: source.nickName || source.nickname || source.name || source.realName || '',
    avatar: source.avatar || source.avatarUrl || source.avatar_url || source.picture || source.profileUrl || source.profile_url || '',
    profileUrl: source.profileUrl || source.profile_url || '',
  }
}

export function getCurrentRoute() {
  if (!isBrowser()) {
    return ''
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function buildObservabilityContext(extra = {}) {
  const config = getAppConfig()
  const app = config?.app || {}
  const storedUser = normalizeUserContext(readStoredUser())

  return {
    appName: app.name || 'note-web',
    appVersion: app.version || '0.0.0',
    env: app.env || 'development',
    route: getCurrentRoute(),
    sessionId: getSessionId(),
    userId: readCookie('cloud_doc_userid') || storedUser.userId || storedUser.id || '',
    appId: readCookie('cloud_doc_appid') || '',
    user: storedUser,
    url: isBrowser() ? window.location.href : '',
    referrer: isBrowser() ? document.referrer || '' : '',
    timestamp: Date.now(),
    ...extra,
  }
}
