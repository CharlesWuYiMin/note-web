import { create } from 'zustand'
import notebookService from '@/services/notebookService'

function normalizeNotebookCollection(data) {
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

const useNotebookStore = create((set, get) => ({
  notebooks: [],
  currentNotebook: null,
  isLoading: false,
  error: null,

  fetchNotebooks: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await notebookService.getNotebooks()
      set({
        notebooks: normalizeNotebookCollection(data),
        isLoading: false,
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  setCurrentNotebook: (notebook) => set({ currentNotebook: notebook }),

  createNotebook: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const created = await notebookService.createNotebook(data)
      const newNotebook = created && typeof created === 'object'
        ? created
        : {
          id: `temp-${Date.now()}`,
          ...data,
          noteCount: 0,
          isDefault: false,
        }
      set((state) => ({
        notebooks: [...state.notebooks, newNotebook],
        isLoading: false,
      }))
      return newNotebook
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateNotebook: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await notebookService.updateNotebook(id, data)
      set((state) => ({
        notebooks: state.notebooks.map((nb) =>
          nb.id === id ? { ...nb, ...data, ...(updated || {}) } : nb
        ),
        currentNotebook:
          state.currentNotebook?.id === id
            ? { ...state.currentNotebook, ...data, ...(updated || {}) }
            : state.currentNotebook,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteNotebook: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await notebookService.deleteNotebook(id)
      set((state) => ({
        notebooks: state.notebooks.filter((nb) => nb.id !== id),
        currentNotebook:
          state.currentNotebook?.id === id ? null : state.currentNotebook,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))

export default useNotebookStore
