import React, { useState, useEffect } from 'react'
import { Modal, List, Button, Tag, Spin, message, Typography, Space } from 'antd'
import {
  HistoryOutlined,
  RollbackOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import historyService from '@/services/historyService'
import { formatRelativeTime } from '@/utils/dateUtils'

const { Text, Paragraph } = Typography

const HistoryDialog = ({ open, noteId, onClose }) => {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)

  useEffect(() => {
    if (open && noteId) {
      fetchHistory()
    }
  }, [open, noteId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const data = await historyService.getNoteHistory(noteId)
      setHistoryList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
      message.error('获取历史记录失败')
      setHistoryList([])
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (version) => {
    try {
      const result = await historyService.restoreVersion(noteId, version)
      
      if (result.success) {
        message.success(`已恢复到版本 ${version}`)
        onClose()
      } else {
        message.error('恢复失败')
      }
    } catch (error) {
      console.error('Failed to restore version:', error)
      message.error('恢复失败，请重试')
    }
  }

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined style={{ color: '#0256d2' }} />
          <span>历史记录</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} icon={<CloseOutlined />}>
          关闭
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <Spin spinning={loading} tip="加载历史记录...">
        {historyList.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#bfbfbf' }}>
            <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>暂无历史记录</p>
          </div>
        ) : (
          <List
            dataSource={historyList}
            renderItem={(item) => (
              <List.Item
                key={item.version}
                actions={[
                  <Button
                    key="restore"
                    type="link"
                    size="small"
                    icon={<RollbackOutlined />}
                    onClick={() => handleRestore(item.version)}
                    style={{ color: '#1677ff' }}
                  >
                    恢复此版本
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>版本 {item.version}</Text>
                      {item.version === historyList[0]?.version && (
                        <Tag color="#0256d2">当前</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                      </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Modal>
  )
}

export default HistoryDialog
