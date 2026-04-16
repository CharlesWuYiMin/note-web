const DEFAULT_EMPTY_TITLE = '未命名笔记'
const RECENT_SEARCH_STORAGE_KEY = 'note-web:recent-searches'
const RECENT_SEARCH_LIMIT = 8

export function stripHighlightMarkup(value) {
  if (value == null) {
    return ''
  }

  return String(value)
    .replace(/<\/?em>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickFirstRawText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

export function normalizeSearchItem(item = {}, fallbackStatus = 'active') {
  const itemId = item?.noteId || item?.id || item?.documentId || item?.document_id || ''
  const title = stripHighlightMarkup(item?.title) || DEFAULT_EMPTY_TITLE
  const highlightTitle = pickFirstRawText(item?.highlightTitle, item?.highlight_title)
  const context = pickFirstRawText(item?.context, item?.highlight, item?.content, item?.summary)

  return {
    ...item,
    id: itemId ? String(itemId) : '',
    noteId: item?.noteId || itemId || '',
    documentId: item?.documentId || item?.document_id || itemId || '',
    title,
    highlightTitle,
    context,
    previewText: stripHighlightMarkup(context),
    updatedAt: item?.updatedAt || item?.updateDate || item?.update_date || item?.deletedAt || item?.createdAt || null,
    status: item?.status || fallbackStatus || 'active',
    voiceNumber: Number(item?.voiceNumber || item?.voiceCount || 0),
  }
}

export function splitHighlightText(text, keyword = '') {
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

export function splitHighlightedText(text, keyword = '') {
  const rawText = String(text || '')
  const emPattern = /<em>(.*?)<\/em>/gis

  if (!rawText) {
    return []
  }

  if (!emPattern.test(rawText)) {
    return splitHighlightText(rawText, keyword)
  }

  emPattern.lastIndex = 0
  const segments = []
  let cursor = 0

  for (const match of rawText.matchAll(emPattern)) {
    const matchedText = match[0]
    const innerText = stripHighlightMarkup(match[1])
    const index = match.index ?? 0

    if (index > cursor) {
      const plainText = stripHighlightMarkup(rawText.slice(cursor, index))
      if (plainText) {
        segments.push({ text: plainText, matched: false })
      }
    }

    if (innerText) {
      segments.push({ text: innerText, matched: true })
    }

    cursor = index + matchedText.length
  }

  const tailText = stripHighlightMarkup(rawText.slice(cursor))
  if (tailText) {
    segments.push({ text: tailText, matched: false })
  }

  return segments
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
