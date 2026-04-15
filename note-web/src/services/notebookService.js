import request from '@/utils/request'

class NotebookService {
  async getNotebooks() {
    const response = await request.get('/notebooks')
    return response && Object.prototype.hasOwnProperty.call(response, 'data')
      ? response.data
      : response
  }

  async createNotebook(data) {
    const response = await request.post('/notebooks', data)
    return response && Object.prototype.hasOwnProperty.call(response, 'data')
      ? response.data
      : response
  }

  async updateNotebook(id, data) {
    const response = await request.put(`/notebooks/${id}`, data)
    return response && Object.prototype.hasOwnProperty.call(response, 'data')
      ? response.data
      : response
  }

  deleteNotebook(id) {
    return request.delete(`/notebooks/${id}`)
  }
}

export default new NotebookService()
