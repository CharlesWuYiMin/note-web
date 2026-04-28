import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SearchResultList from '@/components/search/SearchResultList'

describe('SearchResultList', () => {
  it('renders note type specific icons and only shows voice for notes with real voice records', () => {
    render(
      <SearchResultList
        query="笔记"
        results={[
          { id: '1', title: '文本笔记', type: 'text', updatedAt: '2026-04-23T08:00:00.000Z' },
          { id: '2', title: '大纲笔记', type: 'outline', updatedAt: '2026-04-23T08:00:00.000Z' },
          { id: '3', title: '手写笔记', type: 'handwritten', updatedAt: '2026-04-23T08:00:00.000Z' },
          { id: '4', title: '语音笔记', type: 'text', voiceNumber: 1, updatedAt: '2026-04-23T08:00:00.000Z' },
          { id: '5', title: '有录音的语音笔记', type: 'voice', voiceCount: 2, updatedAt: '2026-04-23T08:00:00.000Z' },
        ]}
        recentSearches={[]}
        onRecentSearchClick={vi.fn()}
        onResultClick={vi.fn()}
      />
    )

    const icons = screen.getAllByTestId('search-result-icon')
    expect(icons).toHaveLength(5)
    expect(icons[0]).toHaveAttribute('data-kind', 'text')
    expect(icons[1]).toHaveAttribute('data-kind', 'outline')
    expect(icons[2]).toHaveAttribute('data-kind', 'handwritten')
    expect(icons[3]).toHaveAttribute('data-kind', 'voice')
    expect(icons[4]).toHaveAttribute('data-kind', 'voice')
  })
})
