import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Button, Spin, Alert } from 'antd'
import { LoginOutlined, MobileOutlined } from '@ant-design/icons'
import authService from '@/services/authService'
import useAuthStore from '@/store/useAuthStore'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: storeLogin, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/cloudnote/recent'
      navigate(from, { replace: true })
      return
    }
    
    handleAuthCallback()
  }, [isAuthenticated, navigate, location])

  const handleAuthCallback = async () => {
    try {
      setIsProcessing(true)
      clearError()
      
      const authData = authService.detectAuthFromUrl()
      if (authData) {
        await storeLogin(authData)
        authService.clearUrlAuthParams()
        const from = location.state?.from || '/cloudnote/recent'
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Auth callback error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleIdaasLogin = () => {
    authService.redirectToIdaas()
  }

  const handleWelinkLogin = () => {
    window.location.href = '/welink-auth'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      padding: 24,
    }}>
      <Card
        style={{ width: '100%', maxWidth: 448, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>云笔记</h1>
          <p style={{ fontSize: 14, color: '#bfbfbf' }}>智能协作，高效记录</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={handleIdaasLogin}
            loading={isLoading || isProcessing}
            block
            style={{
              height: 52,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,97,164,0.25)',
              fontWeight: 600,
            }}
          >
            IDaaS 账号登录
          </Button>

          <Button
            size="large"
            icon={<MobileOutlined />}
            onClick={handleWelinkLogin}
            disabled={isLoading || isProcessing}
            block
            style={{
              height: 52,
              borderRadius: 8,
              borderColor: 'rgba(0,0,0,0.1)',
              fontWeight: 600,
            }}
          >
            Welink 免登
          </Button>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon closable onClose={clearError} style={{ marginTop: 16 }} />
        )}

        {(isLoading || isProcessing) && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <Spin tip="正在处理..." />
          </div>
        )}
      </Card>

      <p style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 12,
        color: '#bfbfbf',
      }}>
        登录即表示您同意我们的服务条款和隐私政策
      </p>
    </div>
  )
}

export default LoginPage
