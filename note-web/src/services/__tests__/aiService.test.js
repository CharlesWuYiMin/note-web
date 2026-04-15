import { describe, it, expect, vi, beforeEach } from 'vitest'
import aiService from '@/services/aiService'

const mockPost = vi.fn()

vi.mock('@/utils/request', () => ({
  default: {
    post: mockPost,
  },
}))

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chat', () => {
    it('should call POST /ai/chat with message and context', async () => {
      const mockResponse = {
        reply: '这是AI的回复',
        usage: { tokens: 150 },
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await aiService.chat({
        message: '请帮我总结这段文字',
        noteId: 'note-123',
        content: '要总结的内容...',
      })

      expect(mockPost).toHaveBeenCalledWith('/ai/chat', {
        message: '请帮我总结这段文字',
        noteId: 'note-123',
        content: '要总结的内容...',
      })
      expect(result.reply).toBe('这是AI的回复')
    })

    it('should handle streaming response', async () => {
      const mockStreamResponse = {
        stream: true,
        chunks: ['这是', 'AI', '的回复'],
      }
      mockPost.mockResolvedValue(mockStreamResponse)

      const result = await aiService.chat({ message: '测试' }, { stream: true })

      expect(result.stream).toBe(true)
    })
  })

  describe('summarize', () => {
    it('should call AI chat with summarize prompt', async () => {
      mockPost.mockResolvedValue({ reply: '摘要内容' })

      const result = await aiService.summarize('note-123', '长文本内容...')

      expect(mockPost).toHaveBeenCalledWith('/ai/chat', {
        message: expect.stringContaining('summarize'),
        noteId: 'note-123',
        content: '长文本内容...',
      })
      expect(result.reply).toBe('摘要内容')
    })
  })

  describe('translate', () => {
    it('should call AI chat with translate prompt and target language', async () => {
      mockPost.mockResolvedValue({ reply: 'Translated text' })

      const result = await aiService.translate('note-123', 'Hello world', 'zh')

      expect(mockPost).toHaveBeenCalledWith('/ai/chat', {
        message: expect.stringContaining('translate'),
        targetLanguage: 'zh',
        noteId: 'note-123',
        content: 'Hello world',
      })
    })
  })
})
