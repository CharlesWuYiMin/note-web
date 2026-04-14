﻿import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Dropdown, Empty, Input, Modal, Popconfirm, Spin } from 'antd'
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
import UxIcon from '@/components/common/UxIcon'
import EditorFactory from '@/components/editors/EditorFactory'
import useNote from '@/hooks/useNote'
import { useMemo } from 'react'
import { useRef } from 'react'
import SharePanelDialog from '@/components/share/SharePanelDialog'
import VoicePromptModal from '@/components/voice/VoicePromptModal'

function normalizeEditorValue(content) {
  if (content == null) {
    return ''
  }

  return typeof content === 'string' ? content : JSON.stringify(content)
}

function hasVoiceRecords(note) {
  if (!note) {
    return false
  }

  if (Array.isArray(note.voiceNote) && note.voiceNote.length > 0) {
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

function getWorkspaceEmptyState(pathname, hasRouteId) {
  if (pathname.startsWith('/cloudnote/shares')) {
    return hasRouteId
      ? {
          title: '未找到分享对应的笔记',
          description: '这条分享记录已经不存在或暂时无法访问。',
        }
      : {
          title: '我的分享',
          description: '当前还没有分享记录，创建分享后会显示在这里。',
        }
  }

  if (pathname.startsWith('/cloudnote/starred') || pathname.startsWith('/cloudnote/star')) {
    return hasRouteId
      ? {
          title: '未找到这条星标笔记',
          description: '这条星标内容可能已被删除，或者暂时无法加载。',
        }
      : {
          title: '星标笔记',
          description: '当前还没有星标笔记，收藏重要内容后会显示在这里。',
        }
  }

  if (pathname.startsWith('/cloudnote/recyclebin')) {
    return hasRouteId
      ? {
          title: '未找到回收站记录',
          description: '这条删除记录可能已被清理，或者暂时无法访问。',
        }
      : {
          title: '回收站',
          description: '当前回收站里还没有内容。',
        }
  }

  if (pathname.startsWith('/cloudnote/notebooks')) {
    return hasRouteId
      ? {
          title: '未找到这条笔记记录',
          description: '这条笔记可能已被删除，或者暂时无法加载。',
        }
      : {
          title: '笔记本',
          description: '当前分类下还没有可打开的笔记。',
        }
  }

  return hasRouteId
    ? {
        title: '未找到对应笔记',
        description: '这条笔记可能已不存在，或者暂时无法访问。',
      }
    : {
        title: '近期笔记',
        description: '当前还没有可打开的笔记，创建一条新的内容后会显示在这里。',
      }
}

function EditorWorkspace() {
  const params = useParams()
  const id = params.id
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    notes,
    currentNote,
    starredNotes,
    isLoading,
    error,
    loadNoteById,
    myShares,
    deletedNotes,
    toggleStar,
    updateName,
    updateContent,
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
  const [editorValue, setEditorValue] = useState('')
  const [voicePromptOpen, setVoicePromptOpen] = useState(false)
  const [voicePromptChoice, setVoicePromptChoice] = useState('zh-CN')
  const [forcedVoiceEditorNoteId, setForcedVoiceEditorNoteId] = useState(null)
  const [voiceAutoStartToken, setVoiceAutoStartToken] = useState(null)
  const [voicePanelVisible, setVoicePanelVisible] = useState(true)
  const titleInputRef = useRef(null)
  const editorBaselineRef = useRef('')
  const routeNotePreview = location.state?.note || null
  const currentRouteNote = currentNote?.id === id ? currentNote : null
  const notePreview = useMemo(() => {
    const preview = routeNotePreview
    if (preview?.id && preview.id === id) {
      return preview
    }

    if (preview?.noteId && preview.noteId === id) {
      return {
        ...preview,
        id,
      }
    }

    const collectionMatch = [currentNote, ...notes, ...starredNotes, ...deletedNotes].find((item) => item?.id === id)
      || myShares.find((item) => item?.noteId === id || item?.id === id)

    if (!collectionMatch) {
      return preview
    }

    if (collectionMatch?.noteId && !collectionMatch.id) {
      return {
        ...collectionMatch,
        id: collectionMatch.noteId,
      }
    }

    return collectionMatch
  }, [currentNote, deletedNotes, id, myShares, notes, routeNotePreview, starredNotes])
  const noteForRender = notePreview || currentRouteNote || null
  const noteId = noteForRender?.id || id || null
  const isStarred = Boolean(noteForRender?.isStarred)
  const isRecycleBinRoute = location.pathname.startsWith('/cloudnote/recyclebin')
  const isDeletedNote = isRecycleBinRoute || noteForRender?.status === 'deleted'
  const hasVoiceMaterials = hasVoiceRecords(noteForRender)
  const showVoiceEditor = forcedVoiceEditorNoteId === noteId || hasVoiceMaterials
  const useVoiceShell = Boolean(noteForRender) && showVoiceEditor
  const showVoiceTrigger = Boolean(noteForRender) && !isDeletedNote && (showVoiceEditor || noteForRender?.type === 'text')
  const emptyState = getWorkspaceEmptyState(location.pathname, Boolean(id))
  const displayTitle = noteForRender?.title || (id ? '未命名笔记' : emptyState.title)
  const isTransitioningNote = Boolean(id) && !noteForRender && !error
  const showEmptyState = !noteForRender && !isLoading && Boolean(error)
  const [title, setTitle] = useState(displayTitle)

  useEffect(() => {
    setEditorValue('')
    editorBaselineRef.current = ''
    setForcedVoiceEditorNoteId(null)
    setVoiceAutoStartToken(null)
    setVoicePanelVisible(true)
    setTitle(notePreview?.title || (id ? '未命名笔记' : emptyState.title))
    setIsTitleEditing(false)

    if (!id) {
      return
    }

    loadNoteById(id).catch(() => {})
  }, [emptyState.title, id, loadNoteById, notePreview?.title])

  useEffect(() => {
    if (noteForRender?.title) {
      setTitle(noteForRender.title)
      setIsTitleEditing(false)
      return
    }

    if (!noteForRender) {
      return
    }

    setTitle('未命名笔记')
    setIsTitleEditing(false)
  }, [noteForRender?.id, noteForRender?.title])

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

    setVoicePromptChoice('zh-CN')
    setVoicePromptOpen(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate, noteId])

  useEffect(() => {
    if (!isTitleEditing || !titleInputRef.current) return

    titleInputRef.current.focus({
      cursor: 'all',
    })
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
      return
    }

    setIsDeletePending(true)
    try {
      await deleteNote(noteId)
      message.success(t('note.deleteSuccess', { defaultValue: '笔记已移入回收站' }))
      navigate('/cloudnote/recyclebin')
    } catch (error) {
      message.error(error?.message || t('note.deleteError', { defaultValue: '删除失败，请稍后重试' }))
    } finally {
      setIsDeletePending(false)
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
      return
    }

    setIsDeletePending(true)
    try {
      await permanentDeleteNote(noteId)
      message.success(t('recycleBin.deleteSuccess', { defaultValue: '笔记已永久删除' }))
      navigate('/cloudnote/recyclebin')
    } catch (error) {
      message.error(error?.message || t('recycleBin.deleteError', { defaultValue: '永久删除失败，请稍后重试' }))
    } finally {
      setIsDeletePending(false)
    }
  }

  const handleEditorSave = async (nextContent) => {
    if (!noteId || isDeletedNote) {
      return
    }

    const normalizedContent = normalizeEditorValue(nextContent)
    if (normalizedContent === editorBaselineRef.current) {
      return
    }

    try {
      await updateContent(noteId, normalizedContent)
      editorBaselineRef.current = normalizedContent
    } catch (error) {
      message.error(error?.message || t('note.saveError', { defaultValue: '内容保存失败，请稍后重试' }))
    }
  }

  const moreMenuItems = [
    { key: 'history', icon: <UxIcon name="history" size={16} color="rgba(16,34,58,0.72)" />, label: t('note.history', { defaultValue: '历史版本' }) },
    { key: 'details', icon: <UxIcon name="info" size={16} color="rgba(16,34,58,0.72)" />, label: t('note.details', { defaultValue: '笔记详情' }) },
  ]

  const handleToggleVoicePanel = () => {
    setVoicePanelVisible((value) => !value)
  }

  const handleVoiceTriggerClick = () => {
    if (!noteId || isDeletedNote) {
      return
    }

    if (showVoiceEditor) {
      handleToggleVoicePanel()
      return
    }

    setVoicePromptChoice('zh-CN')
    setVoicePromptOpen(true)
  }

  const handleConfirmVoicePrompt = () => {
    setVoicePromptOpen(false)
    setForcedVoiceEditorNoteId(noteId || null)
    setVoicePanelVisible(true)
    setVoiceAutoStartToken((token) => (typeof token === 'number' ? token + 1 : 1))
    message.success('已开启语音转录')
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
          minHeight: 58,
          padding: '0 18px 0 16px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          background: '#fff',
          flexShrink: 0,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          {isTitleEditing ? (
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
                height: 40,
                lineHeight: '40px',
                fontSize: 18,
                color: '#6b7280',
                paddingInline: 0,
                fontWeight: 700,
                minWidth: 0,
                maxWidth: 300,
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletedNote) {
                    setIsTitleEditing(true)
                  }
                }}
                aria-label="编辑笔记标题"
                style={{
                  height: 40,
                  lineHeight: '40px',
                  fontSize: 18,
                  color: '#6b7280',
                  padding: 0,
                  fontWeight: 700,
                  minWidth: 0,
                  maxWidth: 300,
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
                  aria-label={showVoiceEditor ? '语音记录' : '开启语音转录'}
                  icon={<SoundOutlined style={{ fontSize: 9 }} />}
                  onClick={handleVoiceTriggerClick}
                  style={{
                    height: 20,
                    minHeight: 20,
                    padding: '0 8px',
                    borderRadius: 999,
                    color: 'var(--primary)',
                    background: 'rgba(2,86,210,0.08)',
                    fontWeight: 700,
                    fontSize: 11,
                    lineHeight: '18px',
                    boxShadow: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 2,
                    flexShrink: 0,
                  }}
                >
                  语音记录
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ToolbarIconButton
            title={isStarred ? t('note.unstar', { defaultValue: '取消收藏' }) : t('note.star', { defaultValue: '收藏' })}
            icon={isStarred ? <StarFilled /> : <StarOutlined />}
            onClick={handleToggleStar}
            loading={isStarPending}
            disabled={!noteId || isDeletedNote}
          />
          <ToolbarIconButton
            title={isFullscreen
              ? t('note.exitFullscreen', { defaultValue: '退出全屏' })
              : t('note.fullscreen', { defaultValue: '全屏' })}
            icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={handleToggleFullscreen}
          />
          <ToolbarIconButton
            title={t('note.share', { defaultValue: '分享' })}
            icon={<ShareAltOutlined />}
            onClick={() => setShareDialogOpen(true)}
            disabled={!noteId || isDeletedNote}
          />
          {isDeletedNote ? (
            <>
              <ToolbarIconButton
                title={t('recycleBin.restore', { defaultValue: '还原' })}
                icon={<RollbackOutlined />}
                onClick={handleRestoreNote}
                loading={isRestorePending}
                disabled={!noteId}
              />
              <Popconfirm
                title={t('recycleBin.confirmDelete', { defaultValue: '确定要永久删除吗？删除后无法恢复。' })}
                okText={t('common.delete', { defaultValue: '删除' })}
                cancelText={t('common.cancel', { defaultValue: '取消' })}
                onConfirm={handlePermanentDeleteNote}
                disabled={!noteId}
              >
                <span>
                  <ToolbarIconButton
                    title={t('recycleBin.permanentDelete', { defaultValue: '永久删除' })}
                    icon={<DeleteOutlined />}
                    danger
                    loading={isDeletePending}
                    disabled={!noteId}
                  />
                </span>
              </Popconfirm>
            </>
          ) : (
            <Popconfirm
              title={t('note.confirmDelete', { defaultValue: '确定要删除此笔记吗？删除后可在回收站恢复。' })}
              okText={t('common.confirm', { defaultValue: '确认' })}
              cancelText={t('common.cancel', { defaultValue: '取消' })}
              onConfirm={handleDeleteNote}
              disabled={!noteId}
            >
              <span>
                <ToolbarIconButton
                  title={t('note.delete', { defaultValue: '删除' })}
                  icon={<DeleteOutlined />}
                  danger
                  loading={isDeletePending}
                  disabled={!noteId}
                />
              </span>
            </Popconfirm>
          )}
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              aria-label={t('note.more', { defaultValue: '更多' })}
              icon={<MoreOutlined />}
              disabled={!noteId}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                color: '#64748b',
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
                value={editorValue}
                onChange={setEditorValue}
                onSave={handleEditorSave}
                onNoteRefresh={noteId ? () => loadNoteById(noteId).catch(() => {}) : null}
                readOnly={isDeletedNote}
                voicePanelVisible={useVoiceShell ? voicePanelVisible : false}
                onVoicePanelToggle={handleToggleVoicePanel}
                autoStartRecordingKey={useVoiceShell ? voiceAutoStartToken : null}
                autoStartLanguage={useVoiceShell ? voicePromptChoice : null}
              />
          ) : showEmptyState ? (
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
              <div
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '12px 20px',
                  textAlign: 'center',
                }}
              >
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={null} />
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: '#10223a' }}>
                  {emptyState.title}
                </div>
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.8, color: 'rgba(16,34,58,0.58)' }}>
                  {emptyState.description}
                </div>
              </div>
            </div>
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
              正在加载笔记...
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
              background: 'rgba(255,255,255,0.56)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Spin />
          </div>
        ) : null}
      </div>

      <SharePanelDialog
        open={shareDialogOpen}
        noteId={noteId}
        onClose={() => setShareDialogOpen(false)}
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
    </section>
  )
}

function ToolbarIconButton({ title, icon, onClick, danger = false, loading = false, disabled = false }) {
  return (
    <Button
      type="text"
      aria-label={title}
      icon={icon}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        color: danger ? '#ef4444' : '#64748b',
      }}
    />
  )
}

export default EditorWorkspace
