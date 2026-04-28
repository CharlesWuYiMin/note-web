import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearRecentSearchesFromStorage,
  getRecentSearchesFromStorage,
  rememberRecentSearchInStorage,
} from '@/utils/searchPresentation'

describe('searchPresentation recent search storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores keywords in localStorage with most recent first and removes duplicates', () => {
    rememberRecentSearchInStorage('  项目规划  ')
    rememberRecentSearchInStorage('会议纪要')
    rememberRecentSearchInStorage('项目规划')

    expect(getRecentSearchesFromStorage()).toEqual(['项目规划', '会议纪要'])
  })

  it('caps the stored history to the configured limit', () => {
    Array.from({ length: 10 }).forEach((_, index) => {
      rememberRecentSearchInStorage(`关键词 ${index + 1}`)
    })

    const recentSearches = getRecentSearchesFromStorage()

    expect(recentSearches).toHaveLength(8)
    expect(recentSearches[0]).toBe('关键词 10')
    expect(recentSearches[7]).toBe('关键词 3')
  })

  it('ignores blank values and supports clearing the history', () => {
    rememberRecentSearchInStorage('   ')
    rememberRecentSearchInStorage('')

    expect(getRecentSearchesFromStorage()).toEqual([])

    rememberRecentSearchInStorage('搜索词')
    expect(getRecentSearchesFromStorage()).toEqual(['搜索词'])

    clearRecentSearchesFromStorage()
    expect(getRecentSearchesFromStorage()).toEqual([])
  })
})
