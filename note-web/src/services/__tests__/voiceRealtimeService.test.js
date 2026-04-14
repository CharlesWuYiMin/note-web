import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  default: {
    post: mockPost,
    get: mockGet,
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

  it('loads and updates realtime sessions through HTTP endpoints', async () => {
    mockGet.mockResolvedValue({ sessionId: 'session-1' })
    mockPost.mockResolvedValue({ ok: true })

    await expect(voiceRealtimeService.getVoiceRealtimeSession('session-1')).resolves.toEqual({ sessionId: 'session-1' })
    await expect(voiceRealtimeService.pauseVoiceRealtimeSession('session-1')).resolves.toEqual({ ok: true })
    await expect(voiceRealtimeService.resumeVoiceRealtimeSession('session-1')).resolves.toEqual({ ok: true })
    await expect(voiceRealtimeService.finishVoiceRealtimeSession('session-1')).resolves.toEqual({ ok: true })

    expect(mockGet).toHaveBeenCalledWith('/voice-realtime/sessions/session-1')
    expect(mockPost).toHaveBeenNthCalledWith(1, '/voice-realtime/sessions/session-1/pause')
    expect(mockPost).toHaveBeenNthCalledWith(2, '/voice-realtime/sessions/session-1/resume')
    expect(mockPost).toHaveBeenNthCalledWith(3, '/voice-realtime/sessions/session-1/finish')
  })
})
