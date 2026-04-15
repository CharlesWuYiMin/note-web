import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Checkbox, Modal, Select, message } from 'antd'
import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FilterOutlined,
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
  shares: ['取消分享'],
  recyclebin: ['恢复', '彻底删除'],
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function resolveNotebookName(note, notebookNameById, fallbackNotebookName = '') {
  const candidates = [
    note?.notebookName,
    note?.notebook?.name,
    note?.notebookTitle,
    note?.notebook_title,
    note?.folderName,
    note?.folder_name,
    notebookNameById[note?.notebookId],
    notebookNameById[note?.notebook_id],
    fallbackNotebookName,
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

function NotesSidebar({ visible = true }) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    notes = [],
    starredNotes = [],
    starredNotesPagination,
    myShares = [],
    deletedNotes = [],
    fetchNotes,
    fetchStarredNotes,
    loadMoreStarredNotes,
    fetchMyShares,
    fetchDeletedNotes,
    toggleStar,
    isLoading,
    isStarredNotesLoadingMore,
  } = useNote()
  const { notebooks = [], currentNotebook, fetchNotebooks } = useNotebook()
  const [sort, setSort] = useState(DEFAULT_RECENT_NOTE_SORT)
  const [menuOpen, setMenuOpen] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [targetNotebookId, setTargetNotebookId] = useState(null)
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false)
  const [pendingField, setPendingField] = useState(DEFAULT_RECENT_NOTE_SORT.field)
  const hasRedirectedRef = useRef(false)
  const menuRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const isRecentRoute = location.pathname.startsWith('/cloudnote/recent')
  const isStarredRoute = location.pathname.startsWith('/cloudnote/starred')
  const isSharesRoute = location.pathname.startsWith('/cloudnote/shares')
  const isNotebooksRoute = location.pathname.startsWith('/cloudnote/notebooks')
  const isRecycleBinRoute = location.pathname.startsWith('/cloudnote/recyclebin')
  const currentSection = isStarredRoute
    ? 'starred'
    : isSharesRoute
      ? 'shares'
      : isNotebooksRoute
        ? 'notebooks'
        : isRecycleBinRoute
          ? 'recyclebin'
          : 'recent'
  const isSectionRoot = location.pathname === `/cloudnote/${currentSection}`
  const currentNoteId = (
    location.pathname.startsWith('/cloudnote/recent/')
    || location.pathname.startsWith('/cloudnote/starred/')
    || location.pathname.startsWith('/cloudnote/shares/')
    || location.pathname.startsWith('/cloudnote/notebooks/')
    || location.pathname.startsWith('/cloudnote/recyclebin/')
  )
    ? location.pathname.split('/').filter(Boolean).at(-1)
    : null
  const isSupportedRoute = isRecentRoute || isStarredRoute || isSharesRoute || isNotebooksRoute || isRecycleBinRoute

  useEffect(() => {
    if (!visible || !isSupportedRoute) {
      hasRedirectedRef.current = false
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

    if (currentSection === 'shares') {
      fetchMyShares()
      return
    }

    if (currentSection === 'recyclebin') {
      fetchDeletedNotes()
      return
    }

    if (currentSection === 'notebooks') {
      if (!currentNotebook?.id) {
        fetchNotebooks()
        return
      }

      fetchNotes({
        ...sort,
        notebookId: currentNotebook.id,
      })
    }
  }, [
    visible,
    isSupportedRoute,
    currentSection,
    currentNotebook?.id,
    fetchNotes,
    fetchStarredNotes,
    fetchMyShares,
    fetchDeletedNotes,
    fetchNotebooks,
    sort,
  ])

  useEffect(() => {
    const shouldLoadNotebookMeta = currentSection === 'recent' || currentSection === 'notebooks'

    if (!visible || !shouldLoadNotebookMeta || notebooks.length > 0) {
      return
    }

    fetchNotebooks()
  }, [visible, currentSection, notebooks.length, fetchNotebooks])

  useEffect(() => {
    if (!visible || !isSupportedRoute || currentSection === 'shares') {
      return
    }

    fetchMyShares()
  }, [currentSection, fetchMyShares, isSupportedRoute, visible])

  const notebookNameById = useMemo(() => notebooks.reduce((result, notebook) => {
    if (notebook?.id && notebook?.name) {
      result[notebook.id] = notebook.name
    }
    return result
  }, {}), [notebooks])

  const sharedNoteIdSet = useMemo(() => new Set(
    myShares
      .map((item) => String(item?.noteId || item?.id || '').trim())
      .filter(Boolean)
  ), [myShares])

  const sourceNotes = useMemo(() => {
    if (currentSection === 'starred') {
      return starredNotes.map((item) => ({
        ...item,
        notebookName: resolveNotebookName(item, notebookNameById),
      }))
    }

    if (currentSection === 'shares') {
      return myShares.map((item) => ({
        ...item,
        id: item.noteId || item.id,
        title: item.noteTitle || item.title,
        notebookName: item.notebookName || item.shareCode || '分享',
        updatedAt: item.updatedAt || item.createdAt,
      }))
    }

    if (currentSection === 'recyclebin') {
      return deletedNotes.map((item) => ({
        ...item,
        notebookName: resolveNotebookName(item, notebookNameById),
      }))
    }

    return notes.map((item) => ({
      ...item,
      notebookName: resolveNotebookName(
        item,
        notebookNameById,
        currentSection === 'notebooks' ? currentNotebook?.name : ''
      ),
    }))
  }, [currentSection, starredNotes, myShares, deletedNotes, notes, notebookNameById, currentNotebook?.name])

  const sortedNotes = useMemo(() => sortRecentNotes(sourceNotes, sort), [sourceNotes, sort])
  const starredLoadedCount = starredNotes.length
  const starredTotalCount = starredNotesPagination?.total || 0
  const showStarredLoadMore = currentSection === 'starred' && Boolean(starredNotesPagination?.hasMore)
  const selectedNotes = useMemo(
    () => sortedNotes.filter((note) => selectedNoteIds.includes(String(note.id))),
    [sortedNotes, selectedNoteIds]
  )
  const allSelected = sortedNotes.length > 0 && selectedNoteIds.length === sortedNotes.length
  const isRecentLikeSection = currentSection === 'recent' || currentSection === 'notebooks'
  const canMoveNotes = isRecentLikeSection && selectedNoteIds.length > 0
  const batchActionLabels = BATCH_ACTION_LABELS[currentSection] || []

  useEffect(() => {
    hasRedirectedRef.current = false
  }, [location.pathname, currentSection, visible])

  useEffect(() => {
    setBatchMode(false)
    setSelectedNoteIds([])
    setMoveDialogOpen(false)
    setTargetNotebookId(null)
  }, [currentSection, currentNotebook?.id])

  useEffect(() => {
    setSelectedNoteIds((prev) => prev.filter((id) => sortedNotes.some((note) => String(note.id) === id)))
  }, [sortedNotes])

  useEffect(() => {
    if (!menuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  useEffect(() => {
    if (!visible || !isSectionRoot || isLoading || sortedNotes.length === 0 || hasRedirectedRef.current) {
      return
    }

    hasRedirectedRef.current = true
    navigate(getDetailPath(currentSection, sortedNotes[0]), {
      replace: true,
      state: { note: sortedNotes[0] },
    })
  }, [visible, isSectionRoot, isLoading, sortedNotes, navigate, currentSection])

  const handleSidebarWheel = (event) => {
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
    event.preventDefault()
  }

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

    if (currentSection === 'shares') {
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

  const runBatchAction = async (action) => {
    if (selectedNoteIds.length === 0 || isBatchSubmitting) {
      return
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
    } catch (error) {
      message.error(getErrorMessage(error, '批量操作失败，请稍后重试'))
    } finally {
      setIsBatchSubmitting(false)
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
      message.success('批量移动成功')
    } catch (error) {
      message.error(getErrorMessage(error, '批量移动失败，请稍后重试'))
    } finally {
      setIsBatchSubmitting(false)
    }
  }

  const moveNotebookOptions = notebooks
    .filter((item) => item?.id)
    .map((item) => ({
      label: item.name,
      value: item.id,
    }))

  const width = visible ? 320 : 0

  return (
    <aside
      aria-label="近期笔记侧栏"
      className="notes-sidebar"
      style={{
        width,
        minWidth: width,
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
        zIndex: 8,
      }}
      onWheelCapture={handleSidebarWheel}
    >
      <div
        style={{
          height: 58,
          padding: '0 10px 0 8px',
          borderBottom: '1px solid rgba(226,232,240,0.9)',
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
                color: '#111827',
              }}
            >
              {sortedNotes.length}篇笔记
            </div>
            {currentSection === 'starred' && starredTotalCount > starredLoadedCount ? (
              <div style={{ fontSize: 12, color: 'rgba(100,116,139,0.82)', marginLeft: 8 }}>
                已加载 {starredLoadedCount}/{starredTotalCount}
              </div>
            ) : null}
          </div>

          <Button
            type="text"
            size="small"
            aria-label="切换批量操作模式"
            icon={<UnorderedListOutlined />}
            onClick={handleToggleBatchMode}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              color: batchMode ? '#1677ff' : 'rgba(16,34,58,0.72)',
              background: batchMode ? 'rgba(22,119,255,0.08)' : 'transparent',
            }}
          />

          <div ref={menuRef} style={{ position: 'relative' }}>
            <Button
              type="text"
              size="small"
              aria-label="打开近期笔记排序菜单"
              icon={<FilterOutlined />}
              onClick={() => {
                setBatchMode(false)
                setSelectedNoteIds([])
                setMenuOpen((value) => !value)
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                color: menuOpen ? '#1677ff' : 'rgba(16,34,58,0.72)',
                background: menuOpen ? 'rgba(22,119,255,0.08)' : 'transparent',
              }}
            />

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: -6,
                  zIndex: 60,
                  width: 226,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(226,232,240,0.92)',
                  boxShadow: '0 18px 36px rgba(15,23,42,0.14)',
                  backdropFilter: 'blur(14px)',
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
                    background: 'rgba(226,232,240,0.92)',
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
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="notes-sidebar__scroll"
        style={{
          padding: '10px 0 12px 0',
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
              margin: '0 0 12px',
              padding: '0 10px',
            }}
          >
            <div
              style={{
                minHeight: 52,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(226,232,240,0.86)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
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
              {currentSection === 'shares' ? (
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
        {sortedNotes.map((note) => (
          <button
            key={note.id}
            type="button"
            data-testid="recent-note-card"
            onClick={() => {
              if (batchMode) {
                handleToggleNoteSelection(String(note.id))
                return
              }
              navigate(getDetailPath(currentSection, note), {
                state: { note },
              })
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              border: '1px solid rgba(226,232,240,0.72)',
              background: currentNoteId === String(note.id)
                ? 'rgba(227,236,255,0.92)'
                : 'rgba(255,255,255,0.96)',
              borderRadius: 8,
              padding: batchMode ? '14px 16px 14px 14px' : '14px 16px 14px 18px',
              marginBottom: 10,
              cursor: 'pointer',
              boxShadow: currentNoteId === String(note.id)
                ? 'none'
                : 'none',
              transition: 'all 0.18s ease',
            }}
          >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
              {batchMode ? (
                <Checkbox
                  checked={selectedNoteIds.includes(String(note.id))}
                  onChange={() => handleToggleNoteSelection(String(note.id))}
                  onClick={(event) => event.stopPropagation()}
                  style={{ marginTop: 2 }}
                />
              ) : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: currentNoteId === String(note.id) ? 700 : 600,
                    color: '#10223a',
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {note.title || '未命名笔记'}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                    fontSize: 12,
                    color: '#475569',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                    <span>{formatMetaDate(note, sort.field, true)}</span>
                    {note.notebookName ? (
                    <span
                      style={{
                        maxWidth: 112,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#2563eb',
                        background: 'rgba(59,130,246,0.10)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                      >
                        {note.notebookName}
                      </span>
                    ) : null}
                  </div>
                  </div>
                </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexShrink: 0 }}>
                {hasVoiceRecords(note) ? (
                  <span
                    title="有语音记录"
                    aria-label="有语音记录"
                    style={{
                      color: '#7cb7ff',
                      fontSize: 16,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SoundOutlined />
                  </span>
                ) : null}
                <button
                  type="button"
                  title={sharedNoteIdSet.has(String(note.id)) ? '已分享，点击打开分享面板' : '分享'}
                  aria-label={sharedNoteIdSet.has(String(note.id)) ? '已分享' : '分享'}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (batchMode) {
                      return
                    }
                    navigate(getDetailPath(currentSection, note), {
                      state: { note, openSharePanel: true },
                    })
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    color: sharedNoteIdSet.has(String(note.id)) ? '#2563eb' : 'rgba(100,116,139,0.58)',
                    fontSize: 16,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    cursor: batchMode ? 'default' : 'pointer',
                  }}
                >
                  <ShareAltOutlined />
                </button>
                <button
                  type="button"
                  title={note.isStarred ? '取消星标' : '星标'}
                  aria-label={note.isStarred ? '取消星标' : '星标'}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (batchMode) {
                      return
                    }
                    toggleStar(note)
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    color: note.isStarred ? '#d97706' : 'rgba(100,116,139,0.58)',
                    fontSize: 16,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    cursor: batchMode ? 'default' : 'pointer',
                  }}
                >
                  {note.isStarred ? <StarFilled /> : <StarOutlined />}
                </button>
              </div>
            </div>
          </button>
        ))}

        {!isLoading && sortedNotes.length === 0 ? (
          <div style={{ padding: '24px 12px', color: 'rgba(16,34,58,0.56)', fontSize: 13 }}>
            {currentSection === 'starred' ? '暂无星标笔记' : '暂无近期笔记'}
          </div>
        ) : null}

        {showStarredLoadMore ? (
          <div style={{ padding: '4px 4px 12px' }}>
            <Button
              block
              onClick={() => loadMoreStarredNotes(sort)}
              loading={isStarredNotesLoadingMore}
              style={{ borderRadius: 10 }}
            >
              {isStarredNotesLoadingMore ? '加载中...' : '加载更多'}
            </Button>
          </div>
        ) : null}
      </div>

      <Modal
        title="移动到笔记本"
        open={moveDialogOpen}
        destroyOnHidden
        onCancel={() => {
          setMoveDialogOpen(false)
          setTargetNotebookId(null)
        }}
        onOk={handleConfirmMove}
        okText="移动"
        cancelText="取消"
        confirmLoading={isBatchSubmitting}
        okButtonProps={{ disabled: !targetNotebookId }}
      >
        <div style={{ color: 'rgba(16,34,58,0.7)', marginBottom: 12 }}>
          已选择 {selectedNoteIds.length} 篇笔记
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="请选择目标笔记本"
          value={targetNotebookId}
          onChange={setTargetNotebookId}
          options={moveNotebookOptions.filter((item) => (
            currentSection === 'notebooks' ? item.value !== currentNotebook?.id : true
          ))}
        />
      </Modal>
    </aside>
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
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '9px 0',
        fontSize: 15,
        color: '#10223a',
        cursor: 'pointer',
        textAlign: 'left',
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

function getDetailPath(section, note) {
  if (section === 'starred') {
    return `/cloudnote/starred/${note.id}`
  }

  if (section === 'shares') {
    return `/cloudnote/shares/${note.id}`
  }

  if (section === 'notebooks') {
    return `/cloudnote/notebooks/${note.id}`
  }

  if (section === 'recyclebin') {
    return `/cloudnote/recyclebin/${note.id}`
  }

  return `/cloudnote/recent/${note.id}`
}
