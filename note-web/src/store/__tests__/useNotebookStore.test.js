import { describe, it, expect, vi, beforeEach } from 'vitest'
import useNotebookStore from '@/store/useNotebookStore'

const {
  mockGetNotebooks,
  mockCreateNotebook,
  mockUpdateNotebook,
  mockDeleteNotebook,
} = vi.hoisted(() => ({
  mockGetNotebooks: vi.fn(),
  mockCreateNotebook: vi.fn(),
  mockUpdateNotebook: vi.fn(),
  mockDeleteNotebook: vi.fn(),
}))

vi.mock('@/services/notebookService', () => ({
  default: {
    getNotebooks: mockGetNotebooks,
    createNotebook: mockCreateNotebook,
    updateNotebook: mockUpdateNotebook,
    deleteNotebook: mockDeleteNotebook,
  },
}))

describe('useNotebookStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useNotebookStore.setState({
      notebooks: [],
      currentNotebook: null,
      isLoading: false,
      error: null,
    })
  })

  it('stores notebooks from array responses', async () => {
    const mockNotebooks = [
      { id: '1', name: 'Default notebook', isDefault: true },
      { id: '2', name: 'Work', isDefault: false },
    ]
    mockGetNotebooks.mockResolvedValue(mockNotebooks)

    await useNotebookStore.getState().fetchNotebooks()

    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks)
  })

  it('stores notebooks from data responses', async () => {
    const mockNotebooks = [{ id: '1', name: 'Default notebook', isDefault: true }]
    mockGetNotebooks.mockResolvedValue({ data: mockNotebooks })

    await useNotebookStore.getState().fetchNotebooks()

    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks)
  })

  it('stores notebooks from items responses', async () => {
    const mockNotebooks = [{ id: '1', name: 'Default notebook', isDefault: true }]
    mockGetNotebooks.mockResolvedValue({ items: mockNotebooks, total: 1 })

    await useNotebookStore.getState().fetchNotebooks()

    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks)
  })

  it('deduplicates concurrent notebook fetch requests', async () => {
    let resolveRequest
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve
    })
    mockGetNotebooks.mockReturnValue(requestPromise)

    const firstCall = useNotebookStore.getState().fetchNotebooks()
    const secondCall = useNotebookStore.getState().fetchNotebooks()

    expect(secondCall).toBe(firstCall)
    expect(mockGetNotebooks).toHaveBeenCalledTimes(1)

    resolveRequest({ data: [{ id: '1', name: 'Default notebook', isDefault: true }] })
    await firstCall

    expect(useNotebookStore.getState().notebooks).toHaveLength(1)
  })

  it('creates notebook and appends fallback fields when service returns nullish', async () => {
    mockCreateNotebook.mockResolvedValue(null)

    const result = await useNotebookStore.getState().createNotebook({ name: 'New notebook' })

    expect(result.name).toBe('New notebook')
    expect(useNotebookStore.getState().notebooks).toHaveLength(1)
  })

  it('updates notebook with request payload when API returns null', async () => {
    useNotebookStore.setState({
      notebooks: [{ id: '1', name: 'Original', description: '' }],
      currentNotebook: { id: '1', name: 'Original', description: '' },
    })
    mockUpdateNotebook.mockResolvedValue(null)

    await useNotebookStore.getState().updateNotebook('1', { name: 'Updated' })

    expect(useNotebookStore.getState().notebooks[0].name).toBe('Updated')
    expect(useNotebookStore.getState().currentNotebook.name).toBe('Updated')
  })

  it('removes notebook from list after delete', async () => {
    useNotebookStore.setState({
      notebooks: [
        { id: '1', name: 'To delete' },
        { id: '2', name: 'Keep' },
      ],
      currentNotebook: { id: '1', name: 'To delete' },
    })
    mockDeleteNotebook.mockResolvedValue({ success: true })

    await useNotebookStore.getState().deleteNotebook('1')

    expect(useNotebookStore.getState().notebooks).toEqual([{ id: '2', name: 'Keep' }])
    expect(useNotebookStore.getState().currentNotebook).toBeNull()
  })

  it('moves notebooks up and down while keeping the default notebook first', () => {
    useNotebookStore.setState({
      notebooks: [
        { id: 'default', name: 'Default notebook', isDefault: true },
        { id: 'a', name: 'A', isDefault: false },
        { id: 'b', name: 'B', isDefault: false },
        { id: 'c', name: 'C', isDefault: false },
      ],
      currentNotebook: null,
    })

    useNotebookStore.getState().moveNotebook('b', 'up')
    expect(useNotebookStore.getState().notebooks.map((item) => item.id)).toEqual(['default', 'b', 'a', 'c'])

    useNotebookStore.getState().moveNotebook('b', 'down')
    expect(useNotebookStore.getState().notebooks.map((item) => item.id)).toEqual(['default', 'a', 'b', 'c'])
  })
})
