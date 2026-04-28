import axios from 'axios'
import { getAppConfig } from './config'
import { handleUnauthorizedResponse } from './authNavigation'
import { logger, reportApi } from './observability'
import { getCurrentRoute } from './observability/context'

const { api } = getAppConfig()

const request = axios.create({
  baseURL: api.baseUrl,
  timeout: 30000,
  withCredentials: true,
})

function generateRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeMethod(method) {
  return String(method || 'get').toUpperCase()
}

function resolveRequestUrl(config) {
  const baseURL = String(config?.baseURL || '').replace(/\/+$/u, '')
  const url = String(config?.url || '').trim()
  if (!baseURL) {
    return url
  }

  if (!url) {
    return baseURL
  }

  if (/^https?:\/\//iu.test(url)) {
    return url
  }

  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}

request.interceptors.request.use(
  (config) => {
    const token = getCookie('cloud_doc_token')
    const userId = getCookie('cloud_doc_userid')
    const appId = getCookie('cloud_doc_appid')
    const requestId = generateRequestId()

    if (token && userId && appId) {
      config.headers['token'] = token
      config.headers['userId'] = userId
      config.headers['appId'] = appId
    }

    config.headers['X-Request-Id'] = requestId
    config.metadata = {
      ...(config.metadata || {}),
      requestId,
      startedAt: Date.now(),
      route: getCurrentRoute(),
      method: normalizeMethod(config.method),
      url: resolveRequestUrl(config),
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const metadata = response.config?.metadata || {}
    const duration = Number.isFinite(metadata.startedAt)
      ? Date.now() - metadata.startedAt
      : 0

    reportApi(
      {
        requestId: metadata.requestId || '',
        method: metadata.method || normalizeMethod(response.config?.method),
        url: metadata.url || resolveRequestUrl(response.config),
        route: metadata.route || getCurrentRoute(),
      },
      {
        status: response.status,
        ok: true,
        duration,
      }
    )

    return response.data
  },
  (error) => {
    const metadata = error.config?.metadata || {}
    const duration = Number.isFinite(metadata.startedAt)
      ? Date.now() - metadata.startedAt
      : 0
    const status = error.response?.status || 0

    reportApi(
      {
        requestId: metadata.requestId || '',
        method: metadata.method || normalizeMethod(error.config?.method),
        url: metadata.url || resolveRequestUrl(error.config),
        route: metadata.route || getCurrentRoute(),
      },
      {
        status,
        ok: false,
        duration,
        errorMessage: error.message || 'Request failed',
      }
    )

    logger.error('Request failed', error, {
      requestId: metadata.requestId || '',
      status,
      url: metadata.url || resolveRequestUrl(error.config),
      route: metadata.route || getCurrentRoute(),
    })

    if (error.response?.status === 401) {
      handleUnauthorizedResponse()
    }
    return Promise.reject(error)
  }
)

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

export default request
