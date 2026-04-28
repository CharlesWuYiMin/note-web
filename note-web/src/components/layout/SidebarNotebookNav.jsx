import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Tooltip } from 'antd'
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileOutlined,
  FolderOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  RightOutlined,
  ShareAltOutlined,
  StarOutlined,
} from '@ant-design/icons'
import useNotebook from '@/hooks/useNotebook'

function navItemStyle({ collapsed, isActive }) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: collapsed ? '0' : '12px 14px',
    width: collapsed ? 54 : '100%',
    minHeight: collapsed ? 52 : 46,
    borderRadius: 14,
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

function SidebarNotebookNav({ collapsed, onToggle, onNavigate, currentPath }) {
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

  const navItems = [
    { key: 'recent', icon: <HistoryOutlined />, label: '近期笔记', path: '/cloudnote/recent' },
    { key: 'starred', icon: <StarOutlined />, label: '星标笔记', path: '/cloudnote/starred' },
    { key: 'myshares', icon: <ShareAltOutlined />, label: '我的分享', path: '/cloudnote/myshares' },
    { key: 'recyclebin', icon: <DeleteOutlined />, label: '回收站', path: '/cloudnote/recyclebin' },
  ]

  useEffect(() => {
    if (currentPath?.startsWith('/cloudnote/notebooks')) {
      setNotebooksExpanded(true)
      fetchNotebooks()
    }
  }, [currentPath, fetchNotebooks])

  const sortedNotebooks = useMemo(
    () => [...notebooks].sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault))),
    [notebooks]
  )

  const ensureNotebooksLoaded = async () => {
    await fetchNotebooks()
  }

  const handleNotebookToggle = async () => {
    const nextExpanded = !notebooksExpanded
    setNotebooksExpanded(nextExpanded)
    if (nextExpanded) {
      await ensureNotebooksLoaded()
    }
  }

  const handleCreateNotebook = async (event) => {
    event.stopPropagation()
    await ensureNotebooksLoaded()
    const newNotebook = await createNotebook({ name: '新建笔记本' })
    setCurrentNotebook(newNotebook)
    setEditingNotebookId(newNotebook.id)
    setEditingName(newNotebook.name || '新建笔记本')
    setNotebooksExpanded(true)
    onNavigate?.('/cloudnote/notebooks')
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
        width: collapsed ? 92 : 220,
        background: 'transparent',
        borderRadius: 0,
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.28s ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
      }}
    >
      <div
        style={{
          marginBottom: 28,
          padding: collapsed ? '0 18px' : '8px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 74,
        }}
      >
        {!collapsed ? (
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1677ff', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              WeLink 云笔记
            </h2>
          </div>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 800, color: '#10223a' }}>WL</div>
        )}
      </div>

      <div style={{ margin: '0 12px 20px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => console.log('new note')}
          block
          size="large"
          style={{
            height: 54,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            border: 'none',
            boxShadow: '0 10px 24px rgba(0,97,164,0.24)',
          }}
        >
          {!collapsed && '新建笔记'}
        </Button>
      </div>

      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              style={navItemStyle({ collapsed, isActive: notebookSectionActive || notebooksExpanded })}
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
                    onClick={handleCreateNotebook}
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

      <div style={{ marginTop: 'auto', padding: 16, display: 'flex', justifyContent: 'center' }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{
            color: 'rgba(16,34,58,0.56)',
            width: 46,
            height: 46,
            borderRadius: 16,
          }}
        />
      </div>
    </aside>
  )
}

export default SidebarNotebookNav
