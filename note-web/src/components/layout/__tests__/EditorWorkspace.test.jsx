import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditorWorkspace from '@/components/layout/EditorWorkspace'

const loadNoteByIdMock = vi.fn()
const toggleStarMock = vi.fn()
const updateNameMock = vi.fn()
const updateContentMock = vi.fn()
const deleteNoteMock = vi.fn()
const restoreNoteMock = vi.fn()
const permanentDeleteNoteMock = vi.fn()
const navigateMock = vi.fn()
const locationMock = { pathname: '/cloudnote/recent/note-1' }

const noteState = {
  currentNote: {
    id: 'note-1',
    title: '测试笔记',
    isStarred: false,
    content: '正文',
  },
  isLoading: false,
}

vi.mock('@/hooks/useNote', () => ({
  default: () => ({
    currentNote: noteState.currentNote,
    isLoading: noteState.isLoading,
    loadNoteById: loadNoteByIdMock,
    toggleStar: toggleStarMock,
    updateName: updateNameMock,
    updateContent: updateContentMock,
    deleteNote: deleteNoteMock,
    restoreNote: restoreNoteMock,
    permanentDeleteNote: permanentDeleteNoteMock,
  }),
}))

vi.mock('@/components/editors/EditorFactory', () => ({
  default: function MockEditorFactory(props) {
    return <div data-testid="editor-factory" data-type={props.type} />
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'note-1' }),
    useNavigate: () => navigateMock,
    useLocation: () => locationMock,
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, options) => options?.defaultValue ?? _key,
  }),
}))

describe('EditorWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadNoteByIdMock.mockResolvedValue(noteState.currentNote)
    updateNameMock.mockResolvedValue({})
    updateContentMock.mockResolvedValue({})
    noteState.currentNote = {
      id: 'note-1',
      title: '测试笔记',
      isStarred: false,
      content: '正文',
    }
    locationMock.pathname = '/cloudnote/recent/note-1'
    noteState.isLoading = false
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    })
  })

  it('toggles star through the store action', async () => {
    const user = userEvent.setup()
    toggleStarMock.mockResolvedValue({})

    render(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: '收藏' }))

    await waitFor(() => {
      expect(toggleStarMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1' }))
    })
  })

  it('renders the page editor for text notes', () => {
    render(<EditorWorkspace />)

    expect(screen.getByTestId('editor-factory')).toHaveAttribute('data-type', 'text')
  })

  it('requests fullscreen when clicking the fullscreen button', async () => {
    const user = userEvent.setup()
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined)

    render(<EditorWorkspace />)

    const section = screen.getByRole('button', { name: '全屏' }).closest('section')
    Object.defineProperty(section, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    })

    await user.click(screen.getByRole('button', { name: '全屏' }))

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalled()
    })
  })
})
