const DEFAULT_EMPTY_TITLE = '未命名笔记'
const RECENT_SEARCH_STORAGE_KEY = 'note-web:recent-searches'
const RECENT_SEARCH_LIMIT = 8

function stripHighlightMarkup(value) {
  if (value == null) {
    return ''
  }

  return String(value)
    .replace(/<\/?em>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickFirstText(...values) {
  for (const value of values) {
    const normalized = stripHighlightMarkup(value)
    if (normalized) {
      return normalized
    }
  }

  return ''
}

export function normalizeSearchItem(item = {}, fallbackStatus = 'active') {
  const itemId = item?.noteId || item?.id || item?.documentId || item?.document_id || ''
  const plainTitle = pickFirstText(item?.title) || DEFAULT_EMPTY_TITLE
  const highlightTitle = pickFirstText(item?.highlightTitle, item?.highlight_title)
  const previewText = pickFirstText(item?.context, item?.highlight, item?.content, item?.summary)

  return {
    ...item,
    id: itemId ? String(itemId) : '',
    noteId: item?.noteId || itemId || '',
    documentId: item?.documentId || item?.document_id || itemId || '',
    title: plainTitle,
    highlightTitle,
    context: previewText,
    previewText,
    updatedAt: item?.updatedAt || item?.updateDate || item?.update_date || item?.deletedAt || item?.createdAt || null,
    status: item?.status || fallbackStatus || 'active',
    voiceNumber: Number(item?.voiceNumber || item?.voiceCount || 0),
  }
}

export function splitHighlightText(text, keyword) {
  const source = stripHighlightMarkup(text)
  const needle = String(keyword || '').trim()

  if (!source) {
    return []
  }

  if (!needle) {
    return [{ text: source, matched: false }]
  }

  const segments = []
  const lowerSource = source.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  let cursor = 0

  while (cursor < source.length) {
    const matchIndex = lowerSource.indexOf(lowerNeedle, cursor)

    if (matchIndex < 0) {
      segments.push({ text: source.slice(cursor), matched: false })
      break
    }

    if (matchIndex > cursor) {
      segments.push({ text: source.slice(cursor, matchIndex), matched: false })
    }

    segments.push({
      text: source.slice(matchIndex, matchIndex + needle.length),
      matched: true,
    })
    cursor = matchIndex + needle.length
  }

  return segments
}

export function getSearchScopeLabel(status) {
  switch (status) {
    case 'deleted':
      return '回收站'
    case 'star':
      return '星标笔记'
    case 'share':
      return '我的分享'
    default:
      return '我的笔记'
  }
}

export function getSearchResultPreview(item, contextLabel) {
  if (item?.previewText) {
    return item.previewText
  }

  switch (item?.status) {
    case 'deleted':
      return '该结果来自回收站中的笔记。'
    case 'star':
      return '该结果来自已收藏的笔记标题。'
    case 'share':
      return '该结果来自我的分享笔记标题。'
    default:
      return `该结果来自${contextLabel || '当前目录'}中的笔记。`
  }
}

export function formatSearchDate(value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function getRecentSearchesFromStorage() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY)
    const parsed = JSON.parse(rawValue || '[]')
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string' && item.trim()).slice(0, RECENT_SEARCH_LIMIT)
      : []
  } catch (error) {
    return []
  }
}

export function rememberRecentSearchInStorage(keyword) {
  const normalized = String(keyword || '').trim()
  if (!normalized || typeof window === 'undefined') {
    return []
  }

  const nextValues = [
    normalized,
    ...getRecentSearchesFromStorage().filter((item) => item !== normalized),
  ].slice(0, RECENT_SEARCH_LIMIT)

  try {
    window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(nextValues))
  } catch (error) {
    return nextValues
  }

  return nextValues
}

export function clearRecentSearchesFromStorage() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    window.localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY)
  } catch (error) {
    return []
  }

  return []
}
