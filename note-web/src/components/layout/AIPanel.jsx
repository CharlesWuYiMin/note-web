﻿import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useRef } from 'react'
import { Button, Input, Space, message } from 'antd'
import UxIcon from '@/components/common/UxIcon'
import aiService from '@/services/aiService'
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

function MessageBubble({ item, sceneConfigMap }) {
  const isUser = item.role === 'user'
  const sceneLabel = item.scene ? sceneConfigMap[item.scene]?.sceneLabel : item.sceneLabel

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '88%',
          padding: '12px 14px',
          borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
          background: isUser
            ? 'linear-gradient(135deg, #0061a4 0%, #2f79ff 100%)'
            : 'rgba(255,255,255,0.95)',
          border: isUser ? 'none' : '1px solid rgba(226,232,240,0.86)',
          boxShadow: isUser
            ? '0 12px 24px rgba(0,97,164,0.18)'
            : '0 10px 24px rgba(16,34,58,0.05)',
          color: isUser ? '#ffffff' : '#0f172a',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {sceneLabel ? (
          <div
            style={{
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 700,
              color: isUser ? 'rgba(255,255,255,0.82)' : '#64748b',
            }}
          >
            {sceneLabel}
          </div>
        ) : null}
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          {item.content || (item.streaming ? item.pendingLabel || '' : '')}
          {item.streaming ? <span style={{ marginLeft: 2, opacity: 0.8 }}>|</span> : null}
        </div>
      </div>
    </div>
  )
}

