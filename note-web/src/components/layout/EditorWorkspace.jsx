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
import { useRef } from 'react'
import SharePanelDialog from '@/components/share/SharePanelDialog'

function normalizeEditorValue(content) {
  if (content == null) {
    return ''
  }

  return typeof content === 'string' ? content : JSON.stringify(content)
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
    currentNote,
    isLoading,
    loadNoteById,
    toggleStar,
    updateName,
    updateContent,
    deleteNote,
    restoreNote,
    permanentDeleteNote,
    setCurrentNote,
  } = useNote()
  const workspaceRef = useRef(null)
  const [title, setTitle] = useState('')
  const [isStarPending, setIsStarPending] = useState(false)
  const [isTitleSaving, setIsTitleSaving] = useState(false)
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [isDeletePending, setIsDeletePending] = useState(false)
  const [isRestorePending, setIsRestorePending] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [editorValue, setEditorValue] = useState('')
  const [voicePromptOpen, setVoicePromptOpen] = useState(false)
  const [voicePromptChoice, setVoicePromptChoice] = useState('voice')
  const [forcedVoiceEditorNoteId, setForcedVoiceEditorNoteId] = useState(null)
  const [voiceAutoStartToken, setVoiceAutoStartToken] = useState(0)
  const [voicePanelVisible, setVoicePanelVisible] = useState(true)
  const titleInputRef = useRef(null)
  const editorBaselineRef = useRef('')
  const noteId = currentNote?.id || null
  const isStarred = Boolean(currentNote?.isStarred)
  const isRecycleBinRoute = location.pathname.startsWith('/cloudnote/recyclebin')
  const isDeletedNote = isRecycleBinRoute || currentNote?.status === 'deleted'
  const hasVoiceMaterials = Array.isArray(currentNote?.voiceNote) && currentNote.voiceNote.length > 0
  const showVoiceEditor = forcedVoiceEditorNoteId === noteId || hasVoiceMaterials
  const emptyState = getWorkspaceEmptyState(location.pathname, Boolean(id))
  const showEmptyState = !currentNote && !isLoading

  useEffect(() => {
    setCurrentNote(null)
    setEditorValue('')
    editorBaselineRef.current = ''
    setForcedVoiceEditorNoteId(null)
    setVoiceAutoStartToken(0)
    setVoicePanelVisible(true)
    setTitle(emptyState.title)
    setIsTitleEditing(false)

    if (!id) {
      return
    }

    loadNoteById(id).catch(() => {})
  }, [emptyState.title, id, loadNoteById, setCurrentNote])

  useEffect(() => {
    if (!currentNote) return
    setTitle(currentNote.title || '未命名笔记')
    setIsTitleEditing(false)
  }, [currentNote])

  useEffect(() => {
    if (!location.state?.openVoicePrompt || !noteId) {
      return
    }

    setVoicePromptChoice('voice')
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
    if (!noteId || isStarPending) {
      return
    }

    setIsStarPending(true)
    try {
      await toggleStar({
        ...currentNote,
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
    const currentTitle = (currentNote?.title || '').trim() || '未命名笔记'

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
      setTitle(currentNote?.title || '未命名笔记')
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

  const handleConfirmVoicePrompt = () => {
    setVoicePromptOpen(false)
    if (voicePromptChoice === 'voice') {
      setForcedVoiceEditorNoteId(noteId || null)
      setVoicePanelVisible(true)
      setVoiceAutoStartToken((token) => token + 1)
      message.success('已开启语音转录')
      return
    }

    setForcedVoiceEditorNoteId(null)
    setVoiceAutoStartToken(0)
    message.info('已保留为文本笔记')
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
                {currentNote ? (title || '未命名笔记') : emptyState.title}
              </button>

              {showVoiceEditor ? (
                <Button
                  type="text"
                  aria-label="语音记录"
                  icon={<SoundOutlined style={{ fontSize: 9 }} />}
                  onClick={handleToggleVoicePanel}
                  style={{
                    height: 18,
                    minHeight: 18,
                    padding: '0 7px',
                    borderRadius: 999,
                    color: 'var(--primary)',
                    background: 'rgba(2,86,210,0.08)',
                    fontWeight: 700,
                  fontSize: 11,
                  lineHeight: '16px',
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
          {currentNote ? (
            <EditorFactory
              key={noteId || 'text-editor'}
              type={showVoiceEditor ? 'voice' : (currentNote?.type || 'text')}
              note={currentNote}
              value={editorValue}
              onChange={setEditorValue}
              onSave={handleEditorSave}
              onNoteRefresh={noteId ? () => loadNoteById(noteId).catch(() => {}) : null}
              readOnly={isDeletedNote}
              voicePanelVisible={showVoiceEditor ? voicePanelVisible : false}
              onVoicePanelToggle={handleToggleVoicePanel}
              autoStartRecordingKey={showVoiceEditor ? voiceAutoStartToken : null}
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
          ) : null}
        </div>

        {isLoading && !currentNote ? (
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

      <Modal
        open={voicePromptOpen}
        onCancel={() => {
          setVoicePromptOpen(false)
          setForcedVoiceEditorNoteId(null)
          setVoiceAutoStartToken(0)
        }}
        footer={null}
        centered
        width={520}
        title={null}
        styles={{
          body: {
            padding: 0,
          },
          content: {
            borderRadius: 24,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
          },
        }}
      >
        <div style={{ padding: '24px 26px 22px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 18 }}>是否开启语音转录</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 18 }}>创建后先按文本笔记保存，需要时再打开语音转录面板。</div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
            {[
              { key: 'voice', label: '开启', hint: '打开语音特性框' },
              { key: 'text', label: '仅文本', hint: '保持普通文本笔记' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setVoicePromptChoice(option.key)}
                style={{
                  flex: 1,
                  minHeight: 96,
                  borderRadius: 18,
                  border: voicePromptChoice === option.key ? '2px solid rgba(2,86,210,0.65)' : '1px solid rgba(226,232,240,0.95)',
                  background: voicePromptChoice === option.key ? 'rgba(2,86,210,0.08)' : '#fff',
                  color: voicePromptChoice === option.key ? 'var(--primary)' : '#111827',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: voicePromptChoice === option.key ? '0 10px 24px rgba(2,86,210,0.10)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div>{option.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.78 }}>{option.hint}</div>
              </button>
            ))}
          </div>

          <div style={{ borderRadius: 18, background: 'rgba(248,250,252,0.96)', padding: '18px 18px 16px', marginBottom: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 10 }}>注意事项</div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
              语音记录功能受录音环境与拾音设备影响较大。为保证转写效果，建议使用有线耳机进行录制。
            </div>
          </div>

          <Button
            type="primary"
            block
            size="large"
            onClick={handleConfirmVoicePrompt}
            style={{
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0057d7 0%, #1f4fff 100%)',
              border: 'none',
              fontWeight: 800,
              fontSize: 16,
              boxShadow: '0 14px 28px rgba(2,86,210,0.24)',
            }}
          >
            {voicePromptChoice === 'voice' ? '开启语音转录' : '进入文本笔记'}
          </Button>
        </div>
      </Modal>
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
