import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, List, Spin, Tag, Tooltip, Typography } from 'antd'
import {
  ShareAltOutlined,
  StarOutlined,
  HistoryOutlined,
  FolderOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import useNote from '@/hooks/useNote'
import WorkspaceSectionLayout from '@/components/workspace/WorkspaceSectionLayout'

const { Text, Paragraph } = Typography

function MySharesPage() {
  const navigate = useNavigate()
  const { myShares, isLoading, fetchMyShares } = useNote()

  useEffect(() => {
    fetchMyShares()
  }, [fetchMyShares])

  const stats = useMemo(() => [
    { key: 'shares', label: '我的分享', value: myShares.length, hint: '对外可访问的分享记录', icon: <ShareAltOutlined /> },
    { key: 'recent', label: '最近分享', value: myShares.length > 0 ? new Date(myShares[0].createdAt || Date.now()).toLocaleDateString() : '--', hint: '按创建时间展示', icon: <ClockCircleOutlined /> },
    { key: 'sync', label: '同步状态', value: '在线', hint: '分享信息已同步', icon: <SafetyCertificateOutlined /> },
    { key: 'scope', label: '页面框架', value: '统一', hint: '与近期/星标/回收站一致', icon: <FolderOutlined /> },
  ], [myShares])

  const tabs = [
    { key: 'recent', label: '近期笔记', icon: <HistoryOutlined />, active: false, onClick: () => navigate('/cloudnote/recent') },
    { key: 'starred', label: '星标笔记', icon: <StarOutlined />, active: false, onClick: () => navigate('/cloudnote/starred') },
    { key: 'shares', label: '我的分享', icon: <ShareAltOutlined />, active: true, onClick: () => navigate('/cloudnote/shares') },
    { key: 'notebooks', label: '笔记本', icon: <FolderOutlined />, active: false, onClick: () => navigate('/cloudnote/notebooks') },
    { key: 'recyclebin', label: '回收站', icon: <DeleteOutlined />, active: false, onClick: () => navigate('/cloudnote/recyclebin') },
  ]

  const actions = [
    { key: 'refresh', label: '刷新分享', icon: <ClockCircleOutlined />, onClick: () => fetchMyShares() },
  ]

  const main = (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>我的分享</div>
        <div style={{ fontSize: 13, color: 'rgba(16,34,58,0.54)', marginTop: 4 }}>分享页采用和近期笔记一致的壳子，只展示不同的数据内容。</div>
      </div>

      <Spin spinning={isLoading}>
        {myShares.length === 0 && !isLoading ? (
          <Empty style={{ padding: '48px 0' }} description="暂无分享记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={myShares}
            renderItem={(share) => {
              const title = share.noteTitle || share.title || '未命名分享'
              const summary = share.description || share.noteSummary || share.noteContent || '分享记录可在这里统一查看。'
              return (
                <List.Item
                  key={share.id || share.shareCode || title}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 16,
                    marginBottom: 10,
                    cursor: 'pointer',
                    background: '#fff',
                    border: '1px solid rgba(16,34,58,0.06)',
                    boxShadow: '0 8px 22px rgba(16,34,58,0.03)',
                  }}
                  actions={[
                    <Tooltip title="复制分享码" key="code">
                      <Button type="text" size="small" onClick={(e) => e.stopPropagation()}>
                        {share.shareCode || '分享码'}
                      </Button>
                    </Tooltip>,
                    <Tooltip title="打开原笔记" key="open">
                      <Button type="text" size="small" onClick={(e) => {
                        e.stopPropagation()
                        if (share.noteId) {
                          navigate(`/cloudnote/recent/${share.noteId}`)
                        }
                      }}>
                        打开
                      </Button>
                    </Tooltip>,
                  ]}
                  onClick={() => share.noteId && navigate(`/cloudnote/recent/${share.noteId}`)}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(0,97,164,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 18 }}>
                        <ShareAltOutlined />
                      </div>
                    }
                    title={<div style={{ fontWeight: 700, fontSize: 15, color: '#10223a' }}>{title}</div>}
                    description={
                      <div>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '6px 0 8px', color: 'rgba(16,34,58,0.56)' }}>
                          {summary}
                        </Paragraph>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {share.expiresAt && <Tag style={{ borderRadius: 999 }}>过期: {new Date(share.expiresAt).toLocaleDateString()}</Tag>}
                          {share.permission && <Tag style={{ borderRadius: 999 }}>{share.permission}</Tag>}
                          <Text type="secondary" style={{ fontSize: 12 }}>{share.createdAt ? new Date(share.createdAt).toLocaleDateString() : ''}</Text>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Spin>
    </div>
  )

  const side = (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoCard title="分享说明" content="分享页和其他页面共享同一个壳子，方便以后统一视觉与交互。" />
      <InfoCard title="快捷动作" content={[ '点击条目打开原笔记', '点击分享码可复制', '左侧导航切换到其他区域' ]} />
    </div>
  )

  return (
    <WorkspaceSectionLayout
      title="我的分享"
      subtitle="统一主页面框架中的分享视图。"
      description="这里展示你创建过的分享记录，和近期笔记、星标笔记保持同样的页面语言。"
      icon={<ShareAltOutlined />}
      actions={actions}
      tabs={tabs}
      stats={stats}
      main={main}
      side={side}
    />
  )
}

function InfoCard({ title, content }) {
  return (
    <div style={{
      borderRadius: 20,
      padding: 18,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,249,253,0.96))',
      border: '1px solid rgba(16,34,58,0.06)',
      boxShadow: '0 10px 24px rgba(16,34,58,0.04)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#10223a' }}>{title}</div>
      {Array.isArray(content) ? (
        <ul style={{ margin: '14px 0 0', paddingLeft: 18, color: 'rgba(16,34,58,0.7)', lineHeight: 1.8 }}>
          {content.map((line) => <li key={line}>{line}</li>)}
        </ul>
      ) : (
        <div style={{ marginTop: 12, color: 'rgba(16,34,58,0.7)', lineHeight: 1.8 }}>{content}</div>
      )}
    </div>
  )
}

export default MySharesPage
