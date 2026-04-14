import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from 'antd'
import { useLayoutEffect } from 'react'
import { KooEditor, getRuntimeConfig } from '@cloud/koopage-editor-sdk'
import useAuth from '@/hooks/useAuth'
import authService from '@/services/authService'
import { getAppConfig } from '@/utils/config'
import { preloadPageEditorResources } from '@/utils/pageEditorPreload'

function serializeContent(editor) {
  if (!editor?.getContent) {
    return ''
  }

  const content = editor.getContent()
  if (content == null) {
    return ''
  }

  if (typeof content === 'string') {
    return content
  }

  try {
    return JSON.stringify(content)
  } catch {
    return String(content)
  }
}

function PageEditorV2({
  onChange,
  onSave,
  note,
  placeholder,
  readOnly = false,
  headerActions = null,
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
  const saveTimerRef = useRef(null)
  const lastSerializedRef = useRef('')
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)
  const [editorStatus, setEditorStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [mountSize, setMountSize] = useState({ width: 0, height: 0 })
  const isDev = import.meta.env.DEV
  const useGeneratedEditorJwt = pageEditorAuthEnabled

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const runtimeAuth = useMemo(
    () => {
      const legacyAuth = {
        appId: appId || authService.getAppId() || '',
        userId: userId || authService.getUserId() || '',
        token: authService.getToken() || '',
        user: {
          id: user?.id || userId || authService.getUserId() || '',
          name: user?.name || user?.realName || user?.nickName || userId || authService.getUserId() || 'unknown',
          realName: user?.realName || user?.name || user?.nickName || userId || authService.getUserId() || 'unknown',
          avatar: user?.avatar || user?.avatarUrl || user?.picture || '',
        },
      }

      if (!useGeneratedEditorJwt) {
        return legacyAuth
      }

      return authService.createEditorAuth({
        documentId: note?.id,
        user,
        userId: userId || authService.getUserId(),
        appId,
      })
    },
    [
      appId,
      note?.id,
      pageEditorAuthEnabled,
      user?.avatar,
      user?.avatarUrl,
      user?.id,
      user?.name,
      user?.nickName,
      user?.picture,
      user?.realName,
      userId,
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

    preloadPageEditorResources({
      editorUrl: runtimeConfig?.editorUrl,
      appId: runtimeAuth?.appId || pageEditorAuthAppId || appId || authService.getAppId(),
    })

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
            onOpen: () => { },
          },
        },
        onTitleUpdate: () => { },
        onSavingToDocument: async () => ({ success: true }),
        onUpdate: ({ editor }) => {
          const nextContent = serializeContent(editor)

          if (!nextContent || nextContent === lastSerializedRef.current) {
            return
          }

          lastSerializedRef.current = nextContent
          onChangeRef.current?.(nextContent)

          if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current)
          }

          saveTimerRef.current = window.setTimeout(() => {
            onSaveRef.current?.(nextContent)
          }, 500)
        },
      }).then((editor) => {
        if (cancelled) {
          if (typeof editor?.destroy === 'function') {
            editor.destroy()
          }
          return
        }

        editorRef.current = editor
        lastSerializedRef.current = serializeContent(editor) || lastSerializedRef.current
        setEditorStatus('ready')
        if (isDev) {
          console.debug('[PageEditor] ready', {
            noteId: note?.id,
            hasEditor: Boolean(editor),
          })
        }
      }).catch((error) => {
        if (cancelled) {
          return
        }

        setEditorStatus('error')
        setErrorMessage(error?.message || '页面编辑器初始化失败')
        if (isDev) {
          console.error('[PageEditor] failed', error)
        }
      })
    })

    return () => {
      cancelled = true
      if (frameId != null) {
        window.cancelAnimationFrame(frameId)
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
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
