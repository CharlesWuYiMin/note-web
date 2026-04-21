import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Empty, Pagination, Spin, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import SearchResultToolbar from '@/components/search/SearchResultToolbar'
import SearchResultList from '@/components/search/SearchResultListV2'
import searchService from '@/services/searchService'
import { DEFAULT_SEARCH_SORT, sortSearchResults } from '@/utils/searchResultSort'
import { getSearchContext, getSearchResultPath } from '@/utils/searchContextV2'

const { Text } = Typography

function SearchResultPageWorkspace() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const requestedStatus = searchParams.get('status') || 'active'
  const scopePath = decodeURIComponent(searchParams.get('scope') || '')
  const context = useMemo(() => getSearchContext(
    scopePath || (
      requestedStatus === 'deleted'
        ? '/cloudnote/recyclebin'
        : requestedStatus === 'star'
          ? '/cloudnote/starred'
          : requestedStatus === 'share'
            ? '/cloudnote/shares'
            : '/cloudnote/recent'
    )
  ), [requestedStatus, scopePath])
  const status = context.status

  const [results, setResults] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState(DEFAULT_SEARCH_SORT)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 12

  useEffect(() => {
    setPage(1)
  }, [query, status])

  useEffect(() => {
    const loadRecentSearches = async () => {
      const data = await searchService.getRecentSearches()
      setRecentSearches(Array.isArray(data) ? data.slice(0, 5) : [])
    }

    loadRecentSearches().catch(() => {
      setRecentSearches([])
    })
  }, [query, status])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setTotalCount(0)
      return
    }

    searchService.rememberRecentSearch(query)

    const performSearch = async () => {
      try {
        setLoading(true)
        const data = await searchService.searchNotes(query, { status, page, pageSize })
        const nextResults = Array.isArray(data?.items) ? data.items : []
        setResults(nextResults)
        setTotalCount(Number(data?.total || nextResults.length || 0))
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [page, pageSize, query, status])

  const sortedResults = useMemo(() => sortSearchResults(results, sort), [results, sort])

  const updateSort = (partialSort) => {
    setSort((current) => ({
      ...current,
      ...partialSort,
    }))
  }

  if (!query) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Empty
          description={'\u8bf7\u8f93\u5165\u641c\u7d22\u5173\u952e\u8bcd'}
          image={<SearchOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
        />
      </div>
    )
  }

  return (
    <section
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '18px 20px 26px',
        background: 'radial-gradient(circle at top left, rgba(221,238,255,0.42), transparent 32%), linear-gradient(180deg, rgba(252,253,255,0.98), rgba(246,249,252,0.98))',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#64748b', textTransform: 'uppercase' }}>
            Search Workspace
          </div>
          <h2 style={{ margin: '10px 0 0', fontSize: 34, fontWeight: 800, color: '#10223a', lineHeight: 1.1 }}>
            {'\u641c\u7d22\u7ed3\u679c'}
          </h2>
          <Text type="secondary" style={{ display: 'inline-block', marginTop: 8, fontSize: 15 }}>
            {'\u5f53\u524d\u8303\u56f4\uff1a'}
          </Text>
          <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: 600, color: '#2563eb' }}>
            {context.label}
          </Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 15 }}>
            {'\u5f53\u524d\u5173\u952e\u8bcd\uff1a'}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: 600, color: '#2563eb' }}>
            {query}
          </Text>
        </div>

        <SearchResultToolbar total={totalCount} sort={sort} onSortChange={updateSort} />

        <Spin spinning={loading} data-testid="search-results-loading">
          <SearchResultList
            query={query}
            results={sortedResults}
            context={context}
            recentSearches={recentSearches}
            onRecentSearchClick={(keyword) => {
              navigate(`/cloudnote/search?q=${encodeURIComponent(keyword)}&status=${status}&scope=${encodeURIComponent(scopePath || context.resultRoute)}`)
            }}
            onResultClick={(item) => {
              const path = getSearchResultPath(item, context)
              if (path) {
                navigate(path, { state: { note: item } })
              }
            }}
          />
        </Spin>

        {totalCount > pageSize ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={totalCount}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default SearchResultPageWorkspace
