import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, List, Spin, Tag, Tooltip, Typography } from 'antd'
import {
  StarOutlined,
  ShareAltOutlined,
  HistoryOutlined,
  FolderOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import useNote from '@/hooks/useNote'
import WorkspaceSectionLayout from '@/components/workspace/WorkspaceSectionLayout'

const { Text, Paragraph } = Typography

function StarredNotesPage() {
  const navigate = useNavigate()
  const { starredNotes, isLoading, fetchStarredNotes, toggleStar } = useNote()

  useEffect(() => {
    fetchStarredNotes()
  }, [fetchStarredNotes])

  const stats = useMemo(() => [
    { key: 'starred', label: '星标笔记', value: starredNotes.length, hint: '被你重点关注的内容', icon: <StarOutlined /> },
    { key: 'updated', label: '最近更新', value: starredNotes.length > 0 ? new Date(starredNotes[0].updatedAt || Date.now()).toLocaleDateString() : '--', hint: '按更新时间排序', icon: <ClockCircleOutlined /> },
    { key: 'sync', label: '同步状态', value: '在线', hint: '星标信息已同步', icon: <SafetyCertificateOutlined /> },
    { key: 'scope', label: '当前范围', value: '星标', hint: '与近期笔记同框架展示', icon: <FolderOutlined /> },
  ], [starredNotes])

  const tabs = [
    { key: 'recent', label: '近期笔记', icon: <HistoryOutlined />, active: false, onClick: () => navigate('/cloudnote/recent') },
    { key: 'starred', label: '星标笔记', icon: <StarOutlined />, active: true, onClick: () => navigate('/cloudnote/starred') },
    { key: 'shares', label: '我的分享', icon: <ShareAltOutlined />, active: false, onClick: () => navigate('/cloudnote/shares') },
    { key: 'notebooks', label: '笔记本', icon: <FolderOutlined />, active: false, onClick: () => navigate('/cloudnote/notebooks') },
    { key: 'recyclebin', label: '回收站', icon: <DeleteOutlined />, active: false, onClick: () => navigate('/cloudnote/recyclebin') },
  ]

  const actions = [
    { key: 'refresh', label: '刷新星标', icon: <ClockCircleOutlined />, onClick: () => fetchStarredNotes() },
  ]

  const main = (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>星标笔记</div>
        <div style={{ fontSize: 13, color: 'rgba(16,34,58,0.54)', marginTop: 4 }}>重点内容与近期笔记采用同一套主页面框架，只是视图内容不同。</div>
      </div>

      <Spin spinning={isLoading}>
        {starredNotes.length === 0 && !isLoading ? (
          <Empty style={{ padding: '48px 0' }} description="暂无星标笔记" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={starredNotes}
            renderItem={(note) => (
              <List.Item
                key={note.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: 16,
                  marginBottom: 10,
                  cursor: 'pointer',
                  background: 'rgba(0,97,164,0.05)',
                  border: '1px solid rgba(0,97,164,0.12)',
                  boxShadow: '0 8px 22px rgba(16,34,58,0.03)',
                }}
                actions={[
                  <Tooltip title="取消星标" key="unstar">
                    <Button
                      type="text"
                      size="small"
                      icon={<StarOutlined style={{ color: 'var(--primary)' }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(note)
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="打开" key="open">
                    <Button type="text" size="small" onClick={() => navigate(`/cloudnote/recent/${note.id}`)}>
                      打开
                    </Button>
                  </Tooltip>,
                ]}
                onClick={() => navigate(`/cloudnote/recent/${note.id}`)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(0,97,164,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 18 }}>
                      <StarOutlined />
                    </div>
                  }
                  title={<div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{note.title || '未命名笔记'}</div>}
                  description={
                    <div>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '6px 0 8px', color: 'rgba(16,34,58,0.56)' }}>
                        {note.content || '点击打开后可继续编辑。'}
                      </Paragraph>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {note.notebookName && <Tag style={{ borderRadius: 999 }}>{note.notebookName}</Tag>}
                        <Text type="secondary" style={{ fontSize: 12 }}>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}</Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  )

  const side = (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoCard title="星标提醒" content="这里仍然是同一个主页面框架，星标只是其中一个视图。" />
      <InfoCard title="快捷动作" content={[ '点击条目进入编辑器', '点击星标按钮可取消星标', '使用左侧导航切换到其他区域' ]} />
    </div>
  )

  return (
    <WorkspaceSectionLayout
      title="星标笔记"
      subtitle="把重要内容单独聚拢，同时保留和近期笔记一致的主页面体验。"
      description="星标页、近期页、分享页、笔记本和回收站都采用同一套视图框架。"
      icon={<StarOutlined />}
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

export default StarredNotesPage
