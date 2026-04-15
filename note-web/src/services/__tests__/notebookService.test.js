import { describe, it, expect, vi, beforeEach } from 'vitest'
import notebookService from '@/services/notebookService'

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}))

describe('NotebookService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unwraps the notebook list from response.data', async () => {
    const mockData = [
      { id: '1', name: '我的笔记', isDefault: true },
      { id: '2', name: '工作', isDefault: false },
    ]
    mockGet.mockResolvedValue({ data: mockData })

    const result = await notebookService.getNotebooks()

    expect(mockGet).toHaveBeenCalledWith('/notebooks')
    expect(result).toEqual(mockData)
  })

  it('unwraps create notebook response data', async () => {
    const newNotebook = { name: '新建笔记本' }
    const mockResponse = { id: '3', ...newNotebook }
    mockPost.mockResolvedValue({ data: mockResponse })

    const result = await notebookService.createNotebook(newNotebook)

    expect(mockPost).toHaveBeenCalledWith('/notebooks', newNotebook)
    expect(result).toEqual(mockResponse)
  })

  it('unwraps update notebook response data', async () => {
    const id = '1'
    const updateData = { name: '项目资料' }
    mockPut.mockResolvedValue({ data: null })

    const result = await notebookService.updateNotebook(id, updateData)

    expect(mockPut).toHaveBeenCalledWith(`/notebooks/${id}`, updateData)
    expect(result).toBeNull()
  })

  it('passes delete notebook through untouched', async () => {
    mockDelete.mockResolvedValue({ success: true })

    const result = await notebookService.deleteNotebook('1')

    expect(mockDelete).toHaveBeenCalledWith('/notebooks/1')
    expect(result).toEqual({ success: true })
  })
})