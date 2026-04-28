import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { message } from 'antd'
import NotesSidebar from '@/components/layout/NotesSidebar'

const {
  navigateMock,
  fetchNotesMock,
  loadMoreNotesMock,
  fetchStarredNotesMock,
  loadMoreStarredNotesMock,
  fetchMySharesMock,
  fetchDeletedNotesMock,
  fetchNotebooksMock,
  deleteNoteMock,
  moveNoteMock,
  unstarNoteMock,
  restoreDeletedNoteMock,
  permanentDeleteNoteMock,
  deleteShareMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  fetchNotesMock: vi.fn(),
  loadMoreNotesMock: vi.fn(),
  fetchStarredNotesMock: vi.fn(),
  loadMoreStarredNotesMock: vi.fn(),
  fetchMySharesMock: vi.fn(),
  fetchDeletedNotesMock: vi.fn(),
  fetchNotebooksMock: vi.fn(),
  deleteNoteMock: vi.fn(),
  moveNoteMock: vi.fn(),
  unstarNoteMock: vi.fn(),
  restoreDeletedNoteMock: vi.fn(),
  permanentDeleteNoteMock: vi.fn(),
  deleteShareMock: vi.fn(),
}))

const notesFixture = [
  {
    id: '1',
    title: 'Beta',
    notebookName: '项目 A',
    createdAt: '2026-04-08T08:00:00.000Z',
    updatedAt: '2026-04-09T08:00:00.000Z',
    isStarred: false,
  },
  {
    id: '2',
    title: 'Alpha',
    notebookName: '项目 B',
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
    isStarred: true,
    voiceNote: [{ id: 'voice-1' }],
  },
]

const useNoteState = {
  notes: notesFixture,
  notesPagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  },
  starredNotes: [],
  starredNotesPagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  },
  myShares: [],
  mySharesPagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  },
  deletedNotes: [],
  deletedNotesPagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  },
  fetchNotes: fetchNotesMock,
  loadMoreNotes: loadMoreNotesMock,
  fetchStarredNotes: fetchStarredNotesMock,
  loadMoreStarredNotes: loadMoreStarredNotesMock,
  fetchMyShares: fetchMySharesMock,
  loadMoreMyShares: vi.fn(),
  fetchDeletedNotes: fetchDeletedNotesMock,
  loadMoreDeletedNotes: vi.fn(),
  isLoading: false,
  isNotesLoadingMore: false,
  isStarredNotesLoadingMore: false,
  isMySharesLoadingMore: false,
  isDeletedNotesLoadingMore: false,
  hasLoadedNotes: true,
  hasLoadedStarredNotes: true,
  hasLoadedMyShares: true,
  hasLoadedDeletedNotes: true,
}

const useNotebookState = {
  notebooks: [
    { id: 'nb-1', name: '项目 A' },
    { id: 'nb-2', name: '项目 B' },
  ],
  currentNotebook: { id: 'nb-1', name: '项目 A' },
  fetchNotebooks: fetchNotebooksMock,
}

vi.mock('@/hooks/useNote', () => ({
  default: () => useNoteState,
}))

vi.mock('@/hooks/useNotebook', () => ({
  default: () => useNotebookState,
}))

vi.mock('@/services/noteService', () => ({
  default: {
    deleteNote: deleteNoteMock,
    moveNote: moveNoteMock,
    unstarNote: unstarNoteMock,
    restoreDeletedNote: restoreDeletedNoteMock,
    permanentDeleteNote: permanentDeleteNoteMock,
  },
}))

vi.mock('@/services/shareService', () => ({
  default: {
    deleteShare: deleteShareMock,
  },
}))

