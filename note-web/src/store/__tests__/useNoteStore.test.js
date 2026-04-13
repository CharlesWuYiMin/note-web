import { describe, it, expect, vi, beforeEach } from 'vitest'
import useNoteStore from '@/store/useNoteStore'

const {
  mockGetNotes,
  mockGetNoteById,
  mockCreateNote,
  mockUpdateName,
  mockUpdateContent,
  mockDeleteNote,
  mockStarNote,
  mockUnstarNote,
  mockGetStarredNotes,
  mockGetMyShares,
  mockGetDeletedNotes,
  mockRestoreDeletedNote,
  mockPermanentDeleteNote,
} = vi.hoisted(() => ({
  mockGetNotes: vi.fn(),
  mockGetNoteById: vi.fn(),
  mockCreateNote: vi.fn(),
  mockUpdateName: vi.fn(),
  mockUpdateContent: vi.fn(),
  mockDeleteNote: vi.fn(),
  mockStarNote: vi.fn(),
  mockUnstarNote: vi.fn(),
  mockGetStarredNotes: vi.fn(),
  mockGetMyShares: vi.fn(),
  mockGetDeletedNotes: vi.fn(),
  mockRestoreDeletedNote: vi.fn(),
  mockPermanentDeleteNote: vi.fn(),
}))

vi.mock('@/services/noteService', () => ({
  default: {
    getNotes: mockGetNotes,
    getNoteById: mockGetNoteById,
    createNote: mockCreateNote,
    updateName: mockUpdateName,
    updateContent: mockUpdateContent,
    deleteNote: mockDeleteNote,
    starNote: mockStarNote,
    unstarNote: mockUnstarNote,
    getStarredNotes: mockGetStarredNotes,
    getMyShares: mockGetMyShares,
    getDeletedNotes: mockGetDeletedNotes,
    restoreDeletedNote: mockRestoreDeletedNote,
    permanentDeleteNote: mockPermanentDeleteNote,
  },
}))

