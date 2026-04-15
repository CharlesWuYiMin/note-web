import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AIPanel from '@/components/ai/AIPanel'

const mockChat = vi.fn()

vi.mock('@/services/aiService', () => ({
  default: {
    chat: mockChat,
    summarize: vi.fn(),
    translate: vi.fn(),
  },
}))

describe('AIPanel', () => {
  const defaultProps = {
    noteId: 'note-123',
    content: '测试内容',
    visible: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render AI panel when visible is true', () => {
    render(<AIPanel {...defaultProps} />)

    expect(screen.getByText(/ai assistant/i)).toBeInTheDocument()
  })

  it('should not render when visible is false', () => {
    render(<AIPanel {...defaultProps} visible={false} />)

    expect(screen.queryByText(/ai assistant/i)).not.toBeInTheDocument()
  })

  it('should display feature option cards', () => {
    render(<AIPanel {...defaultProps} />)

    expect(screen.getByText(/summarize/i)).toBeInTheDocument()
    expect(screen.getByText(/translate/i)).toBeInTheDocument()
    expect(screen.getByText(/continue writing/i)).toBeInTheDocument()
    expect(screen.getByText(/polish/i)).toBeInTheDocument()
  })

  it('should have input field for custom message', () => {
    render(<AIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText(/ask ai/i)
    expect(input).toBeInTheDocument()
  })

  it('should send message when send button clicked', async () => {
    const user = userEvent.setup()
    mockChat.mockResolvedValue({ reply: 'AI回复' })

    render(<AIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText(/ask ai/i)
    await user.type(input, '请帮我总结')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockChat).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '请帮我总结',
          noteId: 'note-123',
        })
      )
    })
  })

  it('should display AI response after sending message', async () => {
    const user = userEvent.setup()
    mockChat.mockResolvedValue({ reply: '这是AI生成的摘要...' })

    render(<AIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText(/ask ai/i)
    await user.type(input, '总结')
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('这是AI生成的摘要...')).toBeInTheDocument()
    })
  })

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<AIPanel {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should show loading state while waiting for response', async () => {
    let resolvePromise
    mockChat.mockImplementation(() => new Promise((resolve) => {
      resolvePromise = resolve
    }))

    render(<AIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText(/ask ai/i)
    await userEvent.setup().type(input, 'test')
    await userEvent.setup().click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByRole('status')).toBeInTheDocument()

    resolvePromise({ reply: 'done' })
  })
})
