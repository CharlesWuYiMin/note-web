import request from '@/utils/request'

const NOTE_LIST_ORDER_BY_MAP = {
  createdAt: 1,
  updatedAt: 2,
  title: 3,
}
const DEFAULT_VOICE_FILE_CHUNK_THRESHOLD_BYTES = 5 * 1024 * 1024
const DEFAULT_VOICE_FILE_CHUNK_SIZE_BYTES = 5 * 1024 * 1024
const DEFAULT_IMPORT_ARCHIVE_MAX_BYTES = 100 * 1024 * 1024
const DEFAULT_IMPORT_FILE_CHUNK_THRESHOLD_BYTES = 5 * 1024 * 1024
const DEFAULT_IMPORT_FILE_CHUNK_SIZE_BYTES = 5 * 1024 * 1024
const DEFAULT_IMPORT_TASK_POLL_INTERVAL_MS = 2000
const DEFAULT_IMPORT_TASK_TIMEOUT_MS = 30 * 60 * 1000
const BYTE_SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*([kmgt]?i?b?|[kmgt])?$/i
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

function parseByteSize(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  const match = value.trim().match(BYTE_SIZE_PATTERN)
  if (!match) {
    return fallback
  }
  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount) || amount <= 0) {
    return fallback
  }
  const unit = (match[2] || '').toUpperCase()
  const multiplier = {
    '': 1,
    B: 1,
    K: 1024,
    KB: 1024,
    KIB: 1024,
    M: 1024 ** 2,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    G: 1024 ** 3,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
    T: 1024 ** 4,
    TB: 1024 ** 4,
    TIB: 1024 ** 4,
  }[unit]

  if (!multiplier) {
    return fallback
  }

  const parsed = Math.floor(amount * multiplier)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0B'
  }
  if (bytes >= 1024 ** 3) {
    const value = (bytes / (1024 ** 3)).toFixed(1).replace(/\.0$/, '')
    return `${value}GB`
  }
  if (bytes >= 1024 ** 2) {
    const value = (bytes / (1024 ** 2)).toFixed(1).replace(/\.0$/, '')
    return `${value}MB`
  }
  if (bytes >= 1024) {
    const value = (bytes / 1024).toFixed(1).replace(/\.0$/, '')
    return `${value}KB`
  }
  return `${bytes}B`
}

function resolveVoiceFilename(file) {
  if (typeof file?.name === 'string' && file.name.trim()) {
    return file.name.trim()
  }
  const extension = MIME_EXTENSION_MAP[file?.type] || '.webm'
  return `voice-note${extension}`
}

function resolveImportFilename(file) {
  if (typeof file?.name === 'string' && file.name.trim()) {
    return file.name.trim()
  }
  return 'document-import.zip'
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

function extractResourceId(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const normalized = value.trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (!normalized) {
    return null
  }
  const parts = normalized.split('/')
  return parts[parts.length - 1] || null
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

  async importDocumentArchive(file) {
    const maxArchiveBytes = await this.getImportArchiveMaxBytes()
    if (Number(file?.size) > maxArchiveBytes) {
      throw new Error(`import archive size cannot exceed ${formatByteSize(maxArchiveBytes)}`)
    }

    const uploadPayload = await this.uploadImportFile(file)
    const fileId = extractResourceId(pickValue(uploadPayload, 'fileResource', 'file_resource'))
      || pickValue(uploadPayload, 'fileId', 'file_id')

    if (!fileId) {
      throw new Error('import file_id is required')
    }

    const response = await request.post('/convert/file/import-raw-zip', {
      file_id: fileId,
    })
    return extractPayload(response)
  }

  async getImportArchiveMaxBytes() {
    return parseByteSize(
      await getSysConfigValue('upload_max_size').catch(() => null),
      DEFAULT_IMPORT_ARCHIVE_MAX_BYTES,
    )
  }

  async uploadImportFile(file) {
    const chunkThresholdBytes = parsePositiveInteger(
      await getSysConfigValue('import.file.chunk_threshold_bytes').catch(() => null),
      DEFAULT_IMPORT_FILE_CHUNK_THRESHOLD_BYTES,
    )

    if (Number(file?.size) > chunkThresholdBytes) {
      return this.uploadImportFileInChunks(file)
    }

    const formData = new FormData()
    formData.append('file', file, resolveImportFilename(file))
    const response = await request.post('/file/upload', formData, {
      params: {
        is_doc_res: false,
      },
    })
    return extractPayload(response)
  }

  async getImportTask(taskId) {
    const response = await request.get('/tasks')
    const tasks = extractPayload(response)
    if (tasks && typeof tasks === 'object' && !Array.isArray(tasks)) {
      return tasks
    }
    if (!Array.isArray(tasks)) {
      return null
    }
    return tasks.find((task) => {
      const currentTaskId = pickValue(task, 'taskId', 'task_id')
      return currentTaskId === taskId
    }) || null
  }

  async getImportTasks() {
    const response = await request.get('/tasks')
    const tasks = extractPayload(response)
    return Array.isArray(tasks) ? tasks : []
  }

  async getImportTaskPollIntervalMs() {
    return parsePositiveInteger(
      await getSysConfigValue('import.task.poll_interval_ms').catch(() => null),
      DEFAULT_IMPORT_TASK_POLL_INTERVAL_MS,
    )
  }

  async getImportTaskTimeoutMs() {
    return parsePositiveInteger(
      await getSysConfigValue('import.task.timeout_ms').catch(() => null),
      DEFAULT_IMPORT_TASK_TIMEOUT_MS,
    )
  }

  async uploadImportFileInChunks(file) {
    const filename = resolveImportFilename(file)
    const chunkSizeBytes = parsePositiveInteger(
      await getSysConfigValue('import.file.chunk_size_bytes').catch(() => null),
      DEFAULT_IMPORT_FILE_CHUNK_SIZE_BYTES,
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
      const chunk = file.slice(offset, offset + chunkSizeBytes, file.type || 'application/zip')
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
        is_doc_res: false,
        is_template: false,
        is_gen_new_file: false,
        response_type: 1,
        is_public: false,
      },
    })
    return extractPayload(mergeResponse)
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
