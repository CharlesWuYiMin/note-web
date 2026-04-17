﻿import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Dropdown, Input, Space } from 'antd'
import {
  DownOutlined,
  GlobalOutlined,
  LogoutOutlined,
  RobotOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
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
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  const normalizedUser = useMemo(() => {
    const userInfo = user?.userInfo || {}

    return {
      avatar:
        user?.avatar ||
        user?.avatarUrl ||
        user?.picture ||
        user?.profileUrl ||
        userInfo?.avatar ||
        userInfo?.avatarUrl ||
        userInfo?.picture ||
        userInfo?.profileUrl ||
        null,

      nickName:
        user?.nickName ||
        user?.nickname ||
        user?.name ||
        userInfo?.nickName ||
        userInfo?.nickname ||
        userInfo?.name ||
        null,

      userName:
        user?.userName ||
        user?.username ||
        userInfo?.userName ||
        userInfo?.username ||
        null,

      userId:
        user?.userId ||
        user?.id ||
        userInfo?.userId ||
        userInfo?.id ||
        userId ||
        null,
    }
  }, [user, userId])

  const userAvatar = normalizedUser.avatar
  const resolvedAvatar = avatarLoadFailed ? null : userAvatar
  const displayNickName =
    normalizedUser.nickName ||
    t('common.defaultUser', { defaultValue: '云笔记用户' })

  const displayUserName =
    normalizedUser.userName ||
    normalizedUser.userId ||
    'N/A'

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [userAvatar])

  useEffect(() => {
    if (!profileOpen) {
      setLanguageMenuOpen(false)
    }
  }, [profileOpen])

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 6px 0 4px',
        flexShrink: 0,
        background: 'transparent',
      }}
    >
      <div style={{ flex: 1 }} />

      <Space size={10}>
        <div style={{ width: 380, position: 'relative' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px',
              height: 42,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.94)',
              border: '1px solid rgba(226,232,240,0.92)',
              boxShadow: '0 6px 14px rgba(16,34,58,0.08)',
            }}
          >
            <SearchOutlined
              style={{ color: '#94a3b8', fontSize: 15, flexShrink: 0 }}
            />
            <Input
              id={searchInputId}
              value={searchValue}
              placeholder={t('search.placeholder', {
                defaultValue: '搜索笔记或标签...',
              })}
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
                height: 40,
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
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(226,232,240,0.92)',
            boxShadow: '0 6px 14px rgba(16,34,58,0.08)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              background: 'var(--primary)',
              borderRadius: '50%',
            }}
          />
        </Button>

        <Dropdown
          trigger={['click']}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          placement="bottomRight"
          popupRender={() => (
            <div
              style={{
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <div
                style={{
                  width: 250,
                  padding: 16,
                  borderRadius: 18,
                  boxShadow: '0 14px 36px rgba(16,34,58,0.14)',
                  border: '1px solid rgba(226,232,240,0.88)',
                  background: 'rgba(255,255,255,0.98)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    paddingBottom: 14,
                    marginBottom: 14,
                    borderBottom: '1px solid rgba(226,232,240,0.9)',
                  }}
                >
                  <Avatar
                    size={52}
                    src={resolvedAvatar || undefined}
                    icon={!resolvedAvatar ? <UserOutlined /> : undefined}
                    onError={() => {
                      setAvatarLoadFailed(true)
                      return false
                    }}
                    style={{
                      flexShrink: 0,
                      background: resolvedAvatar
                        ? '#fff'
                        : 'linear-gradient(135deg, #60a5fa, #2563eb)',
                      color: '#fff',
                      boxShadow: '0 8px 18px rgba(0,97,164,0.18)',
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: '#0f172a',
                        lineHeight: 1.2,
                        wordBreak: 'break-all',
                      }}
                    >
                      {displayNickName}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: '#64748b',
                        lineHeight: 1.2,
                        wordBreak: 'break-all',
                      }}
                    >
                      {displayUserName}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {languageMenuOpen ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 'calc(100% + 14px)',
                        width: 210,
                        borderRadius: 16,
                        background: 'rgba(248,250,252,0.98)',
                        border: '1px solid rgba(226,232,240,0.92)',
                        boxShadow: '0 14px 32px rgba(16,34,58,0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          changeLanguage('zh-CN')
                          setLanguageMenuOpen(false)
                        }}
                        style={{
                          flex: 1,
                          minHeight: 54,
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 18px',
                          fontSize: 15,
                          fontWeight: 700,
                          color: isChinese ? '#2563eb' : '#10223a',
                          background: isChinese ? 'rgba(37,99,235,0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(226,232,240,0.82)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>
                          {t('settings.languageOptionZh', {
                            defaultValue: '简体中文',
                          })}
                        </span>
                        <DownOutlined style={{ fontSize: 12, color: '#64748b' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          changeLanguage('en-US')
                          setLanguageMenuOpen(false)
                        }}
                        style={{
                          flex: 1,
                          minHeight: 54,
                          border: 'none',
                          background: isChinese ? 'transparent' : 'rgba(37,99,235,0.08)',
                          color: '#10223a',
                          fontSize: 15,
                          fontWeight: isChinese ? 500 : 700,
                          textAlign: 'left',
                          padding: '0 18px',
                          cursor: 'pointer',
                        }}
                      >
                        English
                      </button>
                    </div>
                  ) : null}

                  <Button
                    block
                    type="text"
                    icon={<GlobalOutlined style={{ fontSize: 18, color: '#0f172a' }} />}
                    onClick={() => setLanguageMenuOpen((open) => !open)}
                    style={{
                      height: 42,
                      paddingInline: 2,
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ flex: 1, textAlign: 'left', marginLeft: 2 }}>
                      {t('settings.language', { defaultValue: '语言' })}
                    </span>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>
                      {isChinese
                        ? t('settings.languageOptionZh', {
                            defaultValue: '简体中文',
                          })
                        : 'English'}
                    </span>
                  </Button>

                  <Button
                    block
                    type="text"
                    danger
                    icon={<LogoutOutlined style={{ fontSize: 18, color: '#0f172a' }} />}
                    onClick={logout}
                    style={{
                      height: 42,
                      paddingInline: 2,
                      justifyContent: 'flex-start',
                      borderRadius: 12,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ marginLeft: 2 }}>
                      {t('nav.logout', { defaultValue: '退出登录' })}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        >
          <Avatar
            size={36}
            src={resolvedAvatar || undefined}
            icon={!resolvedAvatar ? <UserOutlined /> : undefined}
            onError={() => {
              setAvatarLoadFailed(true)
              return false
            }}
            style={{
              cursor: 'pointer',
              border: '2px solid #fff',
              boxShadow: '0 6px 14px rgba(16,34,58,0.10)',
              background: resolvedAvatar
                ? '#fff'
                : 'linear-gradient(135deg, #60a5fa, #2563eb)',
            }}
          />
        </Dropdown>
      </Space>
    </header>
  )
}

export default Header
