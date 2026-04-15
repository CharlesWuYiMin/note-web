import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SidebarWorkspaceNav from '@/components/layout/SidebarWorkspaceNav'

const fetchNotebooksMock = vi.fn()
const createNotebookMock = vi.fn()
const updateNotebookMock = vi.fn()
const deleteNotebookMock = vi.fn()
const moveNotebookMock = vi.fn()
const setCurrentNotebookMock = vi.fn()
const createNoteMock = vi.fn()

const notebookState = {
  notebooks: [
    { id: 'default-nb', name: '默认笔记本', isDefault: true },
    { id: 'work-nb', name: '工作', isDefault: false },
  ],
  currentNotebook: null,
}

vi.mock('@/hooks/useNotebook', () => ({
  default: () => ({
    notebooks: notebookState.notebooks,
    currentNotebook: notebookState.currentNotebook,
    fetchNotebooks: fetchNotebooksMock,
    createNotebook: createNotebookMock,
    updateNotebook: updateNotebookMock,
    deleteNotebook: deleteNotebookMock,
    moveNotebook: moveNotebookMock,
    setCurrentNotebook: setCurrentNotebookMock,
  }),
}))

vi.mock('@/hooks/useNote', () => ({
  default: () => ({
    createNote: createNoteMock,
  }),
}))

vi.mock('@/store/useNotebookStore', () => ({
  default: {
    getState: () => ({
      notebooks: notebookState.notebooks,
    }),
  },
}))

describe('SidebarWorkspaceNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    notebookState.notebooks = [
      { id: 'default-nb', name: '默认笔记本', isDefault: true },
      { id: 'work-nb', name: '工作', isDefault: false },
    ]
    notebookState.currentNotebook = null
  })

  it('creates a text note from the hover menu', async () => {
    const user = userEvent.setup()
    const navigateMock = vi.fn()
    createNoteMock.mockResolvedValue({ id: 'note-1', title: 'note', type: 'text' })

    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={navigateMock} currentPath="/cloudnote/recent" />)

    await user.click(screen.getByRole('button', { name: /plus/ }))
    await user.click(await screen.findByText('文本笔记'))

    await waitFor(() => {
      expect(createNoteMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text',
        notebookId: 'default-nb',
      }))
    })

    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/note-1', undefined)
  })

  it('creates a text note and opens the voice prompt when choosing voice note', async () => {
    const user = userEvent.setup()
    const navigateMock = vi.fn()
    createNoteMock.mockResolvedValue({ id: 'voice-note-1', title: 'voice note', type: 'text' })

    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={navigateMock} currentPath="/cloudnote/recent" />)

    await user.click(screen.getByRole('button', { name: /plus/ }))
    await user.click(await screen.findByText('语音笔记'))

    await waitFor(() => {
      expect(createNoteMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text',
        notebookId: 'default-nb',
      }))
    })

    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/voice-note-1', {
      state: {
        openVoicePrompt: true,
        source: 'voice-create',
      },
    })
  })

  it('creates a notebook from the hover menu', async () => {
    const user = userEvent.setup()
    const navigateMock = vi.fn()
    createNotebookMock.mockResolvedValue({ id: 'nb-3', name: 'new notebook', isDefault: false })

    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={navigateMock} currentPath="/cloudnote/recent" />)

    await user.click(screen.getByRole('button', { name: /plus/ }))
    await user.click((await screen.findAllByText('笔记本')).at(0))

    await waitFor(() => {
      expect(createNotebookMock).toHaveBeenCalledWith({ name: '新建笔记本' })
    })
    expect(setCurrentNotebookMock).toHaveBeenCalledWith({ id: 'nb-3', name: 'new notebook', isDefault: false })
    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/notebooks')
  })

  it('renames a notebook on double click', async () => {
    const user = userEvent.setup()
    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={vi.fn()} currentPath="/cloudnote/notebooks" />)

    await waitFor(() => {
      expect(fetchNotebooksMock).toHaveBeenCalled()
    })

    const target = await screen.findByText('工作')
    await user.dblClick(target)

    const input = screen.getByDisplayValue('工作')
    await user.clear(input)
    await user.type(input, '项目文档')
    await user.tab()

    await waitFor(() => {
      expect(updateNotebookMock).toHaveBeenCalledWith('work-nb', { name: '项目文档' })
    })
  })

  it('does not allow renaming the default notebook', async () => {
    const user = userEvent.setup()
    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={vi.fn()} currentPath="/cloudnote/notebooks" />)

    const target = await screen.findByText('默认笔记本')
    await user.dblClick(target)

    expect(updateNotebookMock).not.toHaveBeenCalled()
    expect(screen.queryByDisplayValue('默认笔记本')).not.toBeInTheDocument()
  })

  it('creates a text note from the notebook row menu', async () => {
    const user = userEvent.setup()
    const navigateMock = vi.fn()
    createNoteMock.mockResolvedValue({ id: 'note-2', title: 'note', type: 'text' })

    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={navigateMock} currentPath="/cloudnote/notebooks" />)

    await user.click(await screen.findByLabelText('笔记本更多操作：工作'))
    await user.click(await screen.findByText('新建文本笔记'))

    await waitFor(() => {
      expect(createNoteMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text',
        notebookId: 'work-nb',
      }))
    })

    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/recent/note-2', undefined)
  })

  it('calls deleteNotebook after confirming delete in the notebook row menu', async () => {
    const user = userEvent.setup()
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={vi.fn()} currentPath="/cloudnote/notebooks" />)

    await user.click(await screen.findByLabelText('笔记本更多操作：工作'))
    await user.click(await screen.findByText('删除'))

    await waitFor(() => {
      expect(deleteNotebookMock).toHaveBeenCalledWith('work-nb')
    })

    confirmMock.mockRestore()
  })
})

