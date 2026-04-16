import { getAppConfig } from '@/utils/config'

import { handleUnauthorizedResponse } from '@/utils/authNavigation'

function extractPayload(response) {
  return response && Object.prototype.hasOwnProperty.call(response, 'data')
    ? response.data
    : response
}

function normalizeChatResponse(response) {
  const payload = extractPayload(response)

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return {
      ...payload,
      reply: payload.reply ?? payload.result ?? '',
    }
  }

  if (typeof payload === 'string') {
    return {
      result: payload,
      reply: payload,
    }
  }

  return payload
}

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return null
}

function getRequestLanguageHeader() {
  const currentLanguage = localStorage.getItem('language') || document?.documentElement?.lang || 'zh-CN'

  if (currentLanguage === 'en-US') {
    return 'en_US'
  }

  return 'zh_CN'
}

function buildApiHeaders({ accept = 'application/json', includeJsonContentType = false } = {}) {
  const headers = {
    Accept: accept,
    'X-LANGUAGE': getRequestLanguageHeader(),
  }

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getCookie('cloud_doc_token')
  const userId = getCookie('cloud_doc_userid')
  const appId = getCookie('cloud_doc_appid')

  if (token && userId && appId) {
    headers.token = token
    headers.userId = userId
    headers.appId = appId
  }

  return headers
}

async function readErrorMessage(response) {
  const rawText = await response.text()
  if (!rawText) {
    return `AI request failed (${response.status})`
  }

  try {
    const parsed = JSON.parse(rawText)
    return parsed?.message || parsed?.error || rawText
  } catch {
    return rawText
  }
}

function ensureAuthorizedResponse(response) {
  if (response.status === 401) {
    handleUnauthorizedResponse()
    throw new Error('登录已失效，请重新登录')
  }
}

function parseSseBlock(block) {
  const lines = block.split(/\r?\n/)
  let event = 'message'
  const dataLines = []

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      return
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  })

  const rawData = dataLines.join('\n')
  if (!rawData) {
    return null
  }

  try {
    return {
      event,
      data: JSON.parse(rawData),
    }
  } catch {
    return {
      event,
      data: rawData,
    }
  }
}

async function consumeSseStream(response, handlers = {}) {
  if (!response.body) {
    throw new Error('AI streaming response is unavailable')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let collectedText = ''
  let finalPayload = null

  const flushBlock = (rawBlock) => {
    const eventBlock = parseSseBlock(rawBlock)
    if (!eventBlock) {
      return
    }

    const { event, data } = eventBlock

    if (event === 'delta') {
      const deltaText = typeof data === 'string' ? data : data?.text || ''
      if (deltaText) {
        collectedText += deltaText
        handlers.onDelta?.(deltaText, data)
      }
      return
    }

    if (event === 'done') {
      finalPayload = data
      handlers.onDone?.(data)
      return
    }

    if (event === 'error') {
      const errorMessage = typeof data === 'string' ? data : data?.message || 'AI streaming request failed'
      handlers.onError?.(errorMessage, data)
      throw new Error(errorMessage)
    }

    handlers.onEvent?.(event, data)
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex).trim()
      buffer = buffer.slice(separatorIndex + 2)
      if (block) {
        flushBlock(block)
      }
      separatorIndex = buffer.indexOf('\n\n')
    }

    if (done) {
      break
    }
  }

  if (buffer.trim()) {
    flushBlock(buffer.trim())
  }

  if (!finalPayload && collectedText) {
    return normalizeChatResponse({
      result: collectedText,
      reply: collectedText,
    })
  }

  return normalizeChatResponse(finalPayload)
}

async function streamAiChat(params, options = {}) {
  const { onDelta, onDone, onError, onEvent, signal } = options
  const { api } = getAppConfig()
  const response = await fetch(`${api.baseUrl}/ai/chat`, {
    method: 'POST',
    headers: buildApiHeaders({
      accept: 'text/event-stream',
      includeJsonContentType: true,
    }),
    credentials: 'include',
    body: JSON.stringify(params),
    signal,
  })
  ensureAuthorizedResponse(response)

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return consumeSseStream(response, {
    onDelta,
    onDone,
    onError,
    onEvent,
  })
}

async function getAiConversation(noteId, options = {}) {
  const { signal } = options
  const { api } = getAppConfig()
  const response = await fetch(`${api.baseUrl}/ai/conversations/${encodeURIComponent(noteId)}`, {
    method: 'GET',
    headers: buildApiHeaders(),
    credentials: 'include',
    signal,
  })
  ensureAuthorizedResponse(response)

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = await response.json()
  return extractPayload(payload)
}

function buildAiChatRequest(noteId, scene, userPrompt) {
  return {
    noteId,
    scene,
    user_prompt: userPrompt,
  }
}

const aiService = {
  chat: streamAiChat,

  streamChat: streamAiChat,

  getConversation: getAiConversation,

  runScene: (noteId, scene, userPrompt, options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, scene, userPrompt), options)
  ),

  streamScene: (noteId, scene, userPrompt, options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, scene, userPrompt), options)
  ),

  summarize: (noteId, userPrompt = 'Summarize the key points of this note.', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'summarize', userPrompt), options)
  ),

  rewrite: (noteId, userPrompt = 'Rewrite and polish this note in a more professional tone.', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'rewrite', userPrompt), options)
  ),

  expand: (noteId, userPrompt = 'Expand this note with more details and context.', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'expand', userPrompt), options)
  ),

  extraction: (noteId, userPrompt = 'Extract the main viewpoints from this voice note.', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'extraction', userPrompt), options)
  ),

  continueWriting: (noteId, userPrompt = 'Expand this note with more details and context.', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'expand', userPrompt), options)
  ),

  polish: (noteId, userPrompt = 'Rewrite and polish this note in a more professional tone.', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'rewrite', userPrompt), options)
  ),

  translate: (noteId, _content, targetLanguage = 'English', options = {}) => (
    streamAiChat(buildAiChatRequest(noteId, 'rewrite', `Translate the current note into ${targetLanguage}.`), options)
  ),
}

export default aiService

