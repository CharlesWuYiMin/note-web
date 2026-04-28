import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditorWorkspace from '@/components/layout/EditorWorkspace'

const editorFactorySpy = vi.hoisted(() => vi.fn())
const loadNoteByIdMock = vi.fn()
const toggleStarMock = vi.fn()
const updateNameMock = vi.fn()
const updateContentMock = vi.fn()
const deleteNoteMock = vi.fn()
const restoreNoteMock = vi.fn()
const permanentDeleteNoteMock = vi.fn()
const navigateMock = vi.fn()
const locationMock = { pathname: '/cloudnote/recent/note-1' }
const paramsMock = { id: 'note-1', noteId: undefined, notebookId: undefined }

const noteState = {
  notes: [{
    id: 'note-1',
    title: '测试笔记',
    type: 'text',
    isStarred: false,
    content: '正文',
  }],
  currentNote: {
    id: 'note-1',
    title: '测试笔记',
    type: 'text',
    isStarred: false,
    content: '正文',
  },
  starredNotes: [],
  myShares: [],
  deletedNotes: [],
  isLoading: false,
  hasLoadedNotes: true,
  hasLoadedStarredNotes: true,
  hasLoadedMyShares: true,
  hasLoadedDeletedNotes: true,
}

vi.mock('@/hooks/useNote', () => ({
  default: () => ({
    notes: noteState.notes,
    currentNote: noteState.currentNote,
    starredNotes: noteState.starredNotes,
    isLoading: noteState.isLoading,
    hasLoadedNotes: noteState.hasLoadedNotes,
    hasLoadedStarredNotes: noteState.hasLoadedStarredNotes,
    hasLoadedMyShares: noteState.hasLoadedMyShares,
    hasLoadedDeletedNotes: noteState.hasLoadedDeletedNotes,
    loadNoteById: loadNoteByIdMock,
    myShares: noteState.myShares,
    deletedNotes: noteState.deletedNotes,
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
    editorFactorySpy(props)
    return <div data-testid="editor-factory" data-type={props.type} />
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => paramsMock,
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
    editorFactorySpy.mockClear()
    loadNoteByIdMock.mockResolvedValue(noteState.currentNote)
    updateNameMock.mockResolvedValue({})
    updateContentMock.mockResolvedValue({})
    noteState.currentNote = {
      id: 'note-1',
      title: '测试笔记',
      type: 'text',
      isStarred: false,
      content: '正文',
    }
    noteState.notes = [noteState.currentNote]
    noteState.starredNotes = []
    noteState.myShares = []
    noteState.deletedNotes = []
    paramsMock.id = 'note-1'
    paramsMock.noteId = undefined
    paramsMock.notebookId = undefined
    locationMock.pathname = '/cloudnote/recent/note-1'
    locationMock.state = undefined
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
    expect(editorFactorySpy).toHaveBeenCalledWith(expect.not.objectContaining({
      value: expect.anything(),
      onChange: expect.any(Function),
      onSave: expect.any(Function),
    }))
  })

  it('shows the voice capsule for text notes without recordings and opens the prompt', async () => {
    const user = userEvent.setup()

    render(<EditorWorkspace />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '编辑笔记标题' })).toHaveTextContent('测试笔记')
    })

    await user.click(screen.getByRole('button', { name: '开启语音转录' }))

    expect(screen.getByText('是否开启语音转录')).toBeInTheDocument()
    expect(screen.getByText('中文')).toBeInTheDocument()
    expect(screen.getByText('英文')).toBeInTheDocument()
    expect(screen.queryByText('创建后先按文本笔记保存，需要时再打开语音转录面板。')).not.toBeInTheDocument()
  })

  it('does not reload note details again when only the route preview title changes', async () => {
    locationMock.state = {
      note: {
        id: 'note-1',
        title: '第一次预览标题',
      },
    }

    const { rerender } = render(<EditorWorkspace />)

    await waitFor(() => {
      expect(loadNoteByIdMock).toHaveBeenCalledTimes(1)
    })

    locationMock.state = {
      note: {
        id: 'note-1',
        title: '第二次预览标题',
      },
    }

    rerender(<EditorWorkspace />)

    expect(loadNoteByIdMock).toHaveBeenCalledTimes(1)
  })

  it('renders the section empty state without loading the editor when no note exists on a root route', () => {
    paramsMock.id = undefined
    paramsMock.noteId = undefined
    paramsMock.notebookId = undefined
    locationMock.pathname = '/cloudnote/recent'
    noteState.currentNote = null
    noteState.notes = []
    noteState.isLoading = false
    noteState.hasLoadedNotes = true
    noteState.hasLoadedStarredNotes = true
    noteState.hasLoadedMyShares = true
    noteState.hasLoadedDeletedNotes = true

    render(<EditorWorkspace />)

    expect(screen.getByText('近期笔记')).toBeInTheDocument()
    expect(screen.getByText('当前还没有可打开的笔记，创建一条新的内容后会显示在这里。')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-factory')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '收藏' })).not.toBeInTheDocument()
  })

  it('shows the notebook empty hint instead of the editor when the notebook list is empty', () => {
    paramsMock.id = undefined
    paramsMock.notebookId = 'nb-1'
    paramsMock.noteId = 'note-1'
    locationMock.pathname = '/cloudnote/notebooks/nb-1/note-1'
    noteState.currentNote = {
      id: 'note-1',
      title: '测试笔记',
      type: 'text',
      isStarred: false,
      content: '正文',
    }
    noteState.notes = []
    noteState.isLoading = false
    noteState.hasLoadedNotes = true
    noteState.hasLoadedStarredNotes = true
    noteState.hasLoadedMyShares = true
    noteState.hasLoadedDeletedNotes = true

    render(<EditorWorkspace />)

    expect(screen.getByText('笔记本')).toBeInTheDocument()
    expect(screen.getByText('当前分类下还没有可打开的笔记。')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-factory')).not.toBeInTheDocument()
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
