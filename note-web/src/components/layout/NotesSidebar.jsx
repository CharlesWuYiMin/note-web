import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { Button, Checkbox, Dropdown, Input, Modal, Select, Spin, Tooltip, message } from 'antd'
import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  FilterOutlined,
  MoreOutlined,
  ShareAltOutlined,
  StarFilled,
  StarOutlined,
  SortAscendingOutlined,
  UnorderedListOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import useNote from '@/hooks/useNote'
import useNotebook from '@/hooks/useNotebook'
import noteService from '@/services/noteService'
import shareService from '@/services/shareService'
import EmptyState from '@/components/common/EmptyState'
import SharePanelDialog from '@/components/share/SharePanelDialog'
import { getLocalizedNotebookName } from '@/utils/notebookLocalization'
import {
  DEFAULT_RECENT_NOTE_SORT,
  RECENT_NOTE_SORT_FIELDS,
  RECENT_NOTE_SORT_ORDERS,
  sortRecentNotes,
} from '@/utils/recentNoteSort'

const SORT_FIELD_OPTIONS = [
  { key: RECENT_NOTE_SORT_FIELDS.CREATED_AT, label: '创建时间', icon: <CalendarOutlined /> },
  { key: RECENT_NOTE_SORT_FIELDS.UPDATED_AT, label: '修改时间', icon: <ClockCircleOutlined /> },
  { key: RECENT_NOTE_SORT_FIELDS.TITLE, label: '笔记名称', icon: <SortAscendingOutlined /> },
]

const SORT_ORDER_OPTIONS = {
  [RECENT_NOTE_SORT_FIELDS.CREATED_AT]: [
    { key: RECENT_NOTE_SORT_ORDERS.DESC, label: '最新创建' },
    { key: RECENT_NOTE_SORT_ORDERS.ASC, label: '最早创建' },
  ],
  [RECENT_NOTE_SORT_FIELDS.UPDATED_AT]: [
    { key: RECENT_NOTE_SORT_ORDERS.DESC, label: '最近修改' },
    { key: RECENT_NOTE_SORT_ORDERS.ASC, label: '最早修改' },
  ],
  [RECENT_NOTE_SORT_FIELDS.TITLE]: [
    { key: RECENT_NOTE_SORT_ORDERS.DESC, label: '从 Z 到 A' },
    { key: RECENT_NOTE_SORT_ORDERS.ASC, label: '从 A 到 Z' },
  ],
}

const BATCH_ACTION_LABELS = {
  recent: ['删除', '移动'],
  notebooks: ['删除', '移动'],
  starred: ['取消收藏'],
  myshares: ['取消分享'],
  recyclebin: ['恢复', '彻底删除'],
}

const NOTE_LIST_VIRTUALIZATION_THRESHOLD = 40
const NOTE_LIST_ESTIMATED_ROW_HEIGHT = 124
const NOTE_LIST_OVERSCAN = 4
const NOTE_LIST_VIEWPORT_FALLBACK_HEIGHT = 720

function getSectionEmptyLabel(section, t) {
  const keyMap = {
    recent: 'notesSidebar.empty.recent',
    starred: 'notesSidebar.empty.starred',
    myshares: 'notesSidebar.empty.shares',
    notebooks: 'notesSidebar.empty.notebooks',
    recyclebin: 'notesSidebar.empty.recycleBin',
  }

  const defaultMap = {
    recent: '暂无近期笔记',
    starred: '暂无星标笔记',
    myshares: '暂无分享记录',
    notebooks: '暂无笔记',
    recyclebin: '回收站为空',
  }

  return t(keyMap[section] || keyMap.recent, { defaultValue: defaultMap[section] || defaultMap.recent })
}

function getSectionEmptyDescription(section, t) {
  const keyMap = {
    recent: 'notesSidebar.emptyDescription.recent',
    starred: 'notesSidebar.emptyDescription.starred',
    myshares: 'notesSidebar.emptyDescription.shares',
    notebooks: 'notesSidebar.emptyDescription.notebooks',
    recyclebin: 'notesSidebar.emptyDescription.recycleBin',
  }

  const defaultMap = {
    recent: '创建或导入笔记后，会在这里继续显示。',
    starred: '收藏重要内容后，可以在这里继续查看。',
    myshares: '创建分享后，可以在这里集中管理分享链接。',
    notebooks: '当前分类下还没有笔记，试试新建一条内容。',
    recyclebin: '删除的笔记会先进入这里，便于恢复或清理。',
  }

  return t(keyMap[section] || keyMap.recent, { defaultValue: defaultMap[section] || defaultMap.recent })
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function resolveNotebookName(note, notebookMapById, fallbackNotebookName = '', t) {
  const candidates = [
    note?.notebook ? getLocalizedNotebookName(note.notebook, t) : '',
    getLocalizedNotebookName(note?.notebookName, t),
    getLocalizedNotebookName(note?.notebook?.name, t),
    getLocalizedNotebookName(note?.notebookTitle, t),
    getLocalizedNotebookName(note?.notebook_title, t),
    getLocalizedNotebookName(note?.folderName, t),
    getLocalizedNotebookName(note?.folder_name, t),
    notebookMapById[note?.notebookId] ? getLocalizedNotebookName(notebookMapById[note.notebookId], t) : '',
    notebookMapById[note?.notebook_id] ? getLocalizedNotebookName(notebookMapById[note.notebook_id], t) : '',
    getLocalizedNotebookName(fallbackNotebookName, t),
  ]

  return candidates.find((value) => typeof value === 'string' && value.trim()) || ''
}

function hasVoiceRecords(note) {
  if (Array.isArray(note?.voiceNote) && note.voiceNote.length > 0) {
    return true
  }

  if (Array.isArray(note?.voiceRealtimeSessions) && note.voiceRealtimeSessions.length > 0) {
    return true
  }

  if (Number(note?.voiceNumber) > 0) {
    return true
  }

  if (Number(note?.voiceCount) > 0) {
    return true
  }

  return false
}

function getVirtualNoteWindow(totalCount, scrollTop, viewportHeight) {
  if (totalCount <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    }
  }

  const safeViewportHeight = viewportHeight > 0 ? viewportHeight : NOTE_LIST_VIEWPORT_FALLBACK_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / NOTE_LIST_ESTIMATED_ROW_HEIGHT) - NOTE_LIST_OVERSCAN)
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + safeViewportHeight) / NOTE_LIST_ESTIMATED_ROW_HEIGHT) + NOTE_LIST_OVERSCAN,
  )

  return {
    startIndex,
    endIndex,
    topSpacerHeight: startIndex * NOTE_LIST_ESTIMATED_ROW_HEIGHT,
    bottomSpacerHeight: Math.max(0, (totalCount - endIndex) * NOTE_LIST_ESTIMATED_ROW_HEIGHT),
  }
}

