import { getAppConfig } from './config'

const AUTH_COOKIE_NAMES = ['cloud_doc_token', 'cloud_doc_userid', 'cloud_doc_appid']
const POST_LOGIN_REDIRECT_KEY = 'cloudnote:post-login-redirect'

let redirectingToLogin = false

function getIdaasLoginUrl(targetPath = '') {
  const config = getAppConfig()
  const idaasConfig = config?.auth?.idaas || {}
  const authUrl = String(idaasConfig.authUrl || '').trim()
  const clientId = String(idaasConfig.clientId || '').trim()
  const redirectUri = String(idaasConfig.redirectUri || '').trim()

  if (!authUrl || !clientId || !redirectUri) {
    return ''
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
  })

  if (targetPath) {
    params.set('state', targetPath)
  }

  return `${authUrl}?${params.toString()}`
}

export function clearAuthCookies() {
  if (typeof document === 'undefined') {
    return
  }

  AUTH_COOKIE_NAMES.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
  })
}

export function rememberPostLoginRedirect(targetPath) {
  if (typeof window === 'undefined') {
    return
  }

  const currentPath = targetPath || `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (!currentPath || currentPath === '/login') {
    return
  }

  window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, currentPath)
  window.localStorage.setItem(POST_LOGIN_REDIRECT_KEY, currentPath)
}

export function consumePostLoginRedirect() {
  if (typeof window === 'undefined') {
    return ''
  }

  const targetPath = (
    window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
    || window.localStorage.getItem(POST_LOGIN_REDIRECT_KEY)
    || ''
  )

  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  window.localStorage.removeItem(POST_LOGIN_REDIRECT_KEY)

  return targetPath
}

export function peekPostLoginRedirect() {
  if (typeof window === 'undefined') {
    return ''
  }

  return (
    window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
    || window.localStorage.getItem(POST_LOGIN_REDIRECT_KEY)
    || ''
  )
}

export function redirectToLogin(options = {}) {
  const { preserveCurrentPath = true, reason = 'expired' } = options

  if (typeof window === 'undefined') {
    return
  }

  clearAuthCookies()

  if (preserveCurrentPath) {
    rememberPostLoginRedirect()
  }

  if (redirectingToLogin) {
    return
  }

  const rememberedPath = peekPostLoginRedirect()
  const loginUrl = getIdaasLoginUrl(rememberedPath)
  if (!loginUrl) {
    const fallbackUrl = new URL('/login', window.location.origin)
    if (reason) {
      fallbackUrl.searchParams.set('reason', reason)
    }

    redirectingToLogin = true
    window.location.replace(`${fallbackUrl.pathname}${fallbackUrl.search}`)
    return
  }

  redirectingToLogin = true
  window.location.replace(loginUrl)
}

export function handleUnauthorizedResponse() {
  redirectToLogin({
    preserveCurrentPath: true,
    reason: 'expired',
  })
}
