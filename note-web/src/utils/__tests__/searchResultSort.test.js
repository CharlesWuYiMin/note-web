import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SEARCH_SORT,
  SEARCH_SORT_FIELDS,
  SEARCH_SORT_ORDERS,
  sortSearchResults,
} from '@/utils/searchResultSort'

describe('searchResultSort', () => {
  const results = [
    {
      id: '1',
      title: 'Zeta Note',
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-09T08:00:00.000Z',
    },
    {
      id: '2',
      title: 'Alpha Note',
      createdAt: '2026-04-08T08:00:00.000Z',
      updatedAt: '2026-04-10T08:00:00.000Z',
    },
    {
      id: '3',
      title: 'Beta Note',
      createdAt: '2026-04-05T08:00:00.000Z',
      updatedAt: '2026-04-07T08:00:00.000Z',
    },
  ]

  it('sorts by updated time descending by default', () => {
    expect(sortSearchResults(results)).toEqual([
      results[1],
      results[0],
      results[2],
    ])
  })

  it('sorts by created time descending', () => {
    expect(
      sortSearchResults(results, {
        field: SEARCH_SORT_FIELDS.CREATED_AT,
        order: SEARCH_SORT_ORDERS.DESC,
      })
    ).toEqual([results[1], results[2], results[0]])
  })

  it('sorts by title ascending', () => {
    expect(
      sortSearchResults(results, {
        field: SEARCH_SORT_FIELDS.TITLE,
        order: SEARCH_SORT_ORDERS.ASC,
      })
    ).toEqual([results[1], results[2], results[0]])
  })

  it('sorts by title descending', () => {
    expect(
      sortSearchResults(results, {
        field: SEARCH_SORT_FIELDS.TITLE,
        order: SEARCH_SORT_ORDERS.DESC,
      })
    ).toEqual([results[0], results[2], results[1]])
  })

  it('does not mutate the original array', () => {
    const snapshot = [...results]

    sortSearchResults(results, DEFAULT_SEARCH_SORT)

    expect(results).toEqual(snapshot)
  })
})
