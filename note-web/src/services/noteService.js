import request from '@/utils/request'

const NOTE_LIST_ORDER_BY_MAP = {
  createdAt: 1,
  updatedAt: 2,
  title: 3,
}

function extractPayload(response) {
  return response && Object.prototype.hasOwnProperty.call(response, 'data')
    ? response.data
    : response
}

function normalizeListParams(params = {}) {
  const normalizedParams = { ...params }

  if (normalizedParams.field && normalizedParams.orderBy == null) {
    normalizedParams.orderBy = NOTE_LIST_ORDER_BY_MAP[normalizedParams.field] ?? NOTE_LIST_ORDER_BY_MAP.updatedAt
  }

  if (normalizedParams.order && normalizedParams.desc == null) {
    normalizedParams.desc = normalizedParams.order === 'asc' ? 0 : 1
  }

  delete normalizedParams.field
  delete normalizedParams.order

  return normalizedParams
}

class NoteService {
  async getNotes(params) {
    const response = await request.get('/notes', {
      params: normalizeListParams(params),
    })

    return extractPayload(response)
  }

  getNoteById(id, params = {}) {
    const normalizedParams = {
      withContent: true,
      ...params,
    }

    return request.get(`/notes/${id}`, {
      params: normalizedParams,
    })
  }

  async createNote(data) {
    const response = await request.post('/notes', data)
    return extractPayload(response)
  }

  async uploadVoiceFile(noteId, file, options = {}) {
    const { sessionId } = options
    const formData = new FormData()
    formData.append('file', file)

    const response = await request.post('/voice-notes/upload', formData, {
      params: {
        noteId,
        ...(sessionId ? { sessionId } : {}),
      },
    })
    return extractPayload(response)
  }

  async getVoiceFile(fileId) {
    const response = await request.get(`/voice-notes/files/${fileId}`, {
      responseType: 'blob',
    })
    return extractPayload(response)
  }

  updateName(id, name) {
    return request.patch(`/name/${id}`, { name })
  }

  updateContent(id, content) {
    return request.patch(`/content/${id}`, { content })
  }

  moveNote(noteId, targetNotebookId) {
    return request.post(`/move/${noteId}`, { notebookId: targetNotebookId })
  }

  async copyNote(noteId, targetNotebookId) {
    const response = await request.post(`/${noteId}/copy`, { notebookId: targetNotebookId })
    return extractPayload(response)
  }

  deleteNote(id) {
    return request.post(`/notes/${id}/delete`)
  }

  starNote(id) {
    return request.post(`/notes/${id}/star`)
  }

  unstarNote(id) {
    return request.post(`/notes/${id}/unstar`)
  }

  async getStarredNotes(params = {}) {
    const response = await request.post('/notes/star', normalizeListParams(params))
    return extractPayload(response)
  }

  async getMyShares() {
    const response = await request.get('/myshare/notes')
    return extractPayload(response)
  }

  async getDeletedNotes() {
    const response = await request.get('/recycle-bin')
    return extractPayload(response)
  }

  restoreDeletedNote(ids) {
    const normalizedIds = Array.isArray(ids) ? ids : [ids]
    return request.post('/notes/recycle-bin/restore', { ids: normalizedIds })
  }

  permanentDeleteNote(ids) {
    const normalizedIds = Array.isArray(ids) ? ids : [ids]
    return request.post('/notes/recycle-bin/delete', { ids: normalizedIds })
  }

  clearRecycleBin() {
    return request.post('/notes/recycle-bin/clear')
  }
}

export default new NoteService()
