﻿import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Empty, List, Spin, Tag, Typography } from 'antd'
import {
  HistoryOutlined,
  StarOutlined,
  ShareAltOutlined,
  FolderOutlined,
  DeleteOutlined,
  RollbackOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import useNote from '@/hooks/useNote'
import WorkspaceSectionLayout from '@/components/workspace/WorkspaceSectionLayout'
import { openCenteredConfirm } from '@/utils/centeredConfirm'

const { Text, Paragraph } = Typography

function RecycleBinPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    deletedNotes,
    isLoading,
    fetchDeletedNotes,
    restoreNote,
    permanentDeleteNote,
    clearRecycleBin,
  } = useNote()

  useEffect(() => {
    fetchDeletedNotes()
  }, [fetchDeletedNotes])

  const stats = useMemo(() => [
    { key: 'trash', label: '回收站条目', value: deletedNotes.length, hint: '已删除但可恢复的笔记', icon: <DeleteOutlined /> },
    { key: 'latest', label: '最近删除', value: deletedNotes.length > 0 ? new Date(deletedNotes[0].deletedAt || Date.now()).toLocaleDateString() : '--', hint: '按删除时间排序', icon: <ClockCircleOutlined /> },
    { key: 'sync', label: '同步状态', value: '在线', hint: '删除记录已同步', icon: <SafetyCertificateOutlined /> },
    { key: 'scope', label: '当前范围', value: '回收站', hint: '与其他区域统一框架', icon: <FolderOutlined /> },
  ], [deletedNotes])

  const tabs = [
    { key: 'recent', label: '近期笔记', icon: <HistoryOutlined />, active: false, onClick: () => navigate('/cloudnote/recent') },
    { key: 'starred', label: '星标笔记', icon: <StarOutlined />, active: false, onClick: () => navigate('/cloudnote/starred') },
    { key: 'shares', label: '我的分享', icon: <ShareAltOutlined />, active: false, onClick: () => navigate('/cloudnote/shares') },
    { key: 'notebooks', label: '笔记本', icon: <FolderOutlined />, active: false, onClick: () => navigate('/cloudnote/notebooks') },
    { key: 'recyclebin', label: '回收站', icon: <DeleteOutlined />, active: true, onClick: () => navigate('/cloudnote/recyclebin') },
  ]

  const actions = [
    { key: 'refresh', label: '刷新回收站', icon: <ClearOutlined />, onClick: () => fetchDeletedNotes() },
    {
      key: 'clear',
      label: '清空回收站',
      icon: <DeleteOutlined />,
      onClick: () => clearRecycleBin(),
      disabled: deletedNotes.length === 0,
    },
  ]

  const main = (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>{t('recycleBin.title')}</div>
          <div style={{ fontSize: 13, color: 'rgba(16,34,58,0.54)', marginTop: 4 }}>删除、恢复和彻底删除都在同一套主页面框架中处理。</div>
        </div>
        {deletedNotes.length > 0 && (
          <Button
            danger
            icon={<ClearOutlined />}
            size="small"
            onClick={() => openCenteredConfirm({
              title: t('recycleBin.confirmClear'),
              okText: t('common.delete'),
              cancelText: t('common.cancel'),
              okButtonProps: { danger: true },
              icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
              onOk: clearRecycleBin,
            })}
          >
            {t('recycleBin.clearAll')}
          </Button>
        )}
      </div>

      <Spin spinning={isLoading}>
        {deletedNotes.length === 0 && !isLoading ? (
          <Empty style={{ padding: '48px 0' }} description={t('recycleBin.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={deletedNotes}
            renderItem={(note) => (
              <List.Item
                key={note.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: 16,
                  marginBottom: 10,
                  background: '#fff',
                  border: '1px solid rgba(16,34,58,0.06)',
                  boxShadow: '0 8px 22px rgba(16,34,58,0.03)',
                }}
                actions={[
                  <Button
                    key="restore"
                    type="text"
                    size="small"
                    icon={<RollbackOutlined />}
                    onClick={() => restoreNote(note.id)}
                    style={{ color: '#1677ff' }}
                  >
                    {t('recycleBin.restore')}
                  </Button>,
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => openCenteredConfirm({
                      title: t('recycleBin.confirmDelete'),
                      okText: t('common.delete'),
                      cancelText: t('common.cancel'),
                      okButtonProps: { danger: true },
                      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
                      onOk: () => permanentDeleteNote(note.id),
                    })}
                  >
                    {t('recycleBin.permanentDelete')}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,77,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', fontSize: 18 }}>
                      <DeleteOutlined />
                    </div>
                  }
                  title={<div style={{ fontSize: 15, fontWeight: 700, color: '#10223a' }}>{note.title || '未命名笔记'}</div>}
                  description={
                    <div>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '6px 0 8px', color: 'rgba(16,34,58,0.56)' }}>
                        {note.content || '删除后仍可恢复到原位置。'}
                      </Paragraph>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {note.notebookName && <Tag style={{ borderRadius: 999 }}>{note.notebookName}</Tag>}
                        <Text type="secondary" style={{ fontSize: 12 }}>{note.deletedAt ? `${t('recycleBin.title')}: ${new Date(note.deletedAt).toLocaleDateString()}` : ''}</Text>
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
      <InfoCard title="恢复规则" content="还原后会回到原笔记本；永久删除会直接移出回收站。" />
      <InfoCard title="操作建议" content={[ '删除前先确认笔记是否有分享链接', '清空回收站前可先批量恢复', '和近期页保持统一视觉风格' ]} />
    </div>
  )

  return (
    <WorkspaceSectionLayout
      title="回收站"
      subtitle="删除、恢复、永久删除都在同一套主页面框架中完成。"
      description="回收站保留了和近期/星标/分享/笔记本一致的主页面语言，只是操作更偏向恢复和清理。"
      icon={<DeleteOutlined />}
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

export default RecycleBinPage
