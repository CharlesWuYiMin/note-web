import { describe, it, expect, vi, beforeEach } from 'vitest'
import noteService from '@/services/noteService'

const { mockGet, mockPost, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
  },
}))

describe('NoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotes', () => {
    it('maps recent note sort params to orderBy and desc', async () => {
      const params = { field: 'updatedAt', order: 'desc' }
      const mockNotes = [
        { id: '1', title: 'note 1' },
        { id: '2', title: 'note 2' },
      ]
      mockGet.mockResolvedValue({ data: mockNotes })

      const result = await noteService.getNotes(params)

      expect(mockGet).toHaveBeenCalledWith('/notes', {
        params: { orderBy: 2, desc: 1 },
      })
      expect(result).toEqual(mockNotes)
    })

    it('keeps explicit orderBy and desc params', async () => {
      mockGet.mockResolvedValue({ data: [] })

      await noteService.getNotes({ orderBy: 1, desc: 0 })

      expect(mockGet).toHaveBeenCalledWith('/notes', {
        params: { orderBy: 1, desc: 0 },
      })
    })
  })

  describe('getNoteById', () => {
    it('calls GET /notes/:id with withContent enabled', async () => {
      const id = '123'
      const mockNote = { id, title: 'test note' }
      mockGet.mockResolvedValue(mockNote)

      const result = await noteService.getNoteById(id)

      expect(mockGet).toHaveBeenCalledWith(`/notes/${id}`, {
        params: { withContent: true },
      })
      expect(result).toEqual(mockNote)
    })
  })

  describe('createNote', () => {
    it('calls POST /notes with the payload', async () => {
      const newNoteData = {
        title: 'new note',
        type: 'text',
        notebookId: 'notebook-1',
      }
      const createdNote = { id: 'new-1', ...newNoteData }
      mockPost.mockResolvedValue(createdNote)

      const result = await noteService.createNote(newNoteData)

      expect(mockPost).toHaveBeenCalledWith('/notes', newNoteData)
      expect(result).toEqual(createdNote)
    })
  })

  describe('uploadVoiceFile', () => {
    it('posts noteId and file as multipart form data', async () => {
      const file = new File(['voice-bytes'], 'voice.webm', { type: 'audio/webm' })
      mockPost.mockResolvedValue({ data: { fileId: 'file-1', url: '/v1/note/files/file-1' } })

      const result = await noteService.uploadVoiceFile('note-123', file)

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [url, body, config] = mockPost.mock.calls[0]
      expect(url).toBe('/voice-notes/upload')
      expect(body).toBeInstanceOf(FormData)
      expect(Array.from(body.entries())).toEqual([
        ['file', file],
      ])
      expect(config).toEqual({
        params: { noteId: 'note-123' },
      })
      expect(result).toEqual({ fileId: 'file-1', url: '/v1/note/files/file-1' })
    })

    it('includes sessionId when uploading a realtime archive file', async () => {
      const file = new File(['voice-bytes'], 'voice.webm', { type: 'audio/webm' })
      mockPost.mockResolvedValue({ data: { fileId: 'file-2', url: '/v1/note/files/file-2' } })

      await noteService.uploadVoiceFile('note-123', file, { sessionId: 'session-123' })

      const [, , config] = mockPost.mock.calls[0]
      expect(config).toEqual({
        params: { noteId: 'note-123', sessionId: 'session-123' },
      })
    })
  })

  describe('getVoiceFile', () => {
    it('calls GET /voice-notes/files/:fileId with blob response type', async () => {
      const blob = new Blob(['audio-bytes'], { type: 'audio/webm' })
      mockGet.mockResolvedValue(blob)

      const result = await noteService.getVoiceFile('file-456')

      expect(mockGet).toHaveBeenCalledWith('/voice-notes/files/file-456', {
        responseType: 'blob',
      })
      expect(result).toEqual(blob)
    })
  })

  describe('updateName', () => {
    it('calls PATCH /name/:id with the renamed note payload', async () => {
      mockPatch.mockResolvedValue({ data: null })

      await noteService.updateName('123', 'new title')

      expect(mockPatch).toHaveBeenCalledWith('/name/123', { name: 'new title' })
    })
  })

  describe('moveNote', () => {
    it('uses noteId in the URL and target notebookId in the request body', async () => {
      mockPost.mockResolvedValue({ data: null })

      await noteService.moveNote('note-123', 'target-notebook-2')

      expect(mockPost).toHaveBeenCalledWith('/move/note-123', { notebookId: 'target-notebook-2' })
    })
  })

  describe('copyNote', () => {
    it('uses the new /:noteId/copy endpoint with target notebookId in the request body', async () => {
      mockPost.mockResolvedValue({ data: { id: 'copied-1' } })

      await noteService.copyNote('note-123', 'target-notebook-2')

      expect(mockPost).toHaveBeenCalledWith('/note-123/copy', { notebookId: 'target-notebook-2' })
    })
  })

  describe('deleteNote', () => {
    it('calls POST /notes/:id/delete for soft deletion', async () => {
      mockPost.mockResolvedValue({ success: true })

      await noteService.deleteNote('123')

      expect(mockPost).toHaveBeenCalledWith('/notes/123/delete')
    })
  })

  describe('recycle bin actions', () => {
    it('calls batch restore API with ids payload', async () => {
      mockPost.mockResolvedValue({ success: true })

      await noteService.restoreDeletedNote('123')

      expect(mockPost).toHaveBeenCalledWith('/notes/recycle-bin/restore', { ids: ['123'] })
    })

    it('calls batch permanent delete API with ids payload', async () => {
      mockPost.mockResolvedValue({ success: true })

      await noteService.permanentDeleteNote(['123', '456'])

      expect(mockPost).toHaveBeenCalledWith('/notes/recycle-bin/delete', { ids: ['123', '456'] })
    })
  })
})
