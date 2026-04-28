import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from 'antd'
import { useLayoutEffect } from 'react'
import { KooEditor, getRuntimeConfig } from '@cloud/koopage-editor-sdk'
import useAuth from '@/hooks/useAuth'
import authService from '@/services/authService'
import { getAppConfig } from '@/utils/config'
import { reportTiming } from '@/utils/observability'

function formatEditorInitError(error, runtimeConfig) {
  const message = error?.message || '页面编辑器初始化失败'
  const details = [
    runtimeConfig?.editorUrl ? `editorUrl=${runtimeConfig.editorUrl}` : '',
    runtimeConfig?.apiUrl ? `apiUrl=${runtimeConfig.apiUrl}` : '',
  ].filter(Boolean)

  return details.length > 0 ? `${message} (${details.join(', ')})` : message
}

function applyEditorContainerPadding(root) {
  const container = root?.querySelector?.('#js-tocs-container')
  if (!container) {
    return false
  }

  container.style.padding = `2rem 5rem`
  container.style.boxSizing = 'border-box'
  return true
}

function PageEditorV2({
  note,
  placeholder,
  readOnly = false,
}) {
  const { api, editor } = getAppConfig()
  const pageEditorConfig = editor?.page || null
  const pageEditorAuthConfig = pageEditorConfig?.auth || {}
  const pageEditorApiUrl = pageEditorConfig?.apiUrl || ''
  const pageEditorEditorUrl = pageEditorConfig?.editorUrl || ''
  const pageEditorCollaborationUrl = pageEditorConfig?.collaborationUrl || ''
  const pageEditorFlowDiagramUrl = pageEditorConfig?.flowDiagramUrl || ''
  const pageEditorMonacoEditorUrl = pageEditorConfig?.monacoEditorUrl || ''
  const pageEditorDolphinWebUrl = pageEditorConfig?.dolphinWebUrl || ''
  const pageEditorObsPrefix = pageEditorConfig?.obsPrefix || ''
  const pageEditorAuthEnabled = Boolean(pageEditorConfig?.auth?.enabled)
  const pageEditorAuthAppId = pageEditorAuthConfig.appId || ''
  const pageEditorAuthSignKey = pageEditorAuthConfig.signKey || ''
  const pageEditorAuthExpiresInMs = pageEditorAuthConfig.expiresInMs || 0
  const { user, userId, appId } = useAuth()
  const mountRef = useRef(null)
  const editorRef = useRef(null)
  const initStartedAtRef = useRef(0)
  const [editorStatus, setEditorStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [mountSize, setMountSize] = useState({ width: 0, height: 0 })
  const isDev = import.meta.env.DEV

  const runtimeAuth = useMemo(
    () => authService.createEditorAuth({
      documentId: note?.id,
      user,
      userId: userId || authService.getUserId(),
      appId,
      readOnly,
      editorKind: 'page',
    }),
    [
      appId,
      note?.id,
      user?.avatar,
      user?.avatarUrl,
      user?.id,
      user?.name,
      user?.nickName,
      user?.picture,
      user?.realName,
      userId,
      readOnly,
    ]
  )
  const runtimeConfig = useMemo(
    () => {
      if (pageEditorConfig) {
        const fallback = getRuntimeConfig(api.contentServer, api.contentServer)

        return {
          ...fallback,
          auth: {
            ...fallback.auth,
            enabled: pageEditorAuthEnabled,
            appId: pageEditorAuthAppId,
            signKey: pageEditorAuthSignKey,
            expiresInMs: pageEditorAuthExpiresInMs,
          },
          apiUrl: pageEditorApiUrl || fallback.apiUrl,
          editorUrl: pageEditorEditorUrl || fallback.editorUrl,
          collaborationUrl: pageEditorCollaborationUrl || fallback.collaborationUrl,
          flowDiagramUrl: pageEditorFlowDiagramUrl || fallback.flowDiagramUrl,
          monacoEditorUrl: pageEditorMonacoEditorUrl || fallback.monacoEditorUrl,
          dolphinWebUrl: pageEditorDolphinWebUrl || fallback.dolphinWebUrl,
          obsPrefix: pageEditorObsPrefix || fallback.obsPrefix,
        }
      }

      const fallback = getRuntimeConfig(api.contentServer, api.contentServer)
      return {
        ...fallback,
        apiUrl: api.contentServer ? new URL('/api', api.contentServer).toString() : api.baseUrl,
      }
    },
    [
      api.baseUrl,
      api.contentServer,
      pageEditorApiUrl,
      pageEditorAuthAppId,
      pageEditorAuthEnabled,
      pageEditorAuthExpiresInMs,
      pageEditorAuthSignKey,
      pageEditorCollaborationUrl,
      pageEditorDolphinWebUrl,
      pageEditorEditorUrl,
      pageEditorFlowDiagramUrl,
      pageEditorMonacoEditorUrl,
      pageEditorObsPrefix,
    ]
  )
  const documentConfig = useMemo(() => ({
    docId: note?.id || '',
    docType: 'document',
  }), [note?.id])
  const mountReady = mountSize.width > 0 && mountSize.height > 0

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
    if (!mountRef.current || !mountReady) {
      return undefined
    }

    let cancelled = false
    let frameId = null
    setEditorStatus('loading')
    setErrorMessage('')
    initStartedAtRef.current = Date.now()

    frameId = window.requestAnimationFrame(() => {
      KooEditor.create({
        element: mountRef.current,
        document: documentConfig,
        auth: runtimeAuth,
        editable: !readOnly,
        editableCollaborative: !readOnly,
        disabledCollaborative: true,
        pure: {
          cover: false,
          title: false,
        },
        toc:{
          show : true,
          position : 'left',
          collapsedDefault : true,
        },
        extensions: {
          LocalKit: true,
          ServerKit: {
            comment: false,
          },
        },
        env: runtimeConfig,
        languages: 'zh-CN',
        theme: 'light',
        autofocus: true,
        showTemplateOnEmpty: false,
        settings: {
          resumeLastViewedPosition: false,
          title: {
            onDocInfoStateChanged: () => { },
          },
          link: {
            promptWhenLinking: true, 
          },
        },
      }).then((editor) => {
        if (cancelled) {
          if (typeof editor?.destroy === 'function') {
            editor.destroy()
          }
          return
        }

        editorRef.current = editor
        applyEditorContainerPadding(mountRef.current)
        setEditorStatus('ready')
        reportTiming('page_editor_init', Date.now() - initStartedAtRef.current, {
          status: 'success',
          noteId: note?.id || '',
          editorUrl: runtimeConfig?.editorUrl || '',
          apiUrl: runtimeConfig?.apiUrl || '',
        })
        if (isDev) {
          console.debug('[PageEditor] ready', {
            noteId: note?.id,
            hasEditor: Boolean(editor),
            runtimeConfig,
          })
        }
      }).catch((error) => {
        if (cancelled) {
          return
        }

        setEditorStatus('error')
        setErrorMessage(formatEditorInitError(error, runtimeConfig))
        reportTiming('page_editor_init', Date.now() - initStartedAtRef.current, {
          status: 'error',
          noteId: note?.id || '',
          editorUrl: runtimeConfig?.editorUrl || '',
          apiUrl: runtimeConfig?.apiUrl || '',
          errorName: error?.name || 'Error',
        })
        if (isDev) {
          console.error('[PageEditor] failed', {
            error,
            runtimeConfig,
            documentConfig,
          })
        }
      })
    })

    return () => {
      cancelled = true
      if (frameId != null) {
        window.cancelAnimationFrame(frameId)
      }
      if (typeof editorRef.current?.destroy === 'function') {
        editorRef.current.destroy()
      }
      editorRef.current = null
    }
  }, [appId, documentConfig, mountReady, pageEditorAuthAppId, readOnly, runtimeConfig, runtimeAuth])

  useEffect(() => {
    if (!mountReady) {
      return undefined
    }

    const editorInstance = editorRef.current
    if (!editorInstance) {
      return undefined
    }

    const resize = editorInstance.resize || editorInstance.refresh || editorInstance.updateSize
    if (typeof resize === 'function') {
      resize.call(editorInstance)
    }

    return undefined
  }, [mountReady, mountSize.height, mountSize.width])

  return (
    <div
      className="page-editor"
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
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {editorStatus === 'error' ? (
          <Alert
            type="error"
            showIcon
            style={{
              flexShrink: 0,
              borderRadius: 0,
              borderLeft: 'none',
              borderRight: 'none',
            }}
            message="页面编辑器初始化失败"
            description={errorMessage || placeholder || '请检查页面编辑器 SDK 和运行环境配置。'}
          />
        ) : null}

        <div
          ref={mountRef}
          style={{
            flex: '1 1 auto',
            display: 'block',
            width: 'auto',
            height: 'auto',
            minWidth: 0,
            minHeight: 0,
            background: '#fff',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  )
}

export default PageEditorV2
