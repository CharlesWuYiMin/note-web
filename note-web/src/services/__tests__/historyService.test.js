import { describe, it, expect, vi, beforeEach } from 'vitest'
import historyService from '@/services/historyService'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/utils/request', () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}))

describe('HistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNoteHistory', () => {
    it('should call GET /notes/:id/history with correct id', async () => {
      const mockHistory = [
        { version: 1, content: '版本1', createdAt: '2026-04-09T10:00:00Z' },
        { version: 2, content: '版本2', createdAt: '2026-04-09T12:00:00Z' },
      ]
      mockGet.mockResolvedValue(mockHistory)

      const result = await historyService.getNoteHistory('note-123')

      expect(mockGet).toHaveBeenCalledWith('/notes/note-123/history', {
        params: {},
      })
      expect(result).toEqual(mockHistory)
    })

    it('should handle empty history array', async () => {
      mockGet.mockResolvedValue([])

      const result = await historyService.getNoteHistory('note-456')

      expect(result).toEqual([])
      expect(mockGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('getVersionDetail', () => {
    it('should call GET /notes/:id/history/:version with correct params', async () => {
      const mockVersion = {
        version: 2,
        content: '<p>具体内容</p>',
        title: '笔记标题',
        updatedAt: '2026-04-09T12:00:00Z',
      }
      mockGet.mockResolvedValue(mockVersion)

      const result = await historyService.getVersionDetail('note-123', 2)

      expect(mockGet).toHaveBeenCalledWith('/notes/note-123/history/2')
      expect(result).toEqual(mockVersion)
    })
  })

  describe('restoreVersion', () => {
    it('should call POST to restore specific version', async () => {
      mockPost.mockResolvedValue({ success: true, restoredVersion: 1 })

      const result = await historyService.restoreVersion('note-123', 1)

      expect(mockPost).toHaveBeenCalledWith('/notes/note-123/history/1/restore')
      expect(result).toEqual({ success: true, restoredVersion: 1 })
    })
  })
})
