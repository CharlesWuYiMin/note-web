import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/common/EmptyState'

describe('EmptyState', () => {
  it('renders with the default message', () => {
    render(<EmptyState />)

    expect(screen.getAllByText(/no data/i).length).toBeGreaterThan(0)
  })

  it('renders a title and description when provided', () => {
    render(<EmptyState title="暂无笔记" description="创建后会显示在这里。" />)

    expect(screen.getByText('暂无笔记')).toBeInTheDocument()
    expect(screen.getByText('创建后会显示在这里。')).toBeInTheDocument()
  })

  it('renders a custom icon', () => {
    render(<EmptyState icon={<span data-testid="custom-icon">Icon</span>} />)

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders an action when provided', () => {
    render(<EmptyState action={<button>创建笔记</button>} />)

    expect(screen.getByRole('button', { name: '创建笔记' })).toBeInTheDocument()
  })
})
