import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loading from '@/components/common/Loading'

describe('Loading', () => {
  it('should render with default text "加载中..."', () => {
    render(<Loading />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should render with custom tip', () => {
    render(<Loading tip="自定义加载提示" />)

    expect(screen.getByText('自定义加载提示')).toBeInTheDocument()
  })

  it('should apply size prop correctly', () => {
    const { container } = render(<Loading size="large" />)

    const spinner = container.querySelector('.ant-spin-lg')
    expect(spinner).toBeInTheDocument()
  })

  it('should support fullscreen mode', () => {
    const { container } = render(<Loading fullscreen />)

    const wrapper = container.querySelector('.loading-fullscreen')
    expect(wrapper).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<Loading />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'loading')
  })
})
