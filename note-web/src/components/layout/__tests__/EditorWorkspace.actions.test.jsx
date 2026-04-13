import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditorWorkspace from '@/components/layout/EditorWorkspace'

const {
  loadNoteByIdMock,
  toggleStarMock,
  updateNameMock,
  updateContentMock,
  deleteNoteMock,
  restoreNoteMock,
  permanentDeleteNoteMock,
  listMySharesMock,
  navigateMock,
  locationMock,
} = vi.hoisted(() => ({
  loadNoteByIdMock: vi.fn(),
  toggleStarMock: vi.fn(),
  updateNameMock: vi.fn(),
  updateContentMock: vi.fn(),
  deleteNoteMock: vi.fn(),
  restoreNoteMock: vi.fn(),
  permanentDeleteNoteMock: vi.fn(),
  listMySharesMock: vi.fn(),
  navigateMock: vi.fn(),
  locationMock: { pathname: '/cloudnote/recent/note-1' },
}))

const noteState = {
  currentNote: {
    id: 'note-1',
    title: '测试笔记',
    type: 'text',
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
    setCurrentNote: vi.fn(),
  }),
}))

vi.mock('@/components/editors/EditorFactory', () => ({
  default: function MockEditorFactory(props) {
    return <div data-testid="editor-factory" data-type={props.type} />
  },
}))

vi.mock('@/services/shareService', () => ({
  default: {
    createShare: vi.fn(),
    deleteShare: vi.fn(),
    listMyShares: listMySharesMock,
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

describe('EditorWorkspace actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMySharesMock.mockResolvedValue([])
    noteState.currentNote = {
      id: 'note-1',
      title: '测试笔记',
      type: 'text',
      isStarred: false,
      content: '正文',
    }
    noteState.isLoading = false
    loadNoteByIdMock.mockResolvedValue(noteState.currentNote)
    updateNameMock.mockResolvedValue({})
    updateContentMock.mockResolvedValue({})
    deleteNoteMock.mockResolvedValue({})
    restoreNoteMock.mockResolvedValue({})
    permanentDeleteNoteMock.mockResolvedValue({})
    locationMock.pathname = '/cloudnote/recent/note-1'
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

    const { rerender } = render(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: /收藏/ }))

    await waitFor(() => {
      expect(toggleStarMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1', isStarred: false }))
    })

    noteState.currentNote = {
      ...noteState.currentNote,
      isStarred: true,
    }
    rerender(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: /取消收藏/ }))

    await waitFor(() => {
      expect(toggleStarMock).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'note-1', isStarred: true }))
    })
  })

  it('requests fullscreen when clicking the fullscreen button', async () => {
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    })

    render(<EditorWorkspace />)

    fireEvent.click(screen.getByRole('button', { name: '全屏' }))

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalled()
    })
  })

  it('opens share dialog from the toolbar', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: '分享' }))

    await waitFor(() => {
      expect(screen.getByText('分享笔记')).toBeInTheDocument()
    })
  })

  it('deletes the current note after confirmation and navigates to recycle bin', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: '删除' }))
    await user.click(screen.getByRole('button', { name: /确\s*认/ }))

    await waitFor(() => {
      expect(deleteNoteMock).toHaveBeenCalledWith('note-1')
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recyclebin')
    })
  })

  it('restores a deleted note from recycle bin view', async () => {
    const user = userEvent.setup()
    locationMock.pathname = '/cloudnote/recyclebin/note-1'
    noteState.currentNote = {
      id: 'note-1',
      title: '已删除笔记',
      isStarred: false,
      status: 'deleted',
      content: '正文',
    }

    render(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: '还原' }))

    await waitFor(() => {
      expect(restoreNoteMock).toHaveBeenCalledWith('note-1')
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent')
    })
  })

  it('permanently deletes a note from recycle bin view after confirmation', async () => {
    const user = userEvent.setup()
    locationMock.pathname = '/cloudnote/recyclebin/note-1'
    noteState.currentNote = {
      id: 'note-1',
      title: '已删除笔记',
      isStarred: false,
      status: 'deleted',
      content: '正文',
    }

    render(<EditorWorkspace />)

    await user.click(screen.getByRole('button', { name: '永久删除' }))
    await user.click(screen.getAllByRole('button', { name: /删\s*除/ }).at(-1))

    await waitFor(() => {
      expect(permanentDeleteNoteMock).toHaveBeenCalledWith('note-1')
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recyclebin')
    })
  })
})
