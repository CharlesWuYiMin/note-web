import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SharePanelDialog from '@/components/share/SharePanelDialog'

const mockOnClose = vi.fn()
const {
  mockCreateShare,
  mockDeleteShare,
  mockListMyShares,
} = vi.hoisted(() => ({
  mockCreateShare: vi.fn(),
  mockDeleteShare: vi.fn(),
  mockListMyShares: vi.fn(),
}))

vi.mock('@/services/shareService', () => ({
  default: {
    createShare: mockCreateShare,
    deleteShare: mockDeleteShare,
    listMyShares: mockListMyShares,
  },
}))

describe('ShareDialog', () => {
  const defaultProps = {
    open: true,
    noteId: 'note-123',
    onClose: mockOnClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockListMyShares.mockResolvedValue([])
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('should render dialog when open is true', () => {
    render(<SharePanelDialog {...defaultProps} />)

    expect(screen.getByText('分享笔记')).toBeInTheDocument()
  })

  it('should not render when open is false', () => {
    render(<SharePanelDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('分享笔记')).not.toBeInTheDocument()
  })

  it('should open sharing and show share link after successful creation', async () => {
    const user = userEvent.setup()
    mockCreateShare.mockResolvedValue({
      shareCode: 'abc123',
      shareUrl: '/v1/note/shares/abc123',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await user.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(screen.getByDisplayValue(`${window.location.origin}/v1/note/shares/abc123`)).toBeInTheDocument()
    })
  })

  it('should call onClose when cancel button clicked', async () => {
    const user = userEvent.setup()
    render(<SharePanelDialog {...defaultProps} />)

    const closeButton = document.querySelector('.ant-modal-close')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should have copy to clipboard button', () => {
    render(<SharePanelDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: /复制链接/ })).toBeInTheDocument()
  })

  it('should display expiry time options', async () => {
    const user = userEvent.setup()
    render(<SharePanelDialog {...defaultProps} />)

    await user.click(screen.getAllByRole('combobox')[1])

    expect(screen.getByText('1天')).toBeInTheDocument()
    expect(screen.getByText('7天')).toBeInTheDocument()
    expect(screen.getByText('30天')).toBeInTheDocument()
    expect(screen.getByText('永久有效')).toBeInTheDocument()
  })

  it('should handle share creation error gracefully', async () => {
    const user = userEvent.setup()
    mockCreateShare.mockRejectedValue(new Error('Failed to create share'))

    render(<SharePanelDialog {...defaultProps} />)

    await user.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to create share')
    })
  })
})