function RecentNoteCard({
  note,
  batchMode,
  selected,
  isCurrentNote,
  isSharedNote,
  isMoreOpen,
  currentSection,
  sortField,
  t,
  onNavigate,
  onToggleSelection,
  onOpenSharePanel,
  onToggleStar,
  getNoteMoreMenuItems,
  onNoteMoreAction,
  setActiveMoreNoteId,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const noteId = String(note.id)
  const isRecycleBinSection = currentSection === 'recyclebin'
  const showSelectedActions = !batchMode && (isHovered || isCurrentNote || isMoreOpen)
  const showStarAction = !batchMode && (note.isStarred || isHovered || isCurrentNote || isMoreOpen)
  const showMoreAction = !batchMode && (isCurrentNote || isMoreOpen)
  const canUseShareAction = !batchMode && !isRecycleBinSection
  const canUseStarAction = !batchMode && !isRecycleBinSection

  return (
    <div
      data-testid="recent-note-card"
      onClick={() => {
        if (batchMode) {
          onToggleSelection(noteId)
          return
        }
        onNavigate(note)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return
        }

        event.preventDefault()
        if (batchMode) {
          onToggleSelection(noteId)
          return
        }

        onNavigate(note)
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        background: 'transparent',
        padding: 0,
        marginBottom: 10,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '100%',
          margin: 0,
          border: isCurrentNote || isHovered
            ? '1px solid rgba(10,89,247,0.10)'
            : '1px solid rgba(15,23,42,0.08)',
          background: isCurrentNote
            ? 'var(--primary-soft)'
            : isHovered
              ? 'rgba(248,250,252,1)'
              : '#ffffff',
          borderRadius: 14,
          padding: batchMode ? '14px 16px 14px 14px' : '14px 16px 14px 18px',
          boxSizing: 'border-box',
          transition: 'all 0.18s ease',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          boxShadow: isCurrentNote
            ? '0 6px 16px rgba(10,89,247,0.08)'
            : isHovered
              ? '0 4px 12px rgba(15,23,42,0.05)'
              : 'none',
          transform: 'translateY(0)',
        }}
      >
        {batchMode ? (
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelection(noteId)}
            onClick={(event) => event.stopPropagation()}
            style={{ marginTop: 2 }}
          />
        ) : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: isCurrentNote ? 700 : 600,
              color: '#10223a',
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {note.title || t('note.untitled', { defaultValue: '未命名笔记' })}
          </div>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'nowrap',
              minWidth: 0,
              overflow: 'hidden',
              fontSize: 12,
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span>{formatMetaDate(note, sortField, true)}</span>
              {note.notebookName ? (
                <span
                  style={{
                    maxWidth: 112,
                    flexShrink: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#2563eb',
                    background: 'rgba(10,89,247,0.08)',
                    padding: '2px 6px',
                    borderRadius: 6,
                  }}
                >
                  {note.notebookName}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 2,
            flexShrink: 0,
            minWidth: 0,
            justifyContent: 'flex-end',
          }}
        >
          {hasVoiceRecords(note) ? (
            <Tooltip
              title={t('note.voiceRecords', { defaultValue: '有语音记录' })}
              placement="top"
              color="#2f3136"
              mouseEnterDelay={0.1}
              mouseLeaveDelay={0.05}
            >
              <span
                title={t('note.voiceRecords', { defaultValue: '有语音记录' })}
                aria-label={t('note.voiceRecords', { defaultValue: '有语音记录' })}
                className="cloudnote-icon-action-btn cloudnote-icon-action-btn--compact cloudnote-icon-action-btn--active"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  color: '#7c3aed',
                  background: 'rgba(124,58,237,0.10)',
                  fontSize: 14,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'default',
                  pointerEvents: 'none',
                }}
              >
                <SoundOutlined />
              </span>
            </Tooltip>
          ) : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: (showSelectedActions || isSharedNote) ? 1 : 0,
              pointerEvents: (showSelectedActions || isSharedNote) ? 'auto' : 'none',
              transition: 'opacity 0.16s ease',
            }}
          >
            {(showSelectedActions || isSharedNote) ? (
              <Tooltip
                title={isSharedNote
                  ? t('note.openSharePanel', { defaultValue: '打开分享面板' })
                  : t('note.shareNote', { defaultValue: '分享笔记' })}
                placement="top"
                color="#2f3136"
                mouseEnterDelay={0.1}
                mouseLeaveDelay={0.05}
              >
                <button
                  type="button"
                  aria-label={isSharedNote
                    ? t('note.openSharePanel', { defaultValue: '已分享' })
                    : t('note.shareNote', { defaultValue: '分享' })}
                  className={[
                    'cloudnote-icon-action-btn',
                    'cloudnote-icon-action-btn--compact',
                    isSharedNote ? 'cloudnote-icon-action-btn--active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!canUseShareAction) {
                      return
                    }
                    onOpenSharePanel(note)
                  }}
                  style={{
                    border: 'none',
                    padding: 0,
                    color: isSharedNote ? '#2563eb' : 'rgba(100,116,139,0.58)',
                    fontSize: 16,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    cursor: canUseShareAction ? 'pointer' : 'default',
                    opacity: isRecycleBinSection ? 0.72 : 1,
                    pointerEvents: canUseShareAction ? 'auto' : 'none',
                    transition: 'opacity 0.16s ease',
                  }}
                >
                  <ShareAltOutlined />
                </button>
              </Tooltip>
            ) : null}
          </div>
          {showStarAction ? (
            <Tooltip
              title={note.isStarred
                ? t('note.unstarNote', { defaultValue: '取消收藏' })
                : t('note.starNote', { defaultValue: '收藏笔记' })}
              placement="top"
              color="#2f3136"
              mouseEnterDelay={0.1}
              mouseLeaveDelay={0.05}
            >
              <button
                type="button"
                aria-label={note.isStarred
                  ? t('note.unstarNote', { defaultValue: '取消收藏' })
                  : t('note.starNote', { defaultValue: '收藏' })}
                className={[
                  'cloudnote-icon-action-btn',
                  'cloudnote-icon-action-btn--compact',
                  note.isStarred ? 'cloudnote-icon-action-btn--active' : '',
                ].filter(Boolean).join(' ')}
                onClick={(event) => {
                  event.stopPropagation()
                  if (!canUseStarAction) {
                    return
                  }
                  onToggleStar(note)
                }}
                style={{
                  border: 'none',
                  padding: 0,
                  color: note.isStarred ? '#d97706' : 'rgba(100,116,139,0.58)',
                  fontSize: 16,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  cursor: canUseStarAction ? 'pointer' : 'default',
                  opacity: isRecycleBinSection ? 0.72 : 1,
                  pointerEvents: canUseStarAction ? 'auto' : 'none',
                  transition: 'opacity 0.16s ease',
                }}
              >
                {note.isStarred ? <StarFilled /> : <StarOutlined />}
              </button>
            </Tooltip>
          ) : null}
          {showMoreAction ? (
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              overlayClassName="cloudnote-notes-more-menu"
              menu={{
                items: getNoteMoreMenuItems(note),
                onClick: async ({ key, domEvent }) => {
                  domEvent.stopPropagation()
                  await onNoteMoreAction({ key, note })
                },
              }}
              onOpenChange={(open) => {
                if (open) {
                  setActiveMoreNoteId(noteId)
                  return
                }

                setActiveMoreNoteId((prev) => (prev === noteId ? null : prev))
              }}
            >
              <Tooltip
                title={t('note.moreActions', { defaultValue: '更多操作' })}
                placement="top"
                color="#2f3136"
                mouseEnterDelay={0.1}
                mouseLeaveDelay={0.05}
              >
                <button
                  type="button"
                  aria-label={t('note.moreActions', { defaultValue: '更多' })}
                  className={[
                    'cloudnote-icon-action-btn',
                    'cloudnote-icon-action-btn--compact',
                    isMoreOpen ? 'cloudnote-icon-action-btn--active' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                  style={{
                    border: 'none',
                    padding: 0,
                    color: isMoreOpen ? '#2563eb' : 'rgba(100,116,139,0.72)',
                    fontSize: 16,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    opacity: 1,
                    transition: 'color 0.16s ease',
                  }}
                >
                  <MoreOutlined />
                </button>
              </Tooltip>
            </Dropdown>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function NotesSidebar({ visible = true, width = 320 }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    notes = [],
    notesPagination,
    starredNotes = [],
    starredNotesPagination,
    myShares = [],
    mySharesPagination,
    deletedNotes = [],
    deletedNotesPagination,
    fetchNotes,
    loadMoreNotes,
    fetchStarredNotes,
    loadMoreStarredNotes,
    fetchMyShares,
    loadMoreMyShares,
    fetchDeletedNotes,
    loadMoreDeletedNotes,
    toggleStar,
    updateName,
    syncNoteShareState,
    isLoading,
    isNotesLoadingMore,
    isStarredNotesLoadingMore,
    isMySharesLoadingMore,
    isDeletedNotesLoadingMore,
    hasLoadedNotes,
      hasLoadedStarredNotes,
      hasLoadedMyShares,
      hasLoadedDeletedNotes,
      currentNote,
      loadNoteById,
    } = useNote()
  const { notebooks = [], currentNotebook, fetchNotebooks, setCurrentNotebook } = useNotebook()
  const [sort, setSort] = useState(DEFAULT_RECENT_NOTE_SORT)
  const [menuOpen, setMenuOpen] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [targetNotebookId, setTargetNotebookId] = useState(null)
  const [copyTargetNotebookId, setCopyTargetNotebookId] = useState(null)
  const [copySourceNoteId, setCopySourceNoteId] = useState(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTargetNoteId, setRenameTargetNoteId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false)
  const [pendingField, setPendingField] = useState(DEFAULT_RECENT_NOTE_SORT.field)
  const [activeMoreNoteId, setActiveMoreNoteId] = useState(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareDialogNoteId, setShareDialogNoteId] = useState(null)
  const [dangerConfirm, setDangerConfirm] = useState(null)
  const hasRedirectedRef = useRef(false)
  const lastNotebookFetchKeyRef = useRef('')
  const scrollContainerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0)

  const isRecentRoute = location.pathname.startsWith('/cloudnote/recent')
  const isStarredRoute = location.pathname.startsWith('/cloudnote/starred')
  const isMySharesRoute = location.pathname.startsWith('/cloudnote/myshares')
  const isNotebooksRoute = location.pathname.startsWith('/cloudnote/notebooks')
  const isRecycleBinRoute = location.pathname.startsWith('/cloudnote/recyclebin')
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const currentSection = isStarredRoute
    ? 'starred'
    : isMySharesRoute
      ? 'myshares'
      : isNotebooksRoute
        ? 'notebooks'
        : isRecycleBinRoute
          ? 'recyclebin'
          : 'recent'
  const notebookRouteNotebookId = currentSection === 'notebooks' && pathSegments[1] === 'notebooks' && pathSegments.length >= 4
    ? pathSegments[2]
    : ''
  const legacyNotebookRouteNoteId = currentSection === 'notebooks' && pathSegments[1] === 'notebooks' && pathSegments.length === 3
    ? pathSegments[2]
    : ''
  const currentNoteId = currentSection === 'notebooks'
    ? (pathSegments.length >= 4 ? pathSegments[3] : legacyNotebookRouteNoteId || null)
    : (
      location.pathname.startsWith('/cloudnote/recent/')
      || location.pathname.startsWith('/cloudnote/starred/')
      || location.pathname.startsWith('/cloudnote/myshares/')
      || location.pathname.startsWith('/cloudnote/recyclebin/')
    )
      ? pathSegments.at(-1)
      : null
  const currentRouteNoteId = currentNoteId ? String(currentNoteId) : ''
  const routeNotebookId = currentSection === 'notebooks'
    ? String(
      notebookRouteNotebookId
      || (
        currentRouteNoteId
        && currentNote?.id
        && String(currentNote.id) === currentRouteNoteId
          ? currentNote?.notebookId
          : ''
      )
      || ''
    ).trim()
    : ''
  const resolvedNotebookId = routeNotebookId || String(currentNotebook?.id || '').trim()
  const isSectionRoot = location.pathname === `/cloudnote/${currentSection}`
  const isSupportedRoute = isRecentRoute || isStarredRoute || isMySharesRoute || isNotebooksRoute || isRecycleBinRoute
  const notebookFetchKey = currentSection === 'notebooks' && resolvedNotebookId
    ? `${resolvedNotebookId}:${sort.field}:${sort.order}`
    : ''

  useEffect(() => {
    if (currentSection !== 'notebooks') {
      lastNotebookFetchKeyRef.current = ''
    }
  }, [currentSection])

  useEffect(() => {
    if (!visible || !isSupportedRoute) {
      hasRedirectedRef.current = false
      return
    }

    if (currentSection === 'notebooks') {
      return
    }

    if (currentSection === 'recent') {
      fetchNotes(sort)
      return
    }

    if (currentSection === 'starred') {
      fetchStarredNotes(sort)
      return
    }

    if (currentSection === 'myshares') {
      fetchMyShares()
      return
    }

    if (currentSection === 'recyclebin') {
      fetchDeletedNotes()
    }
  }, [
    visible,
    isSupportedRoute,
    currentSection,
    fetchNotes,
    fetchStarredNotes,
    fetchMyShares,
    fetchDeletedNotes,
    sort,
  ])

  useEffect(() => {
    if (!visible || currentSection !== 'notebooks') {
      return
    }

    if (!resolvedNotebookId) {
      return
    }

    if (currentNotebook?.id !== resolvedNotebookId) {
      const notebookMatch = notebooks.find((item) => String(item?.id || '') === resolvedNotebookId)
      if (notebookMatch) {
        setCurrentNotebook(notebookMatch)
      }
      return
    }

    if (lastNotebookFetchKeyRef.current !== notebookFetchKey) {
      lastNotebookFetchKeyRef.current = notebookFetchKey
      fetchNotes({
        ...sort,
        notebookId: resolvedNotebookId,
      })
    }
  }, [
    visible,
    currentSection,
    currentNotebook?.id,
    currentNote?.id,
    currentNote?.notebookId,
    currentRouteNoteId,
    resolvedNotebookId,
    notebookFetchKey,
    notebooks,
    fetchNotes,
    setCurrentNotebook,
    sort,
  ])

  useEffect(() => {
    const shouldLoadNotebookMeta = currentSection === 'recent' || currentSection === 'notebooks'

    if (!visible || !shouldLoadNotebookMeta || notebooks.length > 0) {
      return
    }

    fetchNotebooks()
  }, [visible, currentSection, notebooks.length, fetchNotebooks])

  const notebookMapById = useMemo(() => notebooks.reduce((result, notebook) => {
    if (notebook?.id && notebook?.name) {
      result[notebook.id] = notebook
    }
    return result
  }, {}), [notebooks])

  const sourceNotes = useMemo(() => {
    if (currentSection === 'starred') {
      return starredNotes.map((item) => ({
        ...item,
        notebookName: resolveNotebookName(item, notebookMapById, '', t),
      }))
    }

    if (currentSection === 'myshares') {
      return myShares.map((item) => ({
        ...item,
        id: item.noteId || item.id,
        title: item.noteTitle || item.title,
        notebookName: getLocalizedNotebookName(item.notebookName, t) || item.shareCode || t('share.title', { defaultValue: '分享' }),
        updatedAt: item.updatedAt || item.createdAt,
      }))
    }

    if (currentSection === 'recyclebin') {
      return deletedNotes.map((item) => ({
        ...item,
        notebookName: resolveNotebookName(item, notebookMapById, '', t),
      }))
    }

    const notebookScopedNotes = currentSection === 'notebooks' && resolvedNotebookId
      ? notes.filter((item) => {
        const itemNotebookId = String(item?.notebookId || item?.notebook?.id || '').trim()
        return itemNotebookId === resolvedNotebookId
      })
      : notes

    return notebookScopedNotes.map((item) => ({
      ...item,
      notebookName: resolveNotebookName(
        item,
        notebookMapById,
        currentSection === 'notebooks' ? currentNotebook?.name : '',
        t
      ),
    }))
  }, [currentSection, starredNotes, myShares, deletedNotes, notes, notebookMapById, currentNotebook?.name, resolvedNotebookId, t])

  const sortedNotes = useMemo(() => sortRecentNotes(sourceNotes, sort), [sourceNotes, sort])
  const selectedNoteIdSet = useMemo(() => new Set(selectedNoteIds), [selectedNoteIds])
  const starredLoadedCount = starredNotes.length
  const starredTotalCount = Number(starredNotesPagination?.total) || 0
  const mySharesLoadedCount = myShares.length
  const mySharesTotalCount = Number(mySharesPagination?.total) || 0
  const deletedLoadedCount = deletedNotes.length
  const deletedTotalCount = Number(deletedNotesPagination?.total) || 0
  const isPagedSection = currentSection === 'recent' || currentSection === 'notebooks'
  const isAutoPagedSection = isPagedSection || currentSection === 'starred' || currentSection === 'myshares' || currentSection === 'recyclebin'
  const isCurrentSectionLoaded = currentSection === 'starred'
    ? hasLoadedStarredNotes
    : currentSection === 'myshares'
      ? hasLoadedMyShares
      : currentSection === 'recyclebin'
        ? hasLoadedDeletedNotes
        : hasLoadedNotes
  const isCountReady = currentSection === 'notebooks'
    ? Boolean(currentNotebook?.id) && isCurrentSectionLoaded
    : isCurrentSectionLoaded
  const loadedNoteCount = sortedNotes.length
  const notesTotalCount = Number(notesPagination?.total) || 0
  const noteCountTotal = currentSection === 'starred'
    ? (starredTotalCount > 0 ? starredTotalCount : starredLoadedCount)
    : currentSection === 'myshares'
      ? (mySharesTotalCount > 0 ? mySharesTotalCount : mySharesLoadedCount)
      : currentSection === 'recyclebin'
        ? (deletedTotalCount > 0 ? deletedTotalCount : deletedLoadedCount)
    : isPagedSection
      ? (notesTotalCount > 0 ? notesTotalCount : loadedNoteCount)
      : loadedNoteCount
  const selectedNotes = useMemo(
    () => sortedNotes.filter((note) => selectedNoteIds.includes(String(note.id))),
    [sortedNotes, selectedNoteIds]
  )
  const allSelected = sortedNotes.length > 0 && selectedNoteIds.length === sortedNotes.length
  const shouldVirtualizeNotes = sortedNotes.length > NOTE_LIST_VIRTUALIZATION_THRESHOLD
  const virtualNoteWindow = shouldVirtualizeNotes
    ? getVirtualNoteWindow(sortedNotes.length, scrollTop, scrollViewportHeight)
    : {
        startIndex: 0,
        endIndex: sortedNotes.length,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      }
  const visibleNotes = shouldVirtualizeNotes
    ? sortedNotes.slice(virtualNoteWindow.startIndex, virtualNoteWindow.endIndex)
    : sortedNotes
  const isRecentLikeSection = currentSection === 'recent' || currentSection === 'notebooks'
  const canMoveNotes = isRecentLikeSection && selectedNoteIds.length > 0
  const batchActionLabels = BATCH_ACTION_LABELS[currentSection] || []
  const closeDangerConfirm = () => setDangerConfirm(null)

  const openDangerConfirm = (config) => {
    setDangerConfirm(config)
  }

  const requestSingleDangerAction = (type, note) => {
    setActiveMoreNoteId(null)
    const noteTitle = note?.title || t('note.untitled', { defaultValue: '未命名笔记' })

    if (type === 'delete') {
      openDangerConfirm({
        type,
        noteId: String(note.id),
        title: t('note.deleteNoteAction', { defaultValue: '删除笔记' }),
        okText: t('common.confirm', { defaultValue: '确认' }),
        description: `“${noteTitle}” 将移入回收站，你仍然可以稍后恢复。`,
      })
      return
    }

    if (type === 'unshare') {
      openDangerConfirm({
        type,
        noteId: String(note.id),
        shareCode: note.shareCode,
        title: t('note.cancelShareNote', { defaultValue: '取消分享笔记' }),
        okText: t('common.confirm', { defaultValue: '确认' }),
        description: `“${noteTitle}” 的现有分享链接将失效，外部访问会被关闭。`,
      })
      return
    }

    if (type === 'permanentDelete') {
      openDangerConfirm({
        type,
        noteId: String(note.id),
        title: t('note.permanentDeleteNoteAction', { defaultValue: '永久删除笔记' }),
        okText: t('common.delete', { defaultValue: '删除' }),
        description: `“${noteTitle}” 将被永久删除，删除后无法恢复。`,
      })
    }
  }

  const requestBatchDangerAction = (type) => {
    const count = selectedNoteIds.length
    if (count === 0) {
      return
    }

    if (type === 'delete') {
      openDangerConfirm({
        type,
        count,
        title: '批量删除笔记',
        okText: t('common.confirm', { defaultValue: '确认' }),
        description: `将所选 ${count} 篇笔记移入回收站，后续仍可恢复。`,
      })
      return
    }

    if (type === 'unshare') {
      openDangerConfirm({
        type,
        count,
        title: '批量取消分享',
        okText: t('common.confirm', { defaultValue: '确认' }),
        description: `将取消所选 ${count} 条分享，现有分享链接会立即失效。`,
      })
      return
    }

    if (type === 'permanentDelete') {
      openDangerConfirm({
        type,
        count,
        title: '批量永久删除',
        okText: t('common.delete', { defaultValue: '删除' }),
        description: `将永久删除所选 ${count} 篇笔记，删除后无法恢复。`,
      })
    }
  }

  useEffect(() => {
    hasRedirectedRef.current = false
  }, [location.pathname, currentSection, visible])

  useEffect(() => {
    setBatchMode(false)
    setSelectedNoteIds([])
    setMoveDialogOpen(false)
    setTargetNotebookId(null)
    setActiveMoreNoteId(null)
  }, [currentSection, currentNotebook?.id])

  useEffect(() => {
    setSelectedNoteIds((prev) => prev.filter((id) => sortedNotes.some((note) => String(note.id) === id)))
  }, [sortedNotes])

  useEffect(() => {
    if (!visible || !isSectionRoot || isLoading || sortedNotes.length === 0 || hasRedirectedRef.current) {
      return
    }

    hasRedirectedRef.current = true
    navigate(getDetailPath(currentSection, sortedNotes[0], currentNotebook?.id), {
      replace: true,
      state: { note: sortedNotes[0] },
    })
  }, [visible, isSectionRoot, isLoading, sortedNotes, navigate, currentNotebook?.id, currentSection])

  const maybeLoadMoreCurrentSection = useCallback((scrollContainer) => {
    if (!isAutoPagedSection || !visible || isLoading || !scrollContainer) {
      return
    }

    if (currentSection === 'notebooks' && !currentNotebook?.id) {
      return
    }

    const isStarredSection = currentSection === 'starred'
    const isMySharesSection = currentSection === 'myshares'
    const isRecycleBinSection = currentSection === 'recyclebin'
    const hasMore = isStarredSection
      ? Boolean(starredNotesPagination?.hasMore)
      : isMySharesSection
        ? Boolean(mySharesPagination?.hasMore)
        : isRecycleBinSection
          ? Boolean(deletedNotesPagination?.hasMore)
          : Boolean(notesPagination?.hasMore)
    const isLoadingMore = isStarredSection
      ? isStarredNotesLoadingMore
      : isMySharesSection
        ? isMySharesLoadingMore
        : isRecycleBinSection
          ? isDeletedNotesLoadingMore
          : isNotesLoadingMore
    const loadMoreCurrentSection = isStarredSection
      ? loadMoreStarredNotes
      : isMySharesSection
        ? loadMoreMyShares
        : isRecycleBinSection
          ? loadMoreDeletedNotes
          : loadMoreNotes

    if (!hasMore || isLoadingMore || !loadMoreCurrentSection) {
      return
    }

    const threshold = 72
    const reachedBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - threshold
    if (!reachedBottom) {
      return
    }

    const nextParams = currentSection === 'notebooks'
      ? { ...sort, notebookId: currentNotebook.id }
      : currentSection === 'recent' || currentSection === 'starred'
        ? sort
        : {}

    loadMoreCurrentSection(nextParams).catch(() => {})
  }, [
    currentNotebook?.id,
    currentSection,
    deletedNotesPagination?.hasMore,
    isAutoPagedSection,
    isDeletedNotesLoadingMore,
    isLoading,
    isMySharesLoadingMore,
    isNotesLoadingMore,
    isStarredNotesLoadingMore,
    loadMoreDeletedNotes,
    loadMoreMyShares,
    loadMoreNotes,
    loadMoreStarredNotes,
    mySharesPagination?.hasMore,
    notesPagination?.hasMore,
    sort,
    starredNotesPagination?.hasMore,
    visible,
  ])

  const handleSidebarWheel = useCallback((event) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      return
    }

    const { deltaY } = event
    if (!deltaY) {
      return
    }

    const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight
    if (maxScrollTop <= 0) {
      return
    }

    const nextScrollTop = Math.max(0, Math.min(scrollContainer.scrollTop + deltaY, maxScrollTop))
    if (nextScrollTop === scrollContainer.scrollTop) {
      return
    }

    scrollContainer.scrollTop = nextScrollTop
    setScrollTop(nextScrollTop)
    maybeLoadMoreCurrentSection(scrollContainer)
    event.preventDefault()
  }, [maybeLoadMoreCurrentSection])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      return undefined
    }

    scrollContainer.addEventListener('wheel', handleSidebarWheel, { passive: false })

    return () => {
      scrollContainer.removeEventListener('wheel', handleSidebarWheel)
    }
  }, [handleSidebarWheel])

  const handleSidebarScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      return
    }

    setScrollTop(scrollContainer.scrollTop)
    setScrollViewportHeight((prev) => {
      const nextHeight = scrollContainer.clientHeight || 0
      return prev === nextHeight ? prev : nextHeight
    })
    maybeLoadMoreCurrentSection(scrollContainer)
  }, [maybeLoadMoreCurrentSection])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer || !visible) {
      return
    }

    setScrollTop(scrollContainer.scrollTop)
    setScrollViewportHeight((prev) => {
      const nextHeight = scrollContainer.clientHeight || 0
      return prev === nextHeight ? prev : nextHeight
    })
  }, [visible, currentSection, sort.field, sort.order, sortedNotes.length])

  const handleSelectField = (field) => {
    setPendingField(field)
  }

  const handleSelectOrder = (order) => {
    setSort({ field: pendingField, order })
    setMenuOpen(false)
  }

  const refreshCurrentSection = async () => {
    if (currentSection === 'recent') {
      await fetchNotes(sort)
      return
    }

    if (currentSection === 'starred') {
      await fetchStarredNotes(sort)
      return
    }

    if (currentSection === 'myshares') {
      await fetchMyShares()
      return
    }

    if (currentSection === 'recyclebin') {
      await fetchDeletedNotes()
      return
    }

    if (currentSection === 'notebooks' && currentNotebook?.id) {
      await fetchNotes({
        ...sort,
        notebookId: currentNotebook.id,
      })
    }
  }

  const resetBatchState = () => {
    setBatchMode(false)
    setSelectedNoteIds([])
    setMoveDialogOpen(false)
    setTargetNotebookId(null)
    setCopyDialogOpen(false)
    setCopyTargetNotebookId(null)
    setCopySourceNoteId(null)
    setDangerConfirm(null)
  }

  const exitBatchAfterRefresh = async (actedIds = selectedNoteIds) => {
    const shouldResetDetail = currentNoteId && actedIds.includes(String(currentNoteId))
    await refreshCurrentSection()
    resetBatchState()

    if (shouldResetDetail) {
      navigate(`/cloudnote/${currentSection}`, { replace: true })
    }
  }

  const handleToggleBatchMode = () => {
    setMenuOpen(false)
    setBatchMode((prev) => {
      if (prev) {
        setSelectedNoteIds([])
      }
      return !prev
    })
  }

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedNoteIds([])
      return
    }

    setSelectedNoteIds(sortedNotes.map((note) => String(note.id)))
  }

  const handleToggleNoteSelection = (noteId) => {
    setSelectedNoteIds((prev) => (
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    ))
  }

  const handleOpenSingleMoveDialog = (noteId) => {
    setActiveMoreNoteId(null)
    setSelectedNoteIds([String(noteId)])
    setTargetNotebookId(null)
    setMoveDialogOpen(true)
  }

  const handleOpenSingleCopyDialog = (noteId) => {
    setActiveMoreNoteId(null)
    setCopySourceNoteId(String(noteId))
    setCopyTargetNotebookId(null)
    setCopyDialogOpen(true)
  }

  const handleOpenRenameDialog = (note) => {
    setActiveMoreNoteId(null)
    setRenameTargetNoteId(String(note.id))
    setRenameValue(note.title || '')
    setRenameDialogOpen(true)
  }

  const handleDeleteSingleNote = async (noteId) => {
    setActiveMoreNoteId(null)
    setIsBatchSubmitting(true)
    try {
      await noteService.deleteNote(noteId)
      await exitBatchAfterRefresh([String(noteId)])
      message.success('删除成功')
      return true
    } catch (error) {
      message.error(getErrorMessage(error, '删除失败，请稍后重试'))
      return false
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const handleDeleteSingleShare = async (shareCode, noteId) => {
    if (!shareCode) {
      return false
    }

    setActiveMoreNoteId(null)
    setIsBatchSubmitting(true)
    try {
      await shareService.deleteShare(shareCode)
      await exitBatchAfterRefresh([String(noteId)])
      message.success('已取消分享')
      return true
    } catch (error) {
      message.error(getErrorMessage(error, '取消分享失败，请稍后重试'))
      return false
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const openSharePanelForNote = (note) => {
    if (!note?.id) {
      return
    }

    setActiveMoreNoteId(null)
    setShareDialogNoteId(String(note.id))
    setShareDialogOpen(true)
  }

  const handleRestoreSingleNote = async (noteId) => {
    setActiveMoreNoteId(null)
    setIsBatchSubmitting(true)
    try {
      await noteService.restoreDeletedNote([String(noteId)])
      await exitBatchAfterRefresh([String(noteId)])
      message.success('恢复成功')
      return true
    } catch (error) {
      message.error(getErrorMessage(error, '恢复失败，请稍后重试'))
      return false
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const handlePermanentDeleteSingleNote = async (noteId) => {
    setActiveMoreNoteId(null)
    setIsBatchSubmitting(true)
    try {
      await noteService.permanentDeleteNote([String(noteId)])
      await exitBatchAfterRefresh([String(noteId)])
      message.success('删除成功')
      return true
    } catch (error) {
      message.error(getErrorMessage(error, '删除失败，请稍后重试'))
      return false
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const getNoteMoreMenuItems = (note) => {
    if (currentSection === 'recyclebin') {
      return [
        {
          key: 'restore',
          icon: <ExportOutlined rotate={180} />,
          label: t('note.restoreNoteAction', { defaultValue: '还原笔记' }),
        },
        {
          key: 'permanentDelete',
          icon: <DeleteOutlined />,
          label: <span style={{ color: '#dc2626' }}>{t('note.permanentDeleteNoteAction', { defaultValue: '永久删除笔记' })}</span>,
        },
      ]
    }

    const items = [
      ...(currentSection !== 'myshares'
        ? [{
            key: 'rename',
            icon: <EditOutlined />,
            label: t('note.renameNote', { defaultValue: '重命名笔记' }),
          }]
        : []),
      ...(isRecentLikeSection
        ? [{
            key: 'move',
            icon: <ExportOutlined />,
            label: t('note.moveToNotebook', { defaultValue: '移动到笔记本' }),
          }]
        : []),
      ...(currentSection !== 'myshares'
        && currentSection !== 'recyclebin'
        ? [{
            key: 'copy',
            icon: <CopyOutlined />,
            label: t('note.copyToNotebook', { defaultValue: '复制到笔记本' }),
          }]
        : []),
      {
        key: 'share',
        icon: <ShareAltOutlined />,
        label: t('note.shareNote', { defaultValue: '分享笔记' }),
      },
    ]

    if (currentSection === 'myshares') {
      items.push({
        key: 'unshare',
        icon: <DeleteOutlined />,
        label: <span style={{ color: '#dc2626' }}>{t('note.cancelShareNote', { defaultValue: '取消分享笔记' })}</span>,
      })
      return items
    }

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: <span style={{ color: '#dc2626' }}>{t('note.deleteNoteAction', { defaultValue: '删除笔记' })}</span>,
    })

    return items
  }

  const handleNoteMoreAction = async ({ key, note }) => {
    if (key === 'move') {
      handleOpenSingleMoveDialog(note.id)
      return
    }

    if (key === 'copy') {
      handleOpenSingleCopyDialog(note.id)
      return
    }

    if (key === 'rename') {
      handleOpenRenameDialog(note)
      return
    }

    if (key === 'share') {
      openSharePanelForNote(note)
      return
    }

    if (key === 'delete') {
      requestSingleDangerAction('delete', note)
      return
    }

    if (key === 'unshare') {
      requestSingleDangerAction('unshare', note)
      return
    }

    if (key === 'restore') {
      await handleRestoreSingleNote(note.id)
      return
    }

    if (key === 'permanentDelete') {
      requestSingleDangerAction('permanentDelete', note)
    }
  }

  const executeBatchAction = async (action) => {
    if (selectedNoteIds.length === 0 || isBatchSubmitting) {
      return false
    }

    setIsBatchSubmitting(true)
    try {
      if (action === 'delete') {
        await Promise.all(selectedNoteIds.map((id) => noteService.deleteNote(id)))
      }

      if (action === 'unstar') {
        await Promise.all(selectedNoteIds.map((id) => noteService.unstarNote(id)))
      }

      if (action === 'unshare') {
        const selectedShareCodes = selectedNotes
          .map((note) => note.shareCode)
          .filter(Boolean)
        await Promise.all(selectedShareCodes.map((shareCode) => shareService.deleteShare(shareCode)))
      }

      if (action === 'restore') {
        await noteService.restoreDeletedNote(selectedNoteIds)
      }

      if (action === 'permanentDelete') {
        await noteService.permanentDeleteNote(selectedNoteIds)
      }

      await exitBatchAfterRefresh()
      message.success('批量操作成功')
      return true
    } catch (error) {
      message.error(getErrorMessage(error, '批量操作失败，请稍后重试'))
      return false
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const runBatchAction = async (action) => {
    if (action === 'delete' || action === 'unshare' || action === 'permanentDelete') {
      requestBatchDangerAction(action)
      return
    }

    await executeBatchAction(action)
  }

  const handleConfirmDangerAction = async () => {
    if (!dangerConfirm || isBatchSubmitting) {
      return
    }

    let success = false

    if (dangerConfirm.type === 'delete') {
      success = dangerConfirm.noteId
        ? await handleDeleteSingleNote(dangerConfirm.noteId)
        : await executeBatchAction('delete')
    }

    if (dangerConfirm.type === 'unshare') {
      success = dangerConfirm.noteId && dangerConfirm.shareCode
        ? await handleDeleteSingleShare(dangerConfirm.shareCode, dangerConfirm.noteId)
        : await executeBatchAction('unshare')
    }

    if (dangerConfirm.type === 'permanentDelete') {
      success = dangerConfirm.noteId
        ? await handlePermanentDeleteSingleNote(dangerConfirm.noteId)
        : await executeBatchAction('permanentDelete')
    }

    if (success) {
      closeDangerConfirm()
    }
  }

  const handleConfirmMove = async () => {
    if (!targetNotebookId || selectedNoteIds.length === 0 || isBatchSubmitting) {
      return
    }

    setIsBatchSubmitting(true)
    try {
      await Promise.all(selectedNoteIds.map((noteId) => noteService.moveNote(noteId, targetNotebookId)))
      setMoveDialogOpen(false)
      setTargetNotebookId(null)
      await exitBatchAfterRefresh()
      await fetchNotebooks()
      message.success('批量移动成功')
    } catch (error) {
      message.error(getErrorMessage(error, '批量移动失败，请稍后重试'))
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const handleConfirmCopy = async () => {
    if (!copyTargetNotebookId || !copySourceNoteId || isBatchSubmitting) {
      return
    }

    setIsBatchSubmitting(true)
    try {
      await noteService.copyNote(copySourceNoteId, copyTargetNotebookId)
      setCopyDialogOpen(false)
      setCopyTargetNotebookId(null)
      setCopySourceNoteId(null)
      await refreshCurrentSection()
      await fetchNotebooks()
      message.success('复制成功')
    } catch (error) {
      message.error(getErrorMessage(error, '复制失败，请稍后重试'))
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const handleConfirmRename = async () => {
    const nextTitle = renameValue.trim()
    if (!renameTargetNoteId || !nextTitle || isBatchSubmitting) {
      return
    }

    setIsBatchSubmitting(true)
    try {
      await updateName(renameTargetNoteId, nextTitle)
      setRenameDialogOpen(false)
      setRenameTargetNoteId(null)
      setRenameValue('')
      message.success('重命名成功')
    } catch (error) {
      message.error(getErrorMessage(error, '重命名失败，请稍后重试'))
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const moveNotebookOptions = notebooks
    .filter((item) => item?.id)
    .map((item) => ({
      label: getLocalizedNotebookName(item, t),
      value: item.id,
    }))

  const sidebarWidth = visible ? width : 0

  return (
    <>
    <style>{`
      .cloudnote-notes-sort-dropdown {
        z-index: 2200 !important;
      }

      .cloudnote-notes-more-menu .ant-dropdown-menu {
        padding: 8px;
        border-radius: 16px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: var(--shadow-md);
      }

      .cloudnote-notes-more-menu .ant-dropdown-menu-item {
        min-height: 38px;
        border-radius: 12px;
        margin: 2px 0;
        color: #10223a;
      }

      .cloudnote-notes-more-menu .ant-dropdown-menu-item:hover {
        background: rgba(10, 89, 247, 0.08);
      }

      .cloudnote-notes-more-menu .ant-dropdown-menu-item-danger:hover {
        background: rgba(239, 68, 68, 0.08);
      }
    `}</style>
    <aside
      aria-label={t('notesSidebar.ariaLabel', { defaultValue: '笔记列表侧栏' })}
      className="notes-sidebar"
      style={{
        width: `var(--cloudnote-notes-width, ${sidebarWidth}px)`,
        minWidth: `var(--cloudnote-notes-width, ${sidebarWidth}px)`,
        height: '100%',
        minHeight: 0,
        opacity: visible ? 1 : 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease, opacity 0.2s ease',
        background: '#ffffff',
        borderRight: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <div
        style={{
          height: 58,
          padding: '0 10px 0 8px',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <div
            style={{
              minWidth: 0,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              paddingLeft: 2,
            }}
          >
            <div
              style={{
                fontSize: 18,
                lineHeight: '40px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#10223a',
                minWidth: 96,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isCountReady
                ? t('notesSidebar.noteCount', {
                  count: noteCountTotal,
                  defaultValue: '{{count}}篇笔记',
                })
                : null}
            </div>
          </div>

          <Button
            type="text"
            size="small"
            aria-label="切换批量操作模式"
            icon={<UnorderedListOutlined />}
            onClick={handleToggleBatchMode}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                color: batchMode ? 'var(--primary)' : 'rgba(16,34,58,0.72)',
                background: batchMode ? 'var(--primary-soft)' : 'transparent',
              }}
          />

          <Dropdown
            trigger={['click']}
            open={menuOpen}
            onOpenChange={(open) => {
              if (open) {
                setBatchMode(false)
                setSelectedNoteIds([])
              }
              setMenuOpen(open)
            }}
            placement="bottomRight"
            getPopupContainer={(triggerNode) => triggerNode?.ownerDocument?.body || document.body}
            overlayClassName="cloudnote-notes-sort-dropdown"
            popupRender={() => (
              <div
                style={{
                  width: 234,
                  padding: '16px',
                  borderRadius: 18,
                  background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(100,116,139,0.94)', marginBottom: 8 }}>
                  排序依据
                </div>
                <div>
                  {SORT_FIELD_OPTIONS.map((option) => (
                    <SortMenuButton
                      key={option.key}
                      option={option}
                      selected={pendingField === option.key}
                      onClick={() => handleSelectField(option.key)}
                    />
                  ))}
                </div>

                <div
                  style={{
                    height: 1,
                    background: 'rgba(15,23,42,0.08)',
                    margin: '10px -2px 12px',
                  }}
                />

                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(100,116,139,0.94)', marginBottom: 8 }}>
                  排序
                </div>
                <div>
                  {SORT_ORDER_OPTIONS[pendingField].map((option) => (
                    <SortMenuButton
                      key={option.key}
                      option={option}
                      selected={sort.order === option.key}
                      onClick={() => handleSelectOrder(option.key)}
                    />
                  ))}
                </div>
              </div>
            )}
          >
            <Button
              type="text"
              size="small"
              aria-label={t('notesSidebar.openSortMenu', { defaultValue: '打开排序菜单' })}
              icon={<FilterOutlined />}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                color: menuOpen ? 'var(--primary)' : 'rgba(16,34,58,0.72)',
                background: menuOpen ? 'var(--primary-soft)' : 'transparent',
              }}
            />
          </Dropdown>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="notes-sidebar__scroll"
        onScroll={handleSidebarScroll}
        style={{
          padding: '10px 16px 12px',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
          height: 0,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {batchMode ? (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 25,
              margin: '0 0 12px',
              padding: '8px 0 12px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                minHeight: 52,
                borderRadius: 16,
                background: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'nowrap',
              }}
            >
              <Checkbox checked={allSelected} onChange={handleToggleSelectAll}>
                全选
              </Checkbox>
              {currentSection === 'recent' || currentSection === 'notebooks' ? (
                <>
                  <BatchActionButton
                    label={batchActionLabels[0]}
                    ariaLabel="批量删除"
                    disabled={selectedNoteIds.length === 0}
                    loading={isBatchSubmitting}
                    onClick={() => runBatchAction('delete')}
                  />
                  <BatchActionButton
                    label={batchActionLabels[1]}
                    ariaLabel="批量移动"
                    disabled={!canMoveNotes}
                    loading={isBatchSubmitting}
                    onClick={async () => {
                      await fetchNotebooks()
                      setMoveDialogOpen(true)
                    }}
                  />
                </>
              ) : null}
              {currentSection === 'starred' ? (
                <BatchActionButton
                  label={batchActionLabels[0]}
                  disabled={selectedNoteIds.length === 0}
                  loading={isBatchSubmitting}
                  onClick={() => runBatchAction('unstar')}
                />
              ) : null}
              {currentSection === 'myshares' ? (
                <BatchActionButton
                  label={batchActionLabels[0]}
                  disabled={selectedNoteIds.length === 0}
                  loading={isBatchSubmitting}
                  onClick={() => runBatchAction('unshare')}
                />
              ) : null}
              {currentSection === 'recyclebin' ? (
                <>
                  <BatchActionButton
                    label={batchActionLabels[0]}
                    ariaLabel="批量恢复"
                    disabled={selectedNoteIds.length === 0}
                    loading={isBatchSubmitting}
                    onClick={() => runBatchAction('restore')}
                  />
                  <BatchActionButton
                    label={batchActionLabels[1]}
                    disabled={selectedNoteIds.length === 0}
                    loading={isBatchSubmitting}
                    danger
                    onClick={() => runBatchAction('permanentDelete')}
                  />
                </>
              ) : null}
              <Button
                type="text"
                onClick={resetBatchState}
                style={{ marginLeft: 'auto', flexShrink: 0, paddingInline: 4 }}
              >
                取消
              </Button>
            </div>
          </div>
        ) : null}
        {visibleNotes.length > 0 ? (
          <>
            {shouldVirtualizeNotes && virtualNoteWindow.topSpacerHeight > 0 ? (
              <div aria-hidden="true" style={{ height: virtualNoteWindow.topSpacerHeight, flexShrink: 0 }} />
            ) : null}
            {visibleNotes.map((note) => {
              const noteId = String(note.id)
              return (
                <RecentNoteCard
                  key={note.id}
                  note={note}
                  batchMode={batchMode}
                  selected={selectedNoteIdSet.has(noteId)}
                  isCurrentNote={currentNoteId === noteId}
                  isSharedNote={Boolean(note.isShared)}
                  isMoreOpen={activeMoreNoteId === noteId}
                  currentSection={currentSection}
                  sortField={sort.field}
                  t={t}
                  onNavigate={(targetNote) => {
                    navigate(getDetailPath(currentSection, targetNote, currentNotebook?.id), {
                      state: { note: targetNote },
                    })
                  }}
                  onToggleSelection={handleToggleNoteSelection}
                  onOpenSharePanel={openSharePanelForNote}
                  onToggleStar={toggleStar}
                  getNoteMoreMenuItems={getNoteMoreMenuItems}
                  onNoteMoreAction={handleNoteMoreAction}
                  setActiveMoreNoteId={setActiveMoreNoteId}
                />
              )
            })}
            {shouldVirtualizeNotes && virtualNoteWindow.bottomSpacerHeight > 0 ? (
              <div aria-hidden="true" style={{ height: virtualNoteWindow.bottomSpacerHeight, flexShrink: 0 }} />
            ) : null}
          </>
        ) : null}

        {!isCurrentSectionLoaded ? (
          <div
            style={{
              minHeight: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(100,116,139,0.78)',
            }}
          >
            <Spin size="small" />
          </div>
        ) : !isLoading && sortedNotes.length === 0 ? (
          <EmptyState
            title={getSectionEmptyLabel(currentSection, t)}
            description={getSectionEmptyDescription(currentSection, t)}
            compact
            style={{ padding: '24px 12px 8px' }}
          />
        ) : null}

      </div>

      <Modal
        title={t('notesSidebar.moveDialog.title', { defaultValue: '移动到笔记本' })}
        open={moveDialogOpen}
        destroyOnHidden
        onCancel={() => {
          setMoveDialogOpen(false)
          setTargetNotebookId(null)
        }}
        onOk={handleConfirmMove}
        okText={t('notesSidebar.moveDialog.confirm', { defaultValue: '移动' })}
        cancelText={t('common.cancel', { defaultValue: '取消' })}
        confirmLoading={isBatchSubmitting}
        okButtonProps={{
          disabled: !targetNotebookId,
          style: {
            height: 40,
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: 'none',
          },
        }}
        cancelButtonProps={{
          style: {
            height: 40,
            borderRadius: 12,
            borderColor: 'rgba(15,23,42,0.08)',
            color: '#10223a',
            fontWeight: 600,
            boxShadow: 'none',
          },
        }}
        styles={{
          content: {
            borderRadius: 22,
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.32)',
          },
        }}
      >
        <div style={{ color: 'rgba(16,34,58,0.7)', marginBottom: 12 }}>
          {t('notesSidebar.moveDialog.selectedCount', {
            count: selectedNoteIds.length,
            defaultValue: '已选择 {{count}} 篇笔记',
          })}
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder={t('notesSidebar.moveDialog.placeholder', { defaultValue: '请选择目标笔记本' })}
          value={targetNotebookId}
          onChange={setTargetNotebookId}
          options={moveNotebookOptions.filter((item) => (
            currentSection === 'notebooks' ? item.value !== currentNotebook?.id : true
          ))}
        />
      </Modal>

      <Modal
        title="复制到笔记本"
        open={copyDialogOpen}
        destroyOnHidden
        onCancel={() => {
          setCopyDialogOpen(false)
          setCopyTargetNotebookId(null)
          setCopySourceNoteId(null)
        }}
        onOk={handleConfirmCopy}
        okText="复制"
        cancelText={t('common.cancel', { defaultValue: '取消' })}
        confirmLoading={isBatchSubmitting}
        okButtonProps={{
          disabled: !copyTargetNotebookId,
          style: {
            height: 40,
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: 'none',
          },
        }}
        cancelButtonProps={{
          style: {
            height: 40,
            borderRadius: 12,
            borderColor: 'rgba(15,23,42,0.08)',
            color: '#10223a',
            fontWeight: 600,
            boxShadow: 'none',
          },
        }}
        styles={{
          content: {
            borderRadius: 22,
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.32)',
          },
        }}
      >
        <div style={{ color: 'rgba(16,34,58,0.7)', marginBottom: 12 }}>
          请选择复制后的目标笔记本
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="请选择目标笔记本"
          value={copyTargetNotebookId}
          onChange={setCopyTargetNotebookId}
          options={moveNotebookOptions}
        />
      </Modal>

      <Modal
        title="重命名笔记"
        open={renameDialogOpen}
        destroyOnHidden
        onCancel={() => {
          setRenameDialogOpen(false)
          setRenameTargetNoteId(null)
          setRenameValue('')
        }}
        onOk={handleConfirmRename}
        okText="确认"
        cancelText={t('common.cancel', { defaultValue: '取消' })}
        confirmLoading={isBatchSubmitting}
        okButtonProps={{
          disabled: !renameValue.trim(),
          style: {
            height: 40,
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: 'none',
          },
        }}
        cancelButtonProps={{
          style: {
            height: 40,
            borderRadius: 12,
            borderColor: 'rgba(15,23,42,0.08)',
            color: '#10223a',
            fontWeight: 600,
            boxShadow: 'none',
          },
        }}
        styles={{
          content: {
            borderRadius: 22,
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.32)',
          },
        }}
      >
        <Input
          value={renameValue}
          maxLength={200}
          placeholder="请输入笔记名称"
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={handleConfirmRename}
        />
      </Modal>

      <Modal
        open={Boolean(dangerConfirm)}
        centered
        title={dangerConfirm?.title || '确认操作'}
        okText={dangerConfirm?.okText || t('common.confirm', { defaultValue: '确认' })}
        cancelText={t('common.cancel', { defaultValue: '取消' })}
        confirmLoading={isBatchSubmitting}
        okButtonProps={{
          danger: true,
          style: {
            height: 40,
            borderRadius: 12,
            fontWeight: 700,
            boxShadow: 'none',
          },
        }}
        cancelButtonProps={{
          style: {
            height: 40,
            borderRadius: 12,
            borderColor: 'rgba(15,23,42,0.08)',
            color: '#10223a',
            fontWeight: 600,
            boxShadow: 'none',
          },
        }}
        onOk={handleConfirmDangerAction}
        onCancel={closeDangerConfirm}
        destroyOnHidden
        styles={{
          content: {
            borderRadius: 22,
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.32)',
          },
        }}
      >
        <div style={{ color: '#475569', lineHeight: 1.7 }}>
          {dangerConfirm?.description}
        </div>
      </Modal>

      <SharePanelDialog
        open={shareDialogOpen}
        noteId={shareDialogNoteId}
        onClose={() => {
          setShareDialogOpen(false)
          setShareDialogNoteId(null)
        }}
        onShareStateLoaded={({ noteId: changedNoteId, isShared, shareDetail, shareCode, shareUrl }) => {
          const targetNoteId = changedNoteId || shareDialogNoteId
          if (!targetNoteId) {
            return
          }

          syncNoteShareState(targetNoteId, isShared, {
            ...shareDetail,
            shareCode,
            shareUrl,
          })
        }}
        onShareChanged={async ({ noteId: changedNoteId, isShared, shareDetail, shareCode, shareUrl }) => {
          const targetNoteId = changedNoteId || shareDialogNoteId
          if (!targetNoteId) {
            return
          }

          syncNoteShareState(targetNoteId, isShared, {
            ...shareDetail,
            shareCode,
            shareUrl,
          })

          await fetchMyShares()
        }}
      />
    </aside>
    </>
  )
}

function BatchActionButton({ label, ariaLabel, onClick, disabled = false, loading = false, danger = false }) {
  return (
    <Button
      type="text"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      danger={danger}
      style={{ paddingInline: 4, fontWeight: 600 }}
    >
      {label}
    </Button>
  )
}

function SortMenuButton({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        background: selected ? 'rgba(10,89,247,0.08)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: selected ? 700 : 500,
        color: '#10223a',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.16s ease, color 0.16s ease',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {option.icon ? (
          <span style={{ color: 'rgba(100,116,139,0.9)', display: 'flex', alignItems: 'center' }}>{option.icon}</span>
        ) : null}
        <span>{option.label}</span>
      </span>
      <span style={{ width: 16, color: '#1677ff', opacity: selected ? 1 : 0 }}>
        <CheckOutlined />
      </span>
    </button>
  )
}

function formatMetaDate(note, field, fullYear = false) {
  const rawValue = field === RECENT_NOTE_SORT_FIELDS.CREATED_AT ? note.createdAt : note.updatedAt

  if (!rawValue) {
    return '--'
  }

  return new Date(rawValue).toLocaleDateString('zh-CN', fullYear ? {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  } : {
    month: 'numeric',
    day: 'numeric',
  })
}

export default NotesSidebar

function getDetailPath(section, note, fallbackNotebookId = null) {
  if (section === 'starred') {
    return `/cloudnote/starred/${note.id}`
  }

  if (section === 'myshares') {
    return `/cloudnote/myshares/${note.id}`
  }

  if (section === 'notebooks') {
    const notebookId = note?.notebookId || note?.notebook?.id || fallbackNotebookId
    if (notebookId) {
      return `/cloudnote/notebooks/${notebookId}/${note.id}`
    }

    return '/cloudnote/notebooks'
  }

  if (section === 'recyclebin') {
    return `/cloudnote/recyclebin/${note.id}`
  }

  return `/cloudnote/recent/${note.id}`
}
