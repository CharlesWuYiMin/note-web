import request from '@/utils/request'

function normalizeSearchPage(data) {
  if (Array.isArray(data)) {
    const items = data
    items.items = items
    items.total = data.length
    items.page = 1
    items.size = data.length || 20
    return items
  }

  const payload = data?.data ?? data
  if (Array.isArray(payload?.items)) {
    const items = payload.items
    items.items = items
    items.total = Number(payload.total || payload.items.length || 0)
    items.page = Number(payload.page || 1)
    items.size = Number(payload.size || payload.pageSize || payload.items.length || 20)
    return items
  }

  const items = []
  items.items = items
  items.total = 0
  items.page = 1
  items.size = 20
  return items
}

const searchService = {
  searchNotes: async (keyword, params = {}) => {
    const { signal, ...queryParams } = params

    if (!keyword || !keyword.trim()) {
      const items = []
      items.items = items
      items.total = 0
      items.page = Number(queryParams.page || 1)
      items.size = Number(queryParams.pageSize || queryParams.size || 20)
      return items
    }

    const response = await request.get('/search', {
      params: {
        keyword,
        ...queryParams,
      },
      signal,
    })

    return normalizeSearchPage(response)
  },

  getRecentSearches: async () => {
    return request.get('/search/recent')
  },

  clearRecentSearches: async () => {
    return request.delete('/search/recent')
  },
}

export default searchService
