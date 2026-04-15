import { describe, it, expect, vi, beforeEach } from 'vitest'
import searchService from '@/services/searchService'

const mockGet = vi.fn()

vi.mock('@/utils/request', () => ({
  default: {
    get: mockGet,
  },
}))

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchNotes', () => {
    it('should call GET /search with query and params', async () => {
      const mockResults = [
        { id: '1', title: '搜索结果1', highlight: '<em>匹配</em>内容' },
        { id: '2', title: '搜索结果2', highlight: '<em>匹配</em>文本' },
      ]
      mockGet.mockResolvedValue(mockResults)

      const result = await searchService.searchNotes('测试关键词', {
        page: 1,
        size: 10,
        notebookId: 'nb-123',
        type: 'text',
      })

      expect(mockGet).toHaveBeenCalledWith('/search', {
        params: {
          q: '测试关键词',
          page: 1,
          size: 10,
          notebookId: 'nb-123',
          type: 'text',
        }
      })
      expect(result).toEqual(mockResults)
    })

    it('should handle empty query gracefully', async () => {
      mockGet.mockResolvedValue([])

      const result = await searchService.searchNotes('')

      expect(result).toEqual([])
    })
  })

  describe('getRecentSearches', () => {
    it('should call GET /search/recent endpoint', async () => {
      const recentSearches = ['关键词1', '关键词2']
      mockGet.mockResolvedValue(recentSearches)

      const result = await searchService.getRecentSearches()

      expect(mockGet).toHaveBeenCalledWith('/search/recent')
      expect(result).toEqual(recentSearches)
    })
  })

  describe('clearRecentSearches', () => {
    it('should call DELETE to clear search history', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ success: true })
      
      vi.mocked(require('@/utils/request').default, true).mockImplementation(() => ({
        get: mockGet,
        delete: mockDelete,
      }))

      const result = await searchService.clearRecentSearches()

      expect(mockDelete).toHaveBeenCalledWith('/search/recent')
      expect(result).toEqual({ success: true })
    })
  })
})
