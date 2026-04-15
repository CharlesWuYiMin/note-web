import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotebookCard } from '@/pages/Notebook/NotebookManagePage'

const mockNotebook = {
  id: '1',
  name: '我的笔记',
  description: '默认笔记本',
  noteCount: 10,
  color: '#e6f4ff',
  isDefault: false,
}

const defaultNotebook = {
  ...mockNotebook,
  isDefault: true,
}

describe('NotebookCard', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render notebook information correctly', () => {
    render(
      <NotebookCard
        notebook={mockNotebook}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={false}
      />
    )

    expect(screen.getByText('我的笔记')).toBeInTheDocument()
    expect(screen.getByText('默认笔记本')).toBeInTheDocument()
    expect(screen.getByText(/10/)).toBeInTheDocument()
  })

  it('should show lock icon for default notebook', () => {
    render(
      <NotebookCard
        notebook={defaultNotebook}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={true}
      />
    )

    const lockIcon = screen.getByTestId('lock-icon')
    expect(lockIcon).toBeInTheDocument()
  })

  it('should not show delete button for default notebook', () => {
    render(
      <NotebookCard
        notebook={defaultNotebook}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={true}
      />
    )

    const deleteButton = screen.queryByRole('button', { name: /delete/i })
    expect(deleteButton).not.toBeInTheDocument()
  })

  it('should show delete button for non-default notebook', () => {
    render(
      <NotebookCard
        notebook={mockNotebook}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={false}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    expect(deleteButton).toBeInTheDocument()
  })

  it('should call onEdit when edit button clicked', async () => {
    const user = userEvent.setup()
    render(
      <NotebookCard
        notebook={mockNotebook}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={false}
      />
    )

    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledTimes(1)
    expect(mockOnEdit).toHaveBeenCalledWith(mockNotebook)
  })

  it('should display notebook color in icon background', () => {
    const coloredNotebook = {
      ...mockNotebook,
      color: '#ff6b6b',
    }

    render(
      <NotebookCard
        notebook={coloredNotebook}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={false}
      />
    )

    const folderIcon = screen.getByTestId('folder-icon')
    expect(folderIcon.style.background).toBe('rgb(255, 107, 107)')
  })

  it('should handle missing description gracefully', () => {
    const noDescription = {
      ...mockNotebook,
      description: undefined,
    }

    render(
      <NotebookCard
        notebook={noDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isDefault={false}
      />
    )

    expect(screen.getByText('我的笔记')).toBeInTheDocument()
  })
})
