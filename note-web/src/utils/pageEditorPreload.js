import { KooEditor } from '@cloud/koopage-editor-sdk'
import authService from '@/services/authService'
import { getAppConfig } from '@/utils/config'

const preloadCache = new Set()

function normalizeEditorUrl(value) {
  return typeof value === 'string' ? value.trim().replace(/\/+$/u, '') : ''
}

function resolveAppId(explicitAppId) {
  if (typeof explicitAppId === 'string' && explicitAppId.trim()) {
    return explicitAppId.trim()
  }

  const config = getAppConfig()
  const pageConfig = config?.editor?.page || {}

  return (
    pageConfig?.auth?.appId
    || pageConfig?.appId
    || authService.getAppId()
    || ''
  )
}

export function getPageEditorPreloadPayload(overrides = {}) {
  const config = getAppConfig()
  const pageConfig = config?.editor?.page || {}
  const editorUrl = normalizeEditorUrl(overrides.editorUrl || pageConfig.editorUrl)
  const appId = resolveAppId(overrides.appId)

  if (!editorUrl) {
    return null
  }

  return {
    editorUrl,
    options: appId ? { appId } : undefined,
  }
}

export function preloadPageEditorResources(overrides = {}) {
  const payload = getPageEditorPreloadPayload(overrides)

  if (!payload) {
    return false
  }

  const cacheKey = `${payload.editorUrl}::${payload.options?.appId || ''}`
  if (preloadCache.has(cacheKey)) {
    return false
  }

  preloadCache.add(cacheKey)

  try {
    KooEditor.preload(payload.editorUrl, payload.options)
    return true
  } catch (error) {
    preloadCache.delete(cacheKey)

    if (import.meta.env.DEV) {
      console.debug('[PageEditor] preload failed', error)
    }

    return false
  }
}

export function schedulePageEditorPreload(overrides = {}) {
  if (typeof window === 'undefined') {
    return undefined
  }

  const run = () => {
    preloadPageEditorResources(overrides)
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(run, { timeout: 1200 })
    return () => window.cancelIdleCallback?.(idleId)
  }

  const timeoutId = window.setTimeout(run, 16)
  return () => window.clearTimeout(timeoutId)
}

export function __resetPageEditorPreloadCacheForTests() {
  preloadCache.clear()
}
