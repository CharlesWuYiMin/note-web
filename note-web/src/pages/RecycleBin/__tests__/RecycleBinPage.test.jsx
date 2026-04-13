import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecycleBinPage from '@/pages/RecycleBin/RecycleBinPage'

const mockDeletedNotes = [
  {
    id: '1',
    title: '已删除笔记1',
    notebookName: '我的笔记',
    deletedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '已删除笔记2',
    notebookName: '工作笔记',
    deletedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

vi.mock('@/store/useNoteStore', () => ({
  default: () => ({
    deletedNotes: mockDeletedNotes,
    isLoading: false,
    fetchDeletedNotes: vi.fn(),
    restoreNote: vi.fn().mockResolvedValue({ success: true }),
    permanentDeleteNote: vi.fn().mockResolvedValue({ success: true }),
    clearRecycleBin: vi.fn().mockResolvedValue({ success: true }),
  }),
}))

describe('RecycleBinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render page title', () => {
    render(<RecycleBinPage />)

    expect(screen.getByText(/recycleBin/i)).toBeInTheDocument()
  })

  it('should display all deleted notes', () => {
    render(<RecycleBinPage />)

    mockDeletedNotes.forEach(note => {
      expect(screen.getByText(note.title)).toBeInTheDocument()
    })
  })

  it('should show empty state when no deleted notes', () => {
    const mockEmpty = []
    vi.mocked(require('@/store/useNoteStore').default).mockReturnValue({
      deletedNotes: mockEmpty,
      isLoading: false,
      fetchDeletedNotes: vi.fn(),
      restoreNote: vi.fn(),
      permanentDeleteNote: vi.fn(),
      clearRecycleBin: vi.fn(),
    })

    render(<RecycleBinPage />)

    expect(screen.getByText(/empty/i)).toBeInTheDocument()
  })

  it('should call fetchDeletedNotes on mount', () => {
    const spy = vi.spyOn(require('@/store/useNoteStore').default(), 'fetchDeletedNotes')

    render(<RecycleBinPage />)

    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  it('should display delete date for each note', () => {
    render(<RecycleBinPage />)

    const dates = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(dates.length).toBeGreaterThanOrEqual(mockDeletedNotes.length)
  })

  it('should have restore button for each note', () => {
    render(<RecycleBinPage />)

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i })
    expect(restoreButtons.length).toBe(mockDeletedNotes.length)
  })

  it('should have permanent delete button for each note', async () => {
    render(<RecycleBinPage />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBe(mockDeletedNotes.length)
  })

  it('should handle restore action on button click', async () => {
    const user = userEvent.setup()
    const restoreSpy = vi.fn()

    vi.mocked(require('@/store/useNoteStore').default).mockReturnValue({
      deletedNotes: mockDeletedNotes,
      isLoading: false,
      fetchDeletedNotes: vi.fn(),
      restoreNote: restoreSpy.mockResolvedValue({ success: true }),
      permanentDeleteNote: vi.fn(),
      clearRecycleBin: vi.fn(),
    })

    render(<RecycleBinPage />)

    const restoreButton = screen.getAllByRole('button', { name: /restore/i })[0]
    await user.click(restoreButton)

    await waitFor(() => {
      expect(restoreSpy).toHaveBeenCalledWith(mockDeletedNotes[0].id)
    })
  })

  it('should have clear all button when notes exist', () => {
    render(<RecycleBinPage />)

    expect(screen.getByText(/clearAll/i)).toBeInTheDocument()
  })
})
