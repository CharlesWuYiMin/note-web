﻿import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Empty, Pagination, Spin, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import SearchResultToolbar from '@/components/search/SearchResultToolbar'
import SearchResultList from '@/components/search/SearchResultList'
import searchService from '@/services/searchService'
import { DEFAULT_SEARCH_SORT, sortSearchResults } from '@/utils/searchResultSort'
import { getSearchContext, getSearchResultPath } from '@/utils/searchContext'

const { Text } = Typography

const SearchResultPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const status = searchParams.get('status') || 'active'
  const context = useMemo(() => getSearchContext(
    status === 'deleted'
      ? '/cloudnote/recyclebin'
      : status === 'star'
        ? '/cloudnote/starred'
        : status === 'share'
          ? '/cloudnote/shares'
          : '/cloudnote/recent'
  ), [status])

  const [results, setResults] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState(DEFAULT_SEARCH_SORT)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 12

  const normalizeSearchResponse = (response) => {
    if (Array.isArray(response)) {
      return {
        items: response,
        total: Number(response.total || response.length || 0),
      }
    }

    const items = Array.isArray(response?.items) ? response.items : []
    return {
      items,
      total: Number(response?.total || items.length || 0),
    }
  }

  useEffect(() => {
    setPage(1)
  }, [query, status])

  useEffect(() => {
    if (!query) {
      setResults([])
      setTotalCount(0)
      return
    }

    performSearch(query, page)
    loadRecentSearches()
  }, [query, page, status])

  const performSearch = async (searchQuery, currentPage) => {
    try {
      setLoading(true)
      const nextRecentSearches = searchService.rememberRecentSearch?.(searchQuery)
      setRecentSearches(Array.isArray(nextRecentSearches) ? nextRecentSearches.slice(0, 5) : [])
      const data = await searchService.searchNotes(searchQuery, { status, page: currentPage, pageSize })
      const nextResults = normalizeSearchResponse(data)
      setResults(nextResults.items)
      setTotalCount(nextResults.total)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentSearches = async () => {
    try {
      const data = await searchService.getRecentSearches()
      setRecentSearches(Array.isArray(data) ? data.slice(0, 5) : [])
    } catch (error) {
      console.error('Failed to load recent searches', error)
      setRecentSearches([])
    }
  }

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
          description="请输入搜索关键词"
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
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: '#64748b', textTransform: 'uppercase' }}>
            Search Workspace
          </div>
          <h2 style={{ margin: '10px 0 0', fontSize: 34, fontWeight: 800, color: '#10223a', lineHeight: 1.1 }}>
            搜索结果
          </h2>
          <Text type="secondary" style={{ display: 'inline-block', marginTop: 8, fontSize: 15 }}>
            当前关键词：
          </Text>
          <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: 600, color: '#0256d2' }}>
            {query}
          </Text>
        </div>

        <SearchResultToolbar total={totalCount} sort={sort} onSortChange={updateSort} />

        <Spin spinning={loading} data-testid="search-results-loading">
          <SearchResultList
            query={query}
            results={sortedResults}
            recentSearches={recentSearches}
            onRecentSearchClick={(keyword) => {
              navigate(`/cloudnote/search?q=${encodeURIComponent(keyword)}&status=${status}`)
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

export default SearchResultPage
