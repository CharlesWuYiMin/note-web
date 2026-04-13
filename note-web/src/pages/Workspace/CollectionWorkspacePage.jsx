import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, List, Popconfirm, Spin, Tag } from 'antd'
import {
  ClearOutlined,
  DeleteOutlined,
  FolderOutlined,
  HistoryOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  ShareAltOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons'
import useNotebook from '@/hooks/useNotebook'
import useNote from '@/hooks/useNote'

const SECTION_CONFIG = {
  starred: {
    title: '星标笔记',
    lead: '重点内容与近期笔记使用同一套工作台，只是数据源切换为已星标笔记。',
    label: '星标视图',
    accent: '#f59e0b',
  },
  shares: {
    title: '我的分享',
    lead: '这里保留和近期笔记一致的页面结构，展示的是你的分享记录与原笔记入口。',
    label: '分享视图',
    accent: '#2563eb',
  },
  notebooks: {
    title: '笔记本',
    lead: '笔记本也进入同一套主页面，只是在正文区展示分类管理内容。',
    label: '笔记本视图',
    accent: '#0f766e',
  },
  recyclebin: {
    title: '回收站',
    lead: '删除、恢复和彻底删除继续放在同一个工作台中处理，避免跳出当前页面语境。',
    label: '回收站视图',
    accent: '#dc2626',
  },
}

function CollectionWorkspacePage({ section }) {
  const navigate = useNavigate()
  const config = SECTION_CONFIG[section]
  const {
    starredNotes,
    myShares,
    deletedNotes,
    isLoading: noteLoading,
    fetchStarredNotes,
    fetchMyShares,
    fetchDeletedNotes,
    toggleStar,
    restoreNote,
    permanentDeleteNote,
    clearRecycleBin,
  } = useNote()
  const {
    notebooks,
    isLoading: notebookLoading,
    fetchNotebooks,
    deleteNotebook,
  } = useNotebook()

  useEffect(() => {
    if (section === 'starred') fetchStarredNotes()
    if (section === 'shares') fetchMyShares()
    if (section === 'notebooks') fetchNotebooks()
    if (section === 'recyclebin') fetchDeletedNotes()
  }, [section, fetchStarredNotes, fetchMyShares, fetchNotebooks, fetchDeletedNotes])

  const isLoading = section === 'notebooks' ? notebookLoading : noteLoading

  const items = useMemo(() => {
    if (section === 'starred') return starredNotes
    if (section === 'shares') return myShares
    if (section === 'notebooks') return notebooks
    if (section === 'recyclebin') return deletedNotes
    return []
  }, [section, starredNotes, myShares, notebooks, deletedNotes])

  const refresh = () => {
    if (section === 'starred') fetchStarredNotes()
    if (section === 'shares') fetchMyShares()
    if (section === 'notebooks') fetchNotebooks()
    if (section === 'recyclebin') fetchDeletedNotes()
  }

  const renderNotebookGrid = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 16,
      }}
    >
      {items.map((notebook) => (
        <div
          key={notebook.id}
          style={{
            borderRadius: 20,
            border: '1px solid rgba(16,34,58,0.06)',
            background: '#fff',
            boxShadow: '0 12px 28px rgba(16,34,58,0.05)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(0,97,164,0.08)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              <FolderOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#10223a' }}>{notebook.name}</div>
                {notebook.isDefault && <LockOutlined style={{ color: '#94a3b8', fontSize: 12 }} />}
              </div>
              <div style={{ marginTop: 6, color: 'rgba(16,34,58,0.56)', lineHeight: 1.7 }}>
                {notebook.description || '当前笔记本暂无描述。'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            <Tag style={{ borderRadius: 999 }}>{notebook.noteCount || 0} 篇笔记</Tag>
            {!notebook.isDefault && (
              <Popconfirm
                title="确定删除这个笔记本吗？"
                okText="删除"
                cancelText="取消"
                onConfirm={() => deleteNotebook(notebook.id)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderList = () => (
    <List
      dataSource={items}
      renderItem={(item) => {
        const title =
          section === 'shares'
            ? item.noteTitle || item.title || '未命名分享'
            : item.title || item.name || '未命名内容'
        const summary =
          section === 'shares'
            ? item.description || item.noteSummary || '分享记录可从这里打开原笔记。'
            : item.content || item.description || '点击后进入对应内容。'
        const dateValue =
          item.updatedAt || item.createdAt || item.deletedAt || null

        return (
          <List.Item
            key={item.id || item.shareCode || title}
            style={{
              padding: '16px 18px',
              borderRadius: 18,
              marginBottom: 12,
              background: '#fff',
              border: '1px solid rgba(16,34,58,0.06)',
              boxShadow: '0 12px 28px rgba(16,34,58,0.05)',
              cursor: section === 'recyclebin' ? 'default' : 'pointer',
            }}
            actions={buildActions(section, item, navigate, {
              toggleStar,
              restoreNote,
              permanentDeleteNote,
            })}
            onClick={() => {
              if (section === 'starred' && item.id) navigate(`/cloudnote/recent/${item.id}`)
              if (section === 'shares' && item.noteId) navigate(`/cloudnote/recent/${item.noteId}`)
            }}
          >
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: `${config.accent}14`,
                    color: config.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  {renderAvatarIcon(section)}
                </div>
              }
              title={<div style={{ fontSize: 15, fontWeight: 700, color: '#10223a' }}>{title}</div>}
              description={
                <div>
                  <div style={{ margin: '6px 0 10px', color: 'rgba(16,34,58,0.58)', lineHeight: 1.8 }}>
                    {summary}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {item.notebookName && <Tag style={{ borderRadius: 999 }}>{item.notebookName}</Tag>}
                    {item.shareCode && <Tag style={{ borderRadius: 999 }}>分享码 {item.shareCode}</Tag>}
                    {dateValue && (
                      <span style={{ fontSize: 12, color: 'rgba(16,34,58,0.44)' }}>
                        {new Date(dateValue).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              }
            />
          </List.Item>
        )
      }}
    />
  )

  return (
    <section className="workspace-editor">
      <div className="workspace-editor__frame">
        <div className="workspace-editor__toolbar">
          <div className="workspace-editor__toolbar-copy">
            <div>
              <div className="workspace-editor__toolbar-title">{config.title}</div>
              <span className="workspace-editor__toolbar-subtitle">
                {config.lead}
              </span>
            </div>
          </div>
          <div className="workspace-editor__toolbar-actions">
            {section === 'notebooks' && (
              <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 12 }}>
                新建笔记本
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={refresh} style={{ borderRadius: 12 }}>
              刷新
            </Button>
            {section === 'recyclebin' && (
              <Button
                danger
                icon={<ClearOutlined />}
                disabled={items.length === 0}
                onClick={clearRecycleBin}
                style={{ borderRadius: 12 }}
              >
                清空
              </Button>
            )}
          </div>
        </div>

        <div className="workspace-editor__body">
          <div
            className="workspace-editor__content"
            style={{ maxWidth: section === 'notebooks' ? 1080 : 920 }}
          >
            <div className="workspace-editor__meta-row">
              <div className="workspace-editor__meta-chip">
                <span className="workspace-editor__meta-chip-label">当前区域</span>
                <span className="workspace-editor__meta-chip-value">{config.label}</span>
              </div>
              <div className="workspace-editor__meta-chip">
                <span className="workspace-editor__meta-chip-label">条目数量</span>
                <span className="workspace-editor__meta-chip-value">{items.length}</span>
              </div>
            </div>

            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1.1, fontWeight: 800, color: '#10223a', marginBottom: 22 }}>
              {config.title}
            </h1>
            <p className="workspace-editor__lead">{config.lead}</p>

            <Spin spinning={isLoading}>
              {items.length === 0 && !isLoading ? (
                <Empty
                  description={`${config.title}暂无内容`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '64px 0' }}
                />
              ) : (
                section === 'notebooks' ? renderNotebookGrid() : renderList()
              )}
            </Spin>
          </div>
        </div>
      </div>
    </section>
  )
}

function renderAvatarIcon(section) {
  if (section === 'starred') return <StarFilled />
  if (section === 'shares') return <ShareAltOutlined />
  if (section === 'recyclebin') return <DeleteOutlined />
  return <FolderOutlined />
}

function buildActions(section, item, navigate, handlers) {
  if (section === 'starred') {
    return [
      <Button
        key="toggle-star"
        type="text"
        icon={<StarOutlined style={{ color: 'var(--primary)' }} />}
        onClick={(event) => {
          event.stopPropagation()
          handlers.toggleStar(item)
        }}
      />,
      <Button
        key="open"
        type="text"
        onClick={(event) => {
          event.stopPropagation()
          navigate(`/cloudnote/recent/${item.id}`)
        }}
      >
        打开
      </Button>,
    ]
  }

  if (section === 'shares') {
    return [
      <Button key="share-code" type="text">
        {item.shareCode || '分享码'}
      </Button>,
      <Button
        key="open"
        type="text"
        onClick={(event) => {
          event.stopPropagation()
          if (item.noteId) navigate(`/cloudnote/recent/${item.noteId}`)
        }}
      >
        打开
      </Button>,
    ]
  }

  if (section === 'recyclebin') {
    return [
      <Button
        key="restore"
        type="text"
        icon={<RollbackOutlined />}
        onClick={() => handlers.restoreNote(item.id)}
      >
        还原
      </Button>,
      <Popconfirm
        key="delete"
        title="确定永久删除吗？"
        okText="删除"
        cancelText="取消"
        onConfirm={() => handlers.permanentDeleteNote(item.id)}
      >
        <Button type="text" danger icon={<DeleteOutlined />}>
          永久删除
        </Button>
      </Popconfirm>,
    ]
  }

  return []
}

export default CollectionWorkspacePage
