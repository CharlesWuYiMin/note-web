import React, { useState } from 'react'
import { Input, Button, Card, Space, Typography, Spin, message } from 'antd'
import {
  RobotOutlined,
  SendOutlined, 
  CloseOutlined,
  BulbOutlined,
  TranslationOutlined,
  EditOutlined,
  HighlightOutlined,
} from '@ant-design/icons'
import aiService from '@/services/aiService'

const { Text, Paragraph } = Typography

const AIPanel = ({ noteId, content, visible, onClose }) => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async (customMessage = null) => {
    const messageText = customMessage || inputValue
    
    if (!messageText.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: messageText }])
    setInputValue('')
    setLoading(true)

    try {
      let response
      
      if (customMessage?.startsWith('[AI_ACTION]:')) {
        const action = customMessage.replace('[AI_ACTION]:', '').trim()
        
        switch (action) {
          case 'summarize':
            response = await aiService.summarize(noteId, content)
            break
          case 'translate':
            response = await aiService.translate(noteId, content)
            break
          case 'continue':
            response = await aiService.continueWriting(noteId, content)
            break
          case 'polish':
            response = await aiService.polish(noteId, content)
            break
          default:
            response = await aiService.chat({ message: action, noteId, content })
        }
      } else {
        response = await aiService.chat({ message: messageText, noteId, content })
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.reply || response },
      ])
    } catch (error) {
      console.error('AI request failed:', error)
      message.error('AI 服务暂时不可用')
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '抱歉，服务暂时不可用，请稍后重试。' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!visible) return null

  return (
    <div
      className="ai-panel"
      style={{
        width: 380,
        height: '100%',
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(172,179,183,0.15)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0 16px 16px 0',
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(172,179,183,0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Space>
          <RobotOutlined style={{ fontSize: 22, color: '#0256d2' }} />
          <Text strong style={{ fontSize: 17 }}>AI 助手</Text>
        </Space>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ color: '#5f6368' }}
        />
      </div>

      <div style={{
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        borderBottom: '1px solid rgba(172,179,183,0.15)',
      }}>
        <Card
          size="small"
          hoverable
          onClick={() => handleSendMessage('[AI_ACTION]: summarize')}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 10,
            background: 'rgba(2,86,210,0.04)',
            border: 'none',
          }}
        >
          <BulbOutlined style={{ color: '#0256d2', fontSize: 18 }} />
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500 }}>
            总结
          </div>
        </Card>
        
        <Card
          size="small"
          hoverable
          onClick={() => handleSendMessage('[AI_ACTION]: translate')}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 10,
            background: 'rgba(2,86,210,0.04)',
            border: 'none',
          }}
        >
          <TranslationOutlined style={{ color: '#0256d2', fontSize: 18 }} />
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500 }}>
            翻译
          </div>
        </Card>
        
        <Card
          size="small"
          hoverable
          onClick={() => handleSendMessage('[AI_ACTION]: continue')}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 10,
            background: 'rgba(2,86,210,0.04)',
            border: 'none',
          }}
        >
          <EditOutlined style={{ color: '#0256d2', fontSize: 18 }} />
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500 }}>
            续写
          </div>
        </Card>
        
        <Card
          size="small"
          hoverable
          onClick={() => handleSendMessage('[AI_ACTION]: polish')}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 10,
            background: 'rgba(2,86,210,0.04)',
            border: 'none',
          }}
        >
          <HighlightOutlined style={{ color: '#0256d2', fontSize: 18 }} />
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500 }}>
            润色
          </div>
        </Card>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bfbfbf',
            gap: 8,
          }}>
            <RobotOutlined style={{ fontSize: 48 }} />
            <Text type="secondary">有什么可以帮您的？</Text>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#0256d2' : 'rgba(247,249,251,0.95)',
              color: msg.role === 'user' ? '#fff' : '#2c3437',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <Spin size="small" tip="思考中..." />
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(172,179,183,0.15)',
        display: 'flex',
        gap: 8,
      }}>
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="向 AI 提问..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{
            borderRadius: 20,
            resize: 'none',
            fontSize: 14,
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => handleSendMessage()}
          loading={loading}
          shape="circle"
          style={{
            height: 36,
            width: 36,
            background: 'linear-gradient(135deg, #0256d2, #4880fd)',
            border: 'none',
            alignSelf: 'flex-end',
          }}
        />
      </div>
    </div>
  )
}

export default AIPanel
