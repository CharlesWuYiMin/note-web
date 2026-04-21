import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Pagination, Spin, Tag, message } from 'antd'
import {
  ClockCircleOutlined,
  CloseOutlined,
  HistoryOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import SearchResultCard from '@/components/search/SearchResultCard'
import searchService from '@/services/searchService'
import { getSearchContext, getSearchResultPath } from '@/utils/searchContextV2'

const DEFAULT_PAGE_SIZE = 8

function NoteSearchPanelWorkspace({
  open,
  onClose,
  keyword = '',
  currentPath = '',
  onOpenFullPage,
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

    const timer = window.setTimeout(() => {
      setDebouncedKeyword(trimmedKeyword)
    }, 240)

    return () => window.clearTimeout(timer)
  }, [open, trimmedKeyword])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const loadRecentSearches = async () => {
      const data = await searchService.getRecentSearches()
      setRecentSearches(Array.isArray(data) ? data.slice(0, 8) : [])
    }

    loadRecentSearches().catch(() => {
      setRecentSearches([])
    })
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
      setPage(1)
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

    const runSearch = async () => {
      try {
        setLoading(true)
        const response = await searchService.searchNotes(debouncedKeyword, {
          status: context.status,
          page: currentPage,
          pageSize: DEFAULT_PAGE_SIZE,
          signal: controller.signal,
        })

        if (controller.signal.aborted || requestId !== requestSeqRef.current) {
          return
        }

        const nextItems = Array.isArray(response.items) ? response.items : []
        setItems(nextItems)
        setTotal(Number(response.total || nextItems.length || 0))
      } catch (error) {
        if (!controller.signal.aborted) {
          setItems([])
          setTotal(0)
        }
      } finally {
        if (!controller.signal.aborted && requestId === requestSeqRef.current) {
          setLoading(false)
        }
      }
    }

    runSearch()

    return () => controller.abort()
  }, [context.status, debouncedKeyword, open, page])

  const handleResultClick = (item) => {
    const path = getSearchResultPath(item, context)
    if (!path) {
      return
    }

    searchService.rememberRecentSearch(trimmedKeyword)
    onClose?.()
    navigate(path, { state: { note: item } })
  }

  const handleRecentClick = (value) => {
    onKeywordChange?.(value)
    setPage(1)
    setDebouncedKeyword(value.trim())
  }

  const handleOpenFullPage = () => {
    if (!trimmedKeyword) {
      return
    }

    searchService.rememberRecentSearch(trimmedKeyword)
    onOpenFullPage?.(trimmedKeyword)
  }

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
        width: 'min(920px, calc(100vw - 36px))',
        zIndex: 40,
      }}
    >
      <div
        style={{
          borderRadius: 28,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,255,0.98))',
          boxShadow: '0 28px 80px rgba(15,23,42,0.18)',
          border: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a' }}>
                <SearchOutlined style={{ color: '#64748b' }} />
                <span style={{ fontSize: 18, fontWeight: 800 }}>{'\u641c\u7d22\u7b14\u8bb0'}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(15,23,42,0.6)' }}>
                {'\u5f53\u524d\u641c\u7d22\u8303\u56f4\uff1a'}
                <span style={{ color: '#2563eb', fontWeight: 700 }}>{context.label}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag color="blue" style={{ borderRadius: 999, marginInlineEnd: 0, padding: '4px 12px' }}>
                {context.label}
              </Tag>
              <Button
                type="text"
                aria-label={'\u5173\u95ed\u641c\u7d22'}
                icon={<CloseOutlined />}
                onClick={() => onClose?.()}
                style={{ borderRadius: 999 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Tag icon={<ClockCircleOutlined />} style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                {context.hint}
              </Tag>
              <Tag icon={<SearchOutlined />} style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                {'\u6b63\u6587\u548c\u6807\u9898\u547d\u4e2d\u4f1a\u9ad8\u4eae\u663e\u793a'}
              </Tag>
            </div>
            <Button type="link" style={{ padding: 0 }} disabled={!trimmedKeyword} onClick={handleOpenFullPage}>
              {'\u6253\u5f00\u5b8c\u6574\u7ed3\u679c\u9875'}
            </Button>
          </div>
        </div>

        <div style={{ padding: 20, minHeight: 360, maxHeight: '70vh', overflow: 'auto' }}>
          {!hasKeyword ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <section style={{ padding: 18, borderRadius: 22, background: '#fff', border: '1px solid rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10223a' }}>
                    <HistoryOutlined />
                    <span>{'\u6700\u8fd1\u641c\u7d22'}</span>
                  </div>
                  {recentSearches.length > 0 ? (
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ padding: 0 }}
                      onClick={async () => {
                        await searchService.clearRecentSearches()
                        setRecentSearches([])
                        message.success('\u5df2\u6e05\u7a7a\u641c\u7d22\u5386\u53f2')
                      }}
                    >
                      {'\u6e05\u7a7a\u5386\u53f2'}
                    </Button>
                  ) : null}
                </div>

                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {recentSearches.length > 0 ? recentSearches.map((item) => (
                    <Tag
                      key={item}
                      onClick={() => handleRecentClick(item)}
                      style={{
                        marginInlineEnd: 0,
                        padding: '7px 12px',
                        borderRadius: 999,
                        cursor: 'pointer',
                        border: '1px solid rgba(37,99,235,0.12)',
                        background: 'rgba(37,99,235,0.06)',
                        color: '#2563eb',
                      }}
                    >
                      {item}
                    </Tag>
                  )) : (
                    <span style={{ color: 'rgba(15,23,42,0.48)', fontSize: 13 }}>
                      {'\u8f93\u5165\u5173\u952e\u8bcd\u540e\u4f1a\u81ea\u52a8\u641c\u7d22\uff0c\u70b9\u5f00\u7ed3\u679c\u540e\u4f1a\u8bb0\u5f55\u5230\u8fd9\u91cc\u3002'}
                    </span>
                  )}
                </div>
              </section>

              <section style={{ padding: 18, borderRadius: 22, background: '#fff', border: '1px solid rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10223a' }}>
                  <SearchOutlined />
                  <span>{'\u641c\u7d22\u63d0\u793a'}</span>
                </div>
                <div style={{ marginTop: 12, color: 'rgba(15,23,42,0.64)', lineHeight: 1.8 }}>
                  {'\u5728\u9876\u90e8\u641c\u7d22\u6846\u8f93\u5165\u5173\u952e\u8bcd\u540e\uff0c\u7ed3\u679c\u4f1a\u6309\u7167\u5f53\u524d\u76ee\u5f55\u81ea\u52a8\u5207\u6362 active\u3001deleted\u3001star\u3001share\uff0c\u5e76\u5c55\u793a\u547d\u4e2d\u7684\u6807\u9898\u6216\u6b63\u6587\u7247\u6bb5\u3002'}
                </div>
              </section>
            </div>
          ) : (
            <Spin spinning={loading}>
              {items.length === 0 && !loading ? (
                <Empty
                  description={`${'\u672a\u627e\u5230\u4e0e \u201c'}${debouncedKeyword}${'\u201d \u76f8\u5173\u7684\u7b14\u8bb0'}`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '72px 0' }}
                >
                  <div style={{ color: 'rgba(15,23,42,0.45)', fontSize: 13 }}>{'\u8bd5\u8bd5\u66f4\u77ed\u7684\u5173\u952e\u8bcd\uff0c\u6216\u8005\u5207\u6362\u76ee\u5f55\u540e\u518d\u641c\u7d22\u3002'}</div>
                </Empty>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {items.map((item) => (
                    <SearchResultCard
                      key={item.id}
                      item={item}
                      keyword={debouncedKeyword}
                      context={context}
                      compact
                      onClick={handleResultClick}
                    />
                  ))}
                </div>
              )}

              {total > DEFAULT_PAGE_SIZE ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                  <Pagination
                    current={page}
                    pageSize={DEFAULT_PAGE_SIZE}
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

export default NoteSearchPanelWorkspace
