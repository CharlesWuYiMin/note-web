import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TextEditor from '@/components/editors/TextEditor'

const mockOnChange = vi.fn()
const mockOnSave = vi.fn()

const defaultProps = {
  value: '',
  onChange: mockOnChange,
  onSave: mockOnSave,
  placeholder: '开始输入...',
}

describe('TextEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render editor with placeholder', () => {
    render(<TextEditor {...defaultProps} />)

    const editor = screen.getByRole('textbox')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveAttribute('placeholder', '开始输入...')
  })

  it('should display initial value', () => {
    render(<TextEditor {...defaultProps} value="初始内容" />)

    expect(screen.getByText('初始内容')).toBeInTheDocument()
  })

  it('should call onChange when content changes', () => {
    render(<TextEditor {...defaultProps} />)

    const editor = screen.getByRole('textbox')
    fireEvent.change(editor, { target: { textContent: '新内容' } })

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should render toolbar buttons', () => {
    render(<TextEditor {...defaultProps} />)

    expect(screen.getByTitle('Bold')).toBeInTheDocument()
    expect(screen.getByTitle('Italic')).toBeInTheDocument()
    expect(screen.getByTitle('Underline')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument()
  })

  it('should apply bold formatting when bold button clicked', () => {
    const user = render(<TextEditor {...defaultProps} value="测试文本" />)

    const boldButton = user.getByTitle('Bold')
    fireEvent.click(boldButton)

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should handle empty value gracefully', () => {
    render(<TextEditor {...defaultProps} value="" />)

    expect(screen.getByPlaceholderText('开始输入...')).toBeInTheDocument()
  })

  it('should be focusable', () => {
    render(<TextEditor {...defaultProps} />)

    const editor = screen.getByRole('textbox')
    fireEvent.focus(editor)

    expect(editor).toHaveFocus()
  })

  it('should have correct ARIA attributes for accessibility', () => {
    render(<TextEditor {...defaultProps} aria-label="文本编辑器" />)

    const editor = screen.getByLabelText('文本编辑器')
    expect(editor).toBeInTheDocument()
  })
})
