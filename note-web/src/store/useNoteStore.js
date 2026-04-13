import { create } from 'zustand'
import noteService from '@/services/noteService'

function normalizeCollection(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  if (Array.isArray(data?.list)) {
    return data.list
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

function omitContent(note) {
  if (!note || typeof note !== 'object') {
    return note
  }

  const { content, ...rest } = note
  return rest
}

function mergeNoteIntoCollection(collection, note) {
  if (!Array.isArray(collection) || !note?.id) {
    return collection
  }

  return collection.map((item) => {
    const itemId = item?.noteId || item?.id
    if (itemId !== note.id) {
      return item
    }

    return {
      ...item,
      ...note,
      id: item?.id || note.id,
      noteId: item?.noteId || note.id,
    }
  })
}

const useNoteStore = create((set, get) => ({
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
  deletedNotes: [],
  isLoading: false,
  isStarredNotesLoadingMore: false,
  error: null,

  fetchNotes: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const data = await noteService.getNotes(params)
      set({
        notes: normalizeCollection(data),
        isLoading: false,
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  loadNoteById: async (id) => {
    if (!id) {
      set({ currentNote: null })
      return null
    }

    set({ isLoading: true, error: null })
    try {
      const note = await noteService.getNoteById(id)
      const noteMeta = note ? omitContent(note) : null
      set((state) => ({
        currentNote: noteMeta,
        notes: noteMeta ? mergeNoteIntoCollection(state.notes, noteMeta) : state.notes,
        starredNotes: noteMeta ? mergeNoteIntoCollection(state.starredNotes, noteMeta) : state.starredNotes,
        myShares: noteMeta ? mergeNoteIntoCollection(state.myShares, noteMeta) : state.myShares,
        deletedNotes: noteMeta ? mergeNoteIntoCollection(state.deletedNotes, noteMeta) : state.deletedNotes,
        isLoading: false,
      }))
      return note || null
    } catch (error) {
      set({ currentNote: null, error: error.message, isLoading: false })
      throw error
    }
  },

  fetchStarredNotes: async (params = {}) => {
    const {
      page = 1,
      pageSize = 20,
      append = page > 1,
      ...restParams
    } = params

    set({
      isLoading: append ? get().isLoading : true,
      isStarredNotesLoadingMore: append,
      error: null,
    })
    try {
      const data = await noteService.getStarredNotes({
        page,
        pageSize,
        ...restParams,
      })
      const items = Array.isArray(data?.items) ? data.items : []
      const total = Number(data?.total) || 0
      const currentPage = Number(data?.page) || page
      const size = Number(data?.size) || pageSize

      set((state) => {
        const mergedItems = append
          ? [...state.starredNotes, ...items.filter((item) => !state.starredNotes.some((note) => note.id === item.id))]
          : items

        return {
          starredNotes: mergedItems,
          starredNotesPagination: {
            page: currentPage,
            pageSize: size,
            total,
            hasMore: currentPage * size < total,
          },
          isLoading: false,
          isStarredNotesLoadingMore: false,
        }
      })
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
        isStarredNotesLoadingMore: false,
      })
    }
  },

  loadMoreStarredNotes: async (params = {}) => {
    const { starredNotesPagination } = get()

    if (!starredNotesPagination.hasMore || get().isStarredNotesLoadingMore) {
      return
    }

    await get().fetchStarredNotes({
      ...params,
      page: starredNotesPagination.page + 1,
      pageSize: starredNotesPagination.pageSize,
      append: true,
    })
  },

  fetchMyShares: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await noteService.getMyShares()
      set({ myShares: normalizeCollection(data), isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchDeletedNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await noteService.getDeletedNotes()
      set({ deletedNotes: normalizeCollection(data), isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  setCurrentNote: (note) => set({ currentNote: note }),

  createNote: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const created = await noteService.createNote(data)
      const newNote = created && typeof created === 'object'
        ? created
        : {
          id: `temp-${Date.now()}`,
          ...data,
          isStarred: false,
          status: 'active',
        }
      set((state) => ({
        notes: [newNote, ...state.notes],
        isLoading: false,
      }))
      return newNote
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateName: async (id, name) => {
    try {
      await noteService.updateName(id, name)
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, title: name } : n)),
        currentNote:
          state.currentNote?.id === id
            ? { ...state.currentNote, title: name }
            : state.currentNote,
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  updateContent: async (id, content) => {
    try {
      await noteService.updateContent(id, content)
      set((state) => ({
        currentNote:
          state.currentNote?.id === id
            ? { ...state.currentNote, content }
            : state.currentNote,
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteNote: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await noteService.deleteNote(id)
      set((state) => {
        const deletedNote = state.notes.find((n) => n.id === id)
          || state.starredNotes.find((n) => n.id === id)
          || state.deletedNotes.find((n) => n.id === id)
          || (state.currentNote?.id === id ? state.currentNote : null)

        const nextDeletedNotes = deletedNote
          ? [{
            ...deletedNote,
            status: 'deleted',
            deletedAt: deletedNote.deletedAt || new Date().toISOString(),
          }, ...state.deletedNotes.filter((note) => note.id !== id)]
          : state.deletedNotes

        return {
          notes: state.notes.filter((n) => n.id !== id),
          starredNotes: state.starredNotes.filter((n) => n.id !== id),
          myShares: state.myShares.filter((item) => item.id !== id && item.noteId !== id),
          deletedNotes: nextDeletedNotes,
          currentNote: state.currentNote?.id === id ? null : state.currentNote,
          isLoading: false,
        }
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  restoreNote: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await noteService.restoreDeletedNote(id)
      set((state) => ({
        deletedNotes: state.deletedNotes.filter((note) => note.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  permanentDeleteNote: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await noteService.permanentDeleteNote(id)
      set((state) => ({
        deletedNotes: state.deletedNotes.filter((note) => note.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  clearRecycleBin: async () => {
    set({ isLoading: true, error: null })
    try {
      await noteService.clearRecycleBin()
      set({ deletedNotes: [], isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  toggleStar: async (note) => {
    try {
      if (note.isStarred) {
        await noteService.unstarNote(note.id)
      } else {
        await noteService.starNote(note.id)
      }
      const nextIsStarred = !note.isStarred
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === note.id ? { ...n, isStarred: nextIsStarred } : n
        ),
        starredNotes: nextIsStarred
          ? (
            state.starredNotes.some((n) => n.id === note.id)
              ? state.starredNotes.map((n) =>
                n.id === note.id ? { ...n, isStarred: true } : n
              )
              : [{ ...note, isStarred: true }, ...state.starredNotes]
          )
          : state.starredNotes.filter((n) => n.id !== note.id),
        starredNotesPagination: nextIsStarred
          ? {
            ...state.starredNotesPagination,
            total: state.starredNotes.some((n) => n.id === note.id)
              ? state.starredNotesPagination.total
              : state.starredNotesPagination.total + 1,
          }
          : {
            ...state.starredNotesPagination,
            total: Math.max(0, state.starredNotesPagination.total - 1),
            hasMore:
              state.starredNotesPagination.total - 1
              > state.starredNotesPagination.page * state.starredNotesPagination.pageSize,
          },
        currentNote:
          state.currentNote?.id === note.id
            ? { ...state.currentNote, isStarred: nextIsStarred }
            : state.currentNote,
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))

export default useNoteStore
