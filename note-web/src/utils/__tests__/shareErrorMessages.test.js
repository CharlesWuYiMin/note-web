import { describe, it, expect } from 'vitest'
import {
  formatSharePromptMessage,
  getSharePromptBaseMessage,
  extractShareBackendReason,
  translateShareBackendReason,
} from '@/utils/shareErrorMessages'

describe('shareErrorMessages', () => {
  it('formats localized prompt for local validation messages', () => {
    localStorage.setItem('language', 'zh-CN')
    expect(getSharePromptBaseMessage('searchKeyword')).toBe('请输入用户搜索关键字')

    localStorage.setItem('language', 'en-US')
    expect(getSharePromptBaseMessage('searchKeyword')).toBe('Please enter a search keyword.')
  })

  it('translates backend reasons into localized prompt details', () => {
    const error = {
      response: {
        status: 403,
        data: {
          message: '用户不存在',
        },
      },
    }

    expect(extractShareBackendReason(error)).toBe('用户不存在')
    expect(translateShareBackendReason('用户不存在')).toEqual({
      zh: '用户不存在',
      en: 'User not found',
    })

    localStorage.setItem('language', 'zh-CN')
    expect(formatSharePromptMessage('enable', error)).toBe(
      '分享设置失败，请稍后重试\n用户不存在'
    )

    localStorage.setItem('language', 'en-US')
    expect(formatSharePromptMessage('enable', error)).toBe(
      'Failed to update sharing settings. Please try again later.\nUser not found'
    )
  })

  it('falls back to status-based localized prompts when backend reason is missing', () => {
    const error = {
      response: {
        status: 500,
        data: {},
      },
    }

    localStorage.setItem('language', 'zh-CN')
    expect(formatSharePromptMessage('load', error)).toBe(
      '分享信息加载失败，请稍后重试\n服务器开小差了，请稍后重试'
    )

    localStorage.setItem('language', 'en-US')
    expect(formatSharePromptMessage('load', error)).toBe(
      'Failed to load sharing information. Please try again later.\nServer error. Please try again later.'
    )
  })
})