vi.mock('@/components/share/SharePanelDialog', () => ({
  default: ({ open, noteId }) => (
    open ? <div data-testid="share-panel" data-note-id={noteId} /> : null
  ),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function renderSidebar(initialEntry = '/cloudnote/recent') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/cloudnote/recent" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/recent/:id" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/starred" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/starred/:id" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/myshares" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/myshares/:id" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/notebooks" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/notebooks/:notebookId/:noteId" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/notebooks/:id" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/recyclebin" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/recyclebin/:id" element={<NotesSidebar visible />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('NotesSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(message, 'error').mockImplementation(vi.fn())
    vi.spyOn(message, 'success').mockImplementation(vi.fn())
    useNoteState.notes = [...notesFixture]
    useNoteState.notesPagination = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
    }
    useNoteState.starredNotes = []
    useNoteState.starredNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
    }
    useNoteState.myShares = []
    useNoteState.mySharesPagination = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
    }
    useNoteState.deletedNotes = []
    useNoteState.deletedNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
    }
    useNoteState.fetchNotes = fetchNotesMock
    useNoteState.loadMoreNotes = loadMoreNotesMock
    useNoteState.fetchStarredNotes = fetchStarredNotesMock
    useNoteState.loadMoreStarredNotes = loadMoreStarredNotesMock
    useNoteState.fetchMyShares = fetchMySharesMock
    useNoteState.loadMoreMyShares = vi.fn()
    useNoteState.fetchDeletedNotes = fetchDeletedNotesMock
    useNoteState.loadMoreDeletedNotes = vi.fn()
    useNoteState.isLoading = false
    useNoteState.isNotesLoadingMore = false
    useNoteState.isStarredNotesLoadingMore = false
    useNoteState.isMySharesLoadingMore = false
    useNoteState.isDeletedNotesLoadingMore = false
    useNoteState.hasLoadedNotes = true
    useNoteState.hasLoadedStarredNotes = true
    useNoteState.hasLoadedMyShares = true
    useNoteState.hasLoadedDeletedNotes = true
    useNotebookState.notebooks = [
      { id: 'nb-1', name: '项目 A' },
      { id: 'nb-2', name: '项目 B' },
    ]
    useNotebookState.currentNotebook = { id: 'nb-1', name: '项目 A' }
    useNotebookState.fetchNotebooks = fetchNotebooksMock
  })

  it('fetches recent notes when opened on recent root', () => {
    renderSidebar('/cloudnote/recent')

    expect(fetchNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })
  })

  it('redirects /cloudnote/recent to the first sorted note', async () => {
    renderSidebar('/cloudnote/recent')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/2', {
        replace: true,
        state: { note: expect.objectContaining({ id: '2' }) },
      })
    })
  })

  it('redirects /cloudnote/starred to the first starred note', async () => {
    useNoteState.starredNotes = [...notesFixture]

    renderSidebar('/cloudnote/starred')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/starred/2', {
        replace: true,
        state: { note: expect.objectContaining({ id: '2' }) },
      })
    })
  })

  it('redirects /cloudnote/notebooks to the first notebook note', async () => {
    renderSidebar('/cloudnote/notebooks')

    await waitFor(() => {
      expect(fetchNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc', notebookId: 'nb-1' })
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/notebooks/nb-1/2', {
        replace: true,
        state: { note: expect.objectContaining({ id: '2' }) },
      })
    })
  })

  it('redirects /cloudnote/myshares to the first shared note', async () => {
    useNoteState.myShares = [
      {
        noteId: '2',
        title: 'Alpha',
        shareCode: 'share-2',
        createdAt: '2026-04-10T08:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
      },
      {
        noteId: '1',
        title: 'Beta',
        shareCode: 'share-1',
        createdAt: '2026-04-08T08:00:00.000Z',
        updatedAt: '2026-04-09T08:00:00.000Z',
      },
    ]

    renderSidebar('/cloudnote/myshares')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/myshares/2', {
        replace: true,
        state: { note: expect.objectContaining({ id: '2' }) },
      })
    })
  })

  it('redirects /cloudnote/recyclebin to the first deleted note', async () => {
    useNoteState.deletedNotes = [...notesFixture]

    renderSidebar('/cloudnote/recyclebin')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recyclebin/2', {
        replace: true,
        state: { note: expect.objectContaining({ id: '2' }) },
      })
    })
  })

  it('shows total recent note count without loading progress', () => {
    useNoteState.notesPagination = {
      page: 1,
      pageSize: 20,
      total: 39,
      hasMore: true,
    }

    renderSidebar('/cloudnote/recent/2')

    expect(screen.getByText(/39\s*篇笔记/)).toBeInTheDocument()
    expect(screen.queryByText(/已加载/)).not.toBeInTheDocument()
  })

  it('shows total recycle bin note count without loading progress', () => {
    useNoteState.deletedNotes = [...notesFixture]
    useNoteState.deletedNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 39,
      hasMore: true,
    }

    renderSidebar('/cloudnote/recyclebin/2')

    expect(screen.getByText(/39\s*篇笔记/)).toBeInTheDocument()
    expect(screen.queryByText(/已加载/)).not.toBeInTheDocument()
  })

  it('fills notebook name from notebookId when recent notes omit notebookName', () => {
    useNoteState.notes = [
      {
        id: '1',
        title: '缺少归属信息',
        notebookId: 'nb-1',
        createdAt: '2026-04-08T08:00:00.000Z',
        updatedAt: '2026-04-09T08:00:00.000Z',
      },
    ]

    renderSidebar('/cloudnote/recent/1')

    expect(screen.getByText('项目 A')).toBeInTheDocument()
  })

  it('renders a voice indicator on notes with recordings', () => {
    renderSidebar('/cloudnote/recent/2')

    expect(screen.getByLabelText('有语音记录')).toBeInTheDocument()
  })

  it('renders multiple status icons without hover for voice, star and shared notes', () => {
    useNoteState.myShares = [
      {
        noteId: '2',
        title: 'Alpha',
        shareCode: 'share-2',
        updatedAt: '2026-04-10T10:00:00.000Z',
      },
    ]

    renderSidebar('/cloudnote/recent/2')

    const noteCard = screen.getAllByTestId('recent-note-card').find((card) => within(card).queryByText('Alpha'))
    expect(noteCard).toBeTruthy()
    expect(within(noteCard).getByLabelText('有语音记录')).toBeInTheDocument()
    expect(within(noteCard).getByRole('button', { name: '已分享' })).toBeInTheDocument()
    expect(within(noteCard).getByRole('button', { name: '取消收藏' })).toBeInTheDocument()
  })

  it('shows note actions on hover and opens share panel without navigating away', async () => {
    const user = userEvent.setup()
    useNoteState.currentNote = {
      id: '1',
      title: 'Alpha',
      notebookName: '项目 A',
      createdAt: '2026-04-08T08:00:00.000Z',
      updatedAt: '2026-04-09T08:00:00.000Z',
      isStarred: false,
    }
    useNoteState.notes = [
      {
        id: '1',
        title: 'Alpha',
        notebookName: '项目 A',
        createdAt: '2026-04-08T08:00:00.000Z',
        updatedAt: '2026-04-09T08:00:00.000Z',
        isStarred: false,
      },
      {
        id: '2',
        title: 'Beta',
        notebookName: '项目 B',
        createdAt: '2026-04-10T08:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
        isStarred: false,
      },
    ]
    renderSidebar('/cloudnote/recent/1')

    const noteCard = screen.getAllByTestId('recent-note-card')[0]
    await user.hover(noteCard)

    const shareButton = within(noteCard).getByRole('button', { name: '分享' })
    const starButton = within(noteCard).getByRole('button', { name: '收藏' })
    const moreButton = within(noteCard).getByRole('button', { name: '更多' })

    expect(shareButton).toHaveStyle({ opacity: '1' })
    expect(starButton).toHaveStyle({ opacity: '1' })
    expect(moreButton).toHaveStyle({ opacity: '1' })

    await user.click(shareButton)

    expect(screen.getByTestId('share-panel')).toHaveAttribute('data-note-id', '2')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('hides the more menu on unselected notes', () => {
    renderSidebar('/cloudnote/recent/2')

    const noteCards = screen.getAllByTestId('recent-note-card')
    expect(within(noteCards[1]).queryByRole('button', { name: '更多' })).not.toBeInTheDocument()
  })

  it('keeps the share icon visible for already shared notes without hover', () => {
    useNoteState.currentNote = {
      id: '1',
      title: 'Alpha',
      notebookName: '项目 A',
      createdAt: '2026-04-08T08:00:00.000Z',
      updatedAt: '2026-04-09T08:00:00.000Z',
      isStarred: false,
    }
    useNoteState.notes = [
      {
        id: '1',
        title: 'Alpha',
        notebookName: '项目 A',
        createdAt: '2026-04-08T08:00:00.000Z',
        updatedAt: '2026-04-09T08:00:00.000Z',
        isStarred: false,
      },
      {
        id: '2',
        title: 'Beta',
        notebookName: '项目 B',
        createdAt: '2026-04-10T08:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
        isStarred: false,
      },
    ]
    useNoteState.myShares = [
      {
        noteId: '2',
        title: 'Beta',
        shareCode: 'share-2',
        updatedAt: '2026-04-10T10:00:00.000Z',
      },
    ]

    renderSidebar('/cloudnote/recent/1')

    const sharedCard = screen.getAllByTestId('recent-note-card')[1]
    expect(within(sharedCard).getByRole('button', { name: '已分享' })).toHaveStyle({ opacity: '1' })
  })

  it('sorts by title ascending when selected from the menu', async () => {
    const user = userEvent.setup()
    renderSidebar('/cloudnote/recent/2')

    await user.click(screen.getByRole('button', { name: '打开近期笔记排序菜单' }))
    await user.click(screen.getByRole('button', { name: /笔记名称/ }))
    await user.click(screen.getByRole('button', { name: /从 A 到 Z/ }))

    const cards = screen.getAllByTestId('recent-note-card')
    expect(cards[0]).toHaveTextContent('Alpha')
    expect(cards[1]).toHaveTextContent('Beta')
    expect(fetchNotesMock).toHaveBeenLastCalledWith({ field: 'title', order: 'asc' })
  })

  it('uses the filter icon for sorting and the list icon for batch mode', async () => {
    const user = userEvent.setup()
    renderSidebar('/cloudnote/recent/2')

    await user.click(screen.getByRole('button', { name: '打开近期笔记排序菜单' }))
    expect(screen.getByRole('button', { name: /笔记名称/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    expect(screen.getByText('全选')).toBeInTheDocument()
  })

  it('batch deletes recent notes and refetches recent notes', async () => {
    const user = userEvent.setup()
    deleteNoteMock.mockResolvedValue({})
    renderSidebar('/cloudnote/recent/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '批量删除' }))
    await user.click(screen.getByRole('button', { name: /确\s*认/ }))

    await waitFor(() => {
      expect(deleteNoteMock).toHaveBeenCalledTimes(2)
      expect(fetchNotesMock).toHaveBeenLastCalledWith({ field: 'updatedAt', order: 'desc' })
    })
  })

  it('batch moves notebook notes and refetches notebook notes', async () => {
    const user = userEvent.setup()
    moveNoteMock.mockResolvedValue({})
    renderSidebar('/cloudnote/notebooks/nb-1/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '批量移动' }))
    const moveNotebookSelect = await screen.findByRole('combobox')
    fireEvent.mouseDown(moveNotebookSelect)
    await user.click(screen.getAllByText('项目 B').at(-1))
    await user.click(screen.getAllByRole('button', { name: /移\s*动/ }).at(-1))

    await waitFor(() => {
      expect(moveNoteMock).toHaveBeenCalledWith('2', 'nb-2')
      expect(moveNoteMock).toHaveBeenCalledWith('1', 'nb-2')
      expect(fetchNotesMock).toHaveBeenLastCalledWith({ field: 'updatedAt', order: 'desc', notebookId: 'nb-1' })
    })

    await waitFor(() => {
      expect(screen.queryByText('移动到笔记本')).not.toBeInTheDocument()
    })
  })

  it('keeps move dialog open and shows backend message when batch move fails', async () => {
    const user = userEvent.setup()
    moveNoteMock.mockRejectedValue({
      response: {
        data: {
          message: '目标笔记本不存在',
        },
      },
    })
    renderSidebar('/cloudnote/notebooks/nb-1/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '批量移动' }))
    const moveNotebookSelect = await screen.findByRole('combobox')
    fireEvent.mouseDown(moveNotebookSelect)
    await user.click(screen.getAllByText('项目 B').at(-1))
    await user.click(screen.getAllByRole('button', { name: /移\s*动/ }).at(-1))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('目标笔记本不存在')
    })

    expect(screen.getByText('移动到笔记本')).toBeInTheDocument()
    expect(moveNoteMock).toHaveBeenCalled()
  })

  it('batch unstars starred notes and refetches starred notes', async () => {
    const user = userEvent.setup()
    unstarNoteMock.mockResolvedValue({})
    useNoteState.starredNotes = [...notesFixture]
    renderSidebar('/cloudnote/starred/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '取消收藏' }))

    await waitFor(() => {
      expect(unstarNoteMock).toHaveBeenCalledTimes(2)
      expect(fetchStarredNotesMock).toHaveBeenLastCalledWith({ field: 'updatedAt', order: 'desc' })
    })
  })

  it('batch cancels shares and refetches shared notes', async () => {
    const user = userEvent.setup()
    deleteShareMock.mockResolvedValue({})
    useNoteState.myShares = [
      { noteId: '2', title: 'Alpha', shareCode: 'share-2', updatedAt: '2026-04-10T10:00:00.000Z' },
      { noteId: '1', title: 'Beta', shareCode: 'share-1', updatedAt: '2026-04-09T08:00:00.000Z' },
    ]
    renderSidebar('/cloudnote/myshares/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '取消分享' }))
    await user.click(screen.getByRole('button', { name: /确\s*认/ }))

    await waitFor(() => {
      expect(deleteShareMock).toHaveBeenCalledWith('share-2')
      expect(deleteShareMock).toHaveBeenCalledWith('share-1')
      expect(fetchMySharesMock).toHaveBeenCalledTimes(2)
    })
  })

  it('batch restores recycle bin notes and refetches recycle bin notes', async () => {
    const user = userEvent.setup()
    restoreDeletedNoteMock.mockResolvedValue({})
    useNoteState.deletedNotes = [...notesFixture]
    renderSidebar('/cloudnote/recyclebin/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '批量恢复' }))

    await waitFor(() => {
      expect(restoreDeletedNoteMock).toHaveBeenCalledWith(['2', '1'])
      expect(fetchDeletedNotesMock).toHaveBeenCalledTimes(2)
    })
  })

  it('batch permanently deletes recycle bin notes and refetches recycle bin notes', async () => {
    const user = userEvent.setup()
    permanentDeleteNoteMock.mockResolvedValue({})
    useNoteState.deletedNotes = [...notesFixture]
    renderSidebar('/cloudnote/recyclebin/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '彻底删除' }))
    await user.click(screen.getAllByRole('button', { name: /删\s*除/ }).at(-1))

    await waitFor(() => {
      expect(permanentDeleteNoteMock).toHaveBeenCalledWith(['2', '1'])
      expect(fetchDeletedNotesMock).toHaveBeenCalledTimes(2)
    })
  })

  it('fetches again when entering recent notes from another section', async () => {
    renderSidebar('/cloudnote/starred')

    expect(fetchNotesMock).not.toHaveBeenCalled()
    expect(fetchStarredNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })

    renderSidebar('/cloudnote/recent')

    await waitFor(() => {
      expect(fetchNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })
    })
  })

  it('opens the clicked note', async () => {
    const user = userEvent.setup()
    renderSidebar('/cloudnote/recent/2')

    await user.click(screen.getByText('Beta'))

    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/1', {
      state: { note: expect.objectContaining({ id: '1' }) },
    })
  })

  it('auto loads the next starred page when scrolling to the bottom', async () => {
    useNoteState.starredNotes = [...notesFixture]
    useNoteState.starredNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 25,
      hasMore: true,
    }

    const { container } = renderSidebar('/cloudnote/starred')
    const scrollContainer = container.querySelector('.notes-sidebar__scroll')
    expect(scrollContainer).toBeTruthy()

    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 430,
      configurable: true,
      writable: true,
    })

    fireEvent.scroll(scrollContainer)

    await waitFor(() => {
      expect(loadMoreStarredNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })
    })
    expect(screen.queryByRole('button', { name: '加载更多' })).not.toBeInTheDocument()
  })

  it('auto loads the next recent page when scrolling to the bottom', async () => {
    useNoteState.notesPagination = {
      page: 1,
      pageSize: 20,
      total: 26,
      hasMore: true,
    }

    const { container } = renderSidebar('/cloudnote/recent/2')
    const scrollContainer = container.querySelector('.notes-sidebar__scroll')
    expect(scrollContainer).toBeTruthy()

    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 430,
      configurable: true,
      writable: true,
    })

    fireEvent.scroll(scrollContainer)

    await waitFor(() => {
      expect(loadMoreNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })
    })
  })

  it('auto loads the next notebook page when scrolling to the bottom', async () => {
    useNoteState.notesPagination = {
      page: 1,
      pageSize: 20,
      total: 26,
      hasMore: true,
    }

    const { container } = renderSidebar('/cloudnote/notebooks/nb-1/2')
    const scrollContainer = container.querySelector('.notes-sidebar__scroll')
    expect(scrollContainer).toBeTruthy()

    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 430,
      configurable: true,
      writable: true,
    })

    fireEvent.scroll(scrollContainer)

    await waitFor(() => {
      expect(loadMoreNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc', notebookId: 'nb-1' })
    })
  })

  it('auto loads the next share page when scrolling to the bottom', async () => {
    const loadMoreMySharesMock = vi.fn()
    useNoteState.myShares = [
      { id: 'share-1', noteId: '1', title: 'Alpha', updatedAt: '2026-04-10T10:00:00.000Z' },
    ]
    useNoteState.mySharesPagination = {
      page: 1,
      pageSize: 20,
      total: 26,
      hasMore: true,
    }
    useNoteState.loadMoreMyShares = loadMoreMySharesMock

    const { container } = renderSidebar('/cloudnote/myshares/1')
    const scrollContainer = container.querySelector('.notes-sidebar__scroll')
    expect(scrollContainer).toBeTruthy()

    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 430,
      configurable: true,
      writable: true,
    })

    fireEvent.scroll(scrollContainer)

    await waitFor(() => {
      expect(loadMoreMySharesMock).toHaveBeenCalledWith({})
    })
  })

  it('auto loads the next recycle bin page when scrolling to the bottom', async () => {
    const loadMoreDeletedNotesMock = vi.fn()
    useNoteState.deletedNotes = [...notesFixture]
    useNoteState.deletedNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 39,
      hasMore: true,
    }
    useNoteState.loadMoreDeletedNotes = loadMoreDeletedNotesMock

    const { container } = renderSidebar('/cloudnote/recyclebin/2')
    const scrollContainer = container.querySelector('.notes-sidebar__scroll')
    expect(scrollContainer).toBeTruthy()

    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 400,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      value: 800,
      configurable: true,
    })
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 430,
      configurable: true,
      writable: true,
    })

    fireEvent.scroll(scrollContainer)

    await waitFor(() => {
      expect(loadMoreDeletedNotesMock).toHaveBeenCalledWith({})
    })
  })
})
