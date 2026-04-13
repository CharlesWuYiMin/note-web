import React from 'react'
import { Empty } from 'antd'
import { FormOutlined } from '@ant-design/icons'

const HandwrittenEditor = ({ value, onChange, onSave }) => {
  return (
    <div
      className="handwritten-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f9fb',
      }}
    >
      <Empty
        image={<FormOutlined style={{ fontSize: 64, color: '#0256d2' }} />}
        description={
          <span style={{ color: '#5f6368', fontSize: 15 }}>
            手写编辑器（基于 Fabric.js）
          </span>
        }
      >
        <div style={{ marginTop: 16, fontSize: 13, color: '#bfbfbf' }}>
          绘图功能 · 画笔工具 · 橡皮擦
        </div>
      </Empty>
    </div>
  )
}

export default HandwrittenEditor
