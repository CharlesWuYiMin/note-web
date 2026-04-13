import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Tooltip } from 'antd'
import {
  ApartmentOutlined,
  AudioOutlined,
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
  PlusOutlined,
  RightOutlined,
  ShareAltOutlined,
  StarOutlined,
} from '@ant-design/icons'
import useNote from '@/hooks/useNote'
import useNotebook from '@/hooks/useNotebook'
import useNotebookStore from '@/store/useNotebookStore'

const COLLAPSED_TILE_SIZE = 56

const NOTE_CREATE_OPTIONS = [
  { key: 'text', label: '文本笔记', type: 'text', icon: <FileTextOutlined />, color: '#1677ff', bg: 'linear-gradient(180deg, #eef6ff, #d8ebff)' },
  { key: 'voice', label: '语音笔记', type: 'voice', icon: <AudioOutlined />, color: '#6d28d9', bg: 'linear-gradient(180deg, #f3edff, #e5dbff)' },
  { key: 'handwritten', label: '手写笔记', type: 'handwritten', icon: <HighlightOutlined />, color: '#ea580c', bg: 'linear-gradient(180deg, #fff1eb, #ffe1d6)' },
  { key: 'outline', label: '大纲笔记', type: 'outline', icon: <ApartmentOutlined />, color: '#0891b2', bg: 'linear-gradient(180deg, #e6fbff, #d4f4fb)' },
  { key: 'notebook', label: '笔记本', icon: <BookOutlined />, color: '#ca8a04', bg: 'linear-gradient(180deg, #fff7da, #ffefb0)' },
]

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

function NewCreatePanel({ onCreate }) {
  return (
    <div
      style={{
        width: 292,
        padding: 10,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 18px 36px rgba(16,34,58,0.14)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {NOTE_CREATE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onCreate(option)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 14,
              padding: '12px 10px 10px',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'rgba(248,250,252,0.95)'
              event.currentTarget.style.boxShadow = '0 14px 28px rgba(16,34,58,0.08)'
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
                width: 52,
                height: 52,
                margin: '0 auto 10px',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: option.color,
                fontSize: 22,
                background: option.bg,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
              }}
            >
              {option.icon}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>{option.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SidebarWorkspaceNav({ collapsed, onToggle, onNavigate, currentPath }) {
  const { createNote } = useNote()
  const {
    notebooks,
    currentNotebook,
    fetchNotebooks,
    createNotebook,
    updateNotebook,
    setCurrentNotebook,
  } = useNotebook()
  const [notebooksExpanded, setNotebooksExpanded] = useState(currentPath?.startsWith('/cloudnote/notebooks'))
  const [hoveredNotebookId, setHoveredNotebookId] = useState(null)
  const [editingNotebookId, setEditingNotebookId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const createCloseTimerRef = useRef(null)

  const navItems = [
    { key: 'recent', icon: <HistoryOutlined />, label: '近期笔记', path: '/cloudnote/recent' },
    { key: 'starred', icon: <StarOutlined />, label: '星标笔记', path: '/cloudnote/starred' },
    { key: 'shares', icon: <ShareAltOutlined />, label: '我的分享', path: '/cloudnote/shares' },
    { key: 'recyclebin', icon: <DeleteOutlined />, label: '回收站', path: '/cloudnote/recyclebin' },
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

  const sortedNotebooks = useMemo(
    () => [...notebooks].sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))),
    [notebooks]
  )

  const ensureNotebooksLoaded = async () => {
    await fetchNotebooks()
    return useNotebookStore.getState().notebooks
  }

  const resolveTargetNotebookId = async () => {
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
    }

    onNavigate?.('/cloudnote/notebooks')
  }

  const handleNotebookCreate = async (event) => {
    event?.stopPropagation()
    closeCreatePanel()
    await ensureNotebooksLoaded()
    const newNotebook = await createNotebook({ name: '新建笔记本' })
    setCurrentNotebook(newNotebook)
    setEditingNotebookId(newNotebook.id)
    setEditingName(newNotebook.name || '新建笔记本')
    setNotebooksExpanded(true)
    onNavigate?.('/cloudnote/notebooks')
  }

  const handleCreateOption = async (option) => {
    closeCreatePanel()

    if (option.key === 'notebook') {
      await handleNotebookCreate()
      return
    }

    const notebookId = await resolveTargetNotebookId()
    if (!notebookId) {
      return
    }

    const note = await createNote({
      title: '未命名笔记',
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

  const notebookSectionActive = currentPath?.startsWith('/cloudnote/notebooks')

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
              WeLink 云笔记
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
        style={{ margin: '0 12px 20px', position: 'relative' }}
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
          {!collapsed && '新建'}
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
              top: 'calc(100% - 2px)',
              left: 0,
              zIndex: 40,
              paddingTop: 2,
            }}
          >
            <NewCreatePanel onCreate={handleCreateOption} />
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
          <Tooltip title={collapsed ? '笔记本' : ''} placement="right">
            <div
              onClick={handleNotebookToggle}
              style={navItemStyle({ collapsed, isActive: notebookSectionActive })}
            >
              <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>
                <FolderOutlined />
              </span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1, fontSize: 18, lineHeight: 1.3 }}>笔记本</span>
                  <Button
                    aria-label="新建笔记本"
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleNotebookCreate}
                    style={{
                      color: 'rgba(16,34,58,0.64)',
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(16,34,58,0.48)' }}>
                    {notebooksExpanded ? <DownOutlined /> : <RightOutlined />}
                  </span>
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

                return (
                  <div
                    key={notebook.id}
                    onClick={() => handleNotebookClick(notebook)}
                    onDoubleClick={() => startRenameNotebook(notebook)}
                    onMouseEnter={() => setHoveredNotebookId(notebook.id)}
                    onMouseLeave={() => setHoveredNotebookId(null)}
                    style={{
                      minHeight: 36,
                      padding: '8px 10px',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: isSelected
                        ? 'rgba(0,97,164,0.08)'
                        : (isHovered ? 'rgba(255,255,255,0.95)' : 'transparent'),
                      boxShadow: isSelected || isHovered ? '0 8px 18px rgba(16,34,58,0.05)' : 'none',
                      color: isSelected ? 'var(--primary)' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileOutlined style={{ fontSize: 16, color: isSelected ? 'var(--primary)' : 'rgba(16,34,58,0.54)' }} />
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
                            fontSize: 16,
                            fontWeight: isSelected ? 700 : 500,
                            lineHeight: 1.35,
                          }}
                        >
                          {notebook.name}
                        </span>
                        {isHovered && !notebook.isDefault && (
                          <EditOutlined
                            onClick={(event) => {
                              event.stopPropagation()
                              startRenameNotebook(notebook)
                            }}
                            style={{ color: 'rgba(16,34,58,0.45)', fontSize: 13 }}
                          />
                        )}
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
