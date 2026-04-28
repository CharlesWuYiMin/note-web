import React, { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Checkbox, Empty, Input, List, Modal, Typography } from 'antd'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '@/i18n'
import shareService from '@/services/shareService'
import { showSharePromptModal } from '@/utils/shareErrorMessages'
import { reportError } from '@/utils/observability'

const { Text } = Typography

const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function unwrapResponse(response) {
  if (response && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data
  }

  return response
}

function normalizeSearchResult(response) {
  const payload = unwrapResponse(response)
  const data = payload?.data

  if (Array.isArray(data)) {
    return {
      total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : data.length,
      page: Number.isFinite(Number(payload?.page)) ? Number(payload.page) : 1,
      size: Number.isFinite(Number(payload?.size)) ? Number(payload.size) : data.length,
      data,
    }
  }

  if (Array.isArray(payload?.items)) {
    return {
      total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : payload.items.length,
      page: Number.isFinite(Number(payload?.page)) ? Number(payload.page) : 1,
      size: Number.isFinite(Number(payload?.size)) ? Number(payload.size) : payload.items.length,
      data: payload.items,
    }
  }

  if (Array.isArray(payload)) {
    return {
      total: payload.length,
      page: 1,
      size: payload.length,
      data: payload,
    }
  }

  return {
    total: 0,
    page: 1,
    size: 0,
    data: [],
  }
}

function getUserKey(user) {
  return user?.oneAccessUserId || user?.userName || user?.nickName || ''
}

function getUserDisplayName(user) {
  return user?.nickName || user?.userName || user?.oneAccessUserId || ''
}

function getUserDept(user) {
  return user?.lowestDept || ''
}

function normalizeUsers(users = []) {
  return users
    .map((user) => {
      if (!user) {
        return null
      }

      if (typeof user === 'string') {
        return {
          oneAccessUserId: user,
          userName: user,
          nickName: user,
          lowestDept: '',
        }
      }

      return user
    })
    .filter(Boolean)
}

function UserCard({ user, selected, onToggle, onRemove, removable = false, t }) {
  const displayName = getUserDisplayName(user) || t('common.defaultUser', { defaultValue: '用户' })
  const account = user?.userName || user?.oneAccessUserId || ''
  const gridTemplateColumns = removable
    ? 'minmax(0, 1.35fr) minmax(0, 1fr)'
    : 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle?.(user)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle?.(user)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 14px',
        borderRadius: 14,
        border: `1px solid ${selected ? 'rgba(37,99,235,0.28)' : 'rgba(15,23,42,0.08)'}`,
        background: selected ? 'rgba(239,246,255,0.9)' : '#fff',
        boxShadow: selected ? '0 8px 20px rgba(37,99,235,0.08)' : 'none',
        cursor: 'pointer',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {removable ? (
        <Button
          type="text"
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            onRemove?.(user)
          }}
          style={{
            width: 32,
            height: 32,
            flexShrink: 0,
            color: '#94a3b8',
          }}
        />
      ) : (
        <Checkbox
          checked={selected}
          aria-label={`${t('share.userSelect.chooseUser')} ${displayName}`}
          onChange={() => onToggle?.(user)}
          onClick={(event) => event.stopPropagation()}
          style={{ flexShrink: 0 }}
        />
      )}

      <Avatar
        style={{
          background: '#eaf2ff',
          color: '#2563eb',
          flexShrink: 0,
          width: removable ? 44 : 48,
          height: removable ? 44 : 48,
          fontSize: 18,
        }}
      >
        {displayName?.[0] || '?'}
      </Avatar>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns,
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Text style={rowTextStyle}>{displayName}</Text>
        <Text style={mutedRowTextStyle}>{account}</Text>
        {!removable ? <Text style={lightRowTextStyle}>{getUserDept(user)}</Text> : null}
      </div>
    </div>
  )
}

