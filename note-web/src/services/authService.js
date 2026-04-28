import request from '@/utils/request'
import { getAppConfig } from '@/utils/config'
import { rememberPostLoginRedirect } from '@/utils/authNavigation'
import { getEditorSection } from '@/utils/editorRuntimeConfig'

class AuthService {
  constructor() {
    this.config = getAppConfig()
    this.userStorageKey = 'cloud_doc_user'
    this.editorJwtRequestCache = new Map()
  }

  getEditorConfig(editorKind = 'page') {
    if (!editorKind || typeof editorKind !== 'string') {
      return {}
    }

    return getEditorSection(editorKind) || {}
  }

  getEditorPageConfig() {
    return this.getEditorConfig('page')
  }

  getEditorAuthConfig(editorKind = 'page') {
    const editorConfig = this.getEditorConfig(editorKind)
    return {
      enabled: Boolean(editorConfig.auth?.enabled),
      appId: editorConfig.auth?.appId || editorConfig.appId || this.getAppId() || 'stub-editor-app-id',
      signKey: editorConfig.auth?.signKey || editorConfig.signKey || 'stub-editor-sign-key',
      expiresInMs: editorConfig.auth?.expiresInMs || 5 * 60 * 1000,
    }
  }

  async generateEditorToken({
    documentId,
    userId,
    appId,
    authType = 'EDIT',
    expiresInMs,
    signKey,
  }) {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    }

    const expirationSeconds = Math.floor(
      (Date.now() + (Number.isFinite(expiresInMs) ? expiresInMs : 5 * 60 * 1000)) / 1000
    )
    const payload = {
      sub: {
        appId: String(appId || this.getAppId() || ''),
        userId: String(userId || 'unknown'),
      },
      doc: {
        documentId: String(documentId || ''),
        authType: String(authType || 'EDIT'),
      },
      exp: expirationSeconds,
    }

    const encodedHeader = this.base64UrlEncodeJson(header)
    const encodedPayload = this.base64UrlEncodeJson(payload)
    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    const signature = await this.signHs256(unsignedToken, signKey)

