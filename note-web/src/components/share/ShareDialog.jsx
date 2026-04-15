import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Input, Select, message, Space, Typography } from 'antd'
import {
  ShareAltOutlined,
  CopyOutlined,
  LinkOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import shareService from '@/services/shareService'

const { Text, Paragraph } = Typography

const ShareDialog = ({ open, noteId, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [expiresIn, setExpiresIn] = useState(7)
  const [error, setError] = useState(null)

  const handleCreateShare = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await shareService.createShare(noteId, {
        expiresIn,
      })
      
      setShareUrl(result.shareUrl)
      setShareCode(result.shareCode)
      message.success('分享链接已生成')
    } catch (err) {
      setError(err.message || '创建分享失败')
      message.error('创建分享失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      message.success('链接已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败，请手动复制')
    })
  }

  const handleClose = () => {
    setShareUrl('')
    setShareCode('')
    setError(null)
    setExpiresIn(7)
    onClose()
  }

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined style={{ color: '#0256d2' }} />
          <span>分享笔记</span>
        </Space>
      }
      open={open}
      centered
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} icon={<CloseOutlined />}>
          取消
        </Button>,
        shareUrl ? (
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyLink}>
            复制链接
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
            生成分享链接
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
              选择链接有效期：
            </Paragraph>

            <Select
              value={expiresIn}
              onChange={setExpiresIn}
              style={{ width: '100%', marginBottom: 16 }}
              options={[
                { value: 1, label: '1 天后过期' },
                { value: 7, label: '7 天后过期 (推荐)' },
                { value: 30, label: '30 天后过期' },
                { value: -1, label: '永不过期' },
              ]}
            />

            {error && (
              <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 8 }}>
                {error}
              </div>
            )}
          </div>
        ) : (
          <div>
            <Paragraph style={{ marginBottom: 12 }}>
              <Text strong>分享链接已创建</Text>
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
              💡 提示：任何人拥有此链接都可以查看此笔记（只读模式）
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ShareDialog
