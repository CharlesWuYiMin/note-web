import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SharePanelDialog from '@/components/share/SharePanelDialog'
import * as shareErrorMessages from '@/utils/shareErrorMessages'

const mockOnClose = vi.fn()
const {
  mockCreateShare,
  mockDeleteShare,
  mockListMyShares,
  mockGetShareDetail,
  mockSearchUsers,
} = vi.hoisted(() => ({
  mockCreateShare: vi.fn(),
  mockDeleteShare: vi.fn(),
  mockListMyShares: vi.fn(),
  mockGetShareDetail: vi.fn(),
  mockSearchUsers: vi.fn(),
}))

vi.mock('@/services/shareService', () => ({
  default: {
    createShare: mockCreateShare,
    deleteShare: mockDeleteShare,
    listMyShares: mockListMyShares,
    getShareDetail: mockGetShareDetail,
    searchUsers: mockSearchUsers,
  },
}))

describe('ShareDialog', () => {
  const defaultProps = {
    open: true,
    noteId: 'note-123',
    onClose: mockOnClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.spyOn(shareErrorMessages, 'showSharePromptModal').mockImplementation(() => {})
    mockListMyShares.mockResolvedValue([])
    mockGetShareDetail.mockResolvedValue(null)
    mockSearchUsers.mockResolvedValue({
      data: {
        total: 0,
        page: 1,
        size: 20,
        data: [],
      },
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    localStorage.setItem('language', 'zh-CN')
  })

  it('renders the dialog and collapsed prompt when open', () => {
    render(<SharePanelDialog {...defaultProps} />)

    expect(screen.getByText('分享笔记')).toBeInTheDocument()
    expect(screen.getByText('用户可通过链接访问该笔记')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<SharePanelDialog {...defaultProps} open={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the collapsed state before sharing is enabled', () => {
    render(<SharePanelDialog {...defaultProps} />)

    expect(screen.queryByRole('button', { name: /复制链接/ })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
  })

  it('treats missing shareType as not shared', async () => {
    mockGetShareDetail.mockResolvedValue({
      noteId: 'note-123',
      shareCode: 'share-123',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('用户可通过链接访问该笔记')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /复制链接/ })).not.toBeInTheDocument()
    })
  })

  it('builds the share link from the current noteId when shareUrl is missing', async () => {
    mockGetShareDetail.mockResolvedValue({
      shareCode: 'share-123',
      shareType: 'all',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(`${window.location.origin}/cloudnote/shares/note-123`)
      ).toBeInTheDocument()
    })
  })

  it('hydrates pointed share users from employee ids on reopen', async () => {
    mockGetShareDetail.mockResolvedValue({
      noteId: 'note-123',
      shareCode: 'share-123',
      shareType: 'pointed',
      userList: ['wu000000'],
    })
    mockSearchUsers.mockResolvedValue({
      data: {
        total: 1,
        page: 1,
        size: 20,
        data: [
          {
            oneAccessUserId: 'wu000000',
            userName: 'wu000000',
            nickName: 'Ada',
            lowestDept: 'Platform',
          },
        ],
      },
    })

    render(<SharePanelDialog {...defaultProps} />)

    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          searchText: 'wu000000',
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Ada')).toBeInTheDocument()
    })
  })

  it('opens sharing and shows the share link after successful creation', async () => {
    const user = userEvent.setup()
    mockCreateShare.mockResolvedValue({
      shareCode: 'abc123',
      shareUrl: '/v1/note/shares/abc123',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await user.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(`${window.location.origin}/cloudnote/shares/note-123`)
      ).toBeInTheDocument()
    })
  })

  it('opens the user selector when pointed sharing is chosen', async () => {
    const user = userEvent.setup()
    mockGetShareDetail.mockResolvedValue({
      noteId: 'note-123',
      shareCode: 'share-123',
      shareType: 'all',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /复制链接/ })).toBeInTheDocument()
    })

    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(await screen.findByText('指定用户可访问'))

    expect(screen.getByText('选择分享用户')).toBeInTheDocument()
  })

  it('searches users and confirms pointed sharing', async () => {
    const user = userEvent.setup()
    mockGetShareDetail.mockResolvedValue({
      noteId: 'note-123',
      shareCode: 'share-123',
      shareType: 'all',
    })
    mockSearchUsers.mockResolvedValue({
      data: {
        total: 1,
        page: 1,
        size: 20,
        data: [
          {
            oneAccessUserId: 'oa-1',
            userName: 'chengang',
            nickName: '陈刚',
            lowestDept: '研发部',
          },
        ],
      },
    })
    mockCreateShare.mockResolvedValue({
      shareCode: 'share-pointed',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /复制链接/ })).toBeInTheDocument()
    })

    await user.click(screen.getAllByRole('combobox')[1])
    await user.click(await screen.findByText('指定用户可访问'))

    const searchInput = screen.getByPlaceholderText('输入工号、用户名或昵称，回车搜索')
    await user.type(searchInput, '陈')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('陈刚')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('checkbox', { name: /选择用户 陈刚/ }))
    await user.click(screen.getByRole('button', { name: /确\s*认/ }))

    await waitFor(() => {
      expect(screen.getByText('陈刚')).toBeInTheDocument()
    })

    expect(mockCreateShare).toHaveBeenCalledWith(
      'note-123',
      expect.objectContaining({
        shareType: 'pointed',
        userList: ['chengang'],
      })
    )
    expect(mockDeleteShare).not.toHaveBeenCalled()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<SharePanelDialog {...defaultProps} />)

    const closeButton = document.querySelector('.ant-modal-close')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('renders the expiry select control when sharing is enabled', async () => {
    mockGetShareDetail.mockResolvedValue({
      noteId: 'note-123',
      shareCode: 'share-123',
      shareType: 'all',
    })

    render(<SharePanelDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('有效期')).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')).toHaveLength(2)
    })
  })

  it('handles share creation error gracefully', async () => {
    const user = userEvent.setup()
    mockCreateShare.mockRejectedValue(new Error('Failed to create share'))

    render(<SharePanelDialog {...defaultProps} />)

    await user.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(shareErrorMessages.showSharePromptModal).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'enable',
        })
      )
    })
  })
})
