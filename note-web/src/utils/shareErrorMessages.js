import { Modal } from 'antd'
import { createElement } from 'react'

const OPERATION_MESSAGES = {
  load: {
    zh: '分享信息加载失败，请稍后重试',
    en: 'Failed to load sharing information. Please try again later.',
  },
  create: {
    zh: '创建分享失败，请稍后重试',
    en: 'Failed to create sharing. Please try again later.',
  },
  enable: {
    zh: '分享设置失败，请稍后重试',
    en: 'Failed to update sharing settings. Please try again later.',
  },
  disable: {
    zh: '关闭分享失败，请稍后重试',
    en: 'Failed to disable sharing. Please try again later.',
  },
  copy: {
    zh: '复制失败，请手动复制',
    en: 'Copy failed. Please copy it manually.',
  },
  search: {
    zh: '用户查询失败，请稍后重试',
    en: 'User search failed. Please try again later.',
  },
  searchKeyword: {
    zh: '请输入用户搜索关键字',
    en: 'Please enter a search keyword.',
  },
  selectUsers: {
    zh: '请选择指定用户后再分享',
    en: 'Please select specified users before sharing.',
  },
  generic: {
    zh: '操作失败，请稍后重试',
    en: 'Operation failed. Please try again later.',
  },
}

const STATUS_MESSAGES = {
  400: {
    zh: '请求参数有误',
    en: 'Invalid request parameters.',
  },
  401: {
    zh: '登录已过期，请重新登录',
    en: 'Session expired. Please sign in again.',
  },
  403: {
    zh: '没有权限执行该操作',
    en: 'You do not have permission to perform this action.',
  },
  404: {
    zh: '资源不存在或已失效',
    en: 'The resource does not exist or has expired.',
  },
  409: {
    zh: '当前状态已变化，请刷新后重试',
    en: 'The state has changed. Please refresh and try again.',
  },
  422: {
    zh: '参数校验失败',
    en: 'Validation failed.',
  },
  429: {
    zh: '请求过于频繁',
    en: 'Too many requests.',
  },
  500: {
    zh: '服务器开小差了，请稍后重试',
    en: 'Server error. Please try again later.',
  },
}

const REASON_RULES = [
  {
    pattern: /(用户不存在|user not found|account not found|member not found|participant not found)/i,
    zh: '用户不存在',
    en: 'User not found',
  },
  {
    pattern: /(没有权限|无权限|permission denied|forbidden|not authorized)/i,
    zh: '没有权限执行该操作',
    en: 'Permission denied',
  },
  {
    pattern: /(分享不存在|share not found|share does not exist|note share not found)/i,
    zh: '分享不存在或已失效',
    en: 'Share not found or expired',
  },
  {
    pattern: /(分享已关闭|sharing is disabled|share disabled|share already disabled)/i,
    zh: '分享已关闭',
    en: 'Sharing is disabled',
  },
  {
    pattern: /(参数错误|invalid parameter|invalid parameters|bad request|validation failed)/i,
    zh: '参数不合法',
    en: 'Invalid parameters',
  },
  {
    pattern: /(请选择.*用户|user list cannot be empty|no specified users|selected users required|empty user list)/i,
    zh: '请选择指定用户',
    en: 'Please select specified users',
  },
  {
    pattern: /(过期|expired)/i,
    zh: '链接已过期',
    en: 'Link expired',
  },
  {
    pattern: /(已存在|already exists|duplicate)/i,
    zh: '记录已存在',
    en: 'Already exists',
  },
  {
    pattern: /(请求过于频繁|too many requests)/i,
    zh: '请求过于频繁',
    en: 'Too many requests',
  },
]

function getFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function getNestedString(source, path) {
  return path.reduce((current, key) => current && current[key], source)
}

function resolveLanguage(language) {
  const raw = String(
    language ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('language') : '') ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'zh-CN'
  ).toLowerCase()

  return raw.startsWith('en') ? 'en' : 'zh'
}

function getLocalizedText(message, language) {
  if (!message) {
    return ''
  }

  if (typeof message === 'string') {
    return message
  }

  const lang = resolveLanguage(language)
  return message[lang] || message.zh || message.en || ''
}

export function extractShareBackendReason(error) {
  const data = error?.response?.data

  if (!data) {
    return ''
  }

  if (typeof data === 'string') {
    return data.trim()
  }

  return getFirstString(
    data.reason,
    data.message,
    data.msg,
    data.detail,
    data.description,
    data.error,
    data.errorMessage,
    data.title,
    getNestedString(data, ['data', 'reason']),
    getNestedString(data, ['data', 'message']),
    getNestedString(data, ['data', 'msg'])
  )
}

export function translateShareBackendReason(reason) {
  const text = getFirstString(reason)

  if (!text) {
    return null
  }

  const matchedRule = REASON_RULES.find((rule) => rule.pattern.test(text))
  if (matchedRule) {
    return {
      zh: matchedRule.zh,
      en: matchedRule.en,
    }
  }

  return null
}

export function formatSharePromptMessage(operation, error, language) {
  const lang = resolveLanguage(language)
  const base = OPERATION_MESSAGES[operation] || OPERATION_MESSAGES.generic
  const status = Number(error?.response?.status || 0)
  const reason = translateShareBackendReason(extractShareBackendReason(error))
  const statusMessage = status ? STATUS_MESSAGES[status] : null

  const lines = [base[lang] || base.zh || base.en || OPERATION_MESSAGES.generic[lang]]

  const detailMessage = getLocalizedText(reason || statusMessage, lang)
  if (detailMessage && detailMessage !== lines[0]) {
    lines.push(detailMessage)
  }

  return lines.join('\n')
}

export function getSharePromptBaseMessage(operation, language) {
  const lang = resolveLanguage(language)
  const base = OPERATION_MESSAGES[operation] || OPERATION_MESSAGES.generic
  return base[lang] || base.zh || base.en || OPERATION_MESSAGES.generic[lang]
}

export function showSharePromptModal({
  operation,
  error,
  language,
  title,
}) {
  const lang = resolveLanguage(language)
  const content = formatSharePromptMessage(operation, error, lang)

  Modal.error({
    title: title || (lang === 'en' ? 'Share failed' : '分享失败'),
    content: createElement('div', { style: { whiteSpace: 'pre-line' } }, content),
    okText: lang === 'en' ? 'OK' : '知道了',
    centered: true,
  })
}
