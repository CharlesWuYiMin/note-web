﻿import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Dropdown, Input, Segmented, Space } from 'antd'
import { RobotOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import UxIcon from '@/components/common/UxIcon'
import useAuth from '@/hooks/useAuth'
import useLanguage from '@/hooks/useLanguage'

function Header({
  onToggleAIPanel,
  onOpenSearch,
  searchValue,
  onSearchChange,
  searchPanel,
  searchInputId,
  searchOpen,
}) {
  const { t } = useTranslation()
  const { logout, user, userId } = useAuth()
  const { changeLanguage, isChinese } = useLanguage()
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const userName = user?.name || user?.nickname || '云笔记用户'
  const userAvatar = user?.avatar || user?.avatarUrl || user?.picture || null

  return (
    <header style={{
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px 0 4px',
      flexShrink: 0,
      background: 'transparent',
    }}>
      <div style={{ flex: 1 }} />

      <Space size={12}>
        <div style={{ width: 420, position: 'relative' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              height: 48,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.94)',
              border: '1px solid rgba(226,232,240,0.92)',
              boxShadow: '0 8px 18px rgba(16,34,58,0.08)',
            }}
          >
            <SearchOutlined style={{ color: '#94a3b8', fontSize: 16, flexShrink: 0 }} />
            <Input
              id={searchInputId}
              value={searchValue}
              placeholder={t('search.placeholder', { defaultValue: '搜索笔记或标签...' })}
              onChange={(event) => {
                onSearchChange?.(event.target.value)
                onOpenSearch?.(event.target.value)
              }}
              onClick={() => onOpenSearch?.(searchValue || '')}
              onFocus={() => onOpenSearch?.(searchValue || '')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onOpenSearch?.(searchValue || '')
                }
              }}
              allowClear
              size="middle"
              variant="borderless"
              style={{
                height: 46,
                background: 'transparent',
                boxShadow: 'none',
              }}
            />
          </div>
          {searchOpen ? searchPanel : null}
        </div>
        <Button
          type="text"
          icon={<RobotOutlined style={{ fontSize: 18, color: 'var(--primary)' }} />}
          onClick={onToggleAIPanel}
          aria-label={t('ai.title', { defaultValue: 'AI 助手' })}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(226,232,240,0.92)',
            boxShadow: '0 8px 18px rgba(16,34,58,0.08)',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            background: 'var(--primary)',
            borderRadius: '50%',
          }} />
        </Button>

        <Dropdown
          trigger={['click']}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          placement="bottomRight"
          popupRender={() => (
            <div style={{
              width: 288,
              padding: 20,
              borderRadius: 16,
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)',
              background: '#fff',
            }}>
              <Space size={16} style={{ marginBottom: 16 }}>
                <Avatar
                  size={56}
                  src={userAvatar || undefined}
                  icon={!userAvatar ? <UserOutlined /> : undefined}
                  style={{
                    background: userAvatar ? '#fff' : 'linear-gradient(135deg, #60a5fa, #2563eb)',
                    color: '#fff',
                    boxShadow: '0 6px 16px rgba(0,97,164,0.22)',
                  }}
                />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{userName}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>ID: {userId || 'N/A'}</p>
                </div>
              </Space>

              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'var(--surface)',
                }}>
                  <Space>
                    <UxIcon name="global" size={18} color="rgba(16,34,58,0.72)" />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{t('settings.language', { defaultValue: '语言' })}</span>
                  </Space>
                  <Segmented
                    size="small"
                    value={isChinese ? 'zh' : 'en'}
                    onChange={(val) => changeLanguage(val === 'zh' ? 'zh-CN' : 'en-US')}
                    options={[
                      { label: '中文', value: 'zh' },
                      { label: 'EN', value: 'en' },
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Button
                  block
                  type="text"
                  icon={<UxIcon name="user" size={16} color="rgba(16,34,58,0.72)" />}
                  onClick={() => console.log('account')}
                  style={{ textAlign: 'left', height: 40 }}
                >
                  {t('settings.accountManagement', { defaultValue: '账号管理' })}
                </Button>
                <Button
                  block
                  type="text"
                  danger
                  icon={<UxIcon name="logout" size={16} color="#ea580c" />}
                  onClick={logout}
                  style={{ textAlign: 'left', height: 40 }}
                >
                  {t('auth.logout', { defaultValue: '退出登录' })}
                </Button>
              </div>
            </div>
          )}
        >
          <Avatar
            size={40}
            src={userAvatar || undefined}
            icon={!userAvatar ? <UserOutlined /> : undefined}
            style={{
              cursor: 'pointer',
              border: '2px solid #fff',
              boxShadow: '0 8px 18px rgba(16,34,58,0.10)',
              background: userAvatar ? '#fff' : 'linear-gradient(135deg, #60a5fa, #2563eb)',
            }}
          />
        </Dropdown>
      </Space>
    </header>
  )
}

export default Header
