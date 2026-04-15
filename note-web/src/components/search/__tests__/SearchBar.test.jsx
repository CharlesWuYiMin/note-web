import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '@/components/search/SearchBar'

const mockOnSearch = vi.fn()

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input with placeholder', () => {
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText(/search/i)
    expect(input).toBeInTheDocument()
  })

  it('should call onSearch when user types and presses enter', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText(/search/i)
    await user.type(input, '测试搜索')
    
    await user.keyboard('{Enter}')

    expect(mockOnSearch).toHaveBeenCalledWith('测试搜索')
  })

  it('should have clear button when input has value', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText(/search/i)
    await user.type(input, '有内容')

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('should not show clear button when input is empty', () => {
    render(<SearchBar onSearch={mockOnSearch} />)

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('should clear input when clear button clicked', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={mockOnSearch} />)

    const input = screen.getByPlaceholderText(/search/i)
    await user.type(input, '要清除的内容')
    
    const clearButton = screen.getByRole('button', { name: /clear/i })
    await user.click(clearButton)

    expect(input.value).toBe('')
  })

  it('should support custom placeholder', () => {
    render(<SearchBar onSearch={mockOnSearch} placeholder="搜索笔记..." />)

    expect(screen.getByPlaceholderText('搜索笔记...')).toBeInTheDocument()
  })

  it('should have search icon in the input', () => {
    render(<SearchBar onSearch={mockOnSearch} />)

    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
  })
})
