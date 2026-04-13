import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { message } from 'antd'
import NotesSidebar from '@/components/layout/NotesSidebar'

const {
  navigateMock,
  fetchNotesMock,
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
  starredNotes: [],
  starredNotesPagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  },
  myShares: [],
  deletedNotes: [],
  fetchNotes: fetchNotesMock,
  fetchStarredNotes: fetchStarredNotesMock,
  loadMoreStarredNotes: loadMoreStarredNotesMock,
  fetchMyShares: fetchMySharesMock,
  fetchDeletedNotes: fetchDeletedNotesMock,
  isLoading: false,
  isStarredNotesLoadingMore: false,
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
        <Route path="/cloudnote/shares" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/shares/:id" element={<NotesSidebar visible />} />
        <Route path="/cloudnote/notebooks" element={<NotesSidebar visible />} />
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
    useNoteState.starredNotes = []
    useNoteState.starredNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
    }
    useNoteState.myShares = []
    useNoteState.deletedNotes = []
    useNoteState.fetchNotes = fetchNotesMock
    useNoteState.fetchStarredNotes = fetchStarredNotesMock
    useNoteState.loadMoreStarredNotes = loadMoreStarredNotesMock
    useNoteState.fetchMyShares = fetchMySharesMock
    useNoteState.fetchDeletedNotes = fetchDeletedNotesMock
    useNoteState.isLoading = false
    useNoteState.isStarredNotesLoadingMore = false
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
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/2', { replace: true })
    })
  })

  it('redirects /cloudnote/starred to the first starred note', async () => {
    useNoteState.starredNotes = [...notesFixture]

    renderSidebar('/cloudnote/starred')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/starred/2', { replace: true })
    })
  })

  it('redirects /cloudnote/notebooks to the first notebook note', async () => {
    renderSidebar('/cloudnote/notebooks')

    await waitFor(() => {
      expect(fetchNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc', notebookId: 'nb-1' })
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/notebooks/2', { replace: true })
    })
  })

  it('redirects /cloudnote/shares to the first shared note', async () => {
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

    renderSidebar('/cloudnote/shares')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/shares/2', { replace: true })
    })
  })

  it('redirects /cloudnote/recyclebin to the first deleted note', async () => {
    useNoteState.deletedNotes = [...notesFixture]

    renderSidebar('/cloudnote/recyclebin')

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recyclebin/2', { replace: true })
    })
  })

  it('shows total recent note count', () => {
    renderSidebar('/cloudnote/recent/2')

    expect(screen.getByText(/2\s*篇笔记/)).toBeInTheDocument()
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

    expect(screen.getByTitle('有语音记录')).toBeInTheDocument()
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

    await waitFor(() => {
      expect(deleteNoteMock).toHaveBeenCalledTimes(2)
      expect(fetchNotesMock).toHaveBeenLastCalledWith({ field: 'updatedAt', order: 'desc' })
    })
  })

  it('batch moves notebook notes and refetches notebook notes', async () => {
    const user = userEvent.setup()
    moveNoteMock.mockResolvedValue({})
    renderSidebar('/cloudnote/notebooks/2')

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
    renderSidebar('/cloudnote/notebooks/2')

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
    renderSidebar('/cloudnote/shares/2')

    await user.click(screen.getByRole('button', { name: '切换批量操作模式' }))
    await user.click(screen.getByText('全选'))
    await user.click(screen.getByRole('button', { name: '取消分享' }))

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

    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/1')
  })

  it('shows load more for starred notes and loads the next page', async () => {
    const user = userEvent.setup()
    useNoteState.starredNotes = [...notesFixture]
    useNoteState.starredNotesPagination = {
      page: 1,
      pageSize: 20,
      total: 25,
      hasMore: true,
    }

    renderSidebar('/cloudnote/starred')

    await user.click(screen.getByRole('button', { name: '加载更多' }))

    expect(loadMoreStarredNotesMock).toHaveBeenCalledWith({ field: 'updatedAt', order: 'desc' })
    expect(screen.getByText('已加载 2/25')).toBeInTheDocument()
  })
})
