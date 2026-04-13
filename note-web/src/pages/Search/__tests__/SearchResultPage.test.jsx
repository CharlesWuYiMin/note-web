﻿import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchResultPage from '@/pages/Search/SearchResultPage'

const { mockSearchNotes, mockGetRecentSearches } = vi.hoisted(() => ({
  mockSearchNotes: vi.fn(),
  mockGetRecentSearches: vi.fn(),
}))
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

vi.mock('@/services/searchService', () => ({
  default: {
    searchNotes: mockSearchNotes,
    getRecentSearches: mockGetRecentSearches,
  },
}))

function renderPage(initialEntry = '/cloudnote/search?q=%E6%B5%8B%E8%AF%95') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/cloudnote/search" element={<SearchResultPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SearchResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRecentSearches.mockResolvedValue(['架构设计', '会议纪要'])
  })

  it('renders query title and result count from search params', async () => {
    mockSearchNotes.mockResolvedValue([
      { id: '1', title: '测试结果 1', updatedAt: '2026-04-10T08:00:00.000Z' },
      { id: '2', title: '测试结果 2', updatedAt: '2026-04-09T08:00:00.000Z' },
    ])

    renderPage()

    expect(await screen.findByText('测试')).toBeInTheDocument()
    expect(screen.getByText('2 篇笔记')).toBeInTheDocument()
    expect(mockSearchNotes).toHaveBeenCalledWith('测试', {})
  })

  it('displays search results sorted by updated time descending by default', async () => {
    mockSearchNotes.mockResolvedValue([
      { id: '1', title: '较早更新', updatedAt: '2026-04-08T08:00:00.000Z' },
      { id: '2', title: '最近更新', updatedAt: '2026-04-10T08:00:00.000Z' },
    ])

    renderPage()

    const cards = await screen.findAllByTestId('search-result-card')
    expect(cards[0]).toHaveTextContent('最近更新')
    expect(cards[1]).toHaveTextContent('较早更新')
  })

  it('changes sorting when user selects title ascending', async () => {
    const user = userEvent.setup()
    mockSearchNotes.mockResolvedValue([
      { id: '1', title: '橙子方案', updatedAt: '2026-04-10T08:00:00.000Z' },
      { id: '2', title: '白板纪要', updatedAt: '2026-04-09T08:00:00.000Z' },
    ])

    renderPage()

    await screen.findByText('2 篇笔记')
    await user.click(screen.getByRole('button', { name: '打开排序菜单' }))
    await user.click(screen.getByRole('button', { name: '笔记名称' }))
    await user.click(screen.getByRole('button', { name: '从 A 到 Z' }))

    const cards = screen.getAllByTestId('search-result-card')
    expect(cards[0]).toHaveTextContent('白板纪要')
    expect(cards[1]).toHaveTextContent('橙子方案')
  })

  it('shows recent searches when available', async () => {
    mockSearchNotes.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('最近搜索')).toBeInTheDocument()
    expect(screen.getByText('架构设计')).toBeInTheDocument()
    expect(screen.getByText('会议纪要')).toBeInTheDocument()
  })

  it('shows empty state when no results', async () => {
    mockSearchNotes.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('未找到与 “测试” 相关的笔记')).toBeInTheDocument()
  })

  it('shows keyword prompt when query is empty', () => {
    renderPage('/cloudnote/search')

    expect(screen.getByText('请输入搜索关键词')).toBeInTheDocument()
  })

  it('shows loading state while searching', () => {
    mockSearchNotes.mockImplementation(() => new Promise(() => {}))
    mockGetRecentSearches.mockImplementation(() => new Promise(() => {}))

    renderPage()

    expect(screen.getByTestId('search-results-loading')).toBeInTheDocument()
  })

  it('falls back to an empty list when search request fails', async () => {
    mockSearchNotes.mockRejectedValue(new Error('network error'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('未找到与 “测试” 相关的笔记')).toBeInTheDocument()
    })
  })
})
