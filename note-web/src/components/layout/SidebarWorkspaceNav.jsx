import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input, Tooltip, message } from 'antd'
import {
  ApartmentOutlined,
  AudioOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  BookOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileOutlined,
  FileTextOutlined,
  FolderOutlined,
  HighlightOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  ShareAltOutlined,
  StarOutlined,
} from '@ant-design/icons'
import useNote from '@/hooks/useNote'
import useNotebook from '@/hooks/useNotebook'
import useNotebookStore from '@/store/useNotebookStore'
import { getLocalizedNotebookName } from '@/utils/notebookLocalization'

const COLLAPSED_TILE_SIZE = 56

function getNoteCreateOptions(t) {
  return [
    { key: 'text', label: t('sidebar.create.textNote', { defaultValue: '文本笔记' }), type: 'text', icon: <FileTextOutlined />, color: '#1677ff', bg: 'linear-gradient(180deg, #eef6ff, #d8ebff)' },
    { key: 'voice', label: t('sidebar.create.voiceNote', { defaultValue: '语音笔记' }), type: 'voice', icon: <AudioOutlined />, color: '#6d28d9', bg: 'linear-gradient(180deg, #f3edff, #e5dbff)' },
    { key: 'handwritten', label: t('sidebar.create.handwrittenNote', { defaultValue: '手写笔记' }), type: 'handwritten', icon: <HighlightOutlined />, color: '#ea580c', bg: 'linear-gradient(180deg, #fff1eb, #ffe1d6)' },
    { key: 'outline', label: t('sidebar.create.outlineNote', { defaultValue: '大纲笔记' }), type: 'outline', icon: <ApartmentOutlined />, color: '#0891b2', bg: 'linear-gradient(180deg, #e6fbff, #d4f4fb)' },
    { key: 'notebook', label: t('nav.notebooks', { defaultValue: '笔记本' }), icon: <BookOutlined />, color: '#ca8a04', bg: 'linear-gradient(180deg, #fff7da, #ffefb0)' },
  ]
}

function navItemStyle({ collapsed, isActive }) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: collapsed ? '0' : '12px 14px',
    width: collapsed ? COLLAPSED_TILE_SIZE : '100%',
    minHeight: collapsed ? COLLAPSED_TILE_SIZE : 46,
    borderRadius: collapsed ? 18 : 14,
    cursor: 'pointer',
    justifyContent: collapsed ? 'center' : 'flex-start',
    alignSelf: collapsed ? 'center' : 'stretch',
    background: isActive ? '#ffffff' : 'transparent',
    color: isActive ? 'var(--primary)' : 'rgba(16,34,58,0.74)',
    fontWeight: isActive ? 700 : 500,
    fontSize: collapsed ? 16 : 17,
    boxShadow: isActive ? '0 10px 22px rgba(16,34,58,0.08)' : 'none',
    transition: 'all 0.15s ease',
  }
}

