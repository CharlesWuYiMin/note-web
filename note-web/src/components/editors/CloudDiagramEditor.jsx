import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, Spin } from 'antd'
import useAuth from '@/hooks/useAuth'
import authService from '@/services/authService'
import { getEditorDocumentType } from '@/utils/editorRuntimeConfig'
import { reportTiming } from '@/utils/observability'

function formatEditorInitError(error, editorProps) {
  const message = error?.message || 'Editor initialization failed'
  const details = [
    editorProps?.url ? `url=${editorProps.url}` : '',
    editorProps?.editorUrl ? `editorUrl=${editorProps.editorUrl}` : '',
    editorProps?.apiUrl ? `apiUrl=${editorProps.apiUrl}` : '',
    editorProps?.service?.baseURL ? `service.baseURL=${editorProps.service.baseURL}` : '',
    editorProps?.collabOptions?.server ? `collabOptions.server=${editorProps.collabOptions.server}` : '',
    typeof navigator !== 'undefined' ? `online=${navigator.onLine}` : '',
  ].filter(Boolean)

  if (/wait iframe ready timeout/u.test(message)) {
    details.push('offlineModeRequiresHostedIframe=true')
  }

  return details.length > 0 ? `${message} (${details.join(', ')})` : message
}

function createLegacyAuthentication({ documentId, user, userId, appId }) {
  const resolvedUserId = user?.id || user?.userId || userId || authService.getUserId() || 'unknown'
  const resolvedUserName =
    user?.name || user?.realName || user?.nickName || resolvedUserId

  return {
    appId: appId || authService.getAppId() || 'stub-editor-app-id',
    userId: resolvedUserId,
    token: authService.getToken() || '',
    analyzeToken: authService.getToken() || '',
    user: {
      id: resolvedUserId,
      name: resolvedUserName,
      realName: user?.realName || user?.name || resolvedUserName,
      avatar: user?.avatar || user?.avatarUrl || user?.picture || '',
    },
    extraData: {
      documentId: documentId || '',
    },
  }
}

function CloudDiagramEditor({
  EditorComponent,
  editorKind,
  editorProps = {},
  documentData = null,
  useServerAuth = true,
  note,
  readOnly = false,
  placeholder,
}) {
  const { user, userId, appId } = useAuth()
  const mountRef = useRef(null)
  const editorWatchdogRef = useRef(null)
  const initStartedAtRef = useRef(0)
  const [authentication, setAuthentication] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [editorLoading, setEditorLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [mountSize, setMountSize] = useState({ width: 0, height: 0 })

  const documentType = getEditorDocumentType(editorKind)
  const mountReady = mountSize.width > 0 && mountSize.height > 0
  const loading = authLoading || editorLoading
  const editorKey = editorProps.url || editorProps.editorUrl || editorKind || 'editor'

  const documentConfig = useMemo(() => {
    const nextDocument = {
      docId: note?.id || '',
      docType: documentType,
      lang: 'zh-CN',
      traceId: note?.traceId || note?.id || '',
      createuserId: userId || authService.getUserId() || '',
      createUserId: userId || authService.getUserId() || '',
      orgId: note?.orgId || note?.organizationId || note?.tenantId || undefined,
    }

    if (documentData != null) {
      nextDocument.data = documentData
    }

    return nextDocument
  }, [documentData, documentType, note?.id, note?.orgId, note?.organizationId, note?.tenantId, note?.traceId, userId])

  const loadAuthentication = useCallback(async () => {
    if (!useServerAuth) {
      return createLegacyAuthentication({
        documentId: note?.id,
        user,
        userId: userId || authService.getUserId(),
        appId,
      })
    }

    const auth = authService.createEditorAuth({
      editorKind,
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
  }, [appId, editorKind, note?.id, readOnly, useServerAuth, user, userId])

  useLayoutEffect(() => {
    const node = mountRef.current

    if (!node) {
      return undefined
    }

    let frameId = null
    let resizeObserver = null

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      const nextSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }

      setMountSize((current) => (
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize
      ))
    }

    const scheduleUpdate = () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(updateSize)
    }

    scheduleUpdate()

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate)
      resizeObserver.observe(node)
    } else {
      window.addEventListener('resize', scheduleUpdate)
    }

    return () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId)
      }

      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', scheduleUpdate)
      }
    }
  }, [])

  useEffect(() => {
    if (!documentConfig.docId) {
      setAuthentication(null)
      setAuthLoading(false)
      setEditorLoading(false)
      setErrorMessage('Missing document id')
      reportTiming('cloud_editor_init', 0, {
        status: 'error',
        editorKind,
        noteId: note?.id || '',
        documentType,
        errorName: 'MissingDocumentId',
      })
      return undefined
    }

    let cancelled = false
    setAuthLoading(true)
    setEditorLoading(true)
    setErrorMessage('')
    initStartedAtRef.current = Date.now()

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
        setErrorMessage(formatEditorInitError(error, editorProps))
        reportTiming('cloud_editor_init', Date.now() - initStartedAtRef.current, {
          status: 'error',
          editorKind,
          noteId: note?.id || '',
          documentType,
          errorName: error?.name || 'Error',
        })
      })

    return () => {
      cancelled = true
    }
  }, [documentConfig.docId, editorProps, loadAuthentication])

  useEffect(
    () => () => {
      if (editorWatchdogRef.current) {
        window.clearTimeout(editorWatchdogRef.current)
        editorWatchdogRef.current = null
      }
    },
    []
  )

  useEffect(() => {
    if (!authentication || !mountReady) {
      return undefined
    }

    if (editorWatchdogRef.current) {
      window.clearTimeout(editorWatchdogRef.current)
      editorWatchdogRef.current = null
    }

    editorWatchdogRef.current = window.setTimeout(() => {
      setEditorLoading(false)
      setErrorMessage(formatEditorInitError(new Error('wait iframe ready timeout'), editorProps))
      reportTiming('cloud_editor_init', Date.now() - initStartedAtRef.current, {
        status: 'error',
        editorKind,
        noteId: note?.id || '',
        documentType,
        errorName: 'TimeoutError',
      })
    }, 12000)

    return () => {
      if (editorWatchdogRef.current) {
        window.clearTimeout(editorWatchdogRef.current)
        editorWatchdogRef.current = null
      }
    }
  }, [authentication, editorProps, mountReady])

  const handleLoaded = useCallback(async (payload) => {
    if (editorWatchdogRef.current) {
      window.clearTimeout(editorWatchdogRef.current)
      editorWatchdogRef.current = null
    }

    setEditorLoading(false)
    setErrorMessage('')
    reportTiming('cloud_editor_init', Date.now() - initStartedAtRef.current, {
      status: 'success',
      editorKind,
      noteId: note?.id || '',
      documentType,
    })

    return { success: true }
  }, [documentType, editorKind, note?.id])

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
          type="error"
          showIcon
          style={{
            flexShrink: 0,
            borderRadius: 0,
            borderLeft: 'none',
            borderRight: 'none',
          }}
          message="Editor initialization failed"
          description={errorMessage || placeholder || 'Please check the SDK and runtime config.'}
        />
      ) : null}

      <div
        ref={mountRef}
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
            key={`${editorKind}:${documentConfig.docId}:${editorKey}`}
            {...editorProps}
            document={documentConfig}
            authentication={authentication}
            onLoadedHandle={handleLoaded}
            onRefreshToken={handleRefreshToken}
          />
        ) : null}
      </div>
    </div>
  )
}

export default CloudDiagramEditor
