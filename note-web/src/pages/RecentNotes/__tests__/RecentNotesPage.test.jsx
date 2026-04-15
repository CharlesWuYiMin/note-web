import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecentNotesPage from '@/pages/RecentNotes/RecentNotesPage'
import useNoteStore from '@/store/useNoteStore'

const mockNotes = [
  {
    id: '1',
    title: '关于产品架构的深度思考',
    type: 'text',
    notebookName: '我的笔记',
    isStarred: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '客户访谈：创意总监',
    type: 'text',
    notebookName: '会议笔记',
    isStarred: false,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

vi.mock('@/hooks/useNote', () => ({
  default: () => ({
    notes: useNoteStore((s) => s.notes),
    isLoading: useNoteStore((s) => s.isLoading),
    fetchNotes: useNoteStore((s) => s.fetchNotes),
    toggleStar: useNoteStore((s) => s.toggleStar),
  }),
}))

describe('RecentNotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNoteStore.setState({
      notes: mockNotes,
      currentNote: null,
      isLoading: false,
      error: null,
    })
  })

  it('should render page title', () => {
    render(<RecentNotesPage />)

    expect(screen.getByText(/recentNotes/i)).toBeInTheDocument()
  })

  it('should display all notes from store', () => {
    render(<RecentNotesPage />)

    mockNotes.forEach(note => {
      expect(screen.getByText(note.title)).toBeInTheDocument()
    })
  })

  it('should show empty state when no notes', () => {
    useNoteStore.setState({ notes: [] })

    render(<RecentNotesPage />)

    expect(screen.getByText(/empty/i)).toBeInTheDocument()
  })

  it('should show loading spinner when loading', () => {
    useNoteStore.setState({ isLoading: true })

    render(<RecentNotesPage />)

    expect(screen.getByRole('spinner')).toBeInTheDocument()
  })

  it('should call fetchNotes on mount', () => {
    const spy = vi.spyOn(useNoteStore.getState(), 'fetchNotes')

    render(<RecentNotesPage />)

    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  it('should display correct note type icon for text type', () => {
    render(<RecentNotesPage />)

    const textIcon = screen.getAllByTestId('type-icon')[0]
    expect(textIcon).toBeInTheDocument()
  })

  it('should highlight starred notes with primary color', () => {
    render(<RecentNotesPage />)

    const starredNoteTitle = screen.getByText(mockNotes[0].title)
    expect(starredNoteTitle.style.fontWeight).toBe('700')
  })

  it('should display notebook name as tag when available', () => {
    render(<RecentNotesPage />)

    mockNotes.forEach(note => {
      if (note.notebookName) {
        expect(screen.getByText(note.notebookName)).toBeInTheDocument()
      }
    })
  })

  it('should show star filled icon for starred notes', () => {
    render(<RecentNotesPage />)

    const starButtons = screen.getAllByRole('button')
    const starredButton = starButtons.find(btn =>
      btn.querySelector('[data-icon="star"]') ||
      btn.innerHTML.includes('StarFilled')
    )
    expect(starredButton).toBeTruthy()
  })

  it('should handle star toggle on button click', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(useNoteStore.getState(), 'toggleStar')

    render(<RecentNotesPage />)

    const starButton = screen.getAllByRole('button')[0]
    await user.click(starButton)

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(mockNotes[0])
    })

    spy.mockRestore()
  })

  it('should format dates correctly', () => {
    render(<RecentNotesPage />)

    const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('should have share and more action buttons for each note', () => {
    render(<RecentNotesPage />)

    const actionButtons = screen.getAllByRole('button')
    expect(actionButtons.length).toBeGreaterThanOrEqual(mockNotes.length * 3)
  })
})
