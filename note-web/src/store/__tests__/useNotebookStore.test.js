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
    useNotebookStore.setState({
      notebooks: [],
      currentNotebook: null,
      isLoading: false,
      error: null,
    })
  })

  it('stores notebooks from array responses', async () => {
    const mockNotebooks = [
      { id: '1', name: '我的笔记', isDefault: true },
      { id: '2', name: '工作', isDefault: false },
    ]
    mockGetNotebooks.mockResolvedValue(mockNotebooks)

    await useNotebookStore.getState().fetchNotebooks()

    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks)
  })

  it('stores notebooks from data responses', async () => {
    const mockNotebooks = [{ id: '1', name: '我的笔记', isDefault: true }]
    mockGetNotebooks.mockResolvedValue({ data: mockNotebooks })

    await useNotebookStore.getState().fetchNotebooks()

    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks)
  })

  it('stores notebooks from items responses', async () => {
    const mockNotebooks = [{ id: '1', name: '我的笔记', isDefault: true }]
    mockGetNotebooks.mockResolvedValue({ items: mockNotebooks, total: 1 })

    await useNotebookStore.getState().fetchNotebooks()

    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks)
  })

  it('creates notebook and appends fallback fields when service returns nullish', async () => {
    mockCreateNotebook.mockResolvedValue(null)

    const result = await useNotebookStore.getState().createNotebook({ name: '新建笔记本' })

    expect(result.name).toBe('新建笔记本')
    expect(useNotebookStore.getState().notebooks).toHaveLength(1)
  })

  it('updates notebook with request payload when API returns null', async () => {
    useNotebookStore.setState({
      notebooks: [{ id: '1', name: '原始名称', description: '' }],
      currentNotebook: { id: '1', name: '原始名称', description: '' },
    })
    mockUpdateNotebook.mockResolvedValue(null)

    await useNotebookStore.getState().updateNotebook('1', { name: '更新后名称' })

    expect(useNotebookStore.getState().notebooks[0].name).toBe('更新后名称')
    expect(useNotebookStore.getState().currentNotebook.name).toBe('更新后名称')
  })

  it('removes notebook from list after delete', async () => {
    useNotebookStore.setState({
      notebooks: [
        { id: '1', name: '待删除' },
        { id: '2', name: '保留' },
      ],
      currentNotebook: { id: '1', name: '待删除' },
    })
    mockDeleteNotebook.mockResolvedValue({ success: true })

    await useNotebookStore.getState().deleteNotebook('1')

    expect(useNotebookStore.getState().notebooks).toEqual([{ id: '2', name: '保留' }])
    expect(useNotebookStore.getState().currentNotebook).toBeNull()
  })
})
