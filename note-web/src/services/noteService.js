import request from '@/utils/request'

const NOTE_LIST_ORDER_BY_MAP = {
  createdAt: 1,
  updatedAt: 2,
  title: 3,
}
const DEFAULT_VOICE_FILE_CHUNK_THRESHOLD_BYTES = 5 * 1024 * 1024
const DEFAULT_VOICE_FILE_CHUNK_SIZE_BYTES = 5 * 1024 * 1024
const MIME_EXTENSION_MAP = {
  'audio/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/flac': '.flac',
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

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function resolveVoiceFilename(file) {
  if (typeof file?.name === 'string' && file.name.trim()) {
    return file.name.trim()
  }
  const extension = MIME_EXTENSION_MAP[file?.type] || '.webm'
  return `voice-note${extension}`
}

function pickValue(source, ...keys) {
  if (!source || typeof source !== 'object') {
    return null
  }
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return null
}

async function getSysConfigValue(key) {
  const response = await request.get(`/sysConfig/${encodeURIComponent(key)}`)
  return extractPayload(response)
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
    const chunkThresholdBytes = parsePositiveInteger(
      await getSysConfigValue('voice.file.chunk_threshold_bytes').catch(() => null),
      DEFAULT_VOICE_FILE_CHUNK_THRESHOLD_BYTES,
    )

    if (Number(file?.size) > chunkThresholdBytes) {
      return this.uploadVoiceFileInChunks(noteId, file, options)
    }

    const { sessionId, duration } = options
    const formData = new FormData()
    formData.append('file', file, resolveVoiceFilename(file))

    const response = await request.post('/voice-notes/upload', formData, {
      params: {
        noteId,
        ...(sessionId ? { sessionId } : {}),
        ...(Number.isFinite(duration) && duration >= 0 ? { duration } : {}),
      },
    })
    return extractPayload(response)
  }

  async uploadVoiceFileInChunks(noteId, file, options = {}) {
    const { sessionId, duration } = options
    const filename = resolveVoiceFilename(file)
    const chunkSizeBytes = parsePositiveInteger(
      await getSysConfigValue('voice.file.chunk_size_bytes').catch(() => null),
      DEFAULT_VOICE_FILE_CHUNK_SIZE_BYTES,
    )
    const initResponse = await request.post('/file/chunk/init', null, {
      params: {
        file_name: filename,
      },
    })
    const initPayload = extractPayload(initResponse)
    const uploadId = pickValue(initPayload, 'uploadId', 'upload_id')

    if (!uploadId) {
      throw new Error('upload_id is required')
    }

    for (let chunkIndex = 0, offset = 0; offset < file.size; chunkIndex += 1, offset += chunkSizeBytes) {
      const chunk = file.slice(offset, offset + chunkSizeBytes, file.type || 'application/octet-stream')
      const formData = new FormData()
      formData.append('file', chunk, filename)
      await request.post('/file/chunk/upload', formData, {
        params: {
          upload_id: uploadId,
          chunk_index: chunkIndex,
        },
      })
    }

    const mergeResponse = await request.post('/file/chunk/merge', null, {
      params: {
        upload_id: uploadId,
        is_doc_res: true,
        is_template: false,
        is_gen_new_file: false,
        document_id: noteId,
        ...(Number.isFinite(duration) && duration >= 0 ? { effective_duration: duration } : {}),
        response_type: 1,
        is_public: false,
      },
    })
    const mergePayload = extractPayload(mergeResponse)
    const fileId = pickValue(mergePayload, 'fileId', 'file_id')
    const fileResource = pickValue(mergePayload, 'fileResource', 'file_resource')

    if (!fileId || !fileResource) {
      throw new Error('chunk merge response is invalid')
    }

    const completeResponse = await request.post('/voice-notes/upload/complete', {
      noteId,
      ...(sessionId ? { sessionId } : {}),
      duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
      fileId,
      fileResource,
      size: file.size,
    })
    return extractPayload(completeResponse)
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