describe('useNoteStore', () => {
  const mockNotes = [
    { id: '1', title: 'note 1', isStarred: false, type: 'text' },
    { id: '2', title: 'note 2', isStarred: true, type: 'outline' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useNoteStore.setState({
      notes: [],
      currentNote: null,
      starredNotes: [],
      starredNotesPagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        hasMore: false,
      },
      myShares: [],
      isLoading: false,
      isStarredNotesLoadingMore: false,
      error: null,
    })
  })

  describe('fetchNotes', () => {
    it('stores array responses directly', async () => {
      mockGetNotes.mockResolvedValue(mockNotes)

      await useNoteStore.getState().fetchNotes()

      expect(useNoteStore.getState().notes).toEqual(mockNotes)
    })

    it('supports object responses with list property', async () => {
      mockGetNotes.mockResolvedValue({ list: mockNotes, total: 2 })

      await useNoteStore.getState().fetchNotes()

      expect(useNoteStore.getState().notes).toEqual(mockNotes)
    })

    it('supports object responses with items property', async () => {
      mockGetNotes.mockResolvedValue({ items: mockNotes, total: 2 })

      await useNoteStore.getState().fetchNotes()

      expect(useNoteStore.getState().notes).toEqual(mockNotes)
    })

    it('supports object responses with data property', async () => {
      mockGetNotes.mockResolvedValue({ data: mockNotes })

      await useNoteStore.getState().fetchNotes()

      expect(useNoteStore.getState().notes).toEqual(mockNotes)
    })

    it('passes query params through to the service', async () => {
      mockGetNotes.mockResolvedValue(mockNotes)

      await useNoteStore.getState().fetchNotes({ field: 'updatedAt', order: 'desc' })

      expect(mockGetNotes).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })
    })
  })

  describe('loadNoteById', () => {
    it('loads note details into currentNote', async () => {
      const detail = { id: '1', title: 'detail note', content: 'body' }
      mockGetNoteById.mockResolvedValue(detail)

      const result = await useNoteStore.getState().loadNoteById('1')

      expect(mockGetNoteById).toHaveBeenCalledWith('1')
      expect(result).toEqual(detail)
      expect(useNoteStore.getState().currentNote).toEqual({
        id: '1',
        title: 'detail note',
      })
    })

    it('merges refreshed note metadata into list collections', async () => {
      const refreshed = {
        id: '1',
        title: 'detail note',
        voiceNumber: 1,
        voiceNote: [{ id: 'voice-1' }],
        content: 'body',
      }
      mockGetNoteById.mockResolvedValue(refreshed)

      useNoteStore.setState({
        notes: [{ id: '1', title: 'note 1', isStarred: false, type: 'text' }],
        starredNotes: [{ id: '1', title: 'note 1', isStarred: true }],
        myShares: [{ id: 'share-1', noteId: '1', title: 'shared note' }],
        deletedNotes: [{ id: '1', title: 'deleted note', status: 'deleted' }],
      })

      await useNoteStore.getState().loadNoteById('1')

      expect(useNoteStore.getState().notes[0]).toEqual(expect.objectContaining({
        id: '1',
        title: 'detail note',
        voiceNumber: 1,
      }))
      expect(useNoteStore.getState().starredNotes[0]).toEqual(expect.objectContaining({
        id: '1',
        title: 'detail note',
        voiceNote: [{ id: 'voice-1' }],
      }))
      expect(useNoteStore.getState().myShares[0]).toEqual(expect.objectContaining({
        id: 'share-1',
        noteId: '1',
        title: 'detail note',
        voiceNumber: 1,
      }))
      expect(useNoteStore.getState().deletedNotes[0]).toEqual(expect.objectContaining({
        id: '1',
        title: 'detail note',
      }))
    })
  })

  describe('updateName', () => {
    it('updates the note title in both list and current note', async () => {
      useNoteStore.setState({
        notes: [mockNotes[0]],
        currentNote: { ...mockNotes[0], content: 'body' },
      })
      mockUpdateName.mockResolvedValue({})

      await useNoteStore.getState().updateName('1', 'new title')

      expect(mockUpdateName).toHaveBeenCalledWith('1', 'new title')
      expect(useNoteStore.getState().notes[0].title).toBe('new title')
      expect(useNoteStore.getState().currentNote.title).toBe('new title')
    })
  })

  describe('deleteNote', () => {
    it('removes the note from active collections and moves it into recycle bin', async () => {
      useNoteStore.setState({
        notes: [mockNotes[0], mockNotes[1]],
        starredNotes: [mockNotes[1]],
        myShares: [{ id: 'share-1', noteId: '2', title: '共享笔记' }],
        currentNote: { ...mockNotes[1], content: 'body' },
        deletedNotes: [],
      })
      mockDeleteNote.mockResolvedValue({})

      await useNoteStore.getState().deleteNote('2')

      expect(mockDeleteNote).toHaveBeenCalledWith('2')
      expect(useNoteStore.getState().notes).toEqual([mockNotes[0]])
      expect(useNoteStore.getState().starredNotes).toEqual([])
      expect(useNoteStore.getState().myShares).toEqual([])
      expect(useNoteStore.getState().currentNote).toBeNull()
      expect(useNoteStore.getState().deletedNotes[0]).toEqual(expect.objectContaining({
        id: '2',
        title: 'note 2',
        status: 'deleted',
      }))
    })
  })

  describe('recycle bin actions', () => {
    it('removes a restored note from recycle bin', async () => {
      useNoteStore.setState({
        deletedNotes: [{ id: '2', title: 'note 2', status: 'deleted' }],
      })
      mockRestoreDeletedNote.mockResolvedValue({})

      await useNoteStore.getState().restoreNote('2')

      expect(mockRestoreDeletedNote).toHaveBeenCalledWith('2')
      expect(useNoteStore.getState().deletedNotes).toEqual([])
    })

    it('removes a permanently deleted note from recycle bin', async () => {
      useNoteStore.setState({
        deletedNotes: [{ id: '2', title: 'note 2', status: 'deleted' }],
      })
      mockPermanentDeleteNote.mockResolvedValue({})

      await useNoteStore.getState().permanentDeleteNote('2')

      expect(mockPermanentDeleteNote).toHaveBeenCalledWith('2')
      expect(useNoteStore.getState().deletedNotes).toEqual([])
    })
  })

  describe('toggleStar', () => {
    it('stars an unstarred note', async () => {
      useNoteStore.setState({
        notes: [mockNotes[0]],
        currentNote: mockNotes[0],
      })
      mockStarNote.mockResolvedValue({ isStarred: true })

      await useNoteStore.getState().toggleStar(mockNotes[0])

      expect(useNoteStore.getState().notes[0].isStarred).toBe(true)
      expect(useNoteStore.getState().currentNote.isStarred).toBe(true)
      expect(mockStarNote).toHaveBeenCalledWith('1')
    })

    it('unstars a starred note', async () => {
      useNoteStore.setState({
        notes: [mockNotes[1]],
        currentNote: mockNotes[1],
      })
      mockUnstarNote.mockResolvedValue({ isStarred: false })

      await useNoteStore.getState().toggleStar(mockNotes[1])

      expect(useNoteStore.getState().notes[0].isStarred).toBe(false)
      expect(mockUnstarNote).toHaveBeenCalledWith('2')
    })
  })

  describe('fetchStarredNotes', () => {
    it('maps paged starred note responses into store state', async () => {
      mockGetStarredNotes.mockResolvedValue({
        items: [mockNotes[1]],
        total: 21,
        page: 1,
        size: 20,
      })

      await useNoteStore.getState().fetchStarredNotes({ field: 'updatedAt', order: 'desc' })

      expect(mockGetStarredNotes).toHaveBeenCalledWith({
        field: 'updatedAt',
        order: 'desc',
        page: 1,
        pageSize: 20,
      })
      expect(useNoteStore.getState().starredNotes).toEqual([mockNotes[1]])
      expect(useNoteStore.getState().starredNotesPagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 21,
        hasMore: true,
      })
    })

    it('appends the next page when loading more starred notes', async () => {
      mockGetStarredNotes
        .mockResolvedValueOnce({
          items: [{ id: '2', title: 'note 2', isStarred: true }],
          total: 21,
          page: 1,
          size: 20,
        })
        .mockResolvedValueOnce({
          items: [{ id: '3', title: 'note 3', isStarred: true }],
          total: 21,
          page: 2,
          size: 20,
        })

      await useNoteStore.getState().fetchStarredNotes()
      await useNoteStore.getState().loadMoreStarredNotes()

      expect(mockGetStarredNotes).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 20 })
      expect(mockGetStarredNotes).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 20 })
      expect(useNoteStore.getState().starredNotes.map((item) => item.id)).toEqual(['2', '3'])
      expect(useNoteStore.getState().starredNotesPagination).toEqual({
        page: 2,
        pageSize: 20,
        total: 21,
        hasMore: false,
      })
    })
  })

  describe('workspace collections', () => {
    it('maps my shares from items payload', async () => {
      mockGetMyShares.mockResolvedValue({ items: [{ id: 'share-1', title: '共享笔记' }] })

      await useNoteStore.getState().fetchMyShares()

      expect(useNoteStore.getState().myShares).toEqual([{ id: 'share-1', title: '共享笔记' }])
    })

    it('maps recycle bin notes from list payload', async () => {
      mockGetDeletedNotes.mockResolvedValue({ list: [{ id: 'deleted-1', title: '已删除笔记' }] })

      await useNoteStore.getState().fetchDeletedNotes()

      expect(useNoteStore.getState().deletedNotes).toEqual([{ id: 'deleted-1', title: '已删除笔记' }])
    })
  })
})
