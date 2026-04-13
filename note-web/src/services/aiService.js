import request from '@/utils/request'

const aiService = {
  chat: async (params, options = {}) => {
    return request.post('/ai/chat', params, options)
  },

  summarize: async (noteId, content) => {
    return request.post('/ai/chat', {
      message: 'Please summarize the following content concisely:',
      noteId,
      content,
      action: 'summarize',
    })
  },

  translate: async (noteId, content, targetLanguage = 'en') => {
    return request.post('/ai/chat', {
      message: `Translate the following content to ${targetLanguage}:`,
      noteId,
      content,
      targetLanguage,
      action: 'translate',
    })
  },

  continueWriting: async (noteId, content) => {
    return request.post('/ai/chat', {
      message: 'Please continue writing based on the following content:',
      noteId,
      content,
      action: 'continue',
    })
  },

  polish: async (noteId, content) => {
    return request.post('/ai/chat', {
      message: 'Please polish and improve the writing of the following content:',
      noteId,
      content,
      action: 'polish',
    })
  },
}

export default aiService
