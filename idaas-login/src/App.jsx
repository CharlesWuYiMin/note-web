import { useState, useEffect } from 'react'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [redirectUri, setRedirectUri] = useState('')

  // 从 URL 中获取 redirectUri 参数（注意：参数名是 redirectUri，不是 redirect_uri）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    // 支持 redirectUri 或 redirect_uri 两种参数名
    const uri = urlParams.get('redirectUri') || urlParams.get('redirect_uri')
    if (uri) {
      setRedirectUri(uri)
      console.log('IDaaS Login: Received redirectUri:', uri)
    } else {
      console.warn('IDaaS Login: No redirectUri found in URL')
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // 验证用户名和密码
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    // 检查 redirectUri 是否存在
    if (!redirectUri) {
      setError('缺少重定向地址，请重新访问应用')
      console.error('IDaaS Login: redirectUri is empty')
      return
    }

    // 模拟登录成功（不校验密码，任何密码都通过）
    setRedirecting(true)

    // 直接使用用户名作为 code
    const code = username

    console.log('IDaaS Login: Generated code for user', username, ':', code)
    console.log('IDaaS Login: Redirecting to:', redirectUri)

    // 构建重定向 URL
    let redirectUrl
    try {
      redirectUrl = new URL(redirectUri)
    } catch (e) {
      // 如果 redirectUri 不是完整 URL，则使用当前 origin
      redirectUrl = new URL(redirectUri, window.location.origin)
    }
    
    redirectUrl.searchParams.append('code', code)
    redirectUrl.searchParams.append('type', 'weDocsIDaas')

    const finalUrl = redirectUrl.toString()
    console.log('IDaaS Login: Final redirect URL:', finalUrl)

    // 延迟重定向，让用户看到加载状态
    setTimeout(() => {
      console.log('IDaaS Login: Executing redirect to:', finalUrl)
      window.location.href = finalUrl
    }, 1000)
  }

  return (
    <div className="container">
      <h1>IDaaS 认证</h1>
      {redirecting ? (
        <div className="redirecting">
          <p>登录成功，正在重定向...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit">登录</button>
        </form>
      )}
    </div>
  )
}

export default App