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
    <>
      <style>{`\
        .voice-prompt-modal-root .ant-modal-content {\
          border-radius: 22px;\
          overflow: hidden;\
          background: #fff;\
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);\
          transform-origin: center center;\
          animation: voice-prompt-pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1);\
        }\
\
        .voice-prompt-modal-root .ant-modal-mask {\
          background: rgba(15, 23, 42, 0.42);\
          backdrop-filter: blur(3px);\
          animation: voice-prompt-mask-in 180ms cubic-bezier(0.22, 1, 0.36, 1);\
        }\
\
        @keyframes voice-prompt-pop-in {\
          from {\
            opacity: 0;\
            transform: translateY(12px) scale(0.98);\
          }\
          to {\
            opacity: 1;\
            transform: translateY(0) scale(1);\
          }\
        }\
\
        @keyframes voice-prompt-mask-in {\
          from { opacity: 0; }\
          to { opacity: 1; }\
        }\
      `}</style>

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
          },
          mask: {
            background: 'rgba(15, 23, 42, 0.42)',
            backdropFilter: 'blur(3px)',
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
                    border: selected ? '2px solid rgba(2,86,210,0.65)' : '1px solid rgba(226,232,240,0.95)',
                    background: selected ? 'rgba(2,86,210,0.08)' : '#fff',
                    color: selected ? 'var(--primary)' : '#111827',
                    fontSize: 17,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: selected ? '0 10px 24px rgba(2,86,210,0.10)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 0,
                    transition: 'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
                  }}
                >
                  <div>{option.label}</div>
                </button>
              )
            })}
          </div>

          <div style={{ borderRadius: 16, background: 'rgba(248,250,252,0.96)', padding: '14px 16px 12px', marginBottom: 14 }}>
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
              background: 'linear-gradient(135deg, #0057d7 0%, #1f4fff 100%)',
              border: 'none',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: '0 12px 22px rgba(2,86,210,0.20)',
            }}
          >
            {resolvedConfirmText}
          </Button>
        </div>
      </Modal>
    </>
  )
}

export default VoicePromptModal
