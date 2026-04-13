import request from '@/utils/request'
import { getAppConfig } from '@/utils/config'

class AuthService {
  constructor() {
    this.config = getAppConfig()
  }

  getEditorPageConfig() {
    return this.config.editor?.page || {}
  }

  getEditorAuthConfig() {
    const pageConfig = this.getEditorPageConfig()
    return {
      appId: pageConfig.auth?.appId || pageConfig.appId || this.getAppId() || 'stub-editor-app-id',
      signKey: pageConfig.auth?.signKey || pageConfig.signKey || 'stub-editor-sign-key',
      expiresInMs: pageConfig.auth?.expiresInMs || 5 * 60 * 1000,
    }
  }

  async generateEditorToken({
    documentId,
    userId,
    userName,
    authType = '1',
    expiresInMs,
    signKey,
  }) {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    }

    const payload = {
      doc: JSON.stringify({
        documentId: String(documentId || ''),
      }),
      sub: JSON.stringify({
        userName: String(userName || userId || 'unknown'),
        userId: String(userId || 'unknown'),
        authType: String(authType || '1'),
      }),
      exp: Date.now() + (Number.isFinite(expiresInMs) ? expiresInMs : 5 * 60 * 1000),
    }

    const encodedHeader = this.base64UrlEncodeJson(header)
    const encodedPayload = this.base64UrlEncodeJson(payload)
    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    const signature = await this.signHs256(unsignedToken, signKey)

    return `${unsignedToken}.${signature}`
  }

  createEditorAuth({ documentId, user, userId, appId }) {
    const editorAuthConfig = this.getEditorAuthConfig()
    const resolvedUserId = user?.id || user?.userId || userId || this.getUserId() || 'unknown'
    const resolvedUserName = user?.name || user?.realName || user?.nickName || resolvedUserId
    const resolvedAppId = editorAuthConfig.appId || appId || this.getAppId() || 'stub-editor-app-id'
    const tokenPromise = this.generateEditorToken({
      documentId,
      userId: resolvedUserId,
      userName: resolvedUserName,
      authType: user?.authType || user?.authTypeId || '1',
      expiresInMs: editorAuthConfig.expiresInMs,
      signKey: editorAuthConfig.signKey,
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
      
      return response
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  getIdaasAuthUrl() {
    const { authUrl, clientId, redirectUri } = this.config.auth.idaas
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
    })
    
    return `${authUrl}?${params.toString()}`
  }

  redirectToIdaas() {
    const url = this.getIdaasAuthUrl()
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

  clearUrlAuthParams() {
    if (window.history.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('type')
      url.searchParams.delete('code')
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
    window.location.href = '/login'
  }
}

export default new AuthService()
