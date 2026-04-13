import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/common/EmptyState'

describe('EmptyState', () => {
  it('should render with default message', () => {
    render(<EmptyState />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('should render with custom description', () => {
    render(<EmptyState description="暂无笔记" />)

    expect(screen.getByText('暂无笔记')).toBeInTheDocument()
  })

  it('should render custom icon', () => {
    const { container } = render(
      <EmptyState icon={<span data-testid="custom-icon">📝</span>} />
    )

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('should render action button when provided', () => {
    render(<EmptyState action={<button>创建笔记</button>} />)

    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('should apply size prop correctly', () => {
    const { container } = render(<EmptyState size="large" />)

    const emptyElement = container.querySelector('.ant-empty-normal')
    expect(emptyElement).toBeInTheDocument()
  })
})
