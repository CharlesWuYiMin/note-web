﻿import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Dropdown, Input, Space } from 'antd'
import {
  DownOutlined,
  GlobalOutlined,
  ImportOutlined,
  LogoutOutlined,
  RobotOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import useAuth from '@/hooks/useAuth'
import useLanguage from '@/hooks/useLanguage'
import ImportTaskDialog from '@/components/layout/ImportTaskDialog'

const headerPanelStyle = {
  borderRadius: 20,
  border: '1px solid rgba(15,23,42,0.08)',
  background: '#fff',
  boxShadow: 'var(--shadow-md)',
}

const headerActionButtonStyle = {
  position: 'relative',
  width: 40,
  height: 40,
  borderRadius: 14,
  background: '#fff',
  border: '1px solid rgba(15,23,42,0.08)',
  boxShadow: 'var(--shadow-sm)',
}

function Header({
  onToggleAIPanel,
  onOpenSearch,
  onSearchSubmit,
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
  const [importTaskOpen, setImportTaskOpen] = useState(false)

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
    <>
      <style>{`
        .cloudnote-header-search-shell:focus-within {
          border-color: rgba(10,89,247,0.28);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
        }

        .cloudnote-header-profile-card .ant-btn {
          border-radius: 12px;
        }

        .cloudnote-header-profile-card .ant-btn:hover,
        .cloudnote-header-profile-card .ant-btn:focus {
          background: rgba(10, 89, 247, 0.08) !important;
          color: #10223a !important;
        }

        .cloudnote-header-profile-card .ant-btn-dangerous:hover,
        .cloudnote-header-profile-card .ant-btn-dangerous:focus {
          background: rgba(239, 68, 68, 0.08) !important;
          color: #dc2626 !important;
        }
      `}</style>
      <header
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 6px',
          flexShrink: 0,
          background: 'transparent',
        }}
      >
      <div style={{ flex: 1 }} />

      <Space size={10}>
        <div style={{ width: 392, maxWidth: 'min(46vw, 392px)', position: 'relative' }}>
          <div
            className="cloudnote-header-search-shell"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              height: 44,
              borderRadius: 18,
              background: '#fff',
              border: '1px solid rgba(15,23,42,0.08)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 160ms ease, box-shadow 160ms ease',
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
                  onSearchSubmit?.(searchValue || '')
                  onOpenSearch?.(searchValue || '')
                }
              }}
              allowClear
              size="middle"
              variant="borderless"
              style={{
                height: 42,
                background: 'transparent',
                boxShadow: 'none',
                fontSize: 14,
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
          className="cloudnote-icon-action-btn cloudnote-icon-action-btn--toolbar"
          style={headerActionButtonStyle}
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
                className="cloudnote-header-profile-card"
                style={{
                  width: 264,
                  padding: 18,
                  ...headerPanelStyle,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    paddingBottom: 16,
                    marginBottom: 14,
                    borderBottom: '1px solid rgba(15,23,42,0.08)',
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
                      boxShadow: '0 8px 18px rgba(15,23,42,0.10)',
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
                        borderRadius: 18,
                        background: '#fff',
                        border: '1px solid rgba(15,23,42,0.08)',
                        boxShadow: 'var(--shadow-md)',
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
                          borderBottom: '1px solid rgba(15,23,42,0.08)',
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
                    icon={<ImportOutlined style={{ fontSize: 18, color: '#0f172a' }} />}
                    onClick={() => {
                      setProfileOpen(false)
                      setLanguageMenuOpen(false)
                      setImportTaskOpen(true)
                    }}
                    style={{
                      height: 44,
                      paddingInline: 8,
                      justifyContent: 'flex-start',
                      borderRadius: 12,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ marginLeft: 2 }}>
                      {t('importTask.entry', { defaultValue: '导入任务' })}
                    </span>
                  </Button>

                  <Button
                    block
                    type="text"
                    icon={<GlobalOutlined style={{ fontSize: 18, color: '#0f172a' }} />}
                    onClick={() => setLanguageMenuOpen((open) => !open)}
                    style={{
                      height: 44,
                      paddingInline: 8,
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
                      height: 44,
                      paddingInline: 8,
                      justifyContent: 'flex-start',
                      borderRadius: 12,
                      color: '#dc2626',
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
            boxShadow: 'var(--shadow-sm)',
            background: resolvedAvatar
              ? '#fff'
              : 'linear-gradient(135deg, #60a5fa, #2563eb)',
            }}
          />
        </Dropdown>
      </Space>
      <ImportTaskDialog
        open={importTaskOpen}
        onClose={() => setImportTaskOpen(false)}
      />
      </header>
    </>
  )
}

export default Header
