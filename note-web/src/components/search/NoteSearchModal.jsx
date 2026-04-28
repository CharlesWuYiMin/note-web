import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  FolderOutlined,
  HistoryOutlined,
  SearchOutlined,
  ShareAltOutlined,
  SoundOutlined,
  StarOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import searchService from '@/services/searchService'
import SearchResultIcon from '@/components/search/SearchResultIcon'
import { hasVoiceRecords } from '@/utils/searchPresentation'
import { getSearchContext, getSearchResultPath } from '@/utils/searchContext'

const { Text, Paragraph } = Typography

const DEFAULT_PAGE_SIZE = 8

function highlightTitle(title, keyword) {
  const text = title || '鏈懡鍚嶇瑪璁?
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

function NoteSearchModal({ open, onClose, initialKeyword = '', currentPath = '', onOpenFullPage }) {
  const navigate = useNavigate()
  const context = useMemo(() => getSearchContext(currentPath), [currentPath])
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const requestSeqRef = useRef(0)
  const lastCommittedKeywordRef = useRef('')

  const [keyword, setKeyword] = useState(initialKeyword)
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword.trim())
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

    setKeyword(initialKeyword || '')
    setDebouncedKeyword((initialKeyword || '').trim())
    setPage(1)
    setItems([])
    setTotal(0)
    setLoading(false)
    lastCommittedKeywordRef.current = ''

    const timer = window.setTimeout(() => {
      inputRef.current?.focus?.({ cursor: 'end' })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [initialKeyword, open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

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

        console.error('Search modal request failed', error)
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

  const handleKeywordChange = (event) => {
    setKeyword(event.target.value)
  }

  const handleKeywordSubmit = () => {
    if (trimmedKeyword) {
      const nextRecentSearches = searchService.rememberRecentSearch?.(trimmedKeyword)
      setRecentSearches(Array.isArray(nextRecentSearches) ? nextRecentSearches.slice(0, 8) : [])
    }

    setPage(1)
    setDebouncedKeyword(trimmedKeyword)
  }

  const handleResultClick = (item) => {
    const path = getSearchResultPath(item, context)
    if (!path) {
      return
    }

    onClose?.()
    navigate(path, { state: { note: item } })
  }

  const handleRecentClick = (value) => {
    setKeyword(value)
    setPage(1)
    setDebouncedKeyword(value.trim())
  }

  const showEmptyState = hasKeyword && !loading && items.length === 0
  const showRecent = !hasKeyword

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={860}
      styles={{
        content: {
          borderRadius: 28,
          padding: 0,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,253,0.98))',
          boxShadow: '0 28px 80px rgba(16,34,58,0.18)',
        },
        body: {
          padding: 0,
        },
      }}
    >
      <div style={{ padding: 20, borderBottom: '1px solid rgba(16,34,58,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>鎼滅储绗旇</div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(16,34,58,0.56)' }}>
              褰撳墠浠呮悳绱?<Text strong style={{ color: '#0256d2' }}>{context.label}</Text>锛屾敮鎸佸疄鏃舵绱笌鍒嗛〉娴忚銆?            </div>
          </div>
          <Tag style={{ borderRadius: 999, marginInlineEnd: 0, padding: '4px 12px' }} color="blue">
            {context.label}
          </Tag>
        </div>

        <Input
          ref={inputRef}
          value={keyword}
          onChange={handleKeywordChange}
          onPressEnter={handleKeywordSubmit}
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="杈撳叆鏍囬鍏抽敭璇嶏紝鍥炶溅鍙珛鍗虫悳绱?
          allowClear
          size="large"
          style={{
            marginTop: 16,
            borderRadius: 18,
            height: 48,
            background: '#f8fbff',
            border: '1px solid rgba(2,86,210,0.10)',
          }}
        />

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Space size={10} wrap>
            <Tag icon={<ClockCircleOutlined />} style={{ borderRadius: 999, marginInlineEnd: 0 }}>
              {context.hint}
            </Tag>
            <Tag icon={<FileTextOutlined />} style={{ borderRadius: 999, marginInlineEnd: 0 }}>
              缁撴灉鎸夋爣棰樺叧閿瓧鍖归厤
            </Tag>
          </Space>
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => onOpenFullPage?.(keyword.trim())}
          >
            鎵撳紑瀹屾暣缁撴灉椤?          </Button>
        </div>
      </div>

      <div style={{ padding: 20, minHeight: 460, maxHeight: '70vh', overflow: 'auto' }}>
        {showRecent ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <section style={{ padding: 18, borderRadius: 22, background: '#fff', border: '1px solid rgba(16,34,58,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10223a' }}>
                  <HistoryOutlined />
                  <span>鏈€杩戞悳绱?/span>
                </div>
                {recentSearches.length > 0 ? (
                  <Button type="link" danger size="small" style={{ padding: 0 }} onClick={async () => {
                    try {
                      await searchService.clearRecentSearches()
                      setRecentSearches([])
                      message.success('宸叉竻绌烘悳绱㈠巻鍙?)
                    } catch (error) {
                      message.error(error?.message || '娓呯┖澶辫触')
                    }
                  }}>
                    娓呯┖鍘嗗彶
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
                      border: '1px solid rgba(2,86,210,0.12)',
                      background: 'rgba(2,86,210,0.06)',
                      color: '#0256d2',
                    }}
                  >
                    {item}
                  </Tag>
                )) : (
                  <Text type="secondary">鏆傛棤鎼滅储鍘嗗彶锛屽紑濮嬭緭鍏ュ叧閿瘝鍗冲彲鎼滅储銆?/Text>
                )}
              </div>
            </section>

            <section style={{ padding: 18, borderRadius: 22, background: '#fff', border: '1px solid rgba(16,34,58,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10223a' }}>
                <SearchOutlined />
                <span>蹇嵎鎻愮ず</span>
              </div>
              <div style={{ marginTop: 12, color: 'rgba(16,34,58,0.64)', lineHeight: 1.8 }}>
                杈撳叆鏍囬鍚庝細鑷姩鎼滅储锛屾敮鎸佹寜 `Enter` 绔嬪嵆鎻愪氦銆傛悳绱㈢粨鏋滀細鎸夊綋鍓嶉〉闈㈣涔夎繃婊わ紝
                骞朵繚鐣欏垎椤碉紝鏂逛究蹇€熻烦杞埌鐩爣绗旇銆?              </div>
            </section>
          </div>
        ) : (
          <Spin spinning={loading}>
            {showEmptyState ? (
              <Empty
                description={`鏈壘鍒颁笌 鈥?{debouncedKeyword}鈥?鐩稿叧鐨勭瑪璁癭}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '72px 0' }}
              >
                <div style={{ color: 'rgba(16,34,58,0.45)', fontSize: 13 }}>璇曡瘯鏇寸煭鐨勬爣棰樿瘝鎴栨洿鏄庣‘鐨勫叧閿瘝</div>
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
                      <SearchResultIcon note={item} size={44} fontSize={18} />

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#10223a', lineHeight: 1.35 }}>
                              {highlightTitle(item.title, debouncedKeyword)}
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8, color: 'rgba(16,34,58,0.56)', fontSize: 12 }}>
                              {hasVoiceRecords(item) ? (
                                <Tag
                                  style={{
                                    borderRadius: 999,
                                    marginInlineEnd: 0,
                                    border: '1px solid rgba(124,183,255,0.22)',
                                    background: 'rgba(124,183,255,0.10)',
                                    color: '#5ea8ff',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <SoundOutlined />
                                                                    <span>
                                    {Number(item.voiceNumber || item.voiceCount || 0) > 0
                                      ? `${item.voiceNumber || item.voiceCount} 条语音`
                                      : '语音'}
                                  </span>
                                </Tag>
                              ) : null}
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
                          {item.deletedAt ? '宸插垹闄ょ殑绗旇锛岀偣鍑诲彲鏌ョ湅鎴栨仮澶嶃€? : '鐐瑰嚮鍗冲彲鎵撳紑瀵瑰簲绗旇銆?}
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
    </Modal>
  )
}

export default NoteSearchModal

