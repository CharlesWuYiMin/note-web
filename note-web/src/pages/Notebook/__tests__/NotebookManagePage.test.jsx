import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotebookManagePage from '@/pages/Notebook/NotebookManagePage'
import useNotebookStore from '@/store/useNotebookStore'

const mockNotebooks = [
  { id: '1', name: '我的笔记', description: '默认笔记本', noteCount: 10, isDefault: true },
  { id: '2', name: '工作笔记', description: '工作相关', noteCount: 5, isDefault: false },
  { id: '3', name: '学习笔记', isDefault: false, noteCount: 8 },
]

vi.mock('@/hooks/useNotebook', () => ({
  default: () => ({
    notebooks: useNotebookStore((s) => s.notebooks),
    isLoading: useNotebookStore((s) => s.isLoading),
    fetchNotebooks: useNotebookStore((s) => s.fetchNotebooks),
    createNotebook: useNotebookStore((s) => s.createNotebook),
    updateNotebook: useNotebookStore((s) => s.updateNotebook),
    deleteNotebook: useNotebookStore((s) => s.deleteNotebook),
  }),
}))

describe('NotebookManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotebookStore.setState({
      notebooks: mockNotebooks,
      currentNotebook: null,
      isLoading: false,
      error: null,
    })
  })

  it('should render page title and create button', () => {
    render(<NotebookManagePage />)

    expect(screen.getByText(/notebook.title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('should display all notebooks in grid layout', () => {
    render(<NotebookManagePage />)

    mockNotebooks.forEach(notebook => {
      expect(screen.getByText(notebook.name)).toBeInTheDocument()
    })
  })

  it('should show loading spinner when loading', () => {
    useNotebookStore.setState({ isLoading: true })

    render(<NotebookManagePage />)

    expect(screen.getByRole('spinner')).toBeInTheDocument()
  })

  it('should show empty state when no notebooks', () => {
    useNotebookStore.setState({ notebooks: [] })

    render(<NotebookManagePage />)

    expect(screen.getByText(/empty/i)).toBeInTheDocument()
  })

  it('should open create modal when clicking create button', async () => {
    const user = userEvent.setup()
    render(<NotebookManagePage />)

    const createButton = screen.getByRole('button', { name: /create/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/create/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })
  })

  it('should display correct notebook count for each card', () => {
    render(<NotebookManagePage />)

    mockNotebooks.forEach(notebook => {
      if (notebook.noteCount) {
        expect(screen.getByText(new RegExp(notebook.noteCount.toString()))).toBeInTheDocument()
      }
    })
  })

  it('should call fetchNotebooks on mount', () => {
    const spy = vi.spyOn(useNotebookStore.getState(), 'fetchNotebooks')

    render(<NotebookManagePage />)

    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })
})
