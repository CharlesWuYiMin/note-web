import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Spin } from 'antd'
import authService from '@/services/authService'
import useAuthStore from '@/store/useAuthStore'
import { consumePostLoginRedirect, peekPostLoginRedirect, rememberPostLoginRedirect } from '@/utils/authNavigation'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: storeLogin, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const loginReason = new URLSearchParams(location.search).get('reason')
  const authData = useMemo(() => authService.detectAuthFromUrl(), [location.search])

  const resolveAfterLoginPath = () => (
    location.state?.from
    || consumePostLoginRedirect()
    || '/cloudnote/recent'
  )

  useEffect(() => {
    if (isAuthenticated) {
      navigate(resolveAfterLoginPath(), { replace: true })
      return
    }

    const handleLoginFlow = async () => {
      if (authData) {
        try {
          setIsProcessing(true)
          clearError()

          const redirectFromState = authService.getPostLoginRedirectFromUrl()
          if (redirectFromState) {
            rememberPostLoginRedirect(redirectFromState)
          }

          await storeLogin(authData)
          authService.clearUrlAuthParams()
          navigate(resolveAfterLoginPath(), { replace: true })
        } catch (authError) {
          console.error('Auth callback error:', authError)
          setIsProcessing(false)
        }
        return
      }

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      const rememberedPath = peekPostLoginRedirect()
      const targetPath = (
        location.state?.from
        || rememberedPath
        || (currentPath.startsWith('/login') ? '' : currentPath)
      )

      if (targetPath) {
        rememberPostLoginRedirect(targetPath)
      }

      authService.redirectToIdaas(targetPath)
    }

    void handleLoginFlow()
  }, [authData, clearError, isAuthenticated, location.hash, location.key, location.search, location.state, navigate, storeLogin])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--surface)',
        padding: 24,
      }}
    >
      <Spin size="large" tip={authData ? '正在处理登录...' : '正在跳转登录...'} />
      {error ? (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ maxWidth: 420 }}
        />
      ) : null}
      {!error && loginReason === 'expired' && !isLoading && !isProcessing ? (
        <Alert
          message="当前登录已失效，正在跳转登录"
          type="warning"
          showIcon
          style={{ maxWidth: 420 }}
        />
      ) : null}
    </div>
  )
}

export default LoginPage
