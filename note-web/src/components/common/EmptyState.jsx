import React from 'react'
import { Empty } from 'antd'

const EmptyState = ({
  title = '',
  description = 'No data',
  icon,
  action,
  size,
  compact = false,
  style = {},
  contentStyle = {},
}) => {
  const resolvedDescription = typeof description === 'string' && description.trim()
    ? description
    : 'No data'
  const resolvedTitle = typeof title === 'string' && title.trim()
    ? title
    : resolvedDescription
  const supportingText = resolvedTitle === resolvedDescription ? '' : resolvedDescription

  return (
    <div
      className="empty-state"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '24px 20px' : '48px 24px',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: compact ? 360 : 420,
          textAlign: 'center',
          ...contentStyle,
        }}
      >
        <Empty
          description={null}
          image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
          {...(size ? { size } : {})}
        />
        <div
          style={{
            marginTop: 10,
            fontSize: compact ? 16 : 18,
            fontWeight: 700,
            color: '#10223a',
            lineHeight: 1.35,
          }}
        >
          {resolvedTitle}
        </div>
        {supportingText ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 1.8,
              color: 'rgba(16,34,58,0.54)',
            }}
          >
            {supportingText}
          </div>
        ) : null}
        {action ? (
          <div style={{ marginTop: 18 }}>
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default EmptyState
