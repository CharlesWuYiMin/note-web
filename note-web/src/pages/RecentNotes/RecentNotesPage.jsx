﻿import React, { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Empty, List, Spin, Tag, Tooltip, Typography } from 'antd'
import {
  FileTextOutlined,
  MoreOutlined,
  StarFilled,
  StarOutlined,
  ShareAltOutlined,
  FolderOutlined,
  DeleteOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import useNote from '@/hooks/useNote'
import '@/i18n'
import WorkspaceSectionLayout from '@/components/workspace/WorkspaceSectionLayout'

const { Text, Paragraph } = Typography

function NoteListItem({ note, onClick, onStarToggle, onShare, onMore, t }) {
  return (
    <List.Item
      key={note.id}
      style={{
        padding: '14px 18px',
        borderRadius: 16,
        marginBottom: 10,
        cursor: 'pointer',
        background: note.isShared
          ? 'rgba(37,99,235,0.05)'
          : note.isStarred
            ? 'rgba(0,97,164,0.05)'
            : '#fff',
        border: note.isShared
          ? '1px solid rgba(37,99,235,0.14)'
          : note.isStarred
            ? '1px solid rgba(0,97,164,0.12)'
            : '1px solid rgba(16,34,58,0.06)',
        boxShadow: '0 8px 22px rgba(16,34,58,0.03)',
      }}
      actions={[
        <Tooltip
          title={note.isStarred ? t('note.unstarNote', { defaultValue: '取消收藏' }) : t('note.starNote', { defaultValue: '收藏笔记' })}
          key="star"
          placement="top"
          color="#2f3136"
          mouseEnterDelay={0.1}
          mouseLeaveDelay={0.05}
        >
          <Button
            type="text"
            size="small"
            className={[
              'cloudnote-icon-action-btn',
              'cloudnote-icon-action-btn--compact',
              note.isStarred ? 'cloudnote-icon-action-btn--active' : '',
            ].filter(Boolean).join(' ')}
            aria-label={note.isStarred ? t('note.unstarNote', { defaultValue: '取消收藏' }) : t('note.starNote', { defaultValue: '收藏笔记' })}
            icon={note.isStarred ? <StarFilled style={{ color: 'var(--primary)' }} /> : <StarOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              onStarToggle?.(note)
            }}
          />
        </Tooltip>,
        <Tooltip
          title={note.isShared ? t('note.openSharePanel', { defaultValue: '打开分享面板' }) : t('note.shareNote', { defaultValue: '分享笔记' })}
          key="share"
          placement="top"
          color="#2f3136"
          mouseEnterDelay={0.1}
          mouseLeaveDelay={0.05}
        >
          <Button
            type="text"
            size="small"
            className={[
              'cloudnote-icon-action-btn',
              'cloudnote-icon-action-btn--compact',
              note.isShared ? 'cloudnote-icon-action-btn--active' : '',
            ].filter(Boolean).join(' ')}
            aria-label={note.isShared ? t('note.openSharePanel', { defaultValue: '已分享' }) : t('note.shareNote', { defaultValue: '分享笔记' })}
            icon={<ShareAltOutlined style={{ color: note.isShared ? 'var(--primary)' : undefined }} />}
            onClick={(e) => {
              e.stopPropagation()
              onShare?.(note)
            }}
            style={{
              color: note.isShared ? 'var(--primary)' : undefined,
            }}
          />
        </Tooltip>,
        <Tooltip
          title={t('note.moreActions', { defaultValue: '更多操作' })}
          key="more"
          placement="top"
          color="#2f3136"
          mouseEnterDelay={0.1}
          mouseLeaveDelay={0.05}
        >
          <Button
            type="text"
            size="small"
            className="cloudnote-icon-action-btn cloudnote-icon-action-btn--compact"
            aria-label={t('note.moreActions', { defaultValue: '更多操作' })}
            icon={<MoreOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              onMore?.(note)
            }}
          />
        </Tooltip>,
      ]}
      onClick={() => onClick(note)}
    >
      <List.Item.Meta
        avatar={
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: note.isStarred ? 'rgba(0,97,164,0.1)' : 'rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: note.isStarred ? 'var(--primary)' : 'rgba(16,34,58,0.52)',
              fontSize: 18,
            }}
          >
            <FileTextOutlined />
          </div>
        }
          title={<SpaceTitle note={note} />}
        description={
          <div>
            <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '6px 0 8px', color: 'rgba(16,34,58,0.56)' }}>
              {note.content || '暂无内容摘要，点击后可进入编辑器。'}
            </Paragraph>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {note.notebookName && <Tag style={{ borderRadius: 999 }}>{note.notebookName}</Tag>}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}
              </Text>
            </div>
          </div>
        }
      />
    </List.Item>
  )
}

function SpaceTitle({ note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontWeight: note.isStarred ? 700 : 600, fontSize: 15, color: note.isStarred ? 'var(--primary)' : '#10223a' }}>
          {note.title || '未命名笔记'}
        </span>
        {note.isShared ? (
          <span
            className="cloudnote-icon-action-btn cloudnote-icon-action-btn--compact cloudnote-icon-action-btn--active"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 8px',
              height: 22,
              borderRadius: 999,
              color: 'var(--primary)',
              background: 'rgba(37,99,235,0.08)',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <ShareAltOutlined style={{ fontSize: 11 }} />
            已分享
          </span>
        ) : null}
      </div>
    </div>
  )
}

function RecentNotesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { notes, notesPagination, isLoading, fetchNotes, toggleStar } = useNote()
  const didRedirectRef = useRef(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let active = true
    setIsBootstrapping(true)
    Promise.resolve(fetchNotes()).finally(() => {
      if (active) {
        setIsBootstrapping(false)
      }
    })

    return () => {
      active = false
    }
  }, [fetchNotes])

  useEffect(() => {
    if (location.pathname === '/cloudnote/recent' && !isLoading && !isBootstrapping && notes.length > 0 && !didRedirectRef.current) {
      didRedirectRef.current = true
      navigate(`/cloudnote/recent/${notes[0].id}`, { replace: true })
    }
  }, [location.pathname, isLoading, isBootstrapping, navigate, notes])

  const stats = useMemo(() => {
    const totalRecentNotes = Number(notesPagination?.total) || notes.length
    const starredCount = notes.filter((note) => note.isStarred).length
    const notebookCount = new Set(notes.map((note) => note.notebookName).filter(Boolean)).size
    return [
      {
        key: 'total',
        label: '近期笔记',
        value: totalRecentNotes,
        hint: '登录后默认打开这一组内容',
        icon: <HistoryOutlined />,
      },
      {
        key: 'starred',
        label: '已星标',
        value: starredCount,
        hint: '经常回看的重要内容',
        icon: <StarOutlined />,
      },
      {
        key: 'notebooks',
        label: '相关笔记本',
        value: notebookCount,
        hint: '按笔记本快速过滤',
        icon: <FolderOutlined />,
      },
      {
        key: 'sync',
        label: '同步状态',
        value: '在线',
        hint: '当前数据已与服务端同步',
        icon: <SafetyCertificateOutlined />,
      },
    ]
  }, [notes, notesPagination?.total])

  const tabs = [
    { key: 'recent', label: '近期笔记', icon: <HistoryOutlined />, active: true, onClick: () => navigate('/cloudnote/recent') },
    { key: 'starred', label: '星标笔记', icon: <StarOutlined />, active: false, onClick: () => navigate('/cloudnote/starred') },
    { key: 'myshares', label: '我的分享', icon: <ShareAltOutlined />, active: false, onClick: () => navigate('/cloudnote/myshares') },
    { key: 'notebooks', label: '笔记本', icon: <FolderOutlined />, active: false, onClick: () => navigate('/cloudnote/notebooks') },
    { key: 'recyclebin', label: '回收站', icon: <DeleteOutlined />, active: false, onClick: () => navigate('/cloudnote/recyclebin') },
  ]

  const actions = [
    { key: 'new', label: '新建笔记', icon: <PlusOutlined />, primary: true, onClick: () => console.log('create note') },
    { key: 'sync', label: '刷新列表', icon: <ClockCircleOutlined />, onClick: () => fetchNotes() },
  ]

  const main = (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>最近编辑</div>
          <div style={{ fontSize: 13, color: 'rgba(16,34,58,0.54)', marginTop: 4 }}>默认落点已改成近期笔记，你会先看到这里的第一篇内容。</div>
        </div>
        <Tag color="blue" style={{ borderRadius: 999, marginInlineEnd: 0 }}>按时间排序</Tag>
      </div>

      <Spin spinning={isLoading || isBootstrapping}>
        {notes.length === 0 && !isLoading && !isBootstrapping ? (
          <Empty
            style={{ padding: '48px 0' }}
            description="暂无近期笔记"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={notes}
            renderItem={(note) => (
              <NoteListItem
                key={note.id}
                note={note}
                t={t}
                onClick={(item) => navigate(`/cloudnote/recent/${item.id}`)}
                onStarToggle={async (item) => {
                  await toggleStar(item)
                }}
                onShare={(item) => console.log('share', item.id)}
                onMore={(item) => console.log('more', item.id)}
              />
            )}
          />
        )}
      </Spin>
    </div>
  )

  const side = (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CardBlock
        title="首页说明"
        subtitle="近期笔记就是新的主页"
        content="你访问 /cloudnote/recent 时，会先进入这里的内容列表；如果有数据，系统会自动带你到第一条笔记。"
      />
      <CardBlock
        title="快捷入口"
        subtitle="统一主页框架下的五个区域"
        content={[
          '近期笔记 - 当前默认入口',
          '星标笔记 - 重要内容集合',
          '我的分享 - 对外分享记录',
          '笔记本 - 分类管理',
          '回收站 - 删除恢复',
        ]}
      />
      <CardBlock
        title="编辑提示"
        subtitle="打开第一篇后"
        content="在编辑器里继续写作，左侧列表会保留在统一框架中，方便快速切换。"
      />
    </div>
  )

  return (
    <WorkspaceSectionLayout
      title="近期笔记"
      subtitle="登录后默认进入近期笔记主页，并自动把你带到第一条可打开的笔记。"
      description="这一页承担了原来 home 页面的角色：它既是默认落点，也是统一主页面框架的起点。"
      icon={<HistoryOutlined />}
      actions={actions}
      tabs={tabs}
      stats={stats}
      main={main}
      side={side}
    />
  )
}

function CardBlock({ title, subtitle, content }) {
  return (
    <div style={{
      borderRadius: 20,
      padding: 18,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,249,253,0.96))',
      border: '1px solid rgba(16,34,58,0.06)',
      boxShadow: '0 10px 24px rgba(16,34,58,0.04)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#10223a' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'rgba(16,34,58,0.48)', marginTop: 4 }}>{subtitle}</div>
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

export default RecentNotesPage
