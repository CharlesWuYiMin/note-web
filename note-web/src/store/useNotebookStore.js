import { create } from 'zustand'
import notebookService from '@/services/notebookService'
import { getItem, setItem } from '@/utils/storageUtils'

const NOTEBOOK_ORDER_STORAGE_KEY = 'cloudnote:notebook-order'

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

function readNotebookOrder() {
  const storedOrder = getItem(NOTEBOOK_ORDER_STORAGE_KEY, [])
  return Array.isArray(storedOrder)
    ? storedOrder.filter((id) => typeof id === 'string' && id.length > 0)
    : []
}

function persistNotebookOrder(orderIds) {
  setItem(NOTEBOOK_ORDER_STORAGE_KEY, orderIds)
}

function normalizeNotebookOrder(notebooks, orderIds = []) {
  const notebookMap = new Map(notebooks.map((notebook) => [notebook.id, notebook]))
  const defaultNotebooks = notebooks.filter((notebook) => notebook.isDefault)
  const movableNotebooks = notebooks.filter((notebook) => !notebook.isDefault)
  const preservedOrderIds = orderIds.filter((id) => notebookMap.has(id) && !notebookMap.get(id)?.isDefault)
  const remainingIds = movableNotebooks
    .map((notebook) => notebook.id)
    .filter((id) => !preservedOrderIds.includes(id))
  const nextOrderIds = [...preservedOrderIds, ...remainingIds]

  return {
    notebooks: [
      ...defaultNotebooks,
      ...nextOrderIds.map((id) => notebookMap.get(id)).filter(Boolean),
    ],
    orderIds: nextOrderIds,
  }
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
      const normalized = normalizeNotebookOrder(normalizeNotebookCollection(data), readNotebookOrder())
      persistNotebookOrder(normalized.orderIds)
      set({
        notebooks: normalized.notebooks,
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
      const nextNotebookState = normalizeNotebookOrder(
        [...get().notebooks, newNotebook],
        readNotebookOrder()
      )
      persistNotebookOrder(nextNotebookState.orderIds)
      set({
        notebooks: nextNotebookState.notebooks,
        isLoading: false,
      })
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
      const nextNotebookState = normalizeNotebookOrder(
        get().notebooks.filter((notebook) => notebook.id !== id),
        readNotebookOrder()
      )
      persistNotebookOrder(nextNotebookState.orderIds)
      set((state) => ({
        notebooks: nextNotebookState.notebooks,
        currentNotebook:
          state.currentNotebook?.id === id ? null : state.currentNotebook,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  moveNotebook: (id, direction) => {
    const state = get()
    const movableNotebooks = state.notebooks.filter((notebook) => !notebook.isDefault)
    const currentIndex = movableNotebooks.findIndex((notebook) => notebook.id === id)

    if (currentIndex < 0) {
      return
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= movableNotebooks.length) {
      return
    }

    const nextMovableNotebooks = [...movableNotebooks]
    ;[nextMovableNotebooks[currentIndex], nextMovableNotebooks[targetIndex]] = [
      nextMovableNotebooks[targetIndex],
      nextMovableNotebooks[currentIndex],
    ]

    persistNotebookOrder(nextMovableNotebooks.map((notebook) => notebook.id))
    set({
      notebooks: [
        ...state.notebooks.filter((notebook) => notebook.isDefault),
        ...nextMovableNotebooks,
      ],
    })
  },

  clearError: () => set({ error: null }),
}))

export default useNotebookStore
