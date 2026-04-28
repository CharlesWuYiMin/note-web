import React, { useState } from 'react'
import { Modal, Button, Input, Select, message, Space, Typography } from 'antd'
import {
  ShareAltOutlined,
  CopyOutlined,
  LinkOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '@/i18n'
import shareService from '@/services/shareService'
import { reportError } from '@/utils/observability'
import { showSharePromptModal } from '@/utils/shareErrorMessages'

const { Text, Paragraph } = Typography

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

const ShareDialog = ({ open, noteId, onClose }) => {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [expiresIn, setExpiresIn] = useState(7)

  const handleCreateShare = async () => {
    try {
      setLoading(true)

      const result = await shareService.createShare(noteId, {
        expiresAt: buildExpiresAt(expiresIn),
      })

      setShareUrl(toAbsoluteShareUrl(result.shareUrl || `/cloudnote/shares/${result.noteId || result.shareCode}`))
      setShareCode(result.shareCode || result.noteId || '')
      message.success(t('share.shareSuccess'))
    } catch (err) {
      showSharePromptModal({
        operation: 'create',
        error: err,
        language: i18n.language,
      })
      reportError(err, {
        feature: 'share_dialog_create',
        noteId: String(noteId || ''),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      message.success(t('share.copySuccess'))
    }).catch((err) => {
      showSharePromptModal({
        operation: 'copy',
        error: err,
        language: i18n.language,
      })
    })
  }

  const handleClose = () => {
    setShareUrl('')
    setShareCode('')
    setExpiresIn(7)
    onClose()
  }

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined style={{ color: '#0256d2' }} />
          <span>{t('share.title')}</span>
        </Space>
      }
      open={open}
      centered
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} icon={<CloseOutlined />}>
          {t('common.cancel')}
        </Button>,
        shareUrl ? (
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyLink}>
            {t('share.copyLink')}
          </Button>
        ) : (
          <Button
            key="create"
            type="primary"
            icon={<LinkOutlined />}
            loading={loading}
            onClick={handleCreateShare}
            style={{
              background: 'linear-gradient(135deg, #0256d2, #4880fd)',
              border: 'none',
              borderRadius: 8,
            }}
          >
            {t('share.generateLink')}
          </Button>
        ),
      ]}
      width={480}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        {!shareUrl ? (
          <div>
            <Paragraph style={{ marginBottom: 16, color: '#5f6368' }}>
              {t('share.validityPeriod')}
            </Paragraph>

            <Select
              value={expiresIn}
              onChange={setExpiresIn}
              style={{ width: '100%', marginBottom: 16 }}
              options={[
                { value: 1, label: t('share.oneDay') },
                { value: 7, label: t('share.sevenDays') },
                { value: 30, label: t('share.thirtyDays') },
                { value: -1, label: t('share.permanent') },
              ]}
            />

          </div>
        ) : (
          <div>
            <Paragraph style={{ marginBottom: 12 }}>
              <Text strong>{t('share.generated')}</Text>
            </Paragraph>

            <Input.TextArea
              value={shareUrl}
              readOnly
              autoSize={{ minRows: 2, maxRows: 3 }}
              style={{
                fontFamily: "'Monaco', 'Menlo', monospace",
                fontSize: 13,
                borderRadius: 8,
                background: '#f7f9fb',
                border: '1px solid rgba(172,179,183,0.15)',
              }}
            />

            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              background: 'rgba(2,86,210,0.04)',
              borderRadius: 8,
              fontSize: 13,
              color: '#5f6368',
            }}>
              {t('share.openShareDescription')}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ShareDialog
