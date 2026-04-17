import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Modal, Result, Select, Spin, message } from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
import EditorFactory from '@/components/editors/EditorFactory'
import useNotebook from '@/hooks/useNotebook'
import authService from '@/services/authService'
import shareService from '@/services/shareService'
import noteService from '@/services/noteService'
import { rememberPostLoginRedirect } from '@/utils/authNavigation'

function SharedNoteViewerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notebooks, fetchNotebooks } = useNotebook()
  const currentUserId = authService.getUserId()
  const [sharedNote, setSharedNote] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isStarPending, setIsStarPending] = useState(false)
  const [isSavePending, setIsSavePending] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [targetNotebookId, setTargetNotebookId] = useState(null)

  useEffect(() => {
    let active = true

    const loadSharedNote = async () => {
      if (!id) {
        setSharedNote(null)
        setError('分享笔记不存在')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')
      try {
        const detail = await shareService.getSharedNote(id)
        if (!active) {
          return
        }
        setSharedNote(detail || null)
      } catch (loadError) {
        if (!active) {
          return
        }
        setSharedNote(null)
        setError(loadError?.message || '分享笔记加载失败')
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadSharedNote()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    fetchNotebooks().catch(() => {})
  }, [fetchNotebooks])

  const displayUpdatedAt = useMemo(() => {
    if (!sharedNote?.updatedAt) {
      return ''
    }

    return new Date(sharedNote.updatedAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }, [sharedNote?.updatedAt])

  const editorNote = useMemo(() => {
    if (!sharedNote?.id) {
      return null
    }

    return {
      ...sharedNote,
      id: sharedNote.id,
      type: sharedNote.type || 'text',
      status: 'active',
    }
  }, [sharedNote])

  const notebookOptions = useMemo(
    () => notebooks
      .filter((item) => item?.id)
      .map((item) => ({
        value: item.id,
        label: item.name || '未命名笔记本',
      })),
    [notebooks]
  )

  const isShareOwner = Boolean(
    sharedNote?.ownerUserId
      && currentUserId
      && String(sharedNote.ownerUserId) === String(currentUserId)
  )

  const handleToggleStar = async () => {
    if (!sharedNote?.id || isStarPending || isShareOwner) {
      return
    }

    if (!authService.isAuthenticated()) {
      rememberPostLoginRedirect(`/cloudnote/shares/${id}`)
      navigate('/login', { replace: true, state: { from: `/cloudnote/shares/${id}` } })
      return
    }

    setIsStarPending(true)
    const nextIsStarred = !Boolean(sharedNote.isStarred)

    try {
      if (nextIsStarred) {
        await noteService.starNote(sharedNote.id)
        message.success('已加入星标笔记')
      } else {
        await noteService.unstarNote(sharedNote.id)
        message.success('已取消星标')
      }

      setSharedNote((current) => (
        current
          ? { ...current, isStarred: nextIsStarred }
          : current
      ))
    } catch (starError) {
      message.error(starError?.message || '星标操作失败')
    } finally {
      setIsStarPending(false)
    }
  }

  const handleSaveNote = () => {
    if (!sharedNote?.id || isSavePending || isShareOwner) {
      return
    }

    if (!authService.isAuthenticated()) {
      rememberPostLoginRedirect(`/cloudnote/shares/${id}`)
      navigate('/login', { replace: true, state: { from: `/cloudnote/shares/${id}` } })
      return
    }

    setTargetNotebookId((current) => current || notebookOptions[0]?.value || null)
    setSaveDialogOpen(true)
  }

  const handleConfirmSaveNote = async () => {
    if (!sharedNote?.id || !targetNotebookId || isSavePending || isShareOwner) {
      return
    }

    setIsSavePending(true)
    try {
      const copied = await noteService.copyNote(sharedNote.id, targetNotebookId)
      message.success('笔记已保存到你的空间')
      setSaveDialogOpen(false)
      if (copied?.id) {
        navigate(`/cloudnote/recent/${copied.id}`)
      }
    } catch (saveError) {
      message.error(saveError?.message || '保存笔记失败')
    } finally {
      setIsSavePending(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface)',
        padding: 12,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          minHeight: 'calc(100vh - 24px)',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 28,
          border: '1px solid rgba(226,232,240,0.78)',
          boxShadow: '0 20px 48px rgba(15,23,42,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '16px 24px',
            borderBottom: '1px solid rgba(226,232,240,0.7)',
            background: 'rgba(255,255,255,0.96)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/cloudnote/recent')}
              style={{
                width: 38,
                minWidth: 38,
                height: 38,
                borderRadius: 999,
                border: '1px solid rgba(226,232,240,0.9)',
                color: '#475569',
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1677ff', marginBottom: 2 }}>
                WeLink 云笔记
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.25,
                  fontWeight: 800,
                  color: '#10223a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 'min(56vw, 760px)',
                }}
              >
                {sharedNote?.title || '未命名笔记'}
              </div>
              {displayUpdatedAt ? (
                <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(100,116,139,0.88)' }}>
                  最近修改 {displayUpdatedAt}
                </div>
              ) : null}
            </div>
          </div>

          {!isShareOwner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Button
                icon={sharedNote?.isStarred ? <StarFilled /> : <StarOutlined />}
                onClick={handleToggleStar}
                loading={isStarPending}
                disabled={!sharedNote?.id}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 12,
                  borderColor: sharedNote?.isStarred ? 'rgba(245,158,11,0.2)' : 'rgba(226,232,240,0.9)',
                  color: sharedNote?.isStarred ? '#d97706' : '#334155',
                  background: sharedNote?.isStarred ? 'rgba(255,247,237,0.96)' : '#fff',
                  fontWeight: 600,
                }}
              >
                星标笔记
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveNote}
                loading={isSavePending}
                disabled={!sharedNote?.id}
                style={{
                  height: 40,
                  padding: '0 18px',
                  borderRadius: 12,
                  fontWeight: 600,
                  boxShadow: '0 10px 24px rgba(37,99,235,0.24)',
                }}
              >
                保存笔记
              </Button>
            </div>
          ) : null}
        </header>

        <main
          style={{
            flex: 1,
            minHeight: 0,
            padding: '20px 28px 28px',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1360,
              minHeight: 0,
              borderRadius: 24,
              background: '#fff',
              border: '1px solid rgba(226,232,240,0.88)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isLoading ? (
              <CenteredShell>
                <Spin size="large" />
              </CenteredShell>
            ) : error ? (
              <CenteredShell>
                <Result
                  status="warning"
                  title="分享笔记暂时无法访问"
                  subTitle={error}
                  extra={(
                    <Button type="primary" onClick={() => navigate('/cloudnote/recent')}>
                      返回云笔记
                    </Button>
                  )}
                />
              </CenteredShell>
            ) : (
              <SharedNoteEditorView note={editorNote} />
            )}
          </div>
        </main>
      </div>

      <Modal
        title="选择笔记本"
        open={saveDialogOpen}
        centered
        destroyOnHidden
        onCancel={() => {
          if (!isSavePending) {
            setSaveDialogOpen(false)
          }
        }}
        onOk={handleConfirmSaveNote}
        okText="保存"
        cancelText="取消"
        confirmLoading={isSavePending}
        okButtonProps={{ disabled: !targetNotebookId }}
      >
        <div style={{ marginBottom: 12, color: 'rgba(16,34,58,0.7)' }}>
          请选择要保存到的笔记本
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="请选择目标笔记本"
          value={targetNotebookId}
          onChange={setTargetNotebookId}
          options={notebookOptions}
        />
      </Modal>
    </div>
  )
}

function CenteredShell({ children }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      {children}
    </div>
  )
}

function SharedNoteEditorView({ note }) {
  if (!note?.id) {
    return null
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
      }}
    >
      <EditorFactory
        key={`shared-${note.id}`}
        type={note.type || 'text'}
        note={note}
        readOnly
        onChange={() => {}}
        onSave={() => {}}
      />
    </div>
  )
}

export default SharedNoteViewerPage
