import { create } from 'zustand'
import noteService from '@/services/noteService'

const inFlightNoteDetails = new Map()

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

function mergeUniqueNotes(existingNotes, nextNotes) {
  if (!Array.isArray(existingNotes)) {
    return Array.isArray(nextNotes) ? nextNotes : []
  }

  const seenIds = new Set(existingNotes.map((item) => item?.id || item?.noteId).filter(Boolean))
  const additions = Array.isArray(nextNotes)
    ? nextNotes.filter((item) => {
      const itemId = item?.id || item?.noteId
      return itemId && !seenIds.has(itemId)
    })
    : []

  return [...existingNotes, ...additions]
}

function normalizeNoteId(note) {
  return String(note?.id || note?.noteId || '').trim()
}

function syncShareStateInCollection(collection, noteId, isShared, shareData = {}) {
  if (!Array.isArray(collection) || !noteId) {
    return collection
  }

  return collection.map((item) => {
    const itemId = normalizeNoteId(item)
    if (itemId !== noteId) {
      return item
    }

    if (isShared) {
      return {
        ...item,
        ...shareData,
        id: item?.id || shareData.id || shareData.noteId || noteId,
        noteId: item?.noteId || shareData.noteId || noteId,
        isShared: true,
      }
    }

    const nextItem = {
      ...item,
      ...shareData,
      isShared: false,
    }

    delete nextItem.shareCode
    delete nextItem.shareUrl
    delete nextItem.shareType
    delete nextItem.shareUsers
    delete nextItem.shareUserList
    delete nextItem.sharedAt

    return nextItem
  })
}

function createPaginationState() {
  return {
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  }
}

function resolvePagination(data, page, pageSize, items) {
  const total = Number(data?.total) || items.length || 0
  const currentPage = Number(data?.page) || page
  const size = Number(data?.size) || pageSize

  return {
    page: currentPage,
    pageSize: size,
    total,
    hasMore: currentPage * size < total,
  }
}

