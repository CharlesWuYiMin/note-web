import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Modal,
  Pagination,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CloseOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import EmptyState from '@/components/common/EmptyState'
import searchService from '@/services/searchService'
import SearchResultIcon from '@/components/search/SearchResultIcon'
import SearchHighlightText from '@/components/search/SearchHighlightText'
import { getSearchContext, getSearchResultPath } from '@/utils/searchContext'
import { reportTiming, trackEvent } from '@/utils/observability'

const { Text, Paragraph } = Typography
const DEFAULT_PAGE_SIZE = 8

function formatUpdatedAt(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

function getKeywordSnippet(text, keyword, radius = 18) {
  const source = String(text || '').trim()
  const query = String(keyword || '').trim()

  if (!source) {
    return '点击即可打开对应笔记。'
  }

  if (!query) {
    return source.length > radius * 2
      ? `${source.slice(0, radius * 2).trim()}...`
      : source
  }

  const lowerSource = source.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerSource.indexOf(lowerQuery)

  if (matchIndex < 0) {
    return source.length > radius * 2
      ? `${source.slice(0, radius * 2).trim()}...`
      : source
  }

  const start = Math.max(0, matchIndex - radius)
  const end = Math.min(source.length, matchIndex + query.length + radius)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < source.length ? '...' : ''
  return `${prefix}${source.slice(start, end).trim()}${suffix}`
}

function NoteSearchPanelWorkspace({
  open,
  onClose,
  keyword = '',
  currentPath = '',
  onKeywordChange,
}) {
  const navigate = useNavigate()
  const context = useMemo(() => getSearchContext(currentPath), [currentPath])
  const panelRef = useRef(null)
  const abortRef = useRef(null)
  const requestSeqRef = useRef(0)
  const lastCommittedKeywordRef = useRef('')
  const panelOpenTrackedRef = useRef(false)

  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword.trim())
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])
  const [hoveredItemId, setHoveredItemId] = useState(null)
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false)

  const trimmedKeyword = keyword.trim()
  const hasKeyword = debouncedKeyword.length > 0

  useEffect(() => {
    if (!open) {
      panelOpenTrackedRef.current = false
      return undefined
    }

    if (!panelOpenTrackedRef.current) {
      trackEvent('search_panel_open', {
        currentPath,
        hasKeyword: Boolean(trimmedKeyword),
        context: context.status,
      })
      panelOpenTrackedRef.current = true
    }

    setPage(1)
    setItems([])
    setTotal(0)
    setLoading(false)
    lastCommittedKeywordRef.current = ''

    const timer = window.setTimeout(() => {
      setDebouncedKeyword(trimmedKeyword)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [open, trimmedKeyword])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const loadRecentSearches = async () => {
      try {
        const data = await searchService.getRecentSearches()
        setRecentSearches(Array.isArray(data) ? data.slice(0, 8) : [])
      } catch (error) {
        console.error('Failed to load recent searches', error)
        setRecentSearches([])
      }
    }

    loadRecentSearches()
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleMouseDown = (event) => {
      if (event.target?.closest?.('#header-search-input')) {
        return
      }

      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose, open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    if (!debouncedKeyword) {
      setItems([])
      setTotal(0)
      setLoading(false)
      lastCommittedKeywordRef.current = ''
      return undefined
    }

    if (debouncedKeyword !== lastCommittedKeywordRef.current && page !== 1) {
      setPage(1)
      return undefined
    }

    const controller = new AbortController()
    abortRef.current = controller
    const requestId = ++requestSeqRef.current
    const currentPage = debouncedKeyword === lastCommittedKeywordRef.current ? page : 1
    lastCommittedKeywordRef.current = debouncedKeyword
    const requestStartedAt = Date.now()

    const search = async () => {
      try {
        setLoading(true)
        const response = await searchService.searchNotes(debouncedKeyword, {
          status: context.status,
          page: currentPage,
          pageSize,
          signal: controller.signal,
        })

        if (controller.signal.aborted || requestId !== requestSeqRef.current) {
          return
        }

        const nextItems = Array.isArray(response.items) ? response.items : []
        setItems(nextItems)
        setTotal(Number(response.total || nextItems.length || 0))
        reportTiming('search_request', Date.now() - requestStartedAt, {
          status: 'success',
          keywordLength: debouncedKeyword.length,
          page: currentPage,
          pageSize,
          resultCount: nextItems.length,
          context: context.status,
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        console.error('Search panel request failed', error)
        setItems([])
        setTotal(0)
        reportTiming('search_request', Date.now() - requestStartedAt, {
          status: 'error',
          keywordLength: debouncedKeyword.length,
          page: currentPage,
          pageSize,
          context: context.status,
          errorName: error?.name || 'Error',
        })
      } finally {
        if (!controller.signal.aborted && requestId === requestSeqRef.current) {
          setLoading(false)
        }
      }
    }

    search()

    return () => {
      controller.abort()
    }
  }, [context.status, debouncedKeyword, open, page, pageSize])

  const handleResultClick = (item) => {
    const path = getSearchResultPath(item, context)
    if (!path) {
      return
    }

    trackEvent('search_result_click', {
      noteId: item?.id || '',
      notebookId: item?.notebookId || '',
      path,
      keywordLength: debouncedKeyword.length,
      context: context.status,
    })

    const nextRecentSearches = searchService.rememberRecentSearch?.(trimmedKeyword || debouncedKeyword)
    setRecentSearches(Array.isArray(nextRecentSearches) ? nextRecentSearches.slice(0, 8) : [])
    onClose?.()
    navigate(path)
  }

  const handleClearRecentSearches = async () => {
    try {
      const nextRecentSearches = await searchService.clearRecentSearches()
      setRecentSearches(Array.isArray(nextRecentSearches) ? nextRecentSearches : [])
      message.success('已清空搜索历史')
      trackEvent('search_history_cleared', {
        historyCount: recentSearches.length,
      })
      setClearHistoryConfirmOpen(false)
    } catch (error) {
      message.error(error?.message || '清空失败')
      trackEvent('search_history_clear_failed', {
        errorName: error?.name || 'Error',
      })
    }
  }

  const showEmptyState = hasKeyword && !loading && items.length === 0
  const showRecent = !hasKeyword

  if (!open) {
    return null
  }

  return (
    <>
    <style>{`
      .cloudnote-search-panel .ant-pagination-item,
      .cloudnote-search-panel .ant-pagination-prev,
      .cloudnote-search-panel .ant-pagination-next {
        border-radius: 10px;
        border-color: rgba(15, 23, 42, 0.08);
      }

      .cloudnote-search-panel .ant-pagination-item-active {
        background: var(--primary-soft);
        border-color: rgba(10, 89, 247, 0.18);
      }
    `}</style>
    <div
      className="cloudnote-search-panel"
      ref={panelRef}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: 'min(620px, calc(100vw - 48px))',
        zIndex: 40,
      }}
    >
      <div
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <div
          className="search-panel-scroll"
          style={{
            padding: 16,
            paddingRight: 10,
            minHeight: 320,
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
          }}
        >
          <Button
            type="text"
            aria-label="关闭搜索"
            onClick={() => onClose?.()}
            icon={<CloseOutlined />}
            style={{ position: 'absolute', top: 8, right: 8, borderRadius: 999, zIndex: 1 }}
          />
          {showRecent ? (
            <div style={{ display: 'grid', gap: 14, paddingTop: 28 }}>
              <section style={{ padding: 18, borderRadius: 20, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10223a' }}>
                    <HistoryOutlined />
                    <span>最近搜索</span>
                  </div>
                  {recentSearches.length > 0 ? (
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() => setClearHistoryConfirmOpen(true)}
                    >
                      清空历史
                    </Button>
                  ) : null}
                </div>

                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {recentSearches.length > 0 ? recentSearches.map((item) => (
                    <Tag
                      key={item}
                      onClick={() => onKeywordChange?.(item)}
                      style={{
                        marginInlineEnd: 0,
                        padding: '7px 12px',
                        borderRadius: 999,
                        cursor: 'pointer',
                        border: '1px solid rgba(10,89,247,0.14)',
                        background: 'var(--primary-soft)',
                        color: 'var(--primary)',
                      }}
                    >
                      {item}
                    </Tag>
                  )) : (
                    <Text type="secondary">暂无搜索历史。</Text>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <Spin spinning={loading}>
              {showEmptyState ? (
                <EmptyState
                  title="未找到相关笔记"
                  description={`未找到与“${debouncedKeyword}”相关的笔记，试试更短的标题词或更明确的关键词。`}
                  style={{ padding: '72px 0' }}
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 0,
                    background: '#fff',
                    borderRadius: 18,
                    border: '1px solid rgba(15,23,42,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {items.map((item) => {
                    const isHovered = hoveredItemId === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleResultClick(item)}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId((current) => (current === item.id ? null : current))}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: '1px solid rgba(15,23,42,0.08)',
                          background: isHovered ? 'rgba(248,250,252,1)' : '#fff',
                          padding: '14px 16px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background 0.16s ease',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <SearchResultIcon note={item} size={36} fontSize={18} />

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#10223a', lineHeight: 1.35 }}>
                                  <SearchHighlightText
                                    as="span"
                                    text={item.highlightTitle || item.title || '未命名笔记'}
                                    keyword={debouncedKeyword}
                                  />
                                </div>
                                <Paragraph
                                  ellipsis={{ rows: 1 }}
                                  style={{ margin: '4px 0 0', color: 'rgba(16,34,58,0.68)', lineHeight: 1.6 }}
                                >
                                  <SearchHighlightText
                                    as="span"
                                    text={getKeywordSnippet(item.context, debouncedKeyword)}
                                    keyword={debouncedKeyword}
                                  />
                                </Paragraph>
                                <div
                                  style={{
                                    marginTop: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 18,
                                    flexWrap: 'wrap',
                                    color: 'rgba(16,34,58,0.52)',
                                    fontSize: 12,
                                  }}
                                >
                                  {item.notebookName ? <span>{item.notebookName}</span> : null}
                                  <span>修改时间 {formatUpdatedAt(item.updatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {total > pageSize ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    showSizeChanger={false}
                    onChange={setPage}
                  />
                </div>
              ) : null}
            </Spin>
          )}
        </div>
      </div>
      <Modal
        open={clearHistoryConfirmOpen}
        centered
        title="清空搜索历史"
        okText="清空"
        cancelText="取消"
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
        onOk={handleClearRecentSearches}
        onCancel={() => setClearHistoryConfirmOpen(false)}
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
          清空后将移除最近搜索记录，但不会删除任何笔记内容。
        </div>
      </Modal>
    </div>
    </>
  )
}

export default NoteSearchPanelWorkspace

