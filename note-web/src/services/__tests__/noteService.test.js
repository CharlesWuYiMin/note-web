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
  const createLargeVoiceFile = () => new File(
    [new Uint8Array(5 * 1024 * 1024 + 8)],
    'voice.webm',
    { type: 'audio/webm' },
  )

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
      mockGet.mockResolvedValue({ data: '5242880' })
      mockPost.mockResolvedValue({ data: { fileId: 'file-1', url: '/v1/note/files/file-1' } })

      const result = await noteService.uploadVoiceFile('note-123', file)

      expect(mockGet).toHaveBeenCalledWith('/sysConfig/voice.file.chunk_threshold_bytes')
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
      mockGet.mockResolvedValue({ data: '5242880' })
      mockPost.mockResolvedValue({ data: { fileId: 'file-2', url: '/v1/note/files/file-2' } })

      await noteService.uploadVoiceFile('note-123', file, { sessionId: 'session-123' })

      const [, , config] = mockPost.mock.calls[0]
      expect(config).toEqual({
        params: { noteId: 'note-123', sessionId: 'session-123' },
      })
    })

    it('includes duration when uploading a voice file', async () => {
      const file = new File(['voice-bytes'], 'voice.webm', { type: 'audio/webm' })
      mockGet.mockResolvedValue({ data: '5242880' })
      mockPost.mockResolvedValue({ data: { fileId: 'file-3', url: '/v1/note/files/file-3' } })

      await noteService.uploadVoiceFile('note-123', file, { sessionId: 'session-123', duration: 18 })

      const [, , config] = mockPost.mock.calls[0]
      expect(config).toEqual({
        params: { noteId: 'note-123', sessionId: 'session-123', duration: 18 },
      })
    })

    it('uploads large files through chunk endpoints and then completes archive metadata', async () => {
      const file = createLargeVoiceFile()
      mockGet
        .mockResolvedValueOnce({ data: '5242880' })
        .mockResolvedValueOnce({ data: '5242880' })
      mockPost
        .mockResolvedValueOnce({ data: { upload_id: 'upload-1' } })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ data: { file_id: 'file-9', file_resource: 'assoc-9' } })
        .mockResolvedValueOnce({ data: { fileId: 'file-9', url: '/v1/note/doc/preview/assoc-9', duration: 18, size: file.size, storageType: 'content' } })

      const result = await noteService.uploadVoiceFile('note-123', file, {
        sessionId: 'session-123',
        duration: 18,
      })

      expect(mockGet.mock.calls).toEqual([
        ['/sysConfig/voice.file.chunk_threshold_bytes'],
        ['/sysConfig/voice.file.chunk_size_bytes'],
      ])
      expect(mockPost).toHaveBeenCalledTimes(5)
      expect(mockPost.mock.calls[0]).toEqual([
        '/file/chunk/init',
        null,
        { params: { file_name: 'voice.webm' } },
      ])
      expect(mockPost.mock.calls[1][0]).toBe('/file/chunk/upload')
      expect(mockPost.mock.calls[1][1]).toBeInstanceOf(FormData)
      expect(mockPost.mock.calls[1][2]).toEqual({
        params: { upload_id: 'upload-1', chunk_index: 0 },
      })
      expect(mockPost.mock.calls[2][0]).toBe('/file/chunk/upload')
      expect(mockPost.mock.calls[2][1]).toBeInstanceOf(FormData)
      expect(mockPost.mock.calls[2][2]).toEqual({
        params: { upload_id: 'upload-1', chunk_index: 1 },
      })
      expect(mockPost.mock.calls[3]).toEqual([
        '/file/chunk/merge',
        null,
        {
          params: {
            upload_id: 'upload-1',
            is_doc_res: true,
            is_template: false,
            is_gen_new_file: false,
            document_id: 'note-123',
            effective_duration: 18,
            response_type: 1,
            is_public: false,
          },
        },
      ])
      expect(mockPost.mock.calls[4]).toEqual([
        '/voice-notes/upload/complete',
        {
          noteId: 'note-123',
          sessionId: 'session-123',
          duration: 18,
          fileId: 'file-9',
          fileResource: 'assoc-9',
          size: file.size,
        },
      ])
      expect(result).toEqual({
        fileId: 'file-9',
        url: '/v1/note/doc/preview/assoc-9',
        duration: 18,
        size: file.size,
        storageType: 'content',
      })
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
