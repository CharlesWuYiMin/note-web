﻿import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Dropdown, Input, Modal, Spin, Tooltip } from 'antd'
import { message } from 'antd'
import {
  DeleteOutlined,
  ExpandOutlined,
  MoreOutlined,
  RollbackOutlined,
  ShareAltOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
import { CompressOutlined } from '@ant-design/icons'
import EmptyState from '@/components/common/EmptyState'
import UxIcon from '@/components/common/UxIcon'
import EditorFactory from '@/components/editors/EditorFactory'
import HistorySidebar from '@/components/history/HistorySidebar'
import useNote from '@/hooks/useNote'
import { useMemo } from 'react'
import { useRef } from 'react'
import SharePanelDialog from '@/components/share/SharePanelDialog'
import VoicePromptModal from '@/components/voice/VoicePromptModal'
import { trackEvent } from '@/utils/observability'

function hasVoiceRecords(note) {
  if (!note) {
    return false
  }

  if (Array.isArray(note.voiceNote) && note.voiceNote.length > 0) {
    return true
  }

  if (Array.isArray(note.voiceRealtimeSessions) && note.voiceRealtimeSessions.length > 0) {
    return true
  }

  if (Number(note.voiceNumber) > 0) {
    return true
  }

  if (Number(note.voiceCount) > 0) {
    return true
  }

  return false
}

function getWorkspaceSectionItems(pathname, { notes, starredNotes, myShares, deletedNotes }) {
  if (pathname.startsWith('/cloudnote/starred') || pathname.startsWith('/cloudnote/star')) {
    return starredNotes
  }

  if (pathname.startsWith('/cloudnote/myshares')) {
    return myShares
  }

  if (pathname.startsWith('/cloudnote/recyclebin')) {
    return deletedNotes
  }

  return notes
}

function getWorkspaceSectionKey(pathname) {
  if (pathname.startsWith('/cloudnote/starred') || pathname.startsWith('/cloudnote/star')) {
    return 'starred'
  }

  if (pathname.startsWith('/cloudnote/myshares')) {
    return 'myshares'
  }

  if (pathname.startsWith('/cloudnote/recyclebin')) {
    return 'recyclebin'
  }

  if (pathname.startsWith('/cloudnote/notebooks')) {
    return 'notebooks'
  }

  return 'recent'
}

function getWorkspaceEmptyState(pathname, hasRouteId, t) {
  if (pathname.startsWith('/cloudnote/myshares')) {
    return hasRouteId
      ? {
          title: t('workspace.empty.myshares.missingTitle', { defaultValue: '未找到分享对应的笔记' }),
          description: t('workspace.empty.myshares.missingDescription', { defaultValue: '这条分享记录已经不存在或暂时无法访问。' }),
        }
      : {
          title: t('workspace.empty.myshares.title', { defaultValue: '我的分享' }),
          description: t('workspace.empty.myshares.description', { defaultValue: '当前还没有分享记录，创建分享后会显示在这里。' }),
        }
  }

  if (pathname.startsWith('/cloudnote/starred') || pathname.startsWith('/cloudnote/star')) {
    return hasRouteId
      ? {
          title: t('workspace.empty.starred.missingTitle', { defaultValue: '未找到这条星标笔记' }),
          description: t('workspace.empty.starred.missingDescription', { defaultValue: '这条星标内容可能已被删除，或者暂时无法加载。' }),
        }
      : {
          title: t('workspace.empty.starred.title', { defaultValue: '星标笔记' }),
          description: t('workspace.empty.starred.description', { defaultValue: '当前还没有星标笔记，收藏重要内容后会显示在这里。' }),
        }
  }

  if (pathname.startsWith('/cloudnote/recyclebin')) {
    return hasRouteId
      ? {
          title: t('workspace.empty.recycleBin.missingTitle', { defaultValue: '未找到回收站记录' }),
          description: t('workspace.empty.recycleBin.missingDescription', { defaultValue: '这条删除记录可能已被清理，或者暂时无法访问。' }),
        }
      : {
          title: t('workspace.empty.recycleBin.title', { defaultValue: '回收站' }),
          description: t('workspace.empty.recycleBin.description', { defaultValue: '当前回收站里还没有内容。' }),
        }
  }

  if (pathname.startsWith('/cloudnote/notebooks')) {
    return hasRouteId
      ? {
          title: t('workspace.empty.notebooks.missingTitle', { defaultValue: '未找到这条笔记记录' }),
          description: t('workspace.empty.notebooks.missingDescription', { defaultValue: '这条笔记可能已被删除，或者暂时无法加载。' }),
        }
      : {
          title: t('workspace.empty.notebooks.title', { defaultValue: '笔记本' }),
          description: t('workspace.empty.notebooks.description', { defaultValue: '当前分类下还没有可打开的笔记。' }),
        }
  }

  return hasRouteId
    ? {
        title: t('workspace.empty.recent.missingTitle', { defaultValue: '未找到对应笔记' }),
        description: t('workspace.empty.recent.missingDescription', { defaultValue: '这条笔记可能已不存在，或者暂时无法访问。' }),
      }
    : {
        title: t('workspace.empty.recent.title', { defaultValue: '近期笔记' }),
        description: t('workspace.empty.recent.description', { defaultValue: '当前还没有可打开的笔记，创建一条新的内容后会显示在这里。' }),
      }
}

function normalizeWorkspaceNote(note) {
  if (!note) {
    return null
  }

  if (note.noteId && !note.id) {
    return {
      ...note,
      id: note.noteId,
    }
  }

  return note
}

function getWorkspaceDetailPath(section, note) {
  if (section === 'starred') {
    return `/cloudnote/starred/${note.id}`
  }

  if (section === 'myshares') {
    return `/cloudnote/myshares/${note.id}`
  }

  if (section === 'notebooks') {
    const notebookId = note?.notebookId || note?.notebook?.id || note?.notebook?.notebookId
    if (notebookId) {
      return `/cloudnote/notebooks/${notebookId}/${note.id}`
    }

    return `/cloudnote/notebooks`
  }

  if (section === 'recyclebin') {
    return `/cloudnote/recyclebin/${note.id}`
  }

  return `/cloudnote/recent/${note.id}`
}

function getAdjacentWorkspaceNote(notes, currentNoteId) {
  const normalizedCurrentId = String(currentNoteId || '').trim()
  if (!normalizedCurrentId) {
    return null
  }

  const index = notes.findIndex((note) => String(note?.id || '').trim() === normalizedCurrentId)
  if (index < 0) {
    return null
  }

  return notes[index + 1] || notes[index - 1] || null
}

function WorkspaceStateView({ title, description, loading = false }) {
  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        position: 'relative',
        height: '100%',
        minWidth: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        {loading ? (
          <Spin />
        ) : (
          <EmptyState
            title={title}
            description={description}
            style={{ padding: 0 }}
          />
        )}
      </div>
    </section>
  )
}

