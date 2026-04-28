import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Spin } from 'antd'
import useAuth from '@/hooks/useAuth'
import authService from '@/services/authService'
import { getAppConfig } from '@/utils/config'

const THIRD_BLOCK_EDITOR_NAMES = {
  board: 'blockHuaBan',
  draw: 'blockliuCheng',
  mind: 'blocksiWeiDao',
}

let thirdBlockEditorConfigPromise = null

function normalizeAbsoluteUrl(url) {
  const normalizedUrl = String(url || '').trim()
  if (!normalizedUrl) {
    return ''
  }

  try {
    return new URL(normalizedUrl, window.location.origin).toString()
  } catch {
    return normalizedUrl
  }
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`
}

function stripTrailingSlash(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function stripApiSuffix(url) {
  return stripTrailingSlash(url).replace(/\/api$/u, '')
}

async function loadThirdBlockEditorConfig(contentServerUrl) {
  const normalizedContentServerUrl = normalizeAbsoluteUrl(contentServerUrl)
  if (!normalizedContentServerUrl) {
    return {}
  }

  if (!thirdBlockEditorConfigPromise) {
    thirdBlockEditorConfigPromise = (async () => {
      try {
        const endpoint = new URL('/api/content/sysconfig/all', normalizedContentServerUrl).toString()
        const response = await fetch(endpoint, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`failed to load third block config: ${response.status}`)
        }

        const payload = await response.json()
        const allConfigs = Array.isArray(payload?.data) ? payload.data : []
        const targetConfig = allConfigs.find((item) => item?.configKey === 'webDisplayThirdBlock')
        const thirdBlocks = JSON.parse(targetConfig?.configValue || '[]')

        return thirdBlocks.reduce((result, item) => {
          const key = Object.entries(THIRD_BLOCK_EDITOR_NAMES).find(([, name]) => name === item?.name)?.[0]
          if (!key || !item?.editUrl) {
            return result
          }

          return {
            ...result,
            [key]: normalizeAbsoluteUrl(item.editUrl),
          }
        }, {})
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug('[CloudDiagramEditor] failed to load third block config', error)
        }
        return {}
      }
    })()
  }

  return thirdBlockEditorConfigPromise
}

function resolveEditorUrl(editorConfig, editorKind) {
  const customConfig = editorConfig?.[editorKind] || {}
  if (customConfig?.editorUrl) {
    return normalizeAbsoluteUrl(customConfig.editorUrl)
  }

  if (editorKind === 'draw' && editorConfig?.page?.flowDiagramUrl) {
    return normalizeAbsoluteUrl(editorConfig.page.flowDiagramUrl)
  }

  if (editorKind === 'board') {
    const boardPageUrl =
      editorConfig?.page?.boardEditorUrl ||
      editorConfig?.page?.boardUrl ||
      editorConfig?.page?.mindboardUrl ||
      editorConfig?.page?.handwrittenEditorUrl

    if (boardPageUrl) {
      return normalizeAbsoluteUrl(boardPageUrl)
    }
  }

  const pageEditorUrl = normalizeAbsoluteUrl(editorConfig?.page?.editorUrl)
  if (!pageEditorUrl) {
    return ''
  }

  if (/\/editor\/[^/]+\/?$/u.test(pageEditorUrl)) {
    return ensureTrailingSlash(pageEditorUrl)
  }

  const editorBaseUrl = ensureTrailingSlash(pageEditorUrl)
  try {
    return new URL(`${editorKind}editor/`, editorBaseUrl).toString()
  } catch {
    return `${editorBaseUrl}${editorKind}editor/`
  }
}

function resolveCollaborationUrl(editorConfig, editorKind) {
  const customConfig = editorConfig?.[editorKind] || {}
  return customConfig?.collaborationUrl || editorConfig?.page?.collaborationUrl || ''
}

function resolveApiUrl(editorConfig, apiConfig, editorKind) {
  const customConfig = editorConfig?.[editorKind] || {}
  if (customConfig?.apiUrl) {
    return normalizeAbsoluteUrl(customConfig.apiUrl)
  }

  if (editorConfig?.page?.apiUrl) {
    return normalizeAbsoluteUrl(editorConfig.page.apiUrl)
  }

  const contentServerUrl = normalizeAbsoluteUrl(apiConfig?.contentServer)
  if (contentServerUrl) {
    try {
      return new URL('/api', contentServerUrl).toString()
    } catch {
      return `${stripTrailingSlash(contentServerUrl)}/api`
    }
  }

  return apiConfig?.baseUrl || ''
}

function resolveServiceBaseUrl(editorConfig, apiConfig, editorKind) {
  const customConfig = editorConfig?.[editorKind] || {}
  const explicitServiceBaseUrl =
    customConfig?.serviceBaseUrl ||
    customConfig?.baseURL ||
    customConfig?.service?.baseURL

  if (explicitServiceBaseUrl) {
    return normalizeAbsoluteUrl(explicitServiceBaseUrl)
  }

  const contentServerUrl = normalizeAbsoluteUrl(apiConfig?.contentServer)
  if (contentServerUrl) {
    return stripTrailingSlash(contentServerUrl)
  }

  const apiUrl = resolveApiUrl(editorConfig, apiConfig, editorKind)
  return apiUrl ? stripApiSuffix(normalizeAbsoluteUrl(apiUrl)) : ''
}

function resolveObsPrefix(editorConfig, editorKind) {
  const customConfig = editorConfig?.[editorKind] || {}
  return customConfig?.obsPrefix || editorConfig?.page?.obsPrefix || ''
}

function serializeEditorPayload(payload) {
  if (payload == null) {
    return ''
  }

  if (typeof payload === 'string') {
    return payload
  }

  const persistablePayload = payload?.data ?? payload

  try {
    return JSON.stringify(persistablePayload)
  } catch {
    return String(persistablePayload)
  }
}

function formatEditorInitError(error, runtimeConfig, alternateEditorUrl = '') {
  const message = error?.message || 'Editor initialization failed'
  const details = [
    runtimeConfig?.editorUrl ? `editorUrl=${runtimeConfig.editorUrl}` : '',
    runtimeConfig?.apiUrl ? `apiUrl=${runtimeConfig.apiUrl}` : '',
    runtimeConfig?.serviceBaseUrl ? `serviceBaseUrl=${runtimeConfig.serviceBaseUrl}` : '',
    runtimeConfig?.collaborationUrl ? `collaborationUrl=${runtimeConfig.collaborationUrl}` : '',
    alternateEditorUrl ? `alternateEditorUrl=${alternateEditorUrl}` : '',
    typeof navigator !== 'undefined' ? `online=${navigator.onLine}` : '',
  ].filter(Boolean)

  if (/wait iframe ready timeout/u.test(message)) {
    details.push('offlineModeRequiresHostedIframe=true')
  }

  return details.length > 0 ? `${message} (${details.join(', ')})` : message
}

function CloudDiagramEditor({
  EditorComponent,
  FallbackComponent = null,
  fallbackMessage = '',
  editorKind,
  note,
  onChange,
  onSave,
  readOnly = false,
  placeholder,
}) {
  const { api, editor } = getAppConfig()
  const { user, userId, appId } = useAuth()
  const saveTimerRef = useRef(null)
  const editorWatchdogRef = useRef(null)
  const lastSerializedRef = useRef('')
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const [authentication, setAuthentication] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editorLoading, setEditorLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isFallbackActive, setIsFallbackActive] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const fallbackRuntimeConfig = useMemo(
    () => ({
      editorUrl: resolveEditorUrl(editor, editorKind),
      apiUrl: resolveApiUrl(editor, api, editorKind),
      serviceBaseUrl: resolveServiceBaseUrl(editor, api, editorKind),
      collaborationUrl: resolveCollaborationUrl(editor, editorKind),
      obsPrefix: resolveObsPrefix(editor, editorKind),
    }),
    [api, editor, editorKind]
  )
  const [thirdBlockEditorUrl, setThirdBlockEditorUrl] = useState('')
  const [runtimeConfigReady, setRuntimeConfigReady] = useState(false)
  const alternateEditorUrl =
    thirdBlockEditorUrl && thirdBlockEditorUrl !== fallbackRuntimeConfig.editorUrl
      ? thirdBlockEditorUrl
      : ''
  const runtimeConfigCandidates = useMemo(
    () => [fallbackRuntimeConfig],
    [fallbackRuntimeConfig]
  )
  const [runtimeConfigIndex, setRuntimeConfigIndex] = useState(0)
  const runtimeConfig = runtimeConfigCandidates[runtimeConfigIndex] || fallbackRuntimeConfig
  const iframeReadyTimeoutMs = FallbackComponent ? 5000 : 12000
  const loading = authLoading || editorLoading

  useEffect(() => {
    setThirdBlockEditorUrl('')
    setRuntimeConfigReady(false)
  }, [fallbackRuntimeConfig.editorUrl, editorKind])

  useEffect(() => {
    setRuntimeConfigIndex(0)
  }, [runtimeConfigCandidates])

  const documentConfig = useMemo(
    () => ({
      docId: note?.id || '',
      docType: 'document',
      lang: 'zh-CN',
      orgId: note?.orgId || note?.organizationId || note?.tenantId || undefined,
    }),
    [note?.id, note?.orgId, note?.organizationId, note?.tenantId]
  )

  const loadAuthentication = useCallback(async () => {
    const auth = authService.createEditorAuth({
      documentId: note?.id,
      user,
      userId: userId || authService.getUserId(),
      appId,
      readOnly,
    })
    const token = await auth.token

    return {
      appId: auth.appId,
      userId: auth.userId,
      token,
      analyzeToken: token,
      user: auth.user,
      extraData: auth.extraData,
    }
  }, [appId, note?.id, readOnly, user, userId])

  useEffect(() => {
    if (!runtimeConfigReady) {
      setAuthLoading(true)
      setEditorLoading(true)
      return undefined
    }

    if (!documentConfig.docId) {
      setAuthentication(null)
      setAuthLoading(false)
      setEditorLoading(false)
      setErrorMessage('Missing document id')
      setIsFallbackActive(Boolean(FallbackComponent))
      return undefined
    }

    let cancelled = false
    setAuthLoading(true)
    setEditorLoading(true)
    setErrorMessage('')
    setIsFallbackActive(false)

    loadAuthentication()
      .then((nextAuthentication) => {
        if (cancelled) {
          return
        }

        setAuthentication(nextAuthentication)
        setAuthLoading(false)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setAuthentication(null)
        setAuthLoading(false)
        setEditorLoading(false)
        setErrorMessage(formatEditorInitError(error, runtimeConfig, alternateEditorUrl))
        setIsFallbackActive(Boolean(FallbackComponent))
      })

    return () => {
      cancelled = true
    }
  }, [alternateEditorUrl, documentConfig.docId, loadAuthentication, runtimeConfigReady, runtimeConfig])

  useEffect(() => {
    let cancelled = false

    loadThirdBlockEditorConfig(api.contentServer)
      .then((thirdBlockEditors) => {
        if (cancelled) {
          return
        }

        const overriddenEditorUrl = thirdBlockEditors?.[editorKind]
        setThirdBlockEditorUrl(overriddenEditorUrl || '')
        setRuntimeConfigReady(true)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setRuntimeConfigReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [api.contentServer, editorKind])

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      if (editorWatchdogRef.current) {
        window.clearTimeout(editorWatchdogRef.current)
        editorWatchdogRef.current = null
      }
    },
    []
  )

  useEffect(() => {
    if (!authentication || !runtimeConfigReady) {
      return undefined
    }

    if (editorWatchdogRef.current) {
      window.clearTimeout(editorWatchdogRef.current)
      editorWatchdogRef.current = null
    }

    editorWatchdogRef.current = window.setTimeout(() => {
      setEditorLoading(false)
      setErrorMessage(
        formatEditorInitError(new Error('wait iframe ready timeout'), runtimeConfig, alternateEditorUrl)
      )
      setIsFallbackActive(Boolean(FallbackComponent))
    }, iframeReadyTimeoutMs)

    return () => {
      if (editorWatchdogRef.current) {
        window.clearTimeout(editorWatchdogRef.current)
        editorWatchdogRef.current = null
      }
    }
  }, [alternateEditorUrl, authentication, iframeReadyTimeoutMs, runtimeConfig, runtimeConfigReady])

  const handleEditorPayload = useCallback((payload) => {
    const nextContent = serializeEditorPayload(payload)
    if (!nextContent || nextContent === lastSerializedRef.current) {
      return { success: true }
    }

    lastSerializedRef.current = nextContent
    onChangeRef.current?.(nextContent)

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      onSaveRef.current?.(nextContent)
    }, 500)

    return { success: true }
  }, [])

  const handleLoaded = useCallback(async (payload) => {
    if (editorWatchdogRef.current) {
      window.clearTimeout(editorWatchdogRef.current)
      editorWatchdogRef.current = null
    }

    setEditorLoading(false)
    setErrorMessage('')

    const nextContent = serializeEditorPayload(payload)
    if (nextContent) {
      lastSerializedRef.current = nextContent
      onChangeRef.current?.(nextContent)
    }

    return { success: true }
  }, [])

  const handleRefreshToken = useCallback(async () => {
    const nextAuthentication = await loadAuthentication()
    setAuthentication(nextAuthentication)
    return nextAuthentication
  }, [loadAuthentication])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {errorMessage ? (
        <Alert
          type={isFallbackActive ? 'warning' : 'error'}
          showIcon
          style={{
            flexShrink: 0,
            borderRadius: 0,
            borderLeft: 'none',
            borderRight: 'none',
          }}
          message={isFallbackActive ? 'Diagram editor unavailable, fallback enabled' : 'Editor initialization failed'}
          description={
            isFallbackActive
              ? `${fallbackMessage || 'The dedicated diagram editor is currently unreachable, so PageEditor compatibility mode is being used.'} ${errorMessage}`.trim()
              : (errorMessage || placeholder || 'Please check the SDK and runtime config.')
          }
        />
      ) : null}

      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              zIndex: 1,
            }}
          >
            <Spin />
          </div>
        ) : null}

        {authentication && !errorMessage ? (
          <EditorComponent
            key={`${editorKind}:${documentConfig.docId}:${runtimeConfigIndex}:${runtimeConfig.editorUrl}`}
            document={documentConfig}
            authentication={authentication}
            url={runtimeConfig.editorUrl}
            collabOptions={{
              disable: true,
              server: runtimeConfig.collaborationUrl,
            }}
            scene={{
              mode: readOnly ? 'reader' : 'editor',
            }}
            editorConfig={{
              theme: 'light',
            }}
            service={{
              baseURL: runtimeConfig.serviceBaseUrl,
              imgPrefix: runtimeConfig.obsPrefix,
            }}
            onLoadedHandle={handleLoaded}
            onEditorDataChangeHandle={handleEditorPayload}
            onRefreshToken={handleRefreshToken}
          />
        ) : null}

        {isFallbackActive && FallbackComponent ? (
          <FallbackComponent
            note={note}
            onChange={onChange}
            onSave={onSave}
            readOnly={readOnly}
            placeholder={placeholder}
          />
        ) : null}
      </div>
    </div>
  )
}

export default CloudDiagramEditor
