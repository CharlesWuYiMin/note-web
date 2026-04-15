import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Select, Switch, Typography, message } from 'antd'
import { CloseOutlined, CopyOutlined, DownOutlined, LinkOutlined } from '@ant-design/icons'
import shareService from '@/services/shareService'

const { Text } = Typography

const SHARE_SCOPE_OPTIONS = [
  { value: 'all', label: '任意用户' },
  { value: 'pointed', label: '指定用户' },
]

function toAbsoluteShareUrl(shareUrl) {
  if (!shareUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(shareUrl)) {
    return shareUrl
  }

  return `${window.location.origin}${shareUrl.startsWith('/') ? shareUrl : `/${shareUrl}`}`
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

function parseUserList(value) {
  return value
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getShareScope(share) {
  return share?.shareType === 'pointed' ? 'pointed' : 'all'
}

function SharePanelDialog({ open, noteId, onClose, onShareChanged }) {
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [shareScope, setShareScope] = useState('all')
  const [shareUsers, setShareUsers] = useState('')
  const [expiresIn, setExpiresIn] = useState(30)
  const [error, setError] = useState('')

  const canSubmitPointed = shareScope !== 'pointed' || parseUserList(shareUsers).length > 0

  const shareHint = useMemo(
    () => (shareScope === 'all'
      ? '任意拥有链接的用户都可以查看该笔记。'
      : '请输入工号或用户名，多个用户用逗号或换行分隔。'),
    [shareScope]
  )

  useEffect(() => {
    if (!open || !noteId) {
      return
    }

    let active = true

    const loadShareState = async () => {
      setLoading(true)
      setError('')

      try {
        const shares = await shareService.listMyShares()
        if (!active) {
          return
        }

        const currentShare = shares.find((item) => String(item.noteId || item.id) === String(noteId))

        if (!currentShare) {
          setEnabled(false)
          setShareUrl('')
          setShareCode('')
          setShareScope('all')
          setShareUsers('')
          return
        }

        setEnabled(true)
        setShareCode(currentShare.shareCode || '')
        setShareUrl(toAbsoluteShareUrl(currentShare.shareUrl || `/v1/note/shares/${currentShare.shareCode}`))
        setShareScope(getShareScope(currentShare))
        setShareUsers(Array.isArray(currentShare.userList) ? currentShare.userList.join(', ') : '')
      } catch (err) {
        if (active) {
          setError(err.message || '加载分享信息失败')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadShareState()

    return () => {
      active = false
    }
  }, [open, noteId])

  const createOrUpdateShare = async (scopeOverride = shareScope) => {
    const nextScope = scopeOverride
    const userList = nextScope === 'pointed' ? parseUserList(shareUsers) : undefined

    if (nextScope === 'pointed' && userList.length === 0) {
      setError('请选择分享范围内的用户')
      return false
    }

    setLoading(true)
    setError('')

    try {
      if (shareCode) {
        await shareService.deleteShare(shareCode)
      }

      const result = await shareService.createShare(noteId, {
        shareType: nextScope,
        userList,
        expiresAt: buildExpiresAt(expiresIn),
      })

      setEnabled(true)
      setShareCode(result.shareCode || '')
      setShareUrl(toAbsoluteShareUrl(result.shareUrl || `/v1/note/shares/${result.shareCode}`))
      message.success('分享已开启')
      onShareChanged?.()
      return true
    } catch (err) {
      setEnabled(Boolean(shareCode))
      setError(err.message || '分享设置失败')
      message.error('分享设置失败')
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
      if (!shareCode) {
        setEnabled(false)
        setShareUrl('')
        return
      }

      setLoading(true)
      setError('')
      try {
        await shareService.deleteShare(shareCode)
        setEnabled(false)
        setShareCode('')
        setShareUrl('')
        message.success('分享已关闭')
        onShareChanged?.()
      } catch (err) {
        setError(err.message || '关闭分享失败')
        message.error('关闭分享失败')
      } finally {
        setLoading(false)
      }
      return
    }

    await createOrUpdateShare()
  }

  const handleScopeChange = async (value) => {
    setShareScope(value)
    setError('')

    if (enabled && value === 'all') {
      await createOrUpdateShare(value)
    }
  }

  const handleApplyPointedScope = async () => {
    await createOrUpdateShare('pointed')
  }

  const handleCopyLink = async () => {
    if (!shareUrl) {
      return
    }

    setCopying(true)
    try {
      await navigator.clipboard.writeText(shareUrl)
      message.success('链接已复制')
    } catch (err) {
      message.error(err.message || '复制失败，请手动复制')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      centered
      destroyOnHidden={false}
      closeIcon={<CloseOutlined style={{ fontSize: 18, color: '#111827' }} />}
      styles={{
        body: {
          padding: '26px 28px 28px',
        },
        content: {
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 26px 64px rgba(16,34,58,0.18)',
        },
      }}
      title={(
        <div style={{ fontSize: 34, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
          分享笔记
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingBottom: 18,
            borderBottom: '1px solid rgba(226,232,240,0.9)',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
              用户可通过链接访问该笔记
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
              关闭后，现有分享链接会立即失效。
            </div>
          </div>

          <Switch
            checked={enabled}
            loading={loading}
            onChange={handleToggleShare}
            style={{ background: enabled ? '#1d4ed8' : 'rgba(148,163,184,0.55)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
          <Input
            readOnly
            value={shareUrl}
            placeholder="开启分享后生成链接"
            prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
            style={{
              height: 52,
              borderRadius: 14,
              background: '#f8fafc',
              borderColor: 'rgba(226,232,240,0.9)',
            }}
          />
          <Button
            type="primary"
            onClick={handleCopyLink}
            disabled={!enabled || !shareUrl}
            loading={copying}
            icon={<CopyOutlined />}
            style={{
              minWidth: 118,
              height: 52,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 10px 24px rgba(37,99,235,0.28)',
            }}
          >
            复制链接
          </Button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 140px) minmax(0, 1fr)',
            alignItems: 'center',
            gap: 16,
            paddingTop: 2,
          }}
        >
          <Text style={{ fontSize: 15, color: '#111827' }}>分享范围</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select
              value={shareScope}
              onChange={handleScopeChange}
              suffixIcon={<DownOutlined style={{ fontSize: 12, color: '#64748b' }} />}
              options={SHARE_SCOPE_OPTIONS}
              disabled={!enabled || loading}
              style={{ width: 220 }}
            />

            {shareScope === 'pointed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Input.TextArea
                  value={shareUsers}
                  onChange={(event) => setShareUsers(event.target.value)}
                  placeholder="输入工号或用户名，多个用户请用逗号或换行分隔"
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  disabled={!enabled || loading}
                  style={{
                    borderRadius: 14,
                    background: '#f8fafc',
                  }}
                />
                <Button
                  onClick={handleApplyPointedScope}
                  disabled={!enabled || loading || !canSubmitPointed}
                  style={{ alignSelf: 'flex-start', borderRadius: 12 }}
                >
                  更新分享范围
                </Button>
              </div>
            ) : null}

            <div style={{ fontSize: 13, color: '#64748b' }}>
              {shareHint}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 140px) minmax(0, 1fr)',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Text style={{ fontSize: 15, color: '#111827' }}>有效期</Text>
          <Select
            value={expiresIn}
            onChange={setExpiresIn}
            disabled={!enabled || loading}
            options={[
              { value: 1, label: '1天' },
              { value: 7, label: '7天' },
              { value: 30, label: '30天' },
              { value: -1, label: '永久有效' },
            ]}
            style={{ width: 220 }}
          />
        </div>

        {error ? (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(239,68,68,0.08)',
              color: '#b91c1c',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export default SharePanelDialog
