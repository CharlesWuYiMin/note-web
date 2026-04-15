import request from '@/utils/request'

function extractPayload(response) {
  return response && Object.prototype.hasOwnProperty.call(response, 'data')
    ? response.data
    : response
}

const historyService = {
  getNoteHistory: async (noteId, params = {}) => {
    const response = await request.get(`/notes/${noteId}/history`, {
      params,
    })
    return extractPayload(response)
  },

  getVersionDetail: async (noteId, version) => {
    const response = await request.get(`/notes/${noteId}/history/${version}`)
    return extractPayload(response)
  },

  restoreVersion: async (noteId, version) => {
    const response = await request.post(`/notes/${noteId}/history/${version}/restore`)
    return extractPayload(response)
  },
}

export default historyService
