import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from 'antd'

function VoicePromptModal({
  open,
  title,
  confirmText,
  selectedLanguage,
  onSelectLanguage,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation()
  const resolvedTitle = title || t('voice.promptTitle', { defaultValue: '是否开启语音转录' })
  const resolvedConfirmText = confirmText || t('voice.promptConfirm', { defaultValue: '开启语音转录' })
  const languageOptions = [
    { key: 'zh-CN', label: t('settings.languageOptionZh', { defaultValue: '中文' }) },
    { key: 'en-US', label: t('voice.language.english', { defaultValue: '英文' }) },
  ]

  return (
      <Modal
        open={open}
        onCancel={onCancel}
        footer={null}
        centered
        destroyOnHidden
        width={448}
        title={null}
        rootClassName="voice-prompt-modal-root"
        closeIcon={<span style={{ fontSize: 20, lineHeight: 1, color: '#94a3b8' }}>×</span>}
        styles={{
          body: { padding: 0 },
          content: {
            borderRadius: 22,
            overflow: 'hidden',
            background: '#fff',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: 'var(--shadow-md)',
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.32)',
          },
        }}
      >
        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 12, letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {languageOptions.map((option) => {
              const selected = selectedLanguage === option.key

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onSelectLanguage?.(option.key)}
                  style={{
                  flex: 1,
                  minHeight: 84,
                  borderRadius: 16,
                  border: selected ? '1px solid rgba(10,89,247,0.28)' : '1px solid rgba(15,23,42,0.08)',
                  background: selected ? 'var(--primary-soft)' : '#fff',
                  color: selected ? 'var(--primary)' : '#111827',
                  fontSize: 17,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 0,
                    transition: 'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
                  }}
                >
                  <div>{option.label}</div>
                </button>
              )
            })}
          </div>

          <div style={{ borderRadius: 16, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', padding: '14px 16px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              {t('voice.promptNoticeTitle', { defaultValue: '注意事项' })}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
              {t('voice.promptNoticeBody', { defaultValue: '语音记录功能受录音环境与拾音设备影响较大。为保证转写效果，建议使用有线耳机进行录制。' })}
            </div>
          </div>

          <Button
            type="primary"
            block
            size="large"
            onClick={onConfirm}
            style={{
              height: 48,
              borderRadius: 13,
              background: 'var(--primary)',
              border: '1px solid rgba(10,89,247,0.12)',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {resolvedConfirmText}
          </Button>
        </div>
      </Modal>
  )
}

export default VoicePromptModal
