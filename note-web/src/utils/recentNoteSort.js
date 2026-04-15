export const RECENT_NOTE_SORT_FIELDS = {
  UPDATED_AT: 'updatedAt',
  CREATED_AT: 'createdAt',
  TITLE: 'title',
}

export const RECENT_NOTE_SORT_ORDERS = {
  DESC: 'desc',
  ASC: 'asc',
}

export const DEFAULT_RECENT_NOTE_SORT = {
  field: RECENT_NOTE_SORT_FIELDS.UPDATED_AT,
  order: RECENT_NOTE_SORT_ORDERS.DESC,
}

function compareByDate(left, right, order) {
  const leftValue = new Date(left || 0).getTime()
  const rightValue = new Date(right || 0).getTime()
  return order === RECENT_NOTE_SORT_ORDERS.ASC ? leftValue - rightValue : rightValue - leftValue
}

function compareByTitle(left, right, order) {
  const result = (left || '').localeCompare(right || '', 'zh-CN')
  return order === RECENT_NOTE_SORT_ORDERS.ASC ? result : -result
}

export function sortRecentNotes(notes = [], sort = DEFAULT_RECENT_NOTE_SORT) {
  const normalizedSort = {
    ...DEFAULT_RECENT_NOTE_SORT,
    ...sort,
  }

  return [...notes].sort((left, right) => {
    if (normalizedSort.field === RECENT_NOTE_SORT_FIELDS.CREATED_AT) {
      return compareByDate(left.createdAt, right.createdAt, normalizedSort.order)
    }

    if (normalizedSort.field === RECENT_NOTE_SORT_FIELDS.TITLE) {
      return compareByTitle(left.title, right.title, normalizedSort.order)
    }

    return compareByDate(left.updatedAt, right.updatedAt, normalizedSort.order)
  })
}
