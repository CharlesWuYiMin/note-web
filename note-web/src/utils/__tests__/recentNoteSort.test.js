import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RECENT_NOTE_SORT,
  RECENT_NOTE_SORT_FIELDS,
  RECENT_NOTE_SORT_ORDERS,
  sortRecentNotes,
} from '@/utils/recentNoteSort'

describe('recentNoteSort', () => {
  const notes = [
    { id: '1', title: 'Beta', createdAt: '2026-04-08T08:00:00.000Z', updatedAt: '2026-04-09T08:00:00.000Z' },
    { id: '2', title: 'Alpha', createdAt: '2026-04-10T08:00:00.000Z', updatedAt: '2026-04-10T08:00:00.000Z' },
    { id: '3', title: 'Gamma', createdAt: '2026-04-06T08:00:00.000Z', updatedAt: '2026-04-07T08:00:00.000Z' },
  ]

  it('sorts by updated time descending by default', () => {
    expect(sortRecentNotes(notes, DEFAULT_RECENT_NOTE_SORT).map((item) => item.id)).toEqual(['2', '1', '3'])
  })

  it('sorts by created time ascending', () => {
    expect(
      sortRecentNotes(notes, {
        field: RECENT_NOTE_SORT_FIELDS.CREATED_AT,
        order: RECENT_NOTE_SORT_ORDERS.ASC,
      }).map((item) => item.id)
    ).toEqual(['3', '1', '2'])
  })

  it('sorts by title descending', () => {
    expect(
      sortRecentNotes(notes, {
        field: RECENT_NOTE_SORT_FIELDS.TITLE,
        order: RECENT_NOTE_SORT_ORDERS.DESC,
      }).map((item) => item.id)
    ).toEqual(['3', '1', '2'])
  })
})
