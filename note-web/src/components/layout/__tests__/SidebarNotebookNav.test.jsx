import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SidebarNotebookNav from '@/components/layout/SidebarNotebookNav'

const fetchNotebooksMock = vi.fn()
const createNotebookMock = vi.fn()
const updateNotebookMock = vi.fn()
const setCurrentNotebookMock = vi.fn()

const notebooksFixture = [
  { id: 'nb-1', name: '工作', isDefault: false, noteCount: 2 },
  { id: 'nb-2', name: '默认笔记', isDefault: true, noteCount: 8 },
]

const useNotebookState = {
  notebooks: notebooksFixture,
  currentNotebook: null,
  fetchNotebooks: fetchNotebooksMock,
  createNotebook: createNotebookMock,
  updateNotebook: updateNotebookMock,
  setCurrentNotebook: setCurrentNotebookMock,
}

vi.mock('@/hooks/useNotebook', () => ({
  default: () => useNotebookState,
}))

describe('SidebarNotebookNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotebookState.notebooks = [...notebooksFixture]
    useNotebookState.currentNotebook = null
  })

  it('fetches notebooks when the notebook group is expanded', async () => {
    const user = userEvent.setup()
    render(<SidebarNotebookNav collapsed={false} onToggle={vi.fn()} onNavigate={vi.fn()} currentPath="/cloudnote/recent" />)

    await user.click(screen.getByText('笔记本'))

    expect(fetchNotebooksMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('默认笔记')).toBeInTheDocument()
  })

  it('creates a notebook from the plus button and enters rename mode', async () => {
    const user = userEvent.setup()
    const navigateMock = vi.fn()
    createNotebookMock.mockResolvedValue({ id: 'nb-3', name: '新建笔记本', isDefault: false })

    render(<SidebarNotebookNav collapsed={false} onToggle={vi.fn()} onNavigate={navigateMock} currentPath="/cloudnote/recent" />)

    await user.click(screen.getByLabelText('新建笔记本'))

    await waitFor(() => {
      expect(createNotebookMock).toHaveBeenCalledWith({ name: '新建笔记本' })
    })
    expect(setCurrentNotebookMock).toHaveBeenCalledWith({ id: 'nb-3', name: '新建笔记本', isDefault: false })
    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/notebooks')
  })

  it('renames a notebook on double click', async () => {
    const user = userEvent.setup()
    render(<SidebarNotebookNav collapsed={false} onToggle={vi.fn()} onNavigate={vi.fn()} currentPath="/cloudnote/notebooks" />)

    const target = await screen.findByText('工作')
    await user.dblClick(target)

    const input = screen.getByDisplayValue('工作')
    await user.clear(input)
    await user.type(input, '项目文档')
    await user.tab()

    await waitFor(() => {
      expect(updateNotebookMock).toHaveBeenCalledWith('nb-1', { name: '项目文档' })
    })
  })
})
