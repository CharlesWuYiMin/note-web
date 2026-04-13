import { describe, it, expect, vi, beforeEach } from 'vitest'
import shareService from '@/services/shareService'

const { mockPost, mockGet, mockDelete } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  default: {
    post: mockPost,
    get: mockGet,
    delete: mockDelete,
  },
}))

describe('ShareService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createShare', () => {
    it('should call POST /shares with noteId and options', async () => {
      const mockResponse = {
        shareCode: 'abc123',
        shareUrl: 'https://example.com/s/abc123',
        expiresAt: '2026-04-16T12:00:00Z',
      }
      mockPost.mockResolvedValue(mockResponse)

      const result = await shareService.createShare('note-123', {
        shareType: 'pointed',
        userList: ['w001', 'w002'],
      })

      expect(mockPost).toHaveBeenCalledWith('/shares', {
        noteId: 'note-123',
        shareType: 'pointed',
        userList: ['w001', 'w002'],
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle minimal required fields', async () => {
      const mockResponse = { shareCode: 'xyz789' }
      mockPost.mockResolvedValue(mockResponse)

      const result = await shareService.createShare('note-456')

      expect(mockPost).toHaveBeenCalledWith('/shares', { noteId: 'note-456' })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('listMyShares', () => {
    it('should normalize collection payloads', async () => {
      mockGet.mockResolvedValue({
        data: {
          items: [{ noteId: 'note-1', shareCode: 'abc123' }],
        },
      })

      const result = await shareService.listMyShares()

      expect(mockGet).toHaveBeenCalledWith('/myshare/notes')
      expect(result).toEqual([{ noteId: 'note-1', shareCode: 'abc123' }])
    })
  })

  describe('getSharedNote', () => {
    it('should call GET /shares/:shareCode with correct code', async () => {
      const mockNote = {
        id: 'note-123',
        title: '共享笔记',
        content: '<p>内容</p>',
        sharedBy: 'user-1',
      }
      mockGet.mockResolvedValue(mockNote)

      const result = await shareService.getSharedNote('abc123')

      expect(mockGet).toHaveBeenCalledWith('/shares/abc123')
      expect(result).toEqual(mockNote)
    })

    it('should handle not found error gracefully', async () => {
      mockGet.mockRejectedValue(new Error(404, 'Share not found'))

      try {
        await shareService.getSharedNote('invalid-code')
        expect(true).toBe(false)
      } catch (error) {
        expect(error.message).toContain('404')
      }
    })
  })

  describe('deleteShare', () => {
    it('should call DELETE endpoint for removing share', async () => {
      mockDelete.mockResolvedValue({ success: true })

      const result = await shareService.deleteShare('share-123')

      expect(mockDelete).toHaveBeenCalledWith('/shares/share-123')
      expect(result).toEqual({ success: true })
    })
  })
})
