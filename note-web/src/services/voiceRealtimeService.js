import request from '@/utils/request'
import { getAppConfig } from '@/utils/config'

function extractPayload(response) {
  if (response && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data
  }

  return response
}

function getApiBaseUrl() {
  const config = getAppConfig()
  return config.api?.baseUrl || window.location.origin
}

function toWebSocketBase(baseUrl) {
  const url = new URL(baseUrl, window.location.origin)
  if (url.protocol === 'https:') {
    url.protocol = 'wss:'
  } else if (url.protocol === 'http:') {
    url.protocol = 'ws:'
  }

  return url
}

function buildVoiceRealtimeWsUrl({
  websocketPath = '/v1/note/voice-realtime/ws',
  sessionId,
  appId,
  userId,
  token,
  mimeType = 'audio/webm',
}) {
  const baseUrl = getApiBaseUrl()
  const resolvedPath = String(websocketPath || '/v1/note/voice-realtime/ws')
  const url = resolvedPath.startsWith('ws://') || resolvedPath.startsWith('wss://')
    ? new URL(resolvedPath)
    : new URL(resolvedPath, toWebSocketBase(baseUrl))

  if (sessionId) {
    url.searchParams.set('sessionId', sessionId)
  }

  if (appId) {
    url.searchParams.set('appId', appId)
  }

  if (userId) {
    url.searchParams.set('userId', userId)
  }

  if (token) {
    url.searchParams.set('token', token)
  }

  if (mimeType) {
    url.searchParams.set('mimeType', mimeType)
  }

  return url.toString()
}

async function createVoiceRealtimeSession(noteId, language) {
  const response = await request.post('/voice-realtime/sessions', {
    noteId,
    language,
  })

  return extractPayload(response)
}

async function getVoiceRealtimeSession(sessionId) {
  const response = await request.get(`/voice-realtime/sessions/${sessionId}`)
  return extractPayload(response)
}

async function pauseVoiceRealtimeSession(sessionId) {
  const response = await request.post(`/voice-realtime/sessions/${sessionId}/pause`)
  return extractPayload(response)
}

async function resumeVoiceRealtimeSession(sessionId) {
  const response = await request.post(`/voice-realtime/sessions/${sessionId}/resume`)
  return extractPayload(response)
}

async function finishVoiceRealtimeSession(sessionId) {
  const response = await request.post(`/voice-realtime/sessions/${sessionId}/finish`)
  return extractPayload(response)
}

function createVoiceRealtimeSocket(params) {
  if (typeof WebSocket === 'undefined') {
    throw new Error('当前浏览器不支持 WebSocket')
  }

  const url = buildVoiceRealtimeWsUrl(params)
  return new WebSocket(url)
}

export default {
  buildVoiceRealtimeWsUrl,
  createVoiceRealtimeSession,
  createVoiceRealtimeSocket,
  finishVoiceRealtimeSession,
  getVoiceRealtimeSession,
  pauseVoiceRealtimeSession,
  resumeVoiceRealtimeSession,
}