function NewCreatePanel({ onCreate, options, collapsed }) {
  return (
    <div
      style={{
        width: collapsed ? 244 : '100%',
        minWidth: collapsed ? 244 : 'auto',
        maxWidth: collapsed ? 244 : '100%',
        boxSizing: 'border-box',
        padding: collapsed ? 10 : '12px 14px 10px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid rgba(226,232,240,0.9)',
        boxShadow: '0 14px 32px rgba(16,34,58,0.10)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          columnGap: collapsed ? 8 : 8,
          rowGap: collapsed ? 8 : 6,
        }}
      >
        {options.map((option, index) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onCreate(option)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 16,
              padding: collapsed ? '12px 10px 10px' : '10px 6px 8px',
              minHeight: collapsed ? 'auto' : 96,
              gridColumn: !collapsed && index === options.length - 1 ? '1 / 2' : 'auto',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'rgba(248,250,252,0.96)'
              event.currentTarget.style.boxShadow = '0 12px 24px rgba(16,34,58,0.08)'
              event.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent'
              event.currentTarget.style.boxShadow = 'none'
              event.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div
              style={{
                width: collapsed ? 52 : 42,
                height: collapsed ? 52 : 42,
                margin: collapsed ? '0 auto 10px' : '0 auto 8px',
                borderRadius: collapsed ? 16 : 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: option.color,
                fontSize: collapsed ? 22 : 18,
                background: option.bg,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
              }}
            >
              {option.icon}
            </div>
            <div
              style={{
                fontSize: collapsed ? 14 : 14,
                fontWeight: 600,
                color: '#111827',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {option.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function NotebookActionMenuPanel({ items, onAction }) {
  const toneStyles = {
    blue: { color: '#1677ff', background: 'rgba(22,119,255,0.10)' },
    cyan: { color: '#0891b2', background: 'rgba(8,145,178,0.10)' },
    orange: { color: '#ea580c', background: 'rgba(234,88,12,0.10)' },
    purple: { color: '#6d28d9', background: 'rgba(109,40,217,0.10)' },
    gray: { color: '#64748b', background: 'rgba(100,116,139,0.10)' },
    red: { color: '#ef4444', background: 'rgba(239,68,68,0.10)' },
  }

  return (
    <div
      style={{
        width: 156,
        padding: 8,
        borderRadius: 13,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 10px 18px rgba(16,34,58,0.10)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((item) => {
          if (item.type === 'divider') {
            return (
              <div
                key={item.key}
                style={{
                height: 1,
                  margin: '6px 5px',
                  background: 'rgba(226,232,240,0.88)',
                }}
              />
            )
          }

          const disabled = Boolean(item.disabled)
          const tone = item.tone || 'gray'
          const colors = toneStyles[tone] || toneStyles.gray
          const iconBoxSize = item.variant === 'create' ? 27 : 25
          const iconFontSize = item.variant === 'create' ? 14 : 13
          const disabledTone = {
            color: 'rgba(148,163,184,0.68)',
            background: 'rgba(148,163,184,0.10)',
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (!disabled) {
                  onAction(item.key)
                }
              }}
              disabled={disabled}
              style={{
                height: 36,
                width: '100%',
                border: 'none',
                background: 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                borderRadius: 10,
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(event) => {
                if (!disabled) {
                  event.currentTarget.style.background = item.danger
                    ? 'rgba(239,68,68,0.022)'
                    : 'rgba(2,86,210,0.018)'
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  width: iconBoxSize,
                  height: iconBoxSize,
                  borderRadius: 7,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: disabled
                    ? disabledTone.color
                    : item.danger
                      ? '#ef4444'
                      : colors.color,
                  background: disabled
                    ? disabledTone.background
                    : item.danger
                      ? 'rgba(239,68,68,0.10)'
                      : colors.background,
                  fontSize: iconFontSize,
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 15,
                  lineHeight: 1.12,
                  fontWeight: disabled ? 500 : (item.danger ? 600 : 500),
                  color: disabled
                    ? disabledTone.color
                    : (item.danger ? '#dc2626' : '#1f2937'),
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SidebarWorkspaceNav({ collapsed, onToggle, onNavigate, currentPath }) {
  const { t } = useTranslation()
  const { createNote } = useNote()
  const {
    notebooks,
    currentNotebook,
    fetchNotebooks,
    createNotebook,
    deleteNotebook,
    updateNotebook,
    moveNotebook,
    setCurrentNotebook,
  } = useNotebook()
  const [notebooksExpanded, setNotebooksExpanded] = useState(currentPath?.startsWith('/cloudnote/notebooks'))
  const [hoveredNotebookId, setHoveredNotebookId] = useState(null)
  const [editingNotebookId, setEditingNotebookId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [activeNotebookMenuId, setActiveNotebookMenuId] = useState(null)
  const [activeNotebookMenuPosition, setActiveNotebookMenuPosition] = useState(null)
  const createCloseTimerRef = useRef(null)
  const createOptions = useMemo(() => getNoteCreateOptions(t), [t])

  const navItems = [
    { key: 'recent', icon: <HistoryOutlined />, label: t('sidebar.recentNotes', { defaultValue: '近期笔记' }), path: '/cloudnote/recent' },
    { key: 'starred', icon: <StarOutlined />, label: t('sidebar.starredNotes', { defaultValue: '星标笔记' }), path: '/cloudnote/starred' },
    { key: 'shares', icon: <ShareAltOutlined />, label: t('sidebar.myShares', { defaultValue: '我的分享' }), path: '/cloudnote/shares' },
    { key: 'recyclebin', icon: <DeleteOutlined />, label: t('sidebar.recycleBin', { defaultValue: '回收站' }), path: '/cloudnote/recyclebin' },
  ]

  useEffect(() => {
    if (currentPath?.startsWith('/cloudnote/notebooks')) {
      setNotebooksExpanded(true)
      fetchNotebooks()
    }
  }, [currentPath, fetchNotebooks])

  useEffect(() => () => {
    if (createCloseTimerRef.current) {
      clearTimeout(createCloseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!activeNotebookMenuId) {
      setActiveNotebookMenuPosition(null)
      return undefined
    }

    const handleOutsideClick = (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      if (
        target.closest('[data-notebook-menu-root="true"]') ||
        target.closest('[data-notebook-menu-panel="true"]')
      ) {
        return
      }

      setActiveNotebookMenuId(null)
      setActiveNotebookMenuPosition(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [activeNotebookMenuId])

  useEffect(() => {
    if (!activeNotebookMenuId) {
      return undefined
    }

    const handleDismiss = () => {
      setActiveNotebookMenuId(null)
      setActiveNotebookMenuPosition(null)
    }

    window.addEventListener('scroll', handleDismiss, true)
    window.addEventListener('resize', handleDismiss)
    return () => {
      window.removeEventListener('scroll', handleDismiss, true)
      window.removeEventListener('resize', handleDismiss)
    }
  }, [activeNotebookMenuId])

  const sortedNotebooks = useMemo(
    () => [...notebooks].sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))),
    [notebooks]
  )

  const ensureNotebooksLoaded = async () => {
    await fetchNotebooks()
    return useNotebookStore.getState().notebooks
  }

  const resolveTargetNotebookId = async (preferredNotebookId = null) => {
    if (preferredNotebookId) {
      return preferredNotebookId
    }

    if (currentNotebook?.id) {
      return currentNotebook.id
    }

    const latestNotebooks = notebooks.length > 0 ? notebooks : await ensureNotebooksLoaded()
    const defaultNotebook = latestNotebooks.find((item) => item.isDefault) || latestNotebooks[0]
    return defaultNotebook?.id || null
  }

  const handleNotebookToggle = async () => {
    const nextExpanded = !notebooksExpanded
    setNotebooksExpanded(nextExpanded)
    if (nextExpanded) {
      await ensureNotebooksLoaded()
      if (!currentPath?.startsWith('/cloudnote/notebooks')) {
        onNavigate?.('/cloudnote/notebooks')
      }
    }
  }

  const handleNotebookCreate = async (event) => {
    event?.stopPropagation()
    closeCreatePanel()
    await ensureNotebooksLoaded()
    const defaultNotebookName = t('notebook.newNotebookName', { defaultValue: '新建笔记本' })
    const newNotebook = await createNotebook({ name: defaultNotebookName })
    setCurrentNotebook(newNotebook)
    setEditingNotebookId(newNotebook.id)
    setEditingName(newNotebook.name || defaultNotebookName)
    setNotebooksExpanded(true)
    onNavigate?.('/cloudnote/notebooks')
  }

  const handleCreateOption = async (option, preferredNotebookId = null) => {
    closeCreatePanel()

    if (option.key === 'notebook') {
      await handleNotebookCreate()
      return
    }

    const notebookId = await resolveTargetNotebookId(preferredNotebookId)
    if (!notebookId) {
      return
    }

    const note = await createNote({
      title: t('note.untitled', { defaultValue: '未命名笔记' }),
      type: option.key === 'voice' ? 'text' : option.type,
      notebookId,
    })

    if (note?.id) {
      onNavigate?.(`/cloudnote/recent/${note.id}`, option.key === 'voice' ? {
        state: {
          openVoicePrompt: true,
          source: 'voice-create',
        },
      } : undefined)
    }
  }

  const closeCreatePanel = () => {
    if (createCloseTimerRef.current) {
      clearTimeout(createCloseTimerRef.current)
      createCloseTimerRef.current = null
    }

    setCreateOpen(false)
  }

  const openCreatePanel = () => {
    if (createCloseTimerRef.current) {
      clearTimeout(createCloseTimerRef.current)
      createCloseTimerRef.current = null
    }
    setCreateOpen(true)
  }

  const scheduleCloseCreatePanel = () => {
    if (collapsed) {
      return
    }

    if (createCloseTimerRef.current) {
      clearTimeout(createCloseTimerRef.current)
    }

    createCloseTimerRef.current = setTimeout(() => {
      setCreateOpen(false)
      createCloseTimerRef.current = null
    }, 60)
  }

  const toggleCreatePanel = () => {
    if (createCloseTimerRef.current) {
      clearTimeout(createCloseTimerRef.current)
      createCloseTimerRef.current = null
    }

    setCreateOpen((prev) => !prev)
  }

  const handleNotebookClick = (notebook) => {
    setCurrentNotebook(notebook)
    onNavigate?.('/cloudnote/notebooks')
  }

  const startRenameNotebook = (notebook) => {
    if (notebook?.isDefault) {
      return
    }
    setEditingNotebookId(notebook.id)
    setEditingName(notebook.name || '')
  }

  const finishRenameNotebook = async (notebook) => {
    const nextName = editingName.trim()
    setEditingNotebookId(null)

    if (!nextName || nextName === notebook.name) {
      setEditingName('')
      return
    }

    await updateNotebook(notebook.id, { name: nextName })
    setEditingName('')
  }

  const handleNotebookMenuAction = async (key, notebook) => {
    setActiveNotebookMenuId(null)
    setActiveNotebookMenuPosition(null)

    switch (key) {
      case 'create-text':
        await handleCreateOption({ key: 'text', type: 'text' }, notebook.id)
        return
      case 'create-outline':
        await handleCreateOption({ key: 'outline', type: 'outline' }, notebook.id)
        return
      case 'create-handwritten':
        await handleCreateOption({ key: 'handwritten', type: 'handwritten' }, notebook.id)
        return
      case 'create-voice':
        await handleCreateOption({ key: 'voice', type: 'voice' }, notebook.id)
        return
      case 'rename':
        startRenameNotebook(notebook)
        return
      case 'move-up':
        moveNotebook?.(notebook.id, 'up')
        return
      case 'move-down':
        moveNotebook?.(notebook.id, 'down')
        return
      case 'delete':
        if (window.confirm(t('notebook.confirmDeleteNamed', {
          defaultValue: `确定要删除“${notebook.name}”吗？删除后可在回收站中恢复。`,
          name: notebook.name,
        }))) {
          try {
            await deleteNotebook?.(notebook.id)
            message.success(t('notebook.deleteSuccess', { defaultValue: '删除成功' }))
          } catch (error) {
            message.error(error?.message || t('notebook.deleteError', { defaultValue: '删除失败，请稍后重试' }))
          }
        }
        return
      default:
        return
    }
  }

  const notebookSectionActive = currentPath?.startsWith('/cloudnote/notebooks')
  const movableNotebooks = useMemo(
    () => sortedNotebooks.filter((notebook) => !notebook.isDefault),
    [sortedNotebooks]
  )

  return (
    <aside
      style={{
        width: collapsed ? 92 : 280,
        background: 'transparent',
        borderRadius: 0,
        padding: '0 0 12px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        flexShrink: 0,
        transition: 'width 0.28s ease',
        overflow: 'visible',
        position: 'relative',
        zIndex: createOpen ? 24 : 12,
      }}
    >
      <div
        style={{
          marginBottom: 16,
          padding: collapsed ? '12px 18px 0' : '0 12px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        {!collapsed ? (
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1677ff', margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {t('common.brandName', { defaultValue: 'WeLink 云笔记' })}
            </h2>
          </div>
        ) : (
          <div
            style={{
              width: COLLAPSED_TILE_SIZE,
              height: COLLAPSED_TILE_SIZE,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.82)',
              boxShadow: '0 10px 24px rgba(16,34,58,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: '#1677ff',
              lineHeight: 1,
            }}
          >
            笔
          </div>
        )}
      </div>

      <div
        style={{ margin: '0 12px 14px', position: 'relative' }}
        onMouseEnter={() => {
          if (!collapsed) {
            openCreatePanel()
          }
        }}
        onMouseLeave={() => {
          if (!collapsed) {
            scheduleCloseCreatePanel()
          }
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          size="large"
          onClick={() => {
            if (collapsed) {
              toggleCreatePanel()
              return
            }

            openCreatePanel()
          }}
          style={{
            height: collapsed ? COLLAPSED_TILE_SIZE : 54,
            borderRadius: collapsed ? 18 : 14,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            border: 'none',
            boxShadow: '0 10px 24px rgba(0,97,164,0.24)',
          }}
        >
          {!collapsed ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 4 }}>
              <span>{t('sidebar.new', { defaultValue: '新建' })}</span>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.16)',
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                <DownOutlined rotate={createOpen ? 180 : 0} />
              </span>
            </span>
          ) : null}
        </Button>

        {createOpen ? (
          <div
            style={collapsed ? {
              position: 'absolute',
              top: 0,
              left: 'calc(100% + 10px)',
              zIndex: 40,
            } : {
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 40,
            }}
          >
            <NewCreatePanel onCreate={handleCreateOption} options={createOptions} collapsed={collapsed} />
          </div>
        ) : null}
      </div>

      <nav
        style={{
          flex: 1,
          minHeight: 0,
          padding: '0 10px 92px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {navItems.slice(0, 3).map((item) => {
          const isActive = currentPath?.startsWith(item.path)
          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
              <div onClick={() => onNavigate?.(item.path)} style={navItemStyle({ collapsed, isActive })}>
                <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {!collapsed && <span style={{ fontSize: 17, lineHeight: 1.35 }}>{item.label}</span>}
              </div>
            </Tooltip>
          )
        })}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Tooltip title={collapsed ? t('nav.notebooks', { defaultValue: '笔记本' }) : ''} placement="right">
            <div
              onClick={handleNotebookToggle}
              style={navItemStyle({ collapsed, isActive: notebookSectionActive })}
            >
              <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>
                <FolderOutlined />
              </span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1, fontSize: 18, lineHeight: 1.3 }}>{t('nav.notebooks', { defaultValue: '笔记本' })}</span>
                <Button
                  aria-label={t('notebook.createNotebook', { defaultValue: '新建笔记本' })}
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleNotebookCreate(event)
                  }}
                  style={{
                    color: 'rgba(16,34,58,0.64)',
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                  }}
                />
                  <Button
                    aria-label={notebooksExpanded
                      ? t('notebook.collapse', { defaultValue: '收起笔记本' })
                      : t('notebook.expand', { defaultValue: '展开笔记本' })}
                    type="text"
                    size="small"
                    icon={notebooksExpanded ? <DownOutlined /> : <RightOutlined />}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleNotebookToggle()
                    }}
                    style={{
                      color: 'rgba(16,34,58,0.48)',
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      padding: 0,
                    }}
                  />
                </>
              )}
            </div>
          </Tooltip>

          {!collapsed && notebooksExpanded && (
            <div
              style={{
                marginLeft: 10,
                paddingLeft: 12,
                borderLeft: '1px solid rgba(226,232,240,0.95)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {sortedNotebooks.map((notebook) => {
                const isSelected = currentNotebook?.id === notebook.id
                const isEditing = editingNotebookId === notebook.id
                const isHovered = hoveredNotebookId === notebook.id
                const movableIndex = movableNotebooks.findIndex((item) => item.id === notebook.id)
                const isDefaultNotebook = Boolean(notebook.isDefault)
                const isFirstMovableNotebook = movableIndex === 0
                const isLastMovableNotebook = movableIndex === movableNotebooks.length - 1
                const notebookMenuItems = [
                  { key: 'create-text', label: t('sidebar.create.newTextNote', { defaultValue: '新建文本笔记' }), icon: <FileTextOutlined />, tone: 'blue', variant: 'create' },
                  { key: 'create-outline', label: t('sidebar.create.newOutlineNote', { defaultValue: '新建大纲笔记' }), icon: <ApartmentOutlined />, tone: 'cyan', variant: 'create' },
                  { key: 'create-handwritten', label: t('sidebar.create.newHandwrittenNote', { defaultValue: '新建手写笔记' }), icon: <HighlightOutlined />, tone: 'orange', variant: 'create' },
                  { key: 'create-voice', label: t('sidebar.create.newVoiceNote', { defaultValue: '新建语音笔记' }), icon: <AudioOutlined />, tone: 'purple', variant: 'create' },
                  { key: 'divider-1', type: 'divider' },
                  { key: 'rename', label: t('common.edit', { defaultValue: '重命名' }), icon: <EditOutlined />, tone: 'gray', disabled: isDefaultNotebook },
                  {
                    key: 'move-up',
                    label: t('notebook.moveUp', { defaultValue: '向上移动' }),
                    icon: <ArrowUpOutlined />,
                    tone: 'gray',
                    disabled: isDefaultNotebook || isFirstMovableNotebook,
                  },
                  {
                    key: 'move-down',
                    label: t('notebook.moveDown', { defaultValue: '向下移动' }),
                    icon: <ArrowDownOutlined />,
                    tone: 'gray',
                    disabled: isDefaultNotebook || isLastMovableNotebook,
                  },
                  { key: 'divider-2', type: 'divider' },
                  { key: 'delete', label: t('common.delete', { defaultValue: '删除' }), icon: <DeleteOutlined />, tone: 'red', danger: true, disabled: isDefaultNotebook },
                ]

                return (
                  <div
                    key={notebook.id}
                    onClick={() => handleNotebookClick(notebook)}
                    onDoubleClick={() => startRenameNotebook(notebook)}
                    onMouseEnter={() => setHoveredNotebookId(notebook.id)}
                    onMouseLeave={() => setHoveredNotebookId(null)}
                    style={{
                      position: 'relative',
                      minHeight: 36,
                      padding: '6px 8px 6px 10px',
                      borderRadius: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      cursor: 'pointer',
                      background: isSelected
                        ? 'rgba(0,97,164,0.08)'
                        : (isHovered ? 'rgba(255,255,255,0.95)' : 'transparent'),
                      boxShadow: isSelected || isHovered ? '0 8px 18px rgba(16,34,58,0.05)' : 'none',
                      color: isSelected ? 'var(--primary)' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileOutlined style={{ fontSize: 15, color: isSelected ? 'var(--primary)' : 'rgba(16,34,58,0.52)' }} />
                    {isEditing ? (
                      <Input
                        autoFocus
                        size="small"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => finishRenameNotebook(notebook)}
                        onPressEnter={() => finishRenameNotebook(notebook)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setEditingNotebookId(null)
                            setEditingName('')
                          }
                        }}
                      />
                    ) : (
                      <>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 15,
                            fontWeight: isSelected ? 700 : 500,
                            lineHeight: 1.25,
                          }}
                        >
                          {getLocalizedNotebookName(notebook, t)}
                        </span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} data-notebook-menu-root="true">
                          <Button
                            type="text"
                            aria-label={t('notebook.moreActions', {
                              defaultValue: `笔记本更多操作：${getLocalizedNotebookName(notebook, t)}`,
                              name: getLocalizedNotebookName(notebook, t),
                            })}
                            icon={<MoreOutlined style={{ fontSize: 16 }} />}
                            onClick={(event) => {
                              event.stopPropagation()
                              const buttonRect = event.currentTarget.getBoundingClientRect()
                              setActiveNotebookMenuId((prev) => {
                                if (prev === notebook.id) {
                                  setActiveNotebookMenuPosition(null)
                                  return null
                                }

                                setActiveNotebookMenuPosition({
                                  top: buttonRect.top,
                                  left: buttonRect.right + 12,
                                })
                                return notebook.id
                              })
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                            style={{
                              width: 24,
                              height: 24,
                              minWidth: 24,
                              borderRadius: 8,
                              padding: 0,
                              color: 'rgba(100,116,139,0.88)',
                              opacity: isHovered || isSelected ? 1 : 0.72,
                              flexShrink: 0,
                            }}
                          />
                          {activeNotebookMenuId === notebook.id && activeNotebookMenuPosition && createPortal(
                            <div
                              data-notebook-menu-panel="true"
                              style={{
                                position: 'fixed',
                                top: activeNotebookMenuPosition.top,
                                left: activeNotebookMenuPosition.left,
                                zIndex: 9999,
                                pointerEvents: 'auto',
                              }}
                              onClick={(event) => event.stopPropagation()}
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <NotebookActionMenuPanel
                                items={notebookMenuItems}
                                onAction={(actionKey) => handleNotebookMenuAction(actionKey, notebook)}
                              />
                            </div>,
                            document.body
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {navItems.slice(3).map((item) => {
          const isActive = currentPath?.startsWith(item.path)
          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
              <div onClick={() => onNavigate?.(item.path)} style={navItemStyle({ collapsed, isActive })}>
                <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {!collapsed && <span style={{ fontSize: 17, lineHeight: 1.35 }}>{item.label}</span>}
              </div>
            </Tooltip>
          )
        })}
      </nav>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '16px 18px 18px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
          pointerEvents: 'none',
          background: collapsed
            ? 'linear-gradient(180deg, rgba(247,249,251,0) 0%, rgba(247,249,251,0.96) 30%, rgba(247,249,251,1) 100%)'
            : 'linear-gradient(180deg, rgba(247,249,251,0) 0%, rgba(247,249,251,0.88) 24%, rgba(247,249,251,1) 100%)',
        }}
      >
        {!collapsed && (
          <Button
            type="text"
            icon={<MenuFoldOutlined />}
            onClick={onToggle}
            style={{
              color: 'rgba(16,34,58,0.56)',
              width: 56,
              height: 56,
              borderRadius: 18,
              fontSize: 20,
              background: 'rgba(255,255,255,0.72)',
              boxShadow: '0 10px 24px rgba(16,34,58,0.08)',
              pointerEvents: 'auto',
            }}
          />
        )}
        {collapsed && (
          <Button
            type="text"
            icon={<MenuUnfoldOutlined />}
            onClick={onToggle}
            style={{
              color: 'rgba(16,34,58,0.56)',
              width: 56,
              height: 56,
              borderRadius: 18,
              fontSize: 20,
              background: 'rgba(255,255,255,0.72)',
              boxShadow: '0 10px 24px rgba(16,34,58,0.08)',
              pointerEvents: 'auto',
            }}
          />
        )}
      </div>
    </aside>
  )
}

export default SidebarWorkspaceNav
