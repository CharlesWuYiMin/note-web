import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Select, Switch, Typography, message } from 'antd'
import { CloseOutlined, CopyOutlined, DownOutlined, LinkOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '@/i18n'
import ShareUserSelectModal from '@/components/share/ShareUserSelectModal'
import shareService from '@/services/shareService'
import { showSharePromptModal } from '@/utils/shareErrorMessages'
import { reportError, trackEvent } from '@/utils/observability'

const { Text } = Typography

const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function unwrapShareResponse(response) {
  if (response && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data
  }

  return response
}

function toAbsoluteShareUrl(shareUrl) {
  if (!shareUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(shareUrl)) {
    return shareUrl
  }

  return `${window.location.origin}${shareUrl.startsWith('/') ? shareUrl : `/${shareUrl}`}`
}

function buildShareUrl(noteId) {
  if (!noteId) {
    return ''
  }

  return toAbsoluteShareUrl(`/cloudnote/shares/${noteId}`)
}

function buildExpiresAt(days) {
  if (days === -1) {
    return undefined
  }

  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(23, 59, 59, 999)
  return date.toISOString()
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

function normalizeSearchResult(response) {
  const payload = unwrapShareResponse(response)
  const data = payload?.data

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return []
}

function pickBestMatchedUser(users = [], keyword = '') {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase()

  if (!normalizedKeyword) {
    return users[0] || null
  }

  const exactMatch = users.find((user) => {
    return [user?.oneAccessUserId, user?.userName, user?.nickName]
      .some((value) => String(value || '').trim().toLowerCase() === normalizedKeyword)
  })

  if (exactMatch) {
    return exactMatch
  }

  return users[0] || null
}

async function enrichShareUsers(users = []) {
  const normalizedUsers = normalizeUsers(users)

  return Promise.all(normalizedUsers.map(async (user) => {
    const lookupKey = user?.oneAccessUserId || user?.userName || user?.nickName || ''

    if (!lookupKey) {
      return user
    }

    if (user?.nickName && user?.userName && user?.lowestDept) {
      return user
    }

    try {
      const response = await shareService.searchUsers({
        searchText: lookupKey,
        page: 1,
        pageSize: 20,
      })
      const matches = normalizeSearchResult(response)
      const matchedUser = pickBestMatchedUser(matches, lookupKey)

      if (!matchedUser) {
        return user
      }

      return {
        ...matchedUser,
        oneAccessUserId: matchedUser.oneAccessUserId || user.oneAccessUserId || lookupKey,
        userName: matchedUser.userName || user.userName || lookupKey,
        nickName: matchedUser.nickName || user.nickName || matchedUser.userName || lookupKey,
        lowestDept: matchedUser.lowestDept || user.lowestDept || '',
      }
    } catch {
      return user
    }
  }))
}

function getUserSubmitValue(user) {
  return user?.userName || user?.oneAccessUserId || user?.nickName || ''
}

function getUserDisplayName(user) {
  return user?.nickName || user?.userName || user?.oneAccessUserId || ''
}

function formatUserNames(users = []) {
  return normalizeUsers(users)
    .map((user) => getUserDisplayName(user))
    .filter(Boolean)
    .join('、')
}

function getShareScope(share) {
  if (share?.shareType === 'all' || share?.shareType === 'pointed') {
    return share.shareType
  }

  return 'none'
}

function isShareEnabled(share) {
  return getShareScope(share) !== 'none'
}

function resolveShareDetail(detail, currentNoteId) {
  const shareCode = detail?.shareCode || detail?.noteId || detail?.id || ''
  const shareScope = getShareScope(detail)
  const shareUserItems = normalizeUsers(detail?.userList)

  if (shareScope === 'none') {
    return {
      shareCode: '',
      shareUrl: '',
      shareScope: 'all',
      shareUsers: '',
      shareUserItems: [],
      expiresIn: 30,
    }
  }

  return {
    shareCode,
    shareUrl: buildShareUrl(currentNoteId || detail?.noteId || detail?.id || shareCode),
    shareScope,
    shareUsers: formatUserNames(shareUserItems),
    shareUserItems,
    expiresIn: Number.isFinite(Number(detail?.expiresIn)) ? Number(detail.expiresIn) : 30,
  }
}

function SharePanelDialog({ open, noteId, onClose, onShareChanged, onShareStateLoaded }) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [shareScope, setShareScope] = useState('all')
  const [shareUserItems, setShareUserItems] = useState([])
  const [expiresIn, setExpiresIn] = useState(30)
  const [userSelectorOpen, setUserSelectorOpen] = useState(false)

  const isShared = enabled && Boolean(shareUrl)
  const selectedUserNames = useMemo(() => {
    return shareUserItems.map((user) => getUserDisplayName(user)).filter(Boolean)
  }, [shareUserItems])

  const shareScopeOptions = useMemo(() => ([
    { value: 'all', label: t('share.allUsers') },
    { value: 'pointed', label: t('share.specifiedUsers') },
  ]), [t])

  const expireOptions = useMemo(() => ([
    { value: 1, label: t('share.oneDay') },
    { value: 7, label: t('share.sevenDays') },
    { value: 30, label: t('share.thirtyDays') },
    { value: -1, label: t('share.permanent') },
  ]), [t])

  const emitShareState = (nextIsShared, shareDetail = null, notifyChange = true) => {
    const payload = {
      noteId,
      isShared: nextIsShared,
      shareDetail,
      shareCode: shareDetail?.shareCode || shareCode || '',
      shareUrl: shareDetail?.shareUrl || shareUrl || '',
      shareUsers: shareDetail?.shareUsers || selectedUserNames.join('、'),
      shareUserItems: shareDetail?.shareUserItems || shareUserItems,
    }

    try {
      onShareStateLoaded?.(payload)
    } catch {
      // Keep the dialog resilient if outer sync fails.
    }

    if (notifyChange) {
      Promise.resolve(onShareChanged?.(payload)).catch(() => {})
    }

    return payload
  }

  useEffect(() => {
    if (!open || !noteId) {
      return
    }

    trackEvent('share_panel_open', {
      noteId: String(noteId),
    })

    let active = true
    setLoading(true)

    ;(async () => {
      try {
        const response = await shareService.getShareDetail(noteId)
        const detail = unwrapShareResponse(response)

        if (!active) {
          return
        }

        if (!detail || !isShareEnabled(detail)) {
          setEnabled(false)
          setShareUrl('')
          setShareCode('')
          setShareScope('all')
          setShareUserItems([])
          setExpiresIn(30)
          emitShareState(false, null, false)
          return
        }

        const next = resolveShareDetail(detail, noteId)
        const nextShareUserItems = next.shareScope === 'pointed'
          ? await enrichShareUsers(next.shareUserItems)
          : next.shareUserItems

        if (!active) {
          return
        }

        setEnabled(true)
        setShareCode(next.shareCode)
        setShareUrl(next.shareUrl)
        setShareScope(next.shareScope)
        setShareUserItems(nextShareUserItems)
        setExpiresIn(next.expiresIn)
        emitShareState(true, {
          ...detail,
          ...next,
          shareUserItems: nextShareUserItems,
          shareUsers: formatUserNames(nextShareUserItems),
        }, false)
      } catch (err) {
        if (active) {
          showSharePromptModal({
            operation: 'load',
            error: err,
            language: i18n.language,
          })
          reportError(err, {
            feature: 'share_panel_load',
            noteId: String(noteId || ''),
          })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [noteId, open, i18n.language])

  const createOrUpdateShare = async (scopeOverride = shareScope, userItemsOverride = shareUserItems) => {
    const nextScope = scopeOverride
    const nextUserItems = nextScope === 'pointed' ? normalizeUsers(userItemsOverride) : []
    const userList = nextScope === 'pointed'
      ? nextUserItems.map((user) => getUserSubmitValue(user)).filter(Boolean)
      : undefined

    if (nextScope === 'pointed' && userList.length === 0) {
      showSharePromptModal({
        operation: 'selectUsers',
        language: i18n.language,
      })
      return false
    }

    setLoading(true)

    try {
      const response = await shareService.createShare(noteId, {
        shareType: nextScope,
        userList,
        expiresAt: buildExpiresAt(expiresIn),
      })

      const result = unwrapShareResponse(response) || {}
      const nextShareCode = result.shareCode || result.noteId || result.id || ''
      const nextAbsoluteUrl = buildShareUrl(noteId || result.noteId || result.id || nextShareCode)
      const nextShareDetail = {
        ...result,
        shareCode: nextShareCode,
        shareUrl: nextAbsoluteUrl,
        shareType: nextScope,
        userList,
        expiresAt: buildExpiresAt(expiresIn),
      }

      setEnabled(true)
      setShareScope(nextScope)
      setShareCode(nextShareCode)
      setShareUrl(nextAbsoluteUrl)
      setShareUserItems(nextScope === 'pointed' ? nextUserItems : [])
      message.success(t('share.shareSuccess'))
      trackEvent('share_enabled', {
        noteId: String(noteId || ''),
        shareScope: nextScope,
        expiresIn,
      })
      emitShareState(true, nextShareDetail, true)
      return true
    } catch (err) {
      setEnabled(Boolean(shareCode || shareUrl))
      showSharePromptModal({
        operation: 'enable',
        error: err,
        language: i18n.language,
      })
      reportError(err, {
        feature: 'share_panel_enable',
        noteId: String(noteId || ''),
        shareScope: nextScope,
      })
      trackEvent('share_enable_failed', {
        noteId: String(noteId || ''),
        shareScope: nextScope,
        errorName: err?.name || 'Error',
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleToggleShare = async (checked) => {
    if (!noteId || loading) {
      return
    }

    if (!checked) {
      const shareKey = shareCode || String(noteId || '')

      if (!shareKey) {
        setEnabled(false)
        setShareCode('')
        setShareUrl('')
        setShareUserItems([])
        setShareScope('all')
        emitShareState(false, null, true)
        return
      }

      setLoading(true)

      try {
        await shareService.deleteShare(shareKey)
        setEnabled(false)
        setShareCode('')
        setShareUrl('')
        setShareUserItems([])
        setShareScope('all')
        message.success(t('share.cancelShareSuccess'))
        trackEvent('share_disabled', {
          noteId: String(noteId || ''),
          shareKey,
        })
        emitShareState(false, null, true)
      } catch (err) {
        showSharePromptModal({
          operation: 'disable',
          error: err,
          language: i18n.language,
        })
        reportError(err, {
          feature: 'share_panel_disable',
          noteId: String(noteId || ''),
          shareKey,
        })
        trackEvent('share_disable_failed', {
          noteId: String(noteId || ''),
          errorName: err?.name || 'Error',
        })
      } finally {
        setLoading(false)
      }
      return
    }

    await createOrUpdateShare('all', [])
  }

  const handleScopeChange = async (value) => {
    if (value === 'pointed') {
      setUserSelectorOpen(true)
      return
    }

    setShareScope('all')

    if (enabled) {
      await createOrUpdateShare('all', [])
    }
  }

  const handleConfirmPointedUsers = async (users) => {
    const nextUsers = normalizeUsers(users)
    setUserSelectorOpen(false)
    setShareScope('pointed')
    setShareUserItems(nextUsers)
    await createOrUpdateShare('pointed', nextUsers)
  }

  const handleCopyLink = async () => {
    if (!shareUrl) {
      return
    }

    setCopying(true)
    try {
      await navigator.clipboard.writeText(shareUrl)
      message.success(t('share.copySuccess'))
      trackEvent('share_link_copied', {
        noteId: String(noteId || ''),
        shareCode: shareCode || '',
      })
    } catch (err) {
      showSharePromptModal({
        operation: 'copy',
        error: err,
        language: i18n.language,
      })
      reportError(err, {
        feature: 'share_panel_copy',
        noteId: String(noteId || ''),
        shareCode: shareCode || '',
      })
      trackEvent('share_copy_failed', {
        noteId: String(noteId || ''),
        errorName: err?.name || 'Error',
      })
    } finally {
      setCopying(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      destroyOnHidden={false}
      closeIcon={<CloseOutlined style={{ fontSize: 18, color: '#0f172a' }} />}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          minHeight: 0,
        },
        content: {
          fontFamily: FONT_STACK,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 28,
          overflow: 'hidden',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 24px 70px rgba(15,23,42,0.16)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,252,255,0.98))',
        },
        mask: { background: 'rgba(15, 23, 42, 0.32)' },
      }}
      title={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, fontFamily: FONT_STACK, width: '100%' }}>
        <div style={{ padding: 0, margin: '-8px 0 0 0' }}>
          <div style={{ fontSize: 24, fontWeight: 400, color: '#0f172a', lineHeight: 1.1 }}>
            {t('share.title')}
          </div>
        </div>

        {!enabled ? (
          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '18px 20px',
              minHeight: 96,
              borderRadius: 20,
              background: '#fff',
              border: '1px solid rgba(15,23,42,0.08)',
              boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 400, color: '#0f172a', lineHeight: 1.4 }}>
              {t('share.openShareDescription')}
            </Text>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{t('share.disabled')}</span>
              <Switch
                checked={enabled}
                loading={loading}
                onChange={handleToggleShare}
                style={{ background: enabled ? '#0a59f7' : 'rgba(148,163,184,0.45)' }}
              />
            </div>
          </section>
        ) : (
          <>
            <section
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 10,
                padding: 14,
                borderRadius: 20,
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 14, fontWeight: 400, color: '#0f172a' }}>{t('share.shareLink')}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      {isShared ? t('share.generated') : t('share.notGenerated')}
                    </Text>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{t('share.enabled')}</span>
                    <Switch
                      checked={enabled}
                      loading={loading}
                      onChange={handleToggleShare}
                      style={{ background: enabled ? '#0a59f7' : 'rgba(148,163,184,0.45)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginTop: 12 }}>
                  <Input
                    readOnly
                    value={shareUrl}
                    placeholder={t('share.generateLink')}
                    prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      background: 'rgba(248,250,252,0.92)',
                      borderColor: 'rgba(15,23,42,0.08)',
                      boxShadow: 'none',
                      fontSize: 15,
                    }}
                  />

                  <Button
                    type="primary"
                    onClick={handleCopyLink}
                    disabled={!enabled || !shareUrl}
                    loading={copying}
                    icon={<CopyOutlined />}
                    style={{
                      minWidth: 120,
                      height: 48,
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0a59f7, #2563eb)',
                      boxShadow: '0 14px 28px rgba(10,89,247,0.24)',
                      fontWeight: 400,
                      alignSelf: 'end',
                    }}
                  >
                    {t('share.copyLink')}
                  </Button>
                </div>
              </div>
            </section>

            <section
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 14,
                borderRadius: 20,
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: 400, color: '#0f172a' }}>{t('share.validityPeriod')}</Text>
                <Select
                  value={expiresIn}
                  onChange={setExpiresIn}
                  options={expireOptions}
                  disabled={!enabled || loading}
                  suffixIcon={<DownOutlined style={{ fontSize: 12, color: '#64748b' }} />}
                  style={{ width: 240 }}
                />
              </div>
            </section>

            <section
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 14,
                borderRadius: 20,
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: 400, color: '#0f172a' }}>{t('share.permission')}</Text>
                <Select
                  value={shareScope}
                  onChange={handleScopeChange}
                  suffixIcon={<DownOutlined style={{ fontSize: 12, color: '#64748b' }} />}
                  options={shareScopeOptions}
                  disabled={!enabled || loading}
                  style={{ width: 240 }}
                />
              </div>

              {shareScope === 'pointed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>{t('share.userSelect.selected', { count: shareUserItems.length })}</Text>
                    <Button
                      onClick={() => setUserSelectorOpen(true)}
                      disabled={!enabled || loading}
                      style={{
                        borderRadius: 999,
                        borderColor: 'rgba(15,23,42,0.08)',
                        boxShadow: 'none',
                        paddingInline: 18,
                        height: 36,
                        fontWeight: 400,
                      }}
                    >
                      {shareUserItems.length > 0 ? t('share.userSelect.reselectUser') : t('share.userSelect.chooseUser')}
                    </Button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      maxHeight: 120,
                      overflowY: 'auto',
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(248,250,252,0.92)',
                      border: '1px solid rgba(15,23,42,0.08)',
                    }}
                  >
                    {selectedUserNames.length > 0 ? (
                      selectedUserNames.map((name) => (
                        <span
                          key={name}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: 13,
                            lineHeight: 1.2,
                          }}
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                        {t('share.userSelect.noSelectedUsers')}
                      </Text>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          </>
        )}

        <ShareUserSelectModal
          open={userSelectorOpen}
          initialUsers={shareUserItems}
          loading={loading}
          onCancel={() => setUserSelectorOpen(false)}
          onConfirm={handleConfirmPointedUsers}
        />
      </div>
    </Modal>
  )
}

export default SharePanelDialog
