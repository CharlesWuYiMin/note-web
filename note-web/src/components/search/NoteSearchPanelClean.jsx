import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Pagination, Spin, Tag, Typography, message } from 'antd'
import {
  CloseOutlined,
  DeleteOutlined,
  FolderOutlined,
  HistoryOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StarOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import searchService from '@/services/searchService'
import { getSearchContext, getSearchResultPath } from '@/utils/searchContext'

const { Text, Paragraph } = Typography
const DEFAULT_PAGE_SIZE = 8

function highlightTitle(title, keyword) {
  const text = title || '未命名笔记'
  const needle = keyword.trim()

  if (!needle) {
    return text
  }

  const lowerText = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const index = lowerText.indexOf(lowerNeedle)

  if (index < 0) {
    return text
  }

  return (
    <>
      {text.slice(0, index)}
      <span style={{ color: '#0256d2', fontWeight: 800 }}>
        {text.slice(index, index + needle.length)}
      </span>
      {text.slice(index + needle.length)}
    </>
  )
}

function NoteSearchPanelClean({
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

  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword.trim())
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])

  const trimmedKeyword = keyword.trim()
  const hasKeyword = debouncedKeyword.length > 0

  useEffect(() => {
    if (!open) {
      return undefined
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
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        console.error('Search panel request failed', error)
        setItems([])
        setTotal(0)
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

    onClose?.()
    navigate(path)
  }

  const showEmptyState = hasKeyword && !loading && items.length === 0
  const showRecent = !hasKeyword

  if (!open) {
    return null
  }

  return (
    <div
      ref={panelRef}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: 'min(860px, calc(100vw - 36px))',
        zIndex: 40,
      }}
    >
      <div
        style={{
          borderRadius: 28,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,253,0.98))',
          boxShadow: '0 28px 80px rgba(16,34,58,0.18)',
          border: '1px solid rgba(16,34,58,0.08)',
        }}
      >
        <div style={{ padding: 18, borderBottom: '1px solid rgba(16,34,58,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>搜索笔记</div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(16,34,58,0.56)' }}>
                当前仅搜索 <Text strong style={{ color: '#0256d2' }}>{context.label}</Text>，支持实时检索与分页浏览。
              </div>
            </div>
            <Button
              type="text"
              aria-label="关闭搜索"
              onClick={() => onClose?.()}
              icon={<CloseOutlined />}
              style={{ borderRadius: 999 }}
            />
          </div>
        </div>

        <div style={{ padding: 18, minHeight: 360, maxHeight: '70vh', overflow: 'auto' }}>
          {showRecent ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <section style={{ padding: 18, borderRadius: 22, background: '#fff', border: '1px solid rgba(16,34,58,0.06)' }}>
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
                      onClick={async () => {
                        try {
                          await searchService.clearRecentSearches()
                          setRecentSearches([])
                          message.success('已清空搜索历史')
                        } catch (error) {
                          message.error(error?.message || '清空失败')
                        }
                      }}
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
                        border: '1px solid rgba(2,86,210,0.12)',
                        background: 'rgba(2,86,210,0.06)',
                        color: '#0256d2',
                      }}
                    >
                      {item}
                    </Tag>
                  )) : (
                    <Text type="secondary">暂无搜索历史。</Text>
                  )}
                </div>
              </section>

              <section style={{ padding: 18, borderRadius: 22, background: '#fff', border: '1px solid rgba(16,34,58,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10223a' }}>
                  <SearchOutlined />
                  <span>快捷提示</span>
                </div>
                <div style={{ marginTop: 12, color: 'rgba(16,34,58,0.64)', lineHeight: 1.8 }}>
                  直接在顶部搜索框输入标题关键字，结果会在下方实时刷新。按 `Enter` 可以立即进入完整结果页。
                </div>
              </section>
            </div>
          ) : (
            <Spin spinning={loading}>
              {showEmptyState ? (
                <Empty
                  description={`未找到与 “${debouncedKeyword}” 相关的笔记`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '72px 0' }}
                >
                  <div style={{ color: 'rgba(16,34,58,0.45)', fontSize: 13 }}>试试更短的标题词或更明确的关键词</div>
                </Empty>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleResultClick(item)}
                      style={{
                        width: '100%',
                        border: '1px solid rgba(16,34,58,0.06)',
                        borderRadius: 18,
                        background: '#fff',
                        padding: 16,
                        textAlign: 'left',
                        boxShadow: '0 10px 24px rgba(16,34,58,0.04)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: item.status === 'deleted'
                            ? 'rgba(255,77,79,0.08)'
                            : item.isStarred
                              ? 'rgba(250,173,20,0.12)'
                              : 'rgba(2,86,210,0.08)',
                          color: item.status === 'deleted'
                            ? '#ff4d4f'
                            : item.isStarred
                              ? '#d97706'
                              : '#0256d2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                        >
                          {item.status === 'deleted'
                            ? <DeleteOutlined />
                            : item.status === 'share'
                              ? <ShareAltOutlined />
                              : item.isStarred
                                ? <StarOutlined />
                                : item.notebookId
                                  ? <FolderOutlined />
                                  : <FileTextOutlined />}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: '#10223a', lineHeight: 1.35 }}>
                                {highlightTitle(item.title, debouncedKeyword)}
                              </div>
                            </div>
                            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                              {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''}
                            </Text>
                          </div>

                          <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ margin: '10px 0 0', color: 'rgba(16,34,58,0.58)', lineHeight: 1.7 }}
                          >
                            {item.deletedAt ? '已删除的笔记，点击可查看或恢复。' : '点击即可打开对应笔记。'}
                          </Paragraph>
                        </div>
                      </div>
                    </button>
                  ))}
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
    </div>
  )
}

export default NoteSearchPanelClean