function EditorWorkspace() {
  const params = useParams()
  const routeNoteId = params.noteId || params.id || null
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    notes,
    currentNote,
    starredNotes,
    isLoading,
    hasLoadedNotes,
    hasLoadedStarredNotes,
    hasLoadedMyShares,
    hasLoadedDeletedNotes,
    error,
    loadNoteById,
    myShares,
    deletedNotes,
    fetchMyShares,
    syncNoteShareState,
    toggleStar,
    updateName,
    deleteNote,
    restoreNote,
    permanentDeleteNote,
  } = useNote()
  const workspaceRef = useRef(null)
  const [isStarPending, setIsStarPending] = useState(false)
  const [isTitleSaving, setIsTitleSaving] = useState(false)
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [isDeletePending, setIsDeletePending] = useState(false)
  const [isRestorePending, setIsRestorePending] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmMode, setDeleteConfirmMode] = useState('delete')
  const [voicePromptOpen, setVoicePromptOpen] = useState(false)
  const [voicePromptChoice, setVoicePromptChoice] = useState('zh-CN')
  const [forcedVoiceEditorNoteId, setForcedVoiceEditorNoteId] = useState(null)
  const [voiceAutoStartToken, setVoiceAutoStartToken] = useState(null)
  const [voicePanelVisible, setVoicePanelVisible] = useState(true)
  const titleEditorRef = useRef(null)
  const titleMeasureRef = useRef(null)
  const titleInputRef = useRef(null)
  const [titleEditorWidth, setTitleEditorWidth] = useState(null)
  const routeNotePreview = location.state?.note || null
  const currentRouteNote = currentNote?.id === routeNoteId ? currentNote : null
  const notePreview = useMemo(() => {
    const preview = routeNotePreview
    const collectionMatch = [currentNote, ...notes, ...starredNotes, ...deletedNotes].find((item) => item?.id === routeNoteId)

    const previewMatch = preview?.id === routeNoteId
      ? preview
      : preview?.noteId === routeNoteId
        ? { ...preview, id: routeNoteId }
        : null

    const resolvedNote = collectionMatch || previewMatch

    if (!resolvedNote) {
      return preview
    }

    const normalizedResolvedNote = resolvedNote?.noteId && !resolvedNote.id
      ? {
          ...resolvedNote,
          id: resolvedNote.noteId,
        }
      : resolvedNote

    if (currentRouteNote?.id === routeNoteId) {
      return {
        ...normalizedResolvedNote,
        ...currentRouteNote,
      }
    }

    return normalizedResolvedNote
  }, [currentNote, deletedNotes, notes, routeNoteId, routeNotePreview, starredNotes])
  const noteForRender = notePreview || currentRouteNote || null
  const noteId = noteForRender?.id || routeNoteId || null
  const isStarred = Boolean(noteForRender?.isStarred)
  const isShared = Boolean(noteForRender?.isShared)
  const isRecycleBinRoute = location.pathname.startsWith('/cloudnote/recyclebin')
  const isDeletedNote = isRecycleBinRoute || noteForRender?.status === 'deleted'
  const hasVoiceMaterials = hasVoiceRecords(noteForRender)
  const showVoiceEditor = forcedVoiceEditorNoteId === noteId || hasVoiceMaterials
  const useVoiceShell = Boolean(noteForRender) && showVoiceEditor
  const showVoiceTrigger = Boolean(noteForRender) && !isDeletedNote && (showVoiceEditor || noteForRender?.type === 'text')
  const editorReadOnly = isDeletedNote && !isDeletePending
  const sectionItems = useMemo(
    () => getWorkspaceSectionItems(location.pathname, {
      notes,
      starredNotes,
      myShares,
      deletedNotes,
    }),
    [deletedNotes, location.pathname, myShares, notes, starredNotes]
  )
  const sectionNotes = useMemo(
    () => sectionItems
      .map((item) => normalizeWorkspaceNote(item))
      .filter(Boolean),
    [sectionItems]
  )
  const currentSection = getWorkspaceSectionKey(location.pathname)
  const hasSectionItems = sectionItems.length > 0
  const sectionEmptyState = getWorkspaceEmptyState(location.pathname, false, t)
  const emptyState = getWorkspaceEmptyState(location.pathname, Boolean(routeNoteId), t)
  const untitledLabel = t('note.untitled', { defaultValue: '未命名笔记' })
  const displayTitle = noteForRender?.title || (routeNoteId ? untitledLabel : emptyState.title)
  const isTransitioningNote = Boolean(routeNoteId) && !noteForRender && !error
  const showEmptyState = !noteForRender && !isLoading && Boolean(error)
  const isSectionLoaded = currentSection === 'starred'
    ? hasLoadedStarredNotes
    : currentSection === 'myshares'
      ? hasLoadedMyShares
      : currentSection === 'recyclebin'
        ? hasLoadedDeletedNotes
        : hasLoadedNotes
  const showSectionEmptyState = isSectionLoaded && !isLoading && !hasSectionItems
  const showSectionLoadingState = !isSectionLoaded || (isLoading && !hasSectionItems)
  const [title, setTitle] = useState(displayTitle)

  useEffect(() => {
    setForcedVoiceEditorNoteId(null)
    setVoiceAutoStartToken(null)
    setVoicePanelVisible(true)
    setTitle(notePreview?.title || (routeNoteId ? untitledLabel : emptyState.title))
    setIsTitleEditing(false)

    if (!routeNoteId) {
      return
    }

    loadNoteById(routeNoteId).catch(() => {})
  }, [emptyState.title, loadNoteById, notePreview?.title, routeNoteId, untitledLabel])

  useEffect(() => {
    if (noteForRender?.title) {
      setTitle(noteForRender.title)
      setIsTitleEditing(false)
      return
    }

    if (!noteForRender) {
      return
    }

    setTitle(untitledLabel)
    setIsTitleEditing(false)
  }, [noteForRender?.id, noteForRender?.title, untitledLabel])

  useEffect(() => {
    if (!noteForRender) {
      return
    }

    if (!showVoiceEditor) {
      setVoicePanelVisible(true)
    }
  }, [noteForRender, showVoiceEditor])

  useEffect(() => {
    if (!location.state?.openVoicePrompt || !noteId) {
      return
    }

    trackEvent('voice_prompt_open', {
      noteId: String(noteId || ''),
      source: 'route_state',
    })
    setVoicePromptChoice('zh-CN')
    setVoicePromptOpen(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate, noteId])

  useEffect(() => {
    if (!location.state?.openSharePanel || !noteId) {
      return
    }

    trackEvent('share_dialog_open', {
      noteId: String(noteId || ''),
      source: 'route_state',
    })
    setShareDialogOpen(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate, noteId])

  useEffect(() => {
    const handleOpenSharePanel = (event) => {
      const eventNoteId = String(event?.detail?.noteId || '')
      if (!noteId || eventNoteId !== String(noteId)) {
        return
      }
      trackEvent('share_dialog_open', {
        noteId: String(noteId || ''),
        source: 'custom_event',
      })
      setShareDialogOpen(true)
    }

    window.addEventListener('note:open-share-panel', handleOpenSharePanel)
    return () => window.removeEventListener('note:open-share-panel', handleOpenSharePanel)
  }, [noteId])

  useEffect(() => {
    if (!isTitleEditing || !titleInputRef.current) return

    titleInputRef.current.focus({
      cursor: 'all',
    })
  }, [isTitleEditing])

  useEffect(() => {
    if (!isTitleEditing) {
      setTitleEditorWidth(null)
      return
    }

    const measuredWidth = titleMeasureRef.current?.offsetWidth ?? 0
    const nextWidth = Math.min(Math.max(measuredWidth + 32, 88), 360)
    setTitleEditorWidth(nextWidth)
  }, [isTitleEditing, title])

  useEffect(() => {
    if (!isTitleEditing) {
      return
    }

    const handlePointerDownOutside = (event) => {
      if (titleEditorRef.current?.contains(event.target)) {
        return
      }

      titleInputRef.current?.blur()
    }

    document.addEventListener('pointerdown', handlePointerDownOutside)
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside)
  }, [isTitleEditing])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleToggleStar = async () => {
    if (!noteId || isStarPending || !noteForRender) {
      return
    }

    setIsStarPending(true)
    try {
      await toggleStar({
        ...noteForRender,
        id: noteId,
        isStarred,
      })
    } catch (error) {
      message.error(error?.message || t('note.starError', { defaultValue: '星标操作失败，请稍后重试' }))
    } finally {
      setIsStarPending(false)
    }
  }

  const handleToggleFullscreen = async () => {
    if (!document.fullscreenEnabled || !workspaceRef.current) {
      message.warning(t('note.fullscreenUnavailable', { defaultValue: '当前环境不支持全屏' }))
      return
    }

    try {
      if (document.fullscreenElement === workspaceRef.current) {
        await document.exitFullscreen()
      } else {
        await workspaceRef.current.requestFullscreen()
      }
    } catch (error) {
      message.error(error?.message || t('note.fullscreenError', { defaultValue: '切换全屏失败，请稍后重试' }))
    }
  }

  const handleTitleBlur = async () => {
    if (!noteId || isTitleSaving) {
      setIsTitleEditing(false)
      return
    }

    const nextTitle = title.trim() || '未命名笔记'
    const currentTitle = (noteForRender?.title || '').trim() || '未命名笔记'

    if (nextTitle !== title) {
      setTitle(nextTitle)
    }

    if (nextTitle === currentTitle) {
      setIsTitleEditing(false)
      return
    }

    setIsTitleSaving(true)
    try {
      await updateName(noteId, nextTitle)
    } catch (error) {
      setTitle(currentTitle)
      message.error(error?.message || t('note.renameError', { defaultValue: '标题修改失败，请稍后重试' }))
    } finally {
      setIsTitleSaving(false)
      setIsTitleEditing(false)
    }
  }

  const handleTitleKeyDown = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      await handleTitleBlur()
    }

    if (event.key === 'Escape') {
      setTitle(noteForRender?.title || '未命名笔记')
      setIsTitleEditing(false)
      titleInputRef.current?.blur()
    }
  }

  const handleDeleteNote = async () => {
    if (!noteId || isDeletePending) {
      return false
    }

    setIsDeletePending(true)
    let nextRoute = null
    let nextRouteState = null
    try {
      const nextNote = getAdjacentWorkspaceNote(sectionNotes, noteId)
      await deleteNote(noteId)
      nextRoute = nextNote
        ? getWorkspaceDetailPath(currentSection, nextNote)
        : `/cloudnote/${currentSection}`
      nextRouteState = nextNote ? { note: nextNote } : null
      return true
    } catch (error) {
      message.error(error?.message || t('note.deleteError', { defaultValue: '删除失败，请稍后重试' }))
      return false
    } finally {
      setIsDeletePending(false)
      if (nextRoute) {
        navigate(nextRoute, {
          replace: true,
          ...(nextRouteState ? { state: nextRouteState } : {}),
        })
      }
    }
  }

  const handleRestoreNote = async () => {
    if (!noteId || isRestorePending) {
      return
    }

    setIsRestorePending(true)
    try {
      await restoreNote(noteId)
      message.success(t('recycleBin.restoreSuccess', { defaultValue: '还原成功' }))
      navigate('/cloudnote/recent')
    } catch (error) {
      message.error(error?.message || t('recycleBin.restoreError', { defaultValue: '还原失败，请稍后重试' }))
    } finally {
      setIsRestorePending(false)
    }
  }

  const handlePermanentDeleteNote = async () => {
    if (!noteId || isDeletePending) {
      return false
    }

    setIsDeletePending(true)
    let nextRoute = null
    let nextRouteState = null
    try {
      const nextNote = getAdjacentWorkspaceNote(sectionNotes, noteId)
      await permanentDeleteNote(noteId)
      nextRoute = nextNote
        ? getWorkspaceDetailPath('recyclebin', nextNote)
        : '/cloudnote/recyclebin'
      nextRouteState = nextNote ? { note: nextNote } : null
      return true
    } catch (error) {
      message.error(error?.message || t('recycleBin.deleteError', { defaultValue: '永久删除失败，请稍后重试' }))
      return false
    } finally {
      setIsDeletePending(false)
      if (nextRoute) {
        navigate(nextRoute, {
          replace: true,
          ...(nextRouteState ? { state: nextRouteState } : {}),
        })
      }
    }
  }

  const moreMenuItems = [
    {
      key: 'more-title',
      label: (
        <span style={{ color: 'rgba(16,34,58,0.72)', cursor: 'default' }}>
          {t('note.moreActions', { defaultValue: '更多操作' })}
        </span>
      ),
      disabled: true,
    },
    {
      key: 'history',
      icon: <UxIcon name="history" size={16} color="rgba(16,34,58,0.72)" />,
      label: t('note.history', { defaultValue: '历史版本' }),
    },
  ]

  const handleMoreMenuClick = ({ key }) => {
    if (key === 'history') {
      setHistoryPanelOpen(true)
      return
    }
  }

  const handleToggleVoicePanel = (source = 'toolbar') => {
    trackEvent('voice_panel_toggle', {
      noteId: String(noteId || ''),
      showVoiceEditor,
      nextVisible: !voicePanelVisible,
      source,
    })
    setVoicePanelVisible((value) => !value)
  }

  const openDeleteConfirm = (mode) => {
    if (isDeletePending) {
      return
    }

    setDeleteConfirmMode(mode)
    setDeleteConfirmOpen(true)
  }

  const closeDeleteConfirm = () => {
    if (isDeletePending) {
      return
    }

    setDeleteConfirmOpen(false)
  }

  const handleConfirmDelete = async () => {
    const ok = deleteConfirmMode === 'permanent'
      ? await handlePermanentDeleteNote()
      : await handleDeleteNote()

    if (ok) {
      setDeleteConfirmOpen(false)
    }
  }

  const handleVoiceTriggerClick = () => {
    if (!noteId || isDeletedNote) {
      return
    }

    if (showVoiceEditor) {
      handleToggleVoicePanel('header_button')
      return
    }

    trackEvent('voice_prompt_open', {
      noteId: String(noteId || ''),
      source: 'header_button',
    })
    setVoicePromptChoice('zh-CN')
    setVoicePromptOpen(true)
  }

  const handleConfirmVoicePrompt = () => {
    setVoicePromptOpen(false)
    setForcedVoiceEditorNoteId(noteId || null)
    setVoicePanelVisible(true)
    setVoiceAutoStartToken((token) => (typeof token === 'number' ? token + 1 : 1))
    trackEvent('voice_prompt_confirm', {
      noteId: String(noteId || ''),
      language: voicePromptChoice,
      autoStart: true,
    })
    message.success(t('voice.startedRealtime', { defaultValue: '已开启语音转录' }))
  }

  if (showSectionLoadingState) {
    return <WorkspaceStateView loading title={sectionEmptyState.title} description={sectionEmptyState.description} />
  }

  if (showSectionEmptyState) {
    return <WorkspaceStateView title={sectionEmptyState.title} description={sectionEmptyState.description} />
  }

  return (
    <section style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      position: 'relative',
      height: '100%',
      minWidth: 0,
    }} ref={workspaceRef}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 60,
          padding: '0 20px 0 18px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'rgba(255,255,255,0.98)',
          flexShrink: 0,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          {isTitleEditing ? (
            <div
              ref={titleEditorRef}
              data-testid="note-title-editor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                position: 'relative',
                minWidth: 88,
                maxWidth: 'min(360px, 100%)',
                width: titleEditorWidth ? `${titleEditorWidth}px` : 'auto',
                height: 46,
                padding: '0 10px',
                border: '1px solid rgba(10,89,247,0.32)',
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
                boxSizing: 'border-box',
              }}
            >
              <span
                ref={titleMeasureRef}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  whiteSpace: 'pre',
                  pointerEvents: 'none',
                  fontSize: 18,
                  lineHeight: '40px',
                  fontWeight: 700,
                }}
              >
                {title || ' '}
              </span>
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                variant="borderless"
                disabled={isTitleSaving || isDeletedNote}
                aria-label="笔记标题"
                style={{
                  width: '100%',
                  height: 40,
                  lineHeight: '40px',
                  fontSize: 18,
                  color: '#10223a',
                  paddingInline: 0,
                  fontWeight: 700,
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletedNote) {
                    setIsTitleEditing(true)
                  }
                }}
                aria-label="编辑笔记标题"
                style={{
                  minHeight: 40,
                  lineHeight: '40px',
                  fontSize: 18,
                  color: '#10223a',
                  padding: 0,
                  fontWeight: 700,
                  minWidth: 0,
                  maxWidth: 320,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: isDeletedNote ? 'default' : 'text',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayTitle || '未命名笔记'}
              </button>

              {showVoiceTrigger ? (
                <Button
                  type="text"
                  aria-label={showVoiceEditor
                    ? t('voice.recordsTag', { defaultValue: '语音记录' })
                    : t('voice.openTranscription', { defaultValue: '开启语音转录' })}
                  icon={<SoundOutlined style={{ fontSize: 9 }} />}
                  onClick={handleVoiceTriggerClick}
                  style={{
                    height: 20,
                    minHeight: 20,
                    padding: '0 8px',
                    borderRadius: 999,
                    color: 'var(--primary)',
                    background: 'var(--primary-soft)',
                    fontWeight: 700,
                    fontSize: 11,
                    lineHeight: '18px',
                    boxShadow: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  {t('voice.recordsTag', { defaultValue: '语音记录' })}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <ToolbarIconButton
            title={isFullscreen
              ? t('note.exitFullscreen', { defaultValue: '退出全屏' })
              : t('note.fullscreen', { defaultValue: '全屏' })}
            tooltipTitle={isFullscreen
              ? t('note.exitFullscreen', { defaultValue: '退出全屏' })
              : t('note.enterFullscreen', { defaultValue: '进入全屏' })}
            icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={handleToggleFullscreen}
            active={isFullscreen}
          />
          <ToolbarIconButton
            title={t('note.share', { defaultValue: '分享' })}
            tooltipTitle={t('note.shareNote', { defaultValue: '分享笔记' })}
            icon={<ShareAltOutlined />}
            onClick={() => {
              trackEvent('share_dialog_open', {
                noteId: String(noteId || ''),
                source: 'toolbar_button',
              })
              setShareDialogOpen(true)
            }}
            disabled={!noteId || isDeletedNote}
            active={isShared}
          />
          <ToolbarIconButton
            title={isStarred ? t('note.unstar', { defaultValue: '取消收藏' }) : t('note.star', { defaultValue: '收藏' })}
            tooltipTitle={isStarred
              ? t('note.unstarNote', { defaultValue: '取消收藏' })
              : t('note.starNote', { defaultValue: '收藏笔记' })}
            icon={isStarred ? <StarFilled /> : <StarOutlined />}
            onClick={handleToggleStar}
            loading={isStarPending}
            disabled={!noteId || isDeletedNote}
            active={isStarred}
            activeColor="#d97706"
          />
          {isDeletedNote ? (
            <>
              <ToolbarIconButton
                title={t('recycleBin.restore', { defaultValue: '还原' })}
                tooltipTitle={t('note.restoreNoteAction', { defaultValue: '还原笔记' })}
                icon={<RollbackOutlined />}
                onClick={handleRestoreNote}
                loading={isRestorePending}
                disabled={!noteId}
              />
              <ToolbarIconButton
                title={t('recycleBin.permanentDelete', { defaultValue: '永久删除' })}
                tooltipTitle={t('note.permanentDeleteNoteAction', { defaultValue: '永久删除笔记' })}
                icon={<DeleteOutlined />}
                danger
                loading={isDeletePending}
                disabled={!noteId || isDeletePending}
                onClick={() => openDeleteConfirm('permanent')}
              />
            </>
          ) : (
            <ToolbarIconButton
              title={t('note.delete', { defaultValue: '删除' })}
              tooltipTitle={t('note.deleteNoteAction', { defaultValue: '删除笔记' })}
              icon={<DeleteOutlined />}
              danger
              loading={isDeletePending}
              disabled={!noteId || isDeletePending}
              onClick={() => openDeleteConfirm('delete')}
            />
          )}
          <Dropdown menu={{ items: moreMenuItems, onClick: handleMoreMenuClick }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              aria-label={t('note.more', { defaultValue: '更多' })}
              title={t('note.moreActions', { defaultValue: '更多操作' })}
              icon={<MoreOutlined />}
              disabled={!noteId}
              className="cloudnote-icon-action-btn cloudnote-icon-action-btn--toolbar"
              style={{
                minWidth: 'auto',
                width: 32,
                height: 32,
                padding: 0,
                borderRadius: 10,
                color: '#64748b',
                fontSize: 16,
                lineHeight: 1,
              }}
            />
          </Dropdown>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {noteForRender ? (
            <EditorFactory
              key={noteId || 'text-editor'}
              type={useVoiceShell ? 'voice' : (noteForRender?.type || 'text')}
              note={noteForRender}
              onNoteRefresh={noteId ? () => loadNoteById(noteId).catch(() => {}) : null}
              readOnly={editorReadOnly}
              voicePanelVisible={useVoiceShell ? voicePanelVisible : false}
              onVoicePanelToggle={handleToggleVoicePanel}
              autoStartRecordingKey={useVoiceShell ? voiceAutoStartToken : null}
              autoStartLanguage={useVoiceShell ? voicePromptChoice : null}
            />
            ) : showEmptyState ? (
              <EmptyState
                title={emptyState.title}
                description={emptyState.description}
                style={{
                  flex: 1,
                  minHeight: 0,
                }}
              />
            ) : isTransitioningNote ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(100,116,139,0.72)',
                  fontSize: 14,
                }}
              >
                {t('note.loading', { defaultValue: '正在加载笔记...' })}
              </div>
            ) : null}
          </div>

          {(isLoading || isTransitioningNote) && !noteForRender ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                background: 'rgba(255,255,255,0.72)',
              }}
            >
              <Spin />
            </div>
          ) : null}
        </div>

        <HistorySidebar
          open={historyPanelOpen}
          noteId={noteId}
          onClose={() => setHistoryPanelOpen(false)}
          onRestored={() => {
            if (noteId) {
              loadNoteById(noteId).catch(() => {})
            }
          }}
        />
      </div>

      <SharePanelDialog
        open={shareDialogOpen}
        noteId={noteId}
        onClose={() => {
          setShareDialogOpen(false)
        }}
        onShareStateLoaded={({ noteId: changedNoteId, isShared, shareDetail, shareCode, shareUrl }) => {
          const targetNoteId = changedNoteId || noteId
          if (!targetNoteId) {
            return
          }

          syncNoteShareState(targetNoteId, isShared, {
            ...shareDetail,
            shareCode,
            shareUrl,
          })
        }}
        onShareChanged={async ({ noteId: changedNoteId, isShared, shareDetail, shareCode, shareUrl }) => {
          const targetNoteId = changedNoteId || noteId
          if (!targetNoteId) {
            return
          }

          syncNoteShareState(targetNoteId, isShared, {
            ...shareDetail,
            shareCode,
            shareUrl,
          })

          await fetchMyShares().catch(() => {})
        }}
      />

      <VoicePromptModal
        open={voicePromptOpen}
        selectedLanguage={voicePromptChoice}
        onSelectLanguage={setVoicePromptChoice}
        onConfirm={handleConfirmVoicePrompt}
        onCancel={() => {
          setVoicePromptOpen(false)
          setForcedVoiceEditorNoteId(null)
          setVoiceAutoStartToken(null)
          setVoicePromptChoice('zh-CN')
        }}
      />

      <Modal
        open={deleteConfirmOpen}
        centered
        title={deleteConfirmMode === 'permanent'
          ? t('recycleBin.permanentDelete', { defaultValue: '永久删除' })
          : t('note.delete', { defaultValue: '删除' })}
        okText={deleteConfirmMode === 'permanent'
          ? t('common.delete', { defaultValue: '删除' })
          : t('common.confirm', { defaultValue: '确认' })}
        cancelText={t('common.cancel', { defaultValue: '取消' })}
        okButtonProps={{
          danger: true,
          loading: isDeletePending,
          style: {
            height: 40,
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: 'none',
          },
        }}
        cancelButtonProps={{
          style: {
            height: 40,
            borderRadius: 12,
            borderColor: 'rgba(15,23,42,0.08)',
            color: '#10223a',
            fontWeight: 600,
            boxShadow: 'none',
          },
        }}
        onOk={handleConfirmDelete}
        onCancel={closeDeleteConfirm}
        destroyOnHidden
        styles={{
          content: {
            borderRadius: 22,
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          },
          header: {
            paddingBottom: 8,
          },
          body: {
            paddingTop: 4,
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.32)',
          },
        }}
      >
        <div style={{ color: '#475569', lineHeight: 1.7 }}>
          {deleteConfirmMode === 'permanent'
            ? t('recycleBin.confirmDelete', { defaultValue: '确定要永久删除吗？删除后无法恢复。' })
            : t('note.confirmDelete', { defaultValue: '确定要删除此笔记吗？删除后可在回收站恢复。' })}
        </div>
      </Modal>
    </section>
  )
}

function ToolbarIconButton({
  title,
  tooltipTitle,
  icon,
  onClick,
  danger = false,
  loading = false,
  disabled = false,
  active = false,
  activeColor,
}) {
  return (
    <Tooltip
      title={tooltipTitle || title}
      placement="bottom"
      color="#2f3136"
      mouseEnterDelay={0.1}
      mouseLeaveDelay={0.05}
    >
      <Button
        type="text"
        aria-label={title}
        icon={icon}
        onClick={onClick}
        loading={loading}
        disabled={disabled}
        className={[
          'cloudnote-icon-action-btn',
          'cloudnote-icon-action-btn--toolbar',
          danger ? 'cloudnote-icon-action-btn--danger' : '',
          active ? 'cloudnote-icon-action-btn--active' : '',
        ].filter(Boolean).join(' ')}
        style={{
          minWidth: 40,
          width: 40,
          height: 40,
          padding: 0,
          borderRadius: 12,
          color: danger ? '#ef4444' : active ? (activeColor || '#2563eb') : '#64748b',
          fontSize: 16,
          lineHeight: 1,
        }}
      />
    </Tooltip>
  )
}

export default EditorWorkspace
