import React from 'react'
import { Button, Modal } from 'antd'

const LANGUAGE_OPTIONS = [
  { key: 'zh-CN', label: '中文' },
  { key: 'en-US', label: '英文' },
]

function VoicePromptModal({
  open,
  title = '是否开启语音转录',
  confirmText = '开启语音转录',
  selectedLanguage,
  onSelectLanguage,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={520}
      title={null}
      styles={{
        body: {
          padding: 0,
        },
        content: {
          borderRadius: 24,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
        },
      }}
    >
      <div style={{ padding: '24px 26px 22px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 18 }}>{title}</div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelectLanguage?.(option.key)}
              style={{
                flex: 1,
                minHeight: 96,
                borderRadius: 18,
                border: selectedLanguage === option.key ? '2px solid rgba(2,86,210,0.65)' : '1px solid rgba(226,232,240,0.95)',
                background: selectedLanguage === option.key ? 'rgba(2,86,210,0.08)' : '#fff',
                color: selectedLanguage === option.key ? 'var(--primary)' : '#111827',
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: selectedLanguage === option.key ? '0 10px 24px rgba(2,86,210,0.10)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 0,
              }}
            >
              <div>{option.label}</div>
            </button>
          ))}
        </div>

        <div style={{ borderRadius: 18, background: 'rgba(248,250,252,0.96)', padding: '18px 18px 16px', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 10 }}>注意事项</div>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
            语音记录功能受录音环境与拾音设备影响较大。为保证转写效果，建议使用有线耳机进行录制。
          </div>
        </div>

        <Button
          type="primary"
          block
          size="large"
          onClick={onConfirm}
          style={{
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0057d7 0%, #1f4fff 100%)',
            border: 'none',
            fontWeight: 800,
            fontSize: 16,
            boxShadow: '0 14px 28px rgba(2,86,210,0.24)',
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export default VoicePromptModal
