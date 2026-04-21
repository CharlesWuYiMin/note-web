import React from 'react'
import { Empty, Tag } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import SearchResultCard from '@/components/search/SearchResultCard'

function SearchResultListV2({ results, query, onResultClick, recentSearches, onRecentSearchClick, context }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {recentSearches.length > 0 ? (
        <section
          style={{
            padding: 18,
            borderRadius: 20,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(246,248,252,0.98))',
            border: '1px solid rgba(16,34,58,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#10223a' }}>
            <ClockCircleOutlined />
            <span>最近搜索</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {recentSearches.map((item) => (
              <Tag
                key={item}
                onClick={() => onRecentSearchClick(item)}
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
            ))}
          </div>
        </section>
      ) : null}

      {results.length === 0 ? (
        <Empty
          description={`未找到与 “${query}” 相关的笔记`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '72px 0' }}
        >
          <div style={{ color: 'rgba(16,34,58,0.45)', fontSize: 13 }}>尝试使用更精确的关键词</div>
        </Empty>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {results.map((item) => (
            <SearchResultCard
              key={item.id}
              item={item}
              keyword={query}
              context={context}
              onClick={onResultClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchResultListV2
