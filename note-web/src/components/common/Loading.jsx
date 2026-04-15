import React from 'react'
import { Spin } from 'antd'

const Loading = ({ tip = '加载中...', size = 'default', fullscreen = false }) => {
  const style = fullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.9)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }

  return (
    <div className={`loading ${fullscreen ? 'loading-fullscreen' : ''}`} style={style}>
      <Spin size={size} tip={tip} aria-label="loading" />
    </div>
  )
}

export default Loading
