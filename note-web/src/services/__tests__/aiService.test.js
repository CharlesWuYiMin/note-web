import { beforeEach, describe, expect, it, vi } from 'vitest'
import aiService from '@/services/aiService'

vi.mock('@/utils/config', () => ({
  getAppConfig: () => ({
    api: {
      baseUrl: '/v1/note',
    },
  }),
}))

const handleUnauthorizedResponse = vi.fn()

vi.mock('@/utils/authNavigation', () => ({
  handleUnauthorizedResponse,
}))

describe('AIService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('chat', () => {
    it('uses the streaming endpoint with AiChatRequest payload', async () => {
      const chunks = [
        new TextEncoder().encode('event: start\ndata: {"status":"streaming"}\n\n'),
        new TextEncoder().encode('event: delta\ndata: {"text":"这是 AI 的回答"}\n\n'),
        new TextEncoder().encode('event: done\ndata: {"result":"这是 AI 的回答","conversationId":"conversation-1"}\n\n'),
      ]
      const read = vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ value: chunks[2], done: false })
        .mockResolvedValueOnce({ value: undefined, done: true })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({ read }),
        },
      })

      const result = await aiService.chat({
        noteId: 'note-123',
        scene: 'summarize',
        user_prompt: '请帮我总结',
      })

      expect(global.fetch).toHaveBeenCalledWith('/v1/note/ai/chat', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          noteId: 'note-123',
          scene: 'summarize',
          user_prompt: '请帮我总结',
        }),
      }))
      expect(result.reply).toBe('这是 AI 的回答')
      expect(result.result).toBe('这是 AI 的回答')
    })
  })

  describe('summarize', () => {
    it('sends summarize scene through the streaming endpoint', async () => {
      const chunks = [
        new TextEncoder().encode('event: delta\ndata: {"text":"摘要内容"}\n\n'),
        new TextEncoder().encode('event: done\ndata: {"result":"摘要内容"}\n\n'),
      ]
      const read = vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ value: undefined, done: true })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({ read }),
        },
      })

      const result = await aiService.summarize('note-123', '请总结重点')

      expect(global.fetch).toHaveBeenCalledWith('/v1/note/ai/chat', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          noteId: 'note-123',
          scene: 'summarize',
          user_prompt: '请总结重点',
        }),
      }))
      expect(result.reply).toBe('摘要内容')
    })
  })

  describe('streamChat', () => {
    it('parses SSE delta and done events', async () => {
      const chunks = [
        new TextEncoder().encode('event: delta\ndata: {"text":"这是"}\n\n'),
        new TextEncoder().encode('event: delta\ndata: {"text":"流式"}\n\n'),
        new TextEncoder().encode('event: done\ndata: {"result":"这是流式","conversationId":"conv-1"}\n\n'),
      ]
      const read = vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ value: chunks[2], done: false })
        .mockResolvedValueOnce({ value: undefined, done: true })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({ read }),
        },
      })

      const onDelta = vi.fn()
      const onDone = vi.fn()
      const result = await aiService.streamChat({
        noteId: 'note-123',
        scene: 'rewrite',
        user_prompt: '请润色',
      }, {
        onDelta,
        onDone,
      })

      expect(global.fetch).toHaveBeenCalledWith('/v1/note/ai/chat', expect.objectContaining({
        method: 'POST',
      }))
      expect(onDelta).toHaveBeenCalledTimes(2)
      expect(onDone).toHaveBeenCalledWith({
        result: '这是流式',
        conversationId: 'conv-1',
      })
      expect(result.reply).toBe('这是流式')
    })

    it('falls back to accumulated delta text when done event is missing', async () => {
      const chunks = [
        new TextEncoder().encode('event: delta\ndata: {"text":"片段一"}\n\n'),
        new TextEncoder().encode('event: delta\ndata: {"text":"片段二"}\n\n'),
      ]
      const read = vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ value: undefined, done: true })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({ read }),
        },
      })

      const result = await aiService.streamChat({
        noteId: 'note-123',
        scene: 'expand',
        user_prompt: '请扩写',
      })

      expect(result.result).toBe('片段一片段二')
      expect(result.reply).toBe('片段一片段二')
    })

    it('redirects user to login when streaming request returns 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      await expect(aiService.streamChat({
        noteId: 'note-123',
        scene: 'expand',
        user_prompt: '请扩写',
      })).rejects.toThrow('登录已失效，请重新登录')

      expect(handleUnauthorizedResponse).toHaveBeenCalledTimes(1)
    })
  })

  describe('getConversation', () => {
    it('loads ai conversation by note id', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            conversationId: 'conv-1',
            noteId: 'note-123',
            messages: [
              {
                messageId: 'msg-1',
                role: 'user',
                content: '请帮我总结',
              },
            ],
          },
        }),
      })

      const result = await aiService.getConversation('note-123')

      expect(global.fetch).toHaveBeenCalledWith('/v1/note/ai/conversations/note-123', expect.objectContaining({
        method: 'GET',
      }))
      expect(result.conversationId).toBe('conv-1')
      expect(result.noteId).toBe('note-123')
      expect(result.messages).toHaveLength(1)
    })

    it('redirects user to login when conversation request returns 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })

      await expect(aiService.getConversation('note-123')).rejects.toThrow('登录已失效，请重新登录')

      expect(handleUnauthorizedResponse).toHaveBeenCalledTimes(1)
    })
  })
})
