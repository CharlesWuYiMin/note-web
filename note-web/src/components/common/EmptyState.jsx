import React from 'react'
import { Empty } from 'antd'

const EmptyState = ({
  description = 'No data',
  icon,
  action,
  size = 'normal',
  style = {},
}) => {
  return (
    <div
      className="empty-state"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        ...style,
      }}
    >
      <Empty
        description={description}
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        size={size}
      >
        {action && <div>{action}</div>}
      </Empty>
    </div>
  )
}

export default EmptyState
