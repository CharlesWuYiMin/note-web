import request from '@/utils/request'

const historyService = {
  getNoteHistory: async (noteId) => {
    return request.get(`/notes/${noteId}/history`)
  },

  getVersionDetail: async (noteId, version) => {
    return request.get(`/notes/${noteId}/history/${version}`)
  },

  restoreVersion: async (noteId, version) => {
    return request.post(`/notes/${noteId}/history/${version}/restore`)
  },
}

export default historyService
