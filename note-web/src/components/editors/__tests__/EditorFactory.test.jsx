import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import EditorFactory from '@/components/editors/EditorFactory'

vi.mock('@/components/editors/PageEditor', () => ({
  default: function MockPageEditor(props) {
    return (
      <div
        data-testid="page-editor"
        data-type={props.type}
        data-value={props.value}
        data-placeholder={props.placeholder}
      />
    )
  },
}))

vi.mock('@/components/editors/OutlineEditor', () => ({
  default: function MockOutlineEditor(props) {
    return <div data-testid="outline-editor" data-type={props.type} />
  },
}))

vi.mock('@/components/editors/HandwrittenEditor', () => ({
  default: function MockHandwrittenEditor(props) {
    return <div data-testid="handwritten-editor" data-type={props.type} />
  },
}))

vi.mock('@/components/editors/VoiceNoteEditor', () => ({
  default: function MockVoiceNoteEditor(props) {
    return <div data-testid="voice-editor" data-type={props.type} />
  },
}))

describe('EditorFactory', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSave: vi.fn(),
  }

  it('should render TextEditor for type "text"', () => {
    render(<EditorFactory type="text" {...defaultProps} />)

    expect(screen.getByTestId('page-editor')).toBeInTheDocument()
    expect(screen.getByTestId('page-editor')).toHaveAttribute('data-type', 'text')
  })

  it('should render OutlineEditor for type "outline"', () => {
    render(<EditorFactory type="outline" {...defaultProps} />)

    expect(screen.getByTestId('outline-editor')).toBeInTheDocument()
  })

  it('should render OutlineEditor for type "mind"', () => {
    render(<EditorFactory type="mind" {...defaultProps} />)

    expect(screen.getByTestId('outline-editor')).toBeInTheDocument()
  })

  it('should render HandwrittenEditor for type "handwritten"', () => {
    render(<EditorFactory type="handwritten" {...defaultProps} />)

    expect(screen.getByTestId('handwritten-editor')).toBeInTheDocument()
  })

  it('should render VoiceNoteEditor for type "voice"', () => {
    render(<EditorFactory type="voice" {...defaultProps} />)

    expect(screen.getByTestId('voice-editor')).toBeInTheDocument()
    expect(screen.getByTestId('voice-editor')).toHaveAttribute('data-type', 'voice')
  })

  it('should fallback to TextEditor for unknown type', () => {
    render(<EditorFactory type="unknown" {...defaultProps} />)

    expect(screen.getByTestId('page-editor')).toBeInTheDocument()
  })

  it('should pass all props to the editor component', () => {
    const customValue = '测试内容'
    const customPlaceholder = '自定义占位符'

    render(
      <EditorFactory
        type="text"
        value={customValue}
        placeholder={customPlaceholder}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const editor = screen.getByTestId('page-editor')
    expect(editor).toHaveAttribute('data-value', customValue)
  })
})
