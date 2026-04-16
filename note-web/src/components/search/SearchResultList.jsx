import React from 'react'
import { Button, Empty, Tag, Typography } from 'antd'
import {
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { SoundOutlined } from '@ant-design/icons'
import SearchHighlightText from '@/components/search/SearchHighlightText'

const { Paragraph, Text } = Typography

function hasVoiceRecords(note) {
  if (!note) {
    return false
  }

  if (Array.isArray(note.voiceNote) && note.voiceNote.length > 0) {
    return true
  }

  if (Array.isArray(note.voiceRealtimeSessions) && note.voiceRealtimeSessions.length > 0) {
    return true
  }

  if (Number(note.voiceNumber) > 0) {
    return true
  }

  if (Number(note.voiceCount) > 0) {
    return true
  }

  return false
}

function SearchResultList({ results, query, onResultClick, recentSearches, onRecentSearchClick }) {
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
                  border: '1px solid rgba(2,86,210,0.12)',
                  background: 'rgba(2,86,210,0.06)',
                  color: '#0256d2',
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
          <div style={{ color: 'rgba(16,34,58,0.45)', fontSize: 13 }}>尝试使用更精确的标题或时间关键词</div>
        </Empty>
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
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px solid rgba(16,34,58,0.05)',
                  boxShadow: '0 4px 12px rgba(16,34,58,0.035)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(2,86,210,0.08)',
                      color: '#0256d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    <FileTextOutlined />
                  </div>

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
                            <SoundOutlined />
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
  )
}

export default SearchResultList
