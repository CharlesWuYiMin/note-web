import request from '@/utils/request'

function extractPayload(response) {
  return response && Object.prototype.hasOwnProperty.call(response, 'data')
    ? response.data
    : response
}

function normalizeCollection(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  if (Array.isArray(data?.list)) {
    return data.list
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

const shareService = {
  createShare: async (noteId, options = {}) => {
    const response = await request.post('/shares', {
      noteId,
      ...options,
    })

    return extractPayload(response)
  },

  getSharedNote: async (shareCode) => {
    return request.get(`/shares/${shareCode}`)
  },

  listMyShares: async () => {
    const response = await request.get('/myshare/notes')
    return normalizeCollection(extractPayload(response))
  },

  deleteShare: async (shareCode) => {
    return request.delete(`/shares/${shareCode}`)
  },
}

export default shareService