const useNoteStore = create((set, get) => ({
  notes: [],
  notesPagination: createPaginationState(),
  currentNote: null,
  starredNotes: [],
  starredNotesPagination: createPaginationState(),
  myShares: [],
  mySharesPagination: createPaginationState(),
  deletedNotes: [],
  deletedNotesPagination: createPaginationState(),
  isLoading: false,
  isNotesLoadingMore: false,
  isStarredNotesLoadingMore: false,
  isMySharesLoadingMore: false,
  isDeletedNotesLoadingMore: false,
  hasLoadedNotes: false,
  hasLoadedStarredNotes: false,
  hasLoadedMyShares: false,
  hasLoadedDeletedNotes: false,
  error: null,

  fetchNotes: async (params = {}) => {
    const {
      page = 1,
      pageSize = 20,
      append = page > 1,
      ...restParams
    } = params

    set({
      isLoading: append ? get().isLoading : true,
      isNotesLoadingMore: append,
      error: null,
    })
    try {
      const data = await noteService.getNotes({
        page,
        pageSize,
        ...restParams,
      })
      const items = normalizeCollection(data)

      set((state) => {
        const nextNotes = append
          ? mergeUniqueNotes(state.notes, items)
          : items

        return {
          notes: nextNotes,
          notesPagination: resolvePagination(data, page, pageSize, items),
          isLoading: false,
          isNotesLoadingMore: false,
        }
      })
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
        isNotesLoadingMore: false,
      })
    } finally {
      set({ hasLoadedNotes: true })
    }
  },

  loadMoreNotes: async (params = {}) => {
    const { notesPagination } = get()

    if (!notesPagination.hasMore || get().isNotesLoadingMore) {
      return
    }

    await get().fetchNotes({
      ...params,
      page: notesPagination.page + 1,
      pageSize: notesPagination.pageSize,
      append: true,
    })
  },

  loadNoteById: async (id) => {
    if (!id) {
      set({ currentNote: null })
      return null
    }

    if (inFlightNoteDetails.has(id)) {
      return inFlightNoteDetails.get(id)
    }

    set({ isLoading: true, error: null })
    const requestPromise = noteService.getNoteById(id)
      .then((note) => {
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
      })
      .catch((error) => {
        set({ currentNote: null, error: error.message, isLoading: false })
        throw error
      })
      .finally(() => {
        inFlightNoteDetails.delete(id)
      })

    inFlightNoteDetails.set(id, requestPromise)

    return requestPromise
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
      const items = normalizeCollection(data)

      set((state) => {
        const mergedItems = append
          ? mergeUniqueNotes(state.starredNotes, items)
          : items

        return {
          starredNotes: mergedItems,
          starredNotesPagination: resolvePagination(data, page, pageSize, items),
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
    } finally {
      set({ hasLoadedStarredNotes: true })
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

  fetchMyShares: async (params = {}) => {
    const {
      page = 1,
      pageSize = 20,
      append = page > 1,
    } = params

    set({
      isLoading: append ? get().isLoading : true,
      isMySharesLoadingMore: append,
      error: null,
    })
    try {
      const data = await noteService.getMyShares({
        page,
        pageSize,
      })
      const items = normalizeCollection(data)
      set((state) => ({
        myShares: append ? mergeUniqueNotes(state.myShares, items) : items,
        mySharesPagination: resolvePagination(data, page, pageSize, items),
        isLoading: false,
        isMySharesLoadingMore: false,
      }))
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
        isMySharesLoadingMore: false,
      })
    } finally {
      set({ hasLoadedMyShares: true })
    }
  },

  loadMoreMyShares: async () => {
    const { mySharesPagination } = get()

    if (!mySharesPagination.hasMore || get().isMySharesLoadingMore) {
      return
    }

    await get().fetchMyShares({
      page: mySharesPagination.page + 1,
      pageSize: mySharesPagination.pageSize,
      append: true,
    })
  },

  fetchDeletedNotes: async (params = {}) => {
    const {
      page = 1,
      pageSize = 20,
      append = page > 1,
    } = params

    set({
      isLoading: append ? get().isLoading : true,
      isDeletedNotesLoadingMore: append,
      error: null,
    })
    try {
      const data = await noteService.getDeletedNotes({
        page,
        pageSize,
      })
      const items = normalizeCollection(data)
      set((state) => ({
        deletedNotes: append ? mergeUniqueNotes(state.deletedNotes, items) : items,
        deletedNotesPagination: resolvePagination(data, page, pageSize, items),
        isLoading: false,
        isDeletedNotesLoadingMore: false,
      }))
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
        isDeletedNotesLoadingMore: false,
      })
    } finally {
      set({ hasLoadedDeletedNotes: true })
    }
  },

  loadMoreDeletedNotes: async () => {
    const { deletedNotesPagination } = get()

    if (!deletedNotesPagination.hasMore || get().isDeletedNotesLoadingMore) {
      return
    }

    await get().fetchDeletedNotes({
      page: deletedNotesPagination.page + 1,
      pageSize: deletedNotesPagination.pageSize,
      append: true,
    })
  },

  setCurrentNote: (note) => set({ currentNote: note }),

  syncNoteShareState: (noteId, isShared, shareData = {}) => {
    const normalizedNoteId = String(noteId || '').trim()
    if (!normalizedNoteId) {
      return
    }

    set((state) => ({
      notes: syncShareStateInCollection(state.notes, normalizedNoteId, isShared, shareData),
      starredNotes: syncShareStateInCollection(state.starredNotes, normalizedNoteId, isShared, shareData),
      myShares: syncShareStateInCollection(state.myShares, normalizedNoteId, isShared, shareData),
      deletedNotes: syncShareStateInCollection(state.deletedNotes, normalizedNoteId, isShared, shareData),
      currentNote: normalizeNoteId(state.currentNote) === normalizedNoteId
        ? syncShareStateInCollection([state.currentNote], normalizedNoteId, isShared, shareData)[0]
        : state.currentNote,
    }))
  },

  importDocumentArchive: async (file) => {
    set({ isLoading: true, error: null })
    try {
      const imported = await noteService.importDocumentArchive(file)
      set({ isLoading: false })
      return imported
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  getImportTask: async (taskId) => noteService.getImportTask(taskId),

  getImportTasks: async () => noteService.getImportTasks(),

  getImportTaskPollIntervalMs: async () => noteService.getImportTaskPollIntervalMs(),

  getImportTaskTimeoutMs: async () => noteService.getImportTaskTimeoutMs(),

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
        notesPagination: {
          ...state.notesPagination,
          total: state.notesPagination.total + 1,
          hasMore:
            state.notesPagination.total + 1
            > state.notesPagination.page * state.notesPagination.pageSize,
        },
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
        starredNotes: state.starredNotes.map((n) => (n.id === id ? { ...n, title: name } : n)),
        myShares: state.myShares.map((n) => (
          (n.id === id || n.noteId === id)
            ? { ...n, title: name, noteTitle: name }
            : n
        )),
        deletedNotes: state.deletedNotes.map((n) => (n.id === id ? { ...n, title: name } : n)),
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
          notesPagination: {
            ...state.notesPagination,
            total: Math.max(0, state.notesPagination.total - 1),
            hasMore:
              Math.max(0, state.notesPagination.total - 1)
              > state.notesPagination.page * state.notesPagination.pageSize,
          },
          starredNotes: state.starredNotes.filter((n) => n.id !== id),
          myShares: state.myShares.filter((item) => item.id !== id && item.noteId !== id),
          mySharesPagination: {
            ...state.mySharesPagination,
            total: state.myShares.some((item) => item.id === id || item.noteId === id)
              ? Math.max(0, state.mySharesPagination.total - 1)
              : state.mySharesPagination.total,
            hasMore:
              state.myShares.some((item) => item.id === id || item.noteId === id)
                ? Math.max(0, state.mySharesPagination.total - 1)
                  > state.mySharesPagination.page * state.mySharesPagination.pageSize
                : state.mySharesPagination.hasMore,
          },
          deletedNotes: nextDeletedNotes,
          deletedNotesPagination: deletedNote
            ? {
              ...state.deletedNotesPagination,
              total: state.deletedNotesPagination.total + 1,
              hasMore:
                state.deletedNotesPagination.total + 1
                > state.deletedNotesPagination.page * state.deletedNotesPagination.pageSize,
            }
            : state.deletedNotesPagination,
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
        deletedNotesPagination: {
          ...state.deletedNotesPagination,
          total: Math.max(0, state.deletedNotesPagination.total - 1),
          hasMore:
            Math.max(0, state.deletedNotesPagination.total - 1)
            > state.deletedNotesPagination.page * state.deletedNotesPagination.pageSize,
        },
        notesPagination: {
          ...state.notesPagination,
          total: state.notesPagination.total + 1,
          hasMore:
            state.notesPagination.total + 1
            > state.notesPagination.page * state.notesPagination.pageSize,
        },
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
        deletedNotesPagination: {
          ...state.deletedNotesPagination,
          total: Math.max(0, state.deletedNotesPagination.total - 1),
          hasMore:
            Math.max(0, state.deletedNotesPagination.total - 1)
            > state.deletedNotesPagination.page * state.deletedNotesPagination.pageSize,
        },
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
      set({
        deletedNotes: [],
        deletedNotesPagination: createPaginationState(),
        isLoading: false,
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  toggleStar: async (note) => {
    const previousIsStarred = Boolean(note.isStarred)
    const nextIsStarred = !previousIsStarred

    const applyStarState = (state, starred) => ({
      notes: state.notes.map((n) =>
        n.id === note.id ? { ...n, isStarred: starred } : n
      ),
      starredNotes: starred
        ? (
          state.starredNotes.some((n) => n.id === note.id)
            ? state.starredNotes.map((n) =>
              n.id === note.id ? { ...n, isStarred: true } : n
            )
            : [{ ...note, isStarred: true }, ...state.starredNotes]
        )
        : state.starredNotes.filter((n) => n.id !== note.id),
      starredNotesPagination: starred
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
          ? { ...state.currentNote, isStarred: starred }
          : state.currentNote,
    })

    set((state) => applyStarState(state, nextIsStarred))

    try {
      if (previousIsStarred) {
        await noteService.unstarNote(note.id)
      } else {
        await noteService.starNote(note.id)
      }
    } catch (error) {
      set((state) => applyStarState(state, previousIsStarred))
      set({ error: error.message })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))

export default useNoteStore