function parseConversationMeta(extra) {
  if (!extra || typeof extra !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(extra)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function AIPanel({ onClose, requestedScene = null, requestNonce = 0, autoSendRequested = false, width = 340 }) {
  const { t, i18n } = useTranslation()
  const currentNote = useNoteStore((state) => state.currentNote)
  const currentNoteId = currentNote?.id || currentNote?.noteId || ''
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState([])
  const [activeScene, setActiveScene] = useState('summarize')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRestoringConversation, setIsRestoringConversation] = useState(false)
  const messageListRef = useRef(null)
  const abortRef = useRef(null)
  const currentDocumentTitle = currentNote?.title?.trim() || ''

  const sceneConfigMap = useMemo(() => ({
    extraction: {
      key: 'extraction',
      icon: 'voice',
      title: t('ai.scene.extraction.title', { defaultValue: '观点提取' }),
      desc: t('ai.scene.extraction.description', { defaultValue: '提炼关键观点与待办事项' }),
      color: '#0f766e',
      bgColor: '#e6fffb',
      defaultPrompt: t('ai.scene.extraction.defaultPrompt', { defaultValue: '请基于当前语音笔记提取关键观点、结论和待跟进事项。' }),
      sceneLabel: t('ai.scene.extraction.label', { defaultValue: '观点提取' }),
    },
    summarize: {
      key: 'summarize',
      icon: 'summarize',
      title: t('ai.scene.summarize.title', { defaultValue: '文章摘要' }),
      desc: t('ai.scene.summarize.description', { defaultValue: '提取核心观点与结论' }),
      color: '#0061A4',
      bgColor: '#eef5ff',
      defaultPrompt: t('ai.scene.summarize.defaultPrompt', { defaultValue: '请总结这篇笔记的核心观点和结论。' }),
      sceneLabel: t('ai.scene.summarize.label', { defaultValue: '摘要' }),
    },
    rewrite: {
      key: 'rewrite',
      icon: 'editNote',
      title: t('ai.scene.rewrite.title', { defaultValue: '文案润色' }),
      desc: t('ai.scene.rewrite.description', { defaultValue: '优化措辞使表达更专业' }),
      color: '#8b5cf6',
      bgColor: '#f5efff',
      defaultPrompt: t('ai.scene.rewrite.defaultPrompt', { defaultValue: '请润色这篇笔记，使表达更专业自然。' }),
      sceneLabel: t('ai.scene.rewrite.label', { defaultValue: '润色' }),
    },
    expand: {
      key: 'expand',
      icon: 'unfoldMore',
      title: t('ai.scene.expand.title', { defaultValue: '内容扩写' }),
      desc: t('ai.scene.expand.description', { defaultValue: '基于现有内容丰富细节' }),
      color: '#ea580c',
      bgColor: '#fff4ea',
      defaultPrompt: t('ai.scene.expand.defaultPrompt', { defaultValue: '请基于当前笔记继续扩写，补充更多细节。' }),
      sceneLabel: t('ai.scene.expand.label', { defaultValue: '扩写' }),
    },
  }), [i18n.language, t])

  const features = useMemo(
    () => ['summarize', 'rewrite', 'expand'].map((key) => sceneConfigMap[key]).filter(Boolean),
    [sceneConfigMap]
  )

  const defaultFeature = features[0] || sceneConfigMap.summarize
  const activeFeature = sceneConfigMap[activeScene] || defaultFeature

  useEffect(() => {
    const container = messageListRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [messages])

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (sceneConfigMap[activeScene]) {
      return
    }

    setActiveScene(defaultFeature.key)
  }, [activeScene, defaultFeature.key, sceneConfigMap])

  useEffect(() => {
    abortRef.current?.abort()
    setIsStreaming(false)

    if (!currentNoteId) {
      setMessages([])
      setIsRestoringConversation(false)
      setActiveScene(defaultFeature.key)
      return undefined
    }

    const controller = new AbortController()
    let cancelled = false

    setIsRestoringConversation(true)
    aiService.getConversation(currentNoteId, { signal: controller.signal })
      .then((conversation) => {
        if (cancelled) {
          return
        }

        const restoredMessages = Array.isArray(conversation?.messages)
          ? conversation.messages
            .filter((item) => item?.role === 'user' || item?.role === 'assistant')
            .map((item, index) => {
              const meta = parseConversationMeta(item.extra)
              const scene = sceneConfigMap[meta?.scene] ? meta.scene : null
              const feature = scene ? sceneConfigMap[scene] : null

              return {
                id: item.messageId || `restored-${index}`,
                role: item.role === 'assistant' ? 'assistant' : 'user',
                content: item.content || '',
                scene: scene || undefined,
                sceneLabel: feature?.sceneLabel,
                conversationId: conversation?.conversationId || null,
                streaming: false,
              }
            })
          : []

        setMessages(restoredMessages)

        const restoredScene = [...restoredMessages].reverse().find((item) => item.scene)?.scene
        setActiveScene(restoredScene && sceneConfigMap[restoredScene] ? restoredScene : defaultFeature.key)
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) {
          return
        }

        if (/conversation not found/i.test(error?.message || '')) {
          setMessages([])
          setActiveScene(defaultFeature.key)
          return
        }

        setMessages([])
        setActiveScene(defaultFeature.key)
        message.error(error?.message || t('ai.error.loadConversation', { defaultValue: '加载 AI 会话失败' }))
      })
      .finally(() => {
        if (!cancelled) {
          setIsRestoringConversation(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [currentNoteId, defaultFeature.key, sceneConfigMap])

  const updateAssistantMessage = (assistantId, updater) => {
    setMessages((current) => current.map((item) => (
      item.id === assistantId
        ? {
            ...item,
            ...updater(item),
          }
        : item
    )))
  }

  const sendAiMessage = async (scene, rawPrompt) => {
    const userPrompt = String(rawPrompt || '').trim()

    if (!currentNoteId) {
      message.warning(t('ai.error.openNoteFirst', { defaultValue: '请先打开一篇笔记后再使用 AI 助手' }))
      return
    }

    if (!userPrompt) {
      message.warning(t('ai.error.promptRequired', { defaultValue: '请输入 AI 要求' }))
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const feature = sceneConfigMap[scene] || activeFeature
    const timestamp = Date.now()
    const assistantId = `assistant-${timestamp}`

    setActiveScene(scene)
    setIsStreaming(true)
    setInputValue('')
    setMessages((current) => [
      ...current,
      {
        id: `user-${timestamp}`,
        role: 'user',
        content: userPrompt,
        scene,
        sceneLabel: feature.sceneLabel,
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        scene,
        sceneLabel: feature.sceneLabel,
        pendingLabel: t('ai.generating', { defaultValue: '正在生成...' }),
        streaming: true,
      },
    ])

    try {
      const response = await aiService.streamChat({
        noteId: currentNoteId,
        scene,
        user_prompt: userPrompt,
      }, {
        signal: controller.signal,
        onDelta: (deltaText) => {
          updateAssistantMessage(assistantId, (item) => ({
            content: `${item.content || ''}${deltaText}`,
            streaming: true,
          }))
        },
        onDone: (payload) => {
          updateAssistantMessage(assistantId, (item) => ({
            content: payload?.result || item.content || '',
            conversationId: payload?.conversationId || null,
            streaming: false,
          }))
        },
      })

      if (response?.result) {
        updateAssistantMessage(assistantId, () => ({
          content: response.result,
          conversationId: response.conversationId || null,
          streaming: false,
        }))
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }

      const errorMessage = error?.message || t('ai.error.requestFailed', { defaultValue: 'AI 请求失败，请稍后重试' })
      updateAssistantMessage(assistantId, (item) => ({
        content: item.content || errorMessage,
        streaming: false,
        error: true,
      }))
      message.error(errorMessage)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setIsStreaming(false)
    }
  }

  const handleSend = () => {
    void sendAiMessage(activeScene, inputValue)
  }

  const handleFeatureClick = (feature) => {
    const prompt = inputValue.trim() || feature.defaultPrompt
    void sendAiMessage(feature.key, prompt)
  }

  useEffect(() => {
    if (!requestNonce || !requestedScene) {
      return
    }

    const feature = sceneConfigMap[requestedScene]
    if (!feature) {
      return
    }

    setActiveScene(requestedScene)
    if (autoSendRequested && currentNoteId) {
      void sendAiMessage(requestedScene, feature.defaultPrompt)
    }
  }, [autoSendRequested, currentNoteId, requestNonce, requestedScene, sceneConfigMap])

  return (
    <section
      id="ai-panel"
      style={{
        width,
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
          ref={messageListRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingRight: 2,
          }}
        >
          {messages.length === 0 ? (
            <>
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
                  {t('ai.slogan', { defaultValue: '让灵感自然流淌，创意自由生长' })}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  {t('ai.subSlogan', { defaultValue: '一键生成、润色、总结，让写作更轻松' })}
                </div>
                {isRestoringConversation ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>
                    {t('ai.restoringConversation', { defaultValue: '正在恢复历史会话...' })}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
                {features.map((feature) => {
                  const isActive = activeScene === feature.key

                  return (
                    <button
                      key={feature.key}
                      type="button"
                      onClick={() => handleFeatureClick(feature)}
                      disabled={isStreaming}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.92)',
                        border: isActive ? '1.5px solid rgba(47,121,255,0.45)' : '1px solid rgba(226,232,240,0.86)',
                        borderRadius: 18,
                        boxShadow: isActive ? '0 12px 26px rgba(47,121,255,0.10)' : '0 10px 24px rgba(16,34,58,0.05)',
                        cursor: isStreaming ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: isStreaming ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: feature.bgColor,
                            color: feature.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            flexShrink: 0,
                          }}
                        >
                          <UxIcon name={feature.icon} size={18} color={feature.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{feature.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{feature.desc}</div>
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
                        {t('ai.guide', { defaultValue: 'AI 导航' })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, padding: '0 4px' }}>
                {features.map((feature) => (
                  <button
                    key={feature.key}
                    type="button"
                    onClick={() => handleFeatureClick(feature)}
                    disabled={isStreaming}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 999,
                      border: activeScene === feature.key ? '1px solid rgba(47,121,255,0.35)' : '1px solid rgba(226,232,240,0.9)',
                      background: activeScene === feature.key ? 'rgba(232,241,255,0.96)' : 'rgba(255,255,255,0.9)',
                      color: activeScene === feature.key ? 'var(--primary)' : '#475569',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isStreaming ? 'not-allowed' : 'pointer',
                      opacity: isStreaming ? 0.7 : 1,
                    }}
                  >
                    {feature.sceneLabel}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '2px 4px 0' }}>
                {messages.map((item) => (
                  <MessageBubble key={item.id} item={item} sceneConfigMap={sceneConfigMap} />
                ))}
              </div>
            </>
          )}
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
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 10,
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
                <span>{t('ai.basedOn', { defaultValue: '基于' })}</span>
                <span
                  style={{
                    color: '#111827',
                    fontWeight: 700,
                    maxWidth: 145,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentDocumentTitle || t('aiAssistant.placeholder', { defaultValue: '当前文档' })}
                </span>
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(2,86,210,0.08)',
                  color: 'var(--primary)',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {activeFeature.sceneLabel}
              </div>
            </div>

            <TextArea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={t('ai.inputPlaceholder', {
                defaultValue: `输入要求后发送，当前模式：${activeFeature.title}`,
                mode: activeFeature.title,
              })}
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(event) => {
                if (!event.shiftKey && inputValue.trim() && !isStreaming) {
                  event.preventDefault()
                  handleSend()
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
              disabled={!inputValue.trim() || !currentNoteId}
              loading={isStreaming}
              onClick={handleSend}
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