    return `${unsignedToken}.${signature}`
  }

  async requestEditorAccessToken({ documentId }) {
    const cacheKey = String(documentId || '').trim() || '__empty__'
    const cachedRequest = this.editorJwtRequestCache.get(cacheKey)
    if (cachedRequest) {
      return cachedRequest
    }

    const requestPromise = request.post('/api/accesstoken/jwt', {
      documentId: documentId || '',
    }).then((response) => {
      const token = response?.data?.token || response?.token || ''
      if (!token) {
        throw new Error('empty editor jwt token')
      }

      return token
    }).finally(() => {
      this.editorJwtRequestCache.delete(cacheKey)
    })

    this.editorJwtRequestCache.set(cacheKey, requestPromise)
    return requestPromise
  }

  createEditorAuth({ documentId, user, userId, appId, readOnly = false, editorKind = 'page' }) {
    const editorAuthConfig = this.getEditorAuthConfig(editorKind)
    const resolvedUserId = user?.id || user?.userId || userId || this.getUserId() || 'unknown'
    const resolvedUserName = user?.name || user?.realName || user?.nickName || resolvedUserId
    const resolvedAppId = editorAuthConfig.appId || appId || this.getAppId() || 'stub-editor-app-id'
    const resolvedAuthType = readOnly ? 'READ' : 'EDIT'
    const legacyAuth = {
      appId: resolvedAppId,
      userId: resolvedUserId,
      user: {
        id: resolvedUserId,
        name: resolvedUserName,
        realName: user?.realName || user?.name || resolvedUserName,
        avatar: user?.avatar || user?.avatarUrl || user?.picture || '',
      },
      token: this.getToken() || '',
      extraData: {
        documentId: documentId || '',
      },
    }

    if (!editorAuthConfig.enabled) {
      return legacyAuth
    }

    const tokenPromise = this.requestEditorAccessToken({
      documentId,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.debug('[EditorAuth] backend jwt failed, fallback to local token', error)
      }

      return this.generateEditorToken({
        documentId,
        userId: resolvedUserId,
        appId: resolvedAppId,
        authType: resolvedAuthType,
        expiresInMs: editorAuthConfig.expiresInMs,
        signKey: editorAuthConfig.signKey,
      })
    })

    if (import.meta.env.DEV) {
      tokenPromise
        .then((token) => {
          const decoded = this.decodeJwtToken(token)
          console.debug('[EditorAuth] generated', {
            appId: resolvedAppId,
            userId: resolvedUserId,
            userName: resolvedUserName,
            documentId: documentId || '',
            authType: resolvedAuthType,
            expiresInMs: editorAuthConfig.expiresInMs,
            header: decoded.header,
            payload: decoded.payload,
          })
        })
        .catch((error) => {
          console.debug('[EditorAuth] generate failed', error)
        })
    }

    return {
      appId: resolvedAppId,
      userId: resolvedUserId,
      user: {
        id: resolvedUserId,
        name: resolvedUserName,
        realName: user?.realName || user?.name || resolvedUserName,
        avatar: user?.avatar || user?.avatarUrl || user?.picture || '',
      },
      token: tokenPromise,
      extraData: {
        documentId: documentId || '',
      },
    }
  }

  decodeJwtToken(token) {
    const [headerPart, payloadPart] = String(token || '').split('.')

    return {
      header: this.decodeJwtPart(headerPart),
      payload: this.decodeJwtPart(payloadPart),
    }
  }

  decodeJwtPart(part) {
    if (!part) {
      return null
    }

    try {
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
      const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
      const base64 = `${normalized}${padding}`
      const binary = typeof atob === 'function'
        ? atob(base64)
        : (typeof Buffer !== 'undefined' ? Buffer.from(base64, 'base64').toString('binary') : '')
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      return JSON.parse(new TextDecoder().decode(bytes))
    } catch {
      return null
    }
  }

  base64UrlEncodeJson(value) {
    return this.base64UrlEncodeString(JSON.stringify(value))
  }

  base64UrlEncodeString(value) {
    const bytes = new TextEncoder().encode(String(value))
    let binary = ''

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index])
    }

    const base64 = typeof btoa === 'function'
      ? btoa(binary)
      : (typeof Buffer !== 'undefined' ? Buffer.from(binary, 'binary').toString('base64') : '')

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
  }

  async signHs256(message, secret) {
    const resolvedSecret = String(secret || 'stub-editor-sign-key')
    const cryptoImpl = globalThis.crypto || (typeof window !== 'undefined' ? window.crypto : undefined)

    if (!cryptoImpl?.subtle) {
      throw new Error('当前环境不支持 Web Crypto，无法生成编辑器 JWT')
    }

    const secretBytes = this.base64DecodeToBytes(resolvedSecret)
    const key = await cryptoImpl.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await cryptoImpl.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(message)
    )

    return this.base64UrlEncodeBytes(new Uint8Array(signature))
  }

  base64DecodeToBytes(value) {
    const normalized = String(value || '').trim().replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
    const base64 = `${normalized}${padding}`

    if (typeof atob === 'function') {
      const binary = atob(base64)
      return Uint8Array.from(binary, (char) => char.charCodeAt(0))
    }

    if (typeof Buffer !== 'undefined') {
      return Uint8Array.from(Buffer.from(base64, 'base64'))
    }

    throw new Error('当前环境不支持 Base64 解码')
  }

  base64UrlEncodeBytes(bytes) {
    let binary = ''

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index])
    }

    const base64 = typeof btoa === 'function'
      ? btoa(binary)
      : (typeof Buffer !== 'undefined' ? Buffer.from(binary, 'binary').toString('base64') : '')

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
  }

  async login(loginData) {
    try {
      const response = await request.post('/login', {
        appId: loginData.appId,
        code: loginData.code,
        authType: loginData.authType,
        redirectUri: loginData.redirectUri || this.config.auth.idaas.redirectUri || `${window.location.origin}/cloudnote/recent`,
      })

      const payload = response?.data ?? response ?? {}
      const rawUser =
        payload.data?.userInfo ||
        payload.data?.user ||
        payload.userInfo ||
        payload.user ||
        payload.data?.profile ||
        payload.profile ||
        payload
      this.saveUserProfile(this.normalizeUserProfile(rawUser, loginData))
      return response
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  getIdaasAuthUrl(targetPath) {
    const { authUrl, clientId, redirectUri } = this.config.auth.idaas
    const redirectTarget = targetPath || this.getPostLoginRedirectFromUrl() || ''
    const safeRedirectTarget = redirectTarget.startsWith('/login') ? '' : redirectTarget
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
    })

    if (safeRedirectTarget) {
      params.set('state', safeRedirectTarget)
    }
    
    return `${authUrl}?${params.toString()}`
  }

  redirectToIdaas(targetPath) {
    if (targetPath) {
      rememberPostLoginRedirect(targetPath)
    }
    const url = this.getIdaasAuthUrl(targetPath)
    window.location.href = url
  }

  handleWelinkAuth(urlParams) {
    const { type, code } = urlParams
    
    if (type === 'weDocs' && code) {
      return {
        authType: 'weDocs',
        code: code,
        appId: this.config.auth.welink.clientId,
        redirectUri: this.config.auth.welink.redirectUri,
      }
    }
    
    return null
  }

  handleCallback(urlParams) {
    const { code } = urlParams
    
    if (!code) {
      throw new Error('No authorization code found')
    }
    
    return {
      authType: 'weDocsIDaas',
      code: code,
      appId: this.config.auth.idaas.clientId,
      redirectUri: this.config.auth.idaas.redirectUri,
    }
  }

  parseAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search)
    
    if (urlParams.get('type') === 'weDocs' && urlParams.has('code')) {
      return this.handleWelinkAuth(Object.fromEntries(urlParams))
    } else if (urlParams.has('code')) {
      return this.handleCallback(Object.fromEntries(urlParams))
    }
    
    return null
  }

  detectAuthFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    const type = urlParams.get('type')
    const code = urlParams.get('code')
    
    if (type === 'weDocs' && code) {
      return {
        authType: 'weDocs',
        code: code,
        appId: this.config.auth.welink.clientId,
        redirectUri: this.config.auth.welink.redirectUri,
      }
    }
      
    if (code) {
      return {
        authType: 'weDocsIDaas',
        code: code,
        appId: this.config.auth.idaas.clientId,
        redirectUri: this.config.auth.idaas.redirectUri,
      }
    }
    
    return null
  }

  getPostLoginRedirectFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    const state = urlParams.get('state')

    if (!state) {
      return ''
    }

    try {
      const decoded = decodeURIComponent(state)
      if (decoded.startsWith('/')) {
        return decoded
      }
    } catch {
      if (state.startsWith('/')) {
        return state
      }
    }

    return ''
  }

  clearUrlAuthParams() {
    if (window.history.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('type')
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      window.history.replaceState({}, document.title, url.toString())
    }
  }

  isAuthenticated() {
    const token = this.getToken()
    const userId = this.getUserId()
    return !!(token && userId)
  }

  getToken() {
    return this.getCookie('cloud_doc_token')
  }

  getUserId() {
    return this.getCookie('cloud_doc_userid')
  }

  getAppId() {
    return this.getCookie('cloud_doc_appid')
  }

  normalizeUserProfile(user, fallback = {}) {
    const source = user && typeof user === 'object' ? user : {}
    const fallbackUserId = source.userId || source.user_id || source.id || fallback.userId || this.getUserId() || ''

    return {
      ...source,
      id: source.id || fallbackUserId,
      userId: source.userId || source.user_id || fallbackUserId,
      userName: source.userName || source.username || source.user_name || fallbackUserId,
      nickName: source.nickName || source.nickname || source.nick_name || source.name || source.realName || source.real_name || '',
      name: source.name || source.realName || source.nickName || source.nickname || '',
      realName: source.realName || source.real_name || source.name || source.nickName || source.nickname || '',
      profileUrl: source.profileUrl || source.profile_url || '',
      avatar: source.avatar || source.avatarUrl || source.avatar_url || source.picture || source.profileUrl || source.profile_url || '',
      avatarUrl: source.avatarUrl || source.avatar_url || source.avatar || source.picture || source.profileUrl || source.profile_url || '',
    }
  }

  saveUserProfile(user) {
    try {
      if (!user || typeof user !== 'object') {
        return
      }
      window.localStorage.setItem(this.userStorageKey, JSON.stringify(user))
    } catch (error) {
      console.warn('Failed to persist user profile', error)
    }
  }

  getStoredUserProfile() {
    try {
      const raw = window.localStorage.getItem(this.userStorageKey)
      if (!raw) {
        return null
      }
      return this.normalizeUserProfile(JSON.parse(raw))
    } catch (error) {
      console.warn('Failed to read stored user profile', error)
      return null
    }
  }

  getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
  }

  setCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
  }

  clearAuthCookies() {
    ['cloud_doc_token', 'cloud_doc_userid', 'cloud_doc_appid'].forEach(cookie => {
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    })
  }

  logout() {
    this.clearAuthCookies()
    try {
      window.localStorage.removeItem(this.userStorageKey)
    } catch (error) {
      console.warn('Failed to clear stored user profile', error)
    }
    const idaasUrl = this.getIdaasAuthUrl('')
    window.location.replace(idaasUrl || '/login')
  }
}

export default new AuthService()
