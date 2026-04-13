﻿import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import LoginPage from '@/pages/Login/LoginPage'
import MainLayoutFloating from '@/layouts/MainLayoutFloating'
import EditorWorkspace from '@/components/layout/EditorWorkspace'
import SearchResultPage from '@/pages/Search/SearchResultPage'
import useAuthStore from '@/store/useAuthStore'
import authService from '@/services/authService'
import { KooEditor, getRuntimeConfig } from '@cloud/koopage-editor-sdk'

function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })
  const location = useLocation()
  const { login: storeLogin, checkAuthStatus } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authData = authService.detectAuthFromUrl()

        if (authData) {
          await storeLogin(authData)
          authService.clearUrlAuthParams()
          setAuthState({ isLoading: false, isAuthenticated: true, error: null })
        } else {
          const isAuthenticated = checkAuthStatus()
          setAuthState({ isLoading: false, isAuthenticated, error: null })
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          error: error.message || 'Authentication failed',
        })
      }
    }

    initAuth()
  }, [location, storeLogin, checkAuthStatus])

  useEffect(()=>{
    KooEditor.preload("https://innovation.huaweiapaas.com/editor",{httpSettings:undefined})
  },[])

  if (authState.isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <Spin size="large" tip="正在验证身份..." />
      </div>
    )
  }

  return children
}

function AuthGuard({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }

  return children
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Navigate to="/cloudnote/recent" replace />
            </AuthGuard>
          }
        />
        <Route
          path="/cloudnote"
          element={
            <AuthGuard>
              <MainLayoutFloating />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="recent" replace />} />
          <Route path="recent" element={<EditorWorkspace />} />
          <Route path="recent/:id" element={<EditorWorkspace />} />
          <Route path="starred" element={<EditorWorkspace />} />
          <Route path="starred/:id" element={<EditorWorkspace />} />
          <Route path="star/:id" element={<EditorWorkspace />} />
          <Route path="shares" element={<EditorWorkspace />} />
          <Route path="shares/:id" element={<EditorWorkspace />} />
          <Route path="search" element={<SearchResultPage />} />
          <Route path="notebooks" element={<EditorWorkspace />} />
          <Route path="notebooks/:id" element={<EditorWorkspace />} />
          <Route path="recyclebin" element={<EditorWorkspace />} />
          <Route path="recyclebin/:id" element={<EditorWorkspace />} />
          <Route path="note/:id" element={<EditorWorkspace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <AppRoutes />
      </Router>
    </ConfigProvider>
  )
}

export default App
