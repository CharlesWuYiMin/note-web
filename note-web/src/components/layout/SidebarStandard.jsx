import React from 'react'
import { Button, Tooltip } from 'antd'
import {
  DeleteOutlined,
  FolderOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  ShareAltOutlined,
  StarOutlined,
} from '@ant-design/icons'

function SidebarStandard({ collapsed, onToggle, onNavigate, currentPath }) {
  const navItems = [
    { key: 'recent', icon: <HistoryOutlined />, label: '近期笔记', path: '/cloudnote/recent' },
    { key: 'starred', icon: <StarOutlined />, label: '星标笔记', path: '/cloudnote/starred' },
    { key: 'shares', icon: <ShareAltOutlined />, label: '我的分享', path: '/cloudnote/shares' },
    { key: 'notebooks', icon: <FolderOutlined />, label: '笔记本', path: '/cloudnote/notebooks' },
    { key: 'recyclebin', icon: <DeleteOutlined />, label: '回收站', path: '/cloudnote/recyclebin' },
  ]

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
        {navItems.map((item) => {
          const isActive = currentPath?.startsWith(item.path)
          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
              <div
                onClick={() => onNavigate?.(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '0' : '12px 14px',
                  width: collapsed ? 54 : '100%',
                  height: collapsed ? 52 : 46,
                  borderRadius: 14,
                  cursor: 'pointer',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  alignSelf: collapsed ? 'center' : 'stretch',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'rgba(16,34,58,0.74)',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? '0 10px 22px rgba(16,34,58,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
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

export default SidebarStandard
