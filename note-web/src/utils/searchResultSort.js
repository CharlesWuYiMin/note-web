export const SEARCH_SORT_FIELDS = {
  UPDATED_AT: 'updatedAt',
  CREATED_AT: 'createdAt',
  TITLE: 'title',
}

export const SEARCH_SORT_ORDERS = {
  DESC: 'desc',
  ASC: 'asc',
}

export const DEFAULT_SEARCH_SORT = {
  field: SEARCH_SORT_FIELDS.UPDATED_AT,
  order: SEARCH_SORT_ORDERS.DESC,
}

function compareDate(left, right, order) {
  const leftTime = new Date(left || 0).getTime()
  const rightTime = new Date(right || 0).getTime()
  return order === SEARCH_SORT_ORDERS.ASC ? leftTime - rightTime : rightTime - leftTime
}

function compareTitle(left, right, order) {
  const result = (left || '').localeCompare(right || '', 'zh-CN')
  return order === SEARCH_SORT_ORDERS.ASC ? result : -result
}

export function sortSearchResults(results = [], sort = DEFAULT_SEARCH_SORT) {
  const normalizedSort = {
    ...DEFAULT_SEARCH_SORT,
    ...sort,
  }

  return [...results].sort((left, right) => {
    if (normalizedSort.field === SEARCH_SORT_FIELDS.CREATED_AT) {
      return compareDate(left.createdAt, right.createdAt, normalizedSort.order)
    }

    if (normalizedSort.field === SEARCH_SORT_FIELDS.TITLE) {
      return compareTitle(left.title, right.title, normalizedSort.order)
    }

    return compareDate(left.updatedAt, right.updatedAt, normalizedSort.order)
  })
}
