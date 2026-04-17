import { useEffect, useState } from 'react'

function resolveRedirectUri(searchParams) {
  return searchParams.get('redirectUri') || searchParams.get('redirect_uri') || ''
}

function resolveState(searchParams) {
  return searchParams.get('state') || ''
}

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [redirectUri, setRedirectUri] = useState('')
  const [oauthState, setOauthState] = useState('')

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const uri = resolveRedirectUri(urlParams)
    const state = resolveState(urlParams)

    if (uri) {
      setRedirectUri(uri)
      console.log('IDaaS Login: Received redirectUri:', uri)
    } else {
      console.warn('IDaaS Login: No redirectUri found in URL')
    }

    if (state) {
      setOauthState(state)
      console.log('IDaaS Login: Received state:', state)
    }
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    if (!redirectUri) {
      setError('缺少重定向地址，请重新访问应用')
      console.error('IDaaS Login: redirectUri is empty')
      return
    }

    setRedirecting(true)

    const code = username
    let redirectUrl

    try {
      redirectUrl = new URL(redirectUri)
    } catch {
      redirectUrl = new URL(redirectUri, window.location.origin)
    }

    redirectUrl.searchParams.set('code', code)
    redirectUrl.searchParams.set('type', 'weDocsIDaas')
    if (oauthState) {
      redirectUrl.searchParams.set('state', oauthState)
    }

    const finalUrl = redirectUrl.toString()
    console.log('IDaaS Login: Final redirect URL:', finalUrl)

    window.setTimeout(() => {
      window.location.href = finalUrl
    }, 600)
  }

  return (
    <div className="container">
      <h1>IDaaS 认证</h1>
      {redirecting ? (
        <div className="redirecting">
          <p>登录成功，正在跳转...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
            />
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button type="submit">登录</button>
        </form>
      )}
    </div>
  )
}

export default App
