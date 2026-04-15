import React, { useEffect, useState } from 'react'
import { Avatar, Button, Empty, Spin, Tag, Typography, message } from 'antd'
import {
  ClockCircleOutlined,
  CloseOutlined,
  RollbackOutlined,
  UserOutlined,
} from '@ant-design/icons'
import historyService from '@/services/historyService'

const { Text } = Typography

const HISTORY_PAGE_SIZE = 20

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatHistoryTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

function getHistoryUserLabel(item) {
  return item?.userName || item?.nickName || item?.userId || '未知用户'
}

function getHistoryAvatarLabel(item) {
  const label = getHistoryUserLabel(item).trim()
  return label ? label.slice(0, 1).toUpperCase() : 'U'
}

function normalizeHistoryItems(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items
  }

  return []
}

function HistorySidebar({ open, noteId, onClose, onRestored }) {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [restoringVersion, setRestoringVersion] = useState(null)

  const reloadHistory = async () => {
    if (!open || !noteId) {
      setHistoryList([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await historyService.getNoteHistory(noteId, {
        page: 1,
        pageSize: HISTORY_PAGE_SIZE,
      })
      setHistoryList(normalizeHistoryItems(result))
    } catch (fetchError) {
      setHistoryList([])
      setError(fetchError?.message || '获取历史版本失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, noteId])

  const handleRestore = async (version) => {
    if (!noteId || version == null || restoringVersion != null) {
      return
    }

    setRestoringVersion(version)
    try {
      await historyService.restoreVersion(noteId, version)
      message.success('已恢复到此版本')
      await reloadHistory()
      onRestored?.()
    } catch (restoreError) {
      message.error(restoreError?.message || '恢复失败，请稍后重试')
    } finally {
      setRestoringVersion(null)
    }
  }

  if (!open) {
    return null
  }

  return (
    <aside
      style={{
        width: 376,
        minWidth: 376,
        borderLeft: '1px solid rgba(226,232,240,0.92)',
        background: 'linear-gradient(180deg, rgba(247,250,255,0.98), rgba(255,255,255,0.98))',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        boxShadow: '-12px 0 30px rgba(16,34,58,0.04)',
      }}
    >
      <div
        style={{
          padding: '18px 18px 16px',
          borderBottom: '1px solid rgba(226,232,240,0.82)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10223a' }}>
            <ClockCircleOutlined style={{ color: '#2563eb' }} />
            <Text strong style={{ fontSize: 16, color: '#10223a' }}>
              历史版本
            </Text>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(100,116,139,0.9)' }}>
            仅展示版本条目，不显示正文内容
          </div>
        </div>

        <Button
          type="text"
          aria-label="关闭历史版本"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ color: 'rgba(100,116,139,0.9)' }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 14px 18px',
        }}
      >
        <Spin spinning={loading} tip="正在加载历史版本...">
          {error ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                border: '1px solid rgba(248,113,113,0.18)',
                background: 'rgba(248,113,113,0.06)',
                color: '#b91c1c',
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              <div>{error}</div>
              <Button size="small" style={{ marginTop: 10 }} onClick={reloadHistory}>
                重新加载
              </Button>
            </div>
          ) : null}

          {!loading && !error && historyList.length === 0 ? (
            <div style={{ paddingTop: 40 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无历史版本"
              />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {historyList.map((item, index) => {
              const historyVersion = item?.version
              const historyTime = formatHistoryTime(item?.createdAt || item?.updatedAt || item?.time)
              const historyUserLabel = getHistoryUserLabel(item)
              const isCurrentVersion = index === 0

              return (
                <div
                  key={`${historyVersion ?? 'version'}-${index}`}
                  style={{
                    padding: '18px 18px 16px',
                    borderRadius: 18,
                    background: '#fff',
                    border: '1px solid rgba(226,232,240,0.92)',
                    boxShadow: '0 10px 24px rgba(16,34,58,0.05)',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 500, color: '#1f2937', lineHeight: 1.35 }}>
                    {historyTime || `版本 ${historyVersion ?? '--'}`}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <Avatar
                        size={30}
                        src={item?.profileUrl || item?.avatarUrl}
                        style={{
                          background: item?.profileUrl || item?.avatarUrl
                            ? undefined
                            : 'linear-gradient(135deg, #93c5fd, #3b82f6)',
                          color: '#fff',
                          flexShrink: 0,
                        }}
                        icon={<UserOutlined />}
                      >
                        {getHistoryAvatarLabel(item)}
                      </Avatar>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 500,
                            color: '#111827',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {historyUserLabel}
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            版本 {historyVersion ?? '--'}
                          </Text>
                          {isCurrentVersion ? (
                            <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                              当前版本
                            </Tag>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="text"
                      aria-label={historyVersion != null ? `恢复版本 ${historyVersion}` : '恢复版本'}
                      icon={<RollbackOutlined />}
                      onClick={() => handleRestore(historyVersion)}
                      loading={restoringVersion === historyVersion}
                      disabled={historyVersion == null}
                      style={{
                        color: '#cbd5e1',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Spin>
      </div>
    </aside>
  )
}

export default HistorySidebar
