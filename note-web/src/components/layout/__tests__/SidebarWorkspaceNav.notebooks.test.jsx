import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SidebarWorkspaceNav from '@/components/layout/SidebarWorkspaceNav'

const fetchNotebooksMock = vi.fn()

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
    createNotebook: vi.fn(),
    updateNotebook: vi.fn(),
    setCurrentNotebook: vi.fn(),
  }),
}))

vi.mock('@/hooks/useNote', () => ({
  default: () => ({
    createNote: vi.fn(),
  }),
}))

vi.mock('@/store/useNotebookStore', () => ({
  default: {
    getState: () => ({
      notebooks: notebookState.notebooks,
    }),
  },
}))

describe('SidebarWorkspaceNav notebook navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notebookState.currentNotebook = null
  })

  it('navigates to notebooks when clicking the notebook section header', async () => {
    const user = userEvent.setup()
    const navigateMock = vi.fn()

    render(<SidebarWorkspaceNav collapsed={false} onToggle={vi.fn()} onNavigate={navigateMock} currentPath="/cloudnote/recent" />)

    await user.click(screen.getByText(/^笔记本$/))

    await waitFor(() => {
      expect(fetchNotebooksMock).toHaveBeenCalled()
    })
    expect(navigateMock).toHaveBeenCalledWith('/cloudnote/notebooks')
  })
})
