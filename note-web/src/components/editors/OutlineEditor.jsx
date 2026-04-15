import React from 'react'
import { Empty, Spin } from 'antd'
import { EditOutlined } from '@ant-design/icons'

const OutlineEditor = ({ value, onChange, onSave }) => {
  return (
    <div
      className="outline-editor"
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
        image={<EditOutlined style={{ fontSize: 64, color: '#0256d2' }} />}
        description={
          <span style={{ color: '#5f6368', fontSize: 15 }}>
            大纲编辑器（基于 ECharts）
          </span>
        }
      >
        <div style={{ marginTop: 16, fontSize: 13, color: '#bfbfbf' }}>
          脑图展示 · 节点编辑 · 实时保存
        </div>
      </Empty>
    </div>
  )
}

export default OutlineEditor
