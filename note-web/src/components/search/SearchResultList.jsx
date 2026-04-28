import React from 'react'
import { Button, Tag, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import EmptyState from '@/components/common/EmptyState'
import { hasVoiceRecords } from '@/utils/searchPresentation'
import SearchResultIcon from '@/components/search/SearchResultIcon'
import SearchHighlightText from '@/components/search/SearchHighlightText'

const { Paragraph, Text } = Typography

function SearchResultList({ results, query, onResultClick, recentSearches, onRecentSearchClick, isLoading = false }) {
  return (
    <>
      <style>{`
        .cloudnote-search-result-card:hover {
          background: rgba(248, 250, 252, 1) !important;
          border-color: rgba(10, 89, 247, 0.10) !important;
          box-shadow: var(--shadow-sm) !important;
        }
      `}</style>
      <div style={{ display: 'grid', gap: 12 }}>
        {recentSearches.length > 0 ? (
          <section
            style={{
              padding: 18,
              borderRadius: 20,
              background: '#fff',
              border: '1px solid rgba(15,23,42,0.08)',
              boxShadow: 'var(--shadow-sm)',
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
                    border: '1px solid rgba(10,89,247,0.14)',
                    background: 'var(--primary-soft)',
                    color: 'var(--primary)',
                  }}
                >
                  {item}
                </Tag>
              ))}
            </div>
          </section>
        ) : null}

        {results.length === 0 && !isLoading ? (
          <EmptyState
            title={`未找到与 “${query}” 相关的笔记`}
            description="试试更短的标题词或更明确的关键词。"
            style={{ padding: '72px 0' }}
          />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {results.map((item) => (
              <Button
                key={item.id}
                type="text"
                data-testid="search-result-card"
                onClick={() => onResultClick(item)}
                style={{
                  height: 'auto',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                <article
                  className="cloudnote-search-result-card"
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 14,
                    background: '#fff',
                    border: '1px solid rgba(15,23,42,0.08)',
                    boxShadow: 'none',
                    transition: 'background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <SearchResultIcon note={item} />

                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                        <Text strong style={{ fontSize: 15, color: '#10223a', lineHeight: 1.15, minWidth: 0 }}>
                          <SearchHighlightText
                            as="span"
                            text={item.highlightTitle || item.title || '未命名笔记'}
                            keyword={query}
                          />
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {hasVoiceRecords(item) ? (
                            <Tag
                              style={{
                                marginInlineEnd: 0,
                                borderRadius: 999,
                                border: '1px solid rgba(124,183,255,0.22)',
                                background: 'rgba(124,183,255,0.10)',
                                color: '#5ea8ff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span style={{ fontSize: 13, lineHeight: 1 }}>•</span>
                              <span>语音</span>
                            </Tag>
                          ) : null}
                          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
                          </Text>
                        </div>
                      </div>

                      {item.context ? (
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            margin: '2px 0 0',
                            color: 'rgba(16,34,58,0.58)',
                            lineHeight: 1.45,
                          }}
                        >
                          <SearchHighlightText
                            as="span"
                            text={item.context}
                            keyword={query}
                          />
                        </Paragraph>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default SearchResultList
