import axios from 'axios'
import { getAppConfig } from './config'

const { api } = getAppConfig()

const request = axios.create({
  baseURL: api.baseUrl,
  timeout: 30000,
  withCredentials: true,
})

request.interceptors.request.use(
  (config) => {
    const token = getCookie('cloud_doc_token')
    const userId = getCookie('cloud_doc_userid')
    const appId = getCookie('cloud_doc_appid')

    if (token && userId && appId) {
      config.headers['token'] = token
      config.headers['userId'] = userId
      config.headers['appId'] = appId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

export default request
