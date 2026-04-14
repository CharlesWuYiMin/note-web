import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  default: {
    post: mockPost,
  },
}))

vi.mock('@/utils/config', () => ({
  getAppConfig: () => ({
    api: {
      baseUrl: 'https://api.example.com',
    },
  }),
}))

import voiceRealtimeService from '@/services/voiceRealtimeService'

describe('voiceRealtimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates realtime session with note id and normalized language', async () => {
    mockPost.mockResolvedValue({
      sessionId: 'session-1',
      websocketPath: '/v1/note/voice-realtime/ws',
      segmentSilenceMs: 1500,
    })

    const result = await voiceRealtimeService.createVoiceRealtimeSession('note-1', 'zh_CN')

    expect(mockPost).toHaveBeenCalledWith('/voice-realtime/sessions', {
      noteId: 'note-1',
      language: 'zh_CN',
    })
    expect(result).toEqual({
      sessionId: 'session-1',
      websocketPath: '/v1/note/voice-realtime/ws',
      segmentSilenceMs: 1500,
    })
  })

  it('builds websocket url with auth params', () => {
    const url = voiceRealtimeService.buildVoiceRealtimeWsUrl({
      websocketPath: '/v1/note/voice-realtime/ws',
      sessionId: 'session-1',
      appId: 'app-1',
      userId: 'user-1',
      token: 'token-1',
      mimeType: 'audio/webm',
    })

    const parsed = new URL(url)

    expect(parsed.protocol).toBe('wss:')
    expect(parsed.host).toBe('api.example.com')
    expect(parsed.pathname).toBe('/v1/note/voice-realtime/ws')
    expect(parsed.searchParams.get('sessionId')).toBe('session-1')
    expect(parsed.searchParams.get('appId')).toBe('app-1')
    expect(parsed.searchParams.get('userId')).toBe('user-1')
    expect(parsed.searchParams.get('token')).toBe('token-1')
    expect(parsed.searchParams.get('mimeType')).toBe('audio/webm')
  })
})
