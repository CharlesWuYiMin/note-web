﻿import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Space } from 'antd'
import UxIcon from '@/components/common/UxIcon'
import useNoteStore from '@/store/useNoteStore'

const { TextArea } = Input

function SendGlyph({ size = 16, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 11.6L19.6 4.8c.8-.4 1.5.4 1.2 1.2L15 21.2c-.3.8-1.4 1-2 .3l-3.9-4.9-4.6-4.6c-.6-.6-.4-1.6.5-2z"
        fill={color}
      />
      <path
        d="M10.6 12.1L19.2 5"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AIPanel({ onClose }) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const currentDocumentTitle = useNoteStore((state) => state.currentNote?.title?.trim() || '')

  const features = [
    {
      key: 'summarize',
      icon: 'summarize',
      title: '文章摘要',
      desc: '提取核心观点与结论',
      color: '#0061A4',
      bgColor: '#eef5ff',
    },
    {
      key: 'rewrite',
      icon: 'editNote',
      title: '文案润色',
      desc: '优化措辞使表达更专业',
      color: '#8b5cf6',
      bgColor: '#f5efff',
    },
    {
      key: 'expand',
      icon: 'unfoldMore',
      title: '内容扩写',
      desc: '基于现有内容丰富细节',
      color: '#ea580c',
      bgColor: '#fff4ea',
    },
  ]

  return (
    <section
      id="ai-panel"
      style={{
        width: 340,
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        flexShrink: 0,
        position: 'relative',
        boxShadow: 'none',
        overflow: 'hidden',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px 0 22px',
          flexShrink: 0,
          background: 'transparent',
        }}
      >
        <Space size={8}>
          <UxIcon name="sparkle" size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', letterSpacing: '0.2px' }}>
            {t('ai.title', { defaultValue: 'AI 助手' })}
          </span>
        </Space>
        {onClose && (
          <Button
            type="text"
            icon={<UxIcon name="close" size={18} color="rgba(71,85,105,0.82)" />}
            onClick={onClose}
            size="small"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(71,85,105,0.82)',
            }}
          />
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 18px 14px',
          gap: 14,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '18px 12px 8px',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at 30% 30%, rgba(125,93,255,0.22), rgba(2,86,210,0.10) 70%)',
                marginBottom: 14,
              }}
            >
              <UxIcon name="sparkle" size={26} color="var(--primary)" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '0.2px', lineHeight: 1.2 }}>
              {t('aiAssistant.title', { defaultValue: 'AI 创作助手' })}
            </div>
            <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: '#334155', lineHeight: 1.5 }}>
              让灵感自然流淌，创意自由生长
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              一键生成、润色、总结，让写作更轻松
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
            {features.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => console.log('AI:', f.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(226,232,240,0.86)',
                  borderRadius: 18,
                  boxShadow: '0 10px 24px rgba(16,34,58,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: f.bgColor,
                      color: f.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <UxIcon name={f.icon} size={18} color={f.color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(2,86,210,0.08)',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  AI 导航
                </div>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            marginTop: 'auto',
            paddingTop: 6,
            paddingBottom: 2,
          }}
        >
          <div
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.88)',
              border: '1.5px solid rgba(68,119,255,0.34)',
              borderRadius: 24,
              boxShadow: '0 10px 26px rgba(16,34,58,0.06)',
              padding: '14px 14px 12px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 17,
                  height: 17,
                  borderRadius: 6,
                  background: 'rgba(68,119,255,0.12)',
                  color: 'var(--primary)',
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                B
              </span>
              <span>基于</span>
              <span
                style={{
                  color: '#111827',
                  fontWeight: 700,
                  maxWidth: 185,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentDocumentTitle || t('aiAssistant.placeholder', { defaultValue: '当前文档' })}
              </span>
            </div>

            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入关于此文档的任何问题，例如：内容摘要总结"
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey && inputValue.trim()) {
                  e.preventDefault()
                  setInputValue('')
                }
              }}
              style={{
                width: '100%',
                padding: 0,
                background: 'transparent',
                border: 'none',
                borderRadius: 16,
                resize: 'none',
                minHeight: 44,
                boxShadow: 'none',
                fontSize: 14,
                lineHeight: 1.7,
                color: '#0f172a',
              }}
            />
            <Button
              type="primary"
              icon={<SendGlyph size={16} />}
              disabled={!inputValue.trim()}
              onClick={() => {
                if (inputValue.trim()) setInputValue('')
              }}
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                width: 38,
                height: 38,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #0061a4 0%, #2f79ff 100%)',
                border: 'none',
                boxShadow: '0 10px 20px rgba(0,97,164,0.22)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AIPanel
