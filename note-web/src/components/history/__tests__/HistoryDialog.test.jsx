import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HistoryDialog from '@/components/history/HistoryDialog'

const mockOnClose = vi.fn()
const mockGetHistory = vi.fn()
const mockRestoreVersion = vi.fn()

vi.mock('@/services/historyService', () => ({
  default: {
    getNoteHistory: mockGetHistory,
    restoreVersion: mockRestoreVersion,
  },
}))

describe('HistoryDialog', () => {
  const defaultProps = {
    open: true,
    noteId: 'note-123',
    onClose: mockOnClose,
  }

  const mockHistory = [
    { version: 3, content: '最新版本', createdAt: new Date().toISOString() },
    { version: 2, content: '中间版本', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { version: 1, content: '初始版本', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dialog when open is true', () => {
    render(<HistoryDialog {...defaultProps} />)

    expect(screen.getByText(/history/i)).toBeInTheDocument()
  })

  it('should fetch history on mount', () => {
    render(<HistoryDialog {...defaultProps} />)

    expect(mockGetHistory).toHaveBeenCalledWith('note-123')
  })

  it('should display history list with versions', async () => {
    mockGetHistory.mockResolvedValue(mockHistory)
    
    render(<HistoryDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/version 3/i)).toBeInTheDocument()
      expect(screen.getByText(/version 2/i)).toBeInTheDocument()
      expect(screen.getByText(/version 1/i)).toBeInTheDocument()
    })
  })

  it('should show empty state when no history', async () => {
    mockGetHistory.mockResolvedValue([])
    
    render(<HistoryDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/empty/i)).toBeInTheDocument()
    })
  })

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(<HistoryDialog {...defaultProps} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should have restore button for each history item', async () => {
    mockGetHistory.mockResolvedValue(mockHistory)
    
    render(<HistoryDialog {...defaultProps} />)

    await waitFor(() => {
      const restoreButtons = screen.getAllByRole('button', { name: /restore/i })
      expect(restoreButtons.length).toBe(mockHistory.length)
    })
  })

  it('should handle restore action correctly', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue(mockHistory)
    mockRestoreVersion.mockResolvedValue({ success: true })

    render(<HistoryDialog {...defaultProps} />)

    await waitFor(async () => {
      const restoreButton = screen.getAllByRole('button', { name: /restore/i })[0]
      await user.click(restoreButton)
      
      expect(mockRestoreVersion).toHaveBeenCalledWith('note-123', 3)
    })
  })

  it('should show loading state while fetching', () => {
    let resolvePromise
    mockGetHistory.mockImplementation(() => new Promise((resolve) => {
      resolvePromise = resolve
    }))

    render(<HistoryDialog {...defaultProps} />)

    expect(screen.getByRole('status')).toBeInTheDocument()

    resolvePromise([])
  })
})