const rowTextStyle = {
  fontSize: 15,
  color: '#0f172a',
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const mutedRowTextStyle = {
  fontSize: 13,
  color: '#64748b',
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const lightRowTextStyle = {
  fontSize: 13,
  color: '#94a3b8',
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const hiddenScrollbarStyle = {
  overflowY: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

function ShareUserSelectModal({
  open,
  initialUsers = [],
  loading = false,
  onCancel,
  onConfirm,
}) {
  const { t, i18n } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    if (!open) {
      return
    }

    setKeyword('')
    setSearchError('')
    setSearchResults([])
    setSelectedUsers(normalizeUsers(initialUsers))
  }, [initialUsers, open])

  const selectedKeys = useMemo(() => {
    return new Set(selectedUsers.map((user) => getUserKey(user)).filter(Boolean))
  }, [selectedUsers])

  const performSearch = async () => {
    const searchText = keyword.trim()

    if (!searchText) {
      setSearchError(t('share.userSelect.searchKeyword'))
      return
    }

    setSearching(true)
    setSearchError('')

    try {
      const response = await shareService.searchUsers({
        searchText,
        page: 1,
        pageSize: 20,
      })

      const result = normalizeSearchResult(response)
      setSearchResults(result.data)

      if (result.data.length === 0) {
        setSearchError(t('share.userSelect.noSearchResults'))
      }
    } catch (error) {
      setSearchError('')
      showSharePromptModal({
        operation: 'search',
        error,
        language: i18n.language,
      })
      reportError(error, {
        feature: 'share_user_search',
        searchText,
      })
    } finally {
      setSearching(false)
    }
  }

  const handleKeywordPressEnter = (event) => {
    event?.preventDefault?.()
    performSearch()
  }

  const handleAddUser = (user) => {
    const key = getUserKey(user)

    if (!key || selectedKeys.has(key)) {
      return
    }

    setSelectedUsers((current) => [...current, user])
  }

  const handleRemoveUser = (user) => {
    const key = getUserKey(user)
    setSelectedUsers((current) => current.filter((item) => getUserKey(item) !== key))
  }

  const handleConfirm = () => {
    onConfirm?.(selectedUsers)
  }

  const handleClearSelected = () => {
    setSelectedUsers([])
  }

  return (
    <Modal
      open={open}
      title={<span style={{ fontFamily: FONT_STACK, fontWeight: 400 }}>{t('share.userSelect.title')}</span>}
      onCancel={onCancel}
      footer={null}
      centered
      width={1120}
      destroyOnHidden
      styles={{
        body: {
          padding: 0,
          flex: 1,
          minHeight: 0,
          display: 'flex',
        },
        content: {
          fontFamily: FONT_STACK,
          display: 'flex',
          flexDirection: 'column',
          height: 'min(78vh, 760px)',
          maxHeight: '760px',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.16)',
          background: '#fff',
        },
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', fontFamily: FONT_STACK }}>
        <section
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minHeight: 0,
          }}
        >
          <Input.Search
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onSearch={performSearch}
            onPressEnter={handleKeywordPressEnter}
            placeholder={t('share.userSelect.searchPlaceholder')}
            allowClear
            size="large"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            enterButton={<Button type="primary" loading={searching}>{t('share.userSelect.searchButton')}</Button>}
            style={{ width: '100%' }}
          />

          {searchError ? (
            <Text style={{ color: '#dc2626', fontSize: 13, whiteSpace: 'pre-line' }}>{searchError}</Text>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, color: '#9ca3af' }}>{t('share.userSelect.contacts')}</Text>
            <Button type="link" style={{ padding: 0, height: 'auto', color: '#94a3b8' }}>
              {t('share.userSelect.more')}
              {' '}
              &gt;
            </Button>
          </div>

          <div style={{ flex: 1, minHeight: 0, paddingRight: 4, ...hiddenScrollbarStyle }}>
            <List
              loading={searching}
              locale={{
                emptyText: <Empty description={t('share.userSelect.searchKeyword')} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
              }}
              dataSource={searchResults}
              renderItem={(item) => {
                const key = getUserKey(item)
                const selected = selectedKeys.has(key)

                return (
                  <List.Item style={{ padding: 0, border: 'none', marginBottom: 12, width: '100%' }}>
                    <UserCard
                      user={item}
                      selected={selected}
                      onToggle={selected ? handleRemoveUser : handleAddUser}
                      t={t}
                    />
                  </List.Item>
                )
              }}
            />
          </div>
        </section>

        <section
          style={{
            width: 360,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: '#fafcff',
            borderLeft: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 20px 16px',
              borderBottom: '1px solid rgba(15,23,42,0.06)',
            }}
          >
            <Text style={{ fontSize: 16, color: '#0f172a' }}>
              {t('share.userSelect.selected', { count: selectedUsers.length })}
            </Text>
            <Button type="link" onClick={handleClearSelected} disabled={selectedUsers.length === 0}>
              {t('share.userSelect.clear')}
            </Button>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: 20,
              ...hiddenScrollbarStyle,
            }}
          >
            {selectedUsers.length === 0 ? (
              <Empty description={t('share.userSelect.noSelectedUsers')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={selectedUsers}
                renderItem={(item) => (
                  <List.Item style={{ padding: 0, border: 'none', marginBottom: 12, width: '100%' }}>
                    <UserCard
                      user={item}
                      selected
                      onToggle={handleRemoveUser}
                      onRemove={handleRemoveUser}
                      removable
                      t={t}
                    />
                  </List.Item>
                )}
              />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '18px 20px 20px',
            }}
          >
            <Button onClick={onCancel} disabled={loading || searching}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              loading={loading || searching}
              disabled={selectedUsers.length === 0}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}

export default ShareUserSelectModal
