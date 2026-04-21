import React from 'react'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOutlined,
  ShareAltOutlined,
  SoundOutlined,
  StarOutlined,
} from '@ant-design/icons'
import SearchHighlightText from '@/components/search/SearchHighlightText'
import {
  formatSearchDate,
  getSearchResultPreview,
  getSearchScopeLabel,
} from '@/utils/searchPresentation'

function resolveResultVisual(item, contextStatus) {
  if (contextStatus === 'deleted' || item?.status === 'deleted') {
    return {
      icon: <DeleteOutlined />,
      background: 'linear-gradient(180deg, rgba(255,235,238,0.96), rgba(255,242,244,0.96))',
      color: '#dc2626',
    }
  }

  if (contextStatus === 'share') {
    return {
      icon: <ShareAltOutlined />,
      background: 'linear-gradient(180deg, rgba(232,245,255,0.96), rgba(239,249,255,0.96))',
      color: '#0284c7',
    }
  }

  if (contextStatus === 'star' || item?.isStarred) {
    return {
      icon: <StarOutlined />,
      background: 'linear-gradient(180deg, rgba(255,247,214,0.96), rgba(255,250,228,0.96))',
      color: '#ca8a04',
    }
  }

  return {
    icon: <FileTextOutlined />,
    background: 'linear-gradient(180deg, rgba(224,242,254,0.96), rgba(239,246,255,0.96))',
    color: '#0284c7',
  }
}

function SearchResultCard({ item, keyword, context, onClick, compact = false }) {
  const visual = resolveResultVisual(item, context?.status)
  const previewText = getSearchResultPreview(item, context?.label)
  const scopeLabel = context?.label || getSearchScopeLabel(item?.status)
  const updatedLabel = formatSearchDate(item?.updatedAt)

  return (
    <button
      type="button"
      data-testid="search-result-card"
      onClick={() => onClick?.(item)}
      style={{
        width: '100%',
        border: 'none',
        padding: 0,
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <article
        style={{
          width: '100%',
          display: 'flex',
          gap: compact ? 14 : 18,
          alignItems: 'flex-start',
          padding: compact ? '16px 18px' : '18px 20px',
          borderRadius: compact ? 20 : 22,
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.06)',
          boxShadow: compact
            ? '0 12px 26px rgba(15,23,42,0.06)'
            : '0 14px 30px rgba(15,23,42,0.05)',
        }}
      >
        <div
          style={{
            width: compact ? 46 : 50,
            height: compact ? 46 : 50,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: compact ? 20 : 22,
            background: visual.background,
            color: visual.color,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
          }}
        >
          {visual.icon}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <SearchHighlightText
            as="div"
            text={item?.highlightTitle || item?.title || '\u672a\u547d\u540d\u7b14\u8bb0'}
            keyword={keyword}
            style={{
              fontSize: compact ? 16 : 17,
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          />

          <SearchHighlightText
            as="div"
            text={previewText}
            keyword={keyword}
            style={{
              marginTop: 8,
              color: '#334155',
              fontSize: compact ? 14 : 15,
              lineHeight: 1.65,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
            highlightStyle={{
              color: '#2563eb',
            }}
          />

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              color: 'rgba(15,23,42,0.56)',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FolderOutlined />
              <span>{scopeLabel}</span>
            </span>

            {updatedLabel ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <EditOutlined />
                <span>{'\u4fee\u6539\u65f6\u95f4'} {updatedLabel}</span>
              </span>
            ) : null}

            {Number(item?.voiceNumber || 0) > 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <SoundOutlined />
                <span>{item.voiceNumber} {'\u6761\u8bed\u97f3'}</span>
              </span>
            ) : null}

            {!updatedLabel && Number(item?.voiceNumber || 0) === 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ClockCircleOutlined />
                <span>{'\u70b9\u51fb\u5373\u53ef\u6253\u5f00\u7b14\u8bb0'}</span>
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </button>
  )
}

export default SearchResultCard
