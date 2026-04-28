import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAuthStore } from '@/store'
import authService from '@/services/authService'
import { consumePostLoginRedirect, rememberPostLoginRedirect } from '@/utils/authNavigation'
import { logger, pageView, reportTiming, setObservabilityUser } from '@/utils/observability'

const LoginPage = lazy(() => import('@/pages/Login/LoginPage'))
const MainLayoutFloating = lazy(() => import('@/layouts/MainLayoutFloating'))
const EditorWorkspace = lazy(() => import('@/components/layout/EditorWorkspace'))
const SearchResultPage = lazy(() => import('@/pages/Search/SearchResultPage'))
const SharedNoteViewerPage = lazy(() => import('@/pages/SharedNotes/SharedNoteViewerPage'))

function FullPageLoader({ tip = '页面加载中...' }) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
    }}>
      <Spin size="large" tip={tip} />
    </div>
  )
}

function withSuspense(element, tip) {
  return (
    <Suspense fallback={<FullPageLoader tip={tip} />}>
      {element}
    </Suspense>
  )
}

function RouteTelemetry() {
  const location = useLocation()
  const routeStartRef = useRef(0)
  const routeKeyRef = useRef('')

  useEffect(() => {
    const route = `${location.pathname}${location.search}${location.hash}`
    routeKeyRef.current = route
    routeStartRef.current = Date.now()

    pageView(route, {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    })

    let firstFrameId = null
    let secondFrameId = null

    const emitRouteReadyTiming = () => {
      if (routeKeyRef.current !== route) {
        return
      }

      reportTiming('route_view_ready', Date.now() - routeStartRef.current, {
        route,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      })
    }

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(emitRouteReadyTiming)
    })

    return () => {
      if (firstFrameId != null) {
        window.cancelAnimationFrame(firstFrameId)
      }

      if (secondFrameId != null) {
        window.cancelAnimationFrame(secondFrameId)
      }
    }
  }, [location.hash, location.pathname, location.search])

  return null
}

function AuthProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })
  const { login: storeLogin, checkAuthStatus } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authData = authService.detectAuthFromUrl()

        if (authData) {
          const redirectFromState = authService.getPostLoginRedirectFromUrl()
          if (redirectFromState) {
            rememberPostLoginRedirect(redirectFromState)
          }
          await storeLogin(authData)
          setObservabilityUser(authService.getStoredUserProfile() || authData.user || null)
          authService.clearUrlAuthParams()
          const redirectPath = consumePostLoginRedirect()
          if (redirectPath) {
            const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
            if (redirectPath !== currentPath) {
              navigate(redirectPath, { replace: true })
              return
            }
          }
          setAuthState({ isLoading: false, isAuthenticated: true, error: null })
        } else {
          const isAuthenticated = checkAuthStatus()
          setObservabilityUser(isAuthenticated ? (authService.getStoredUserProfile() || null) : null)
          setAuthState({ isLoading: false, isAuthenticated, error: null })
        }
      } catch (error) {
        setObservabilityUser(null)
        logger.error('Auth initialization failed', error)
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          error: error.message || 'Authentication failed',
        })
      }
    }

    initAuth()
  }, [storeLogin, checkAuthStatus, navigate, location.key])
  useEffect(() => {
    if (!authState.isAuthenticated) {
      return undefined
    }

    const run = () => {
      void import('@/components/layout/EditorWorkspace')
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(run, { timeout: 1200 })
      return () => window.cancelIdleCallback?.(idleId)
    }

    const timeoutId = window.setTimeout(run, 16)
    return () => window.clearTimeout(timeoutId)
  }, [authState.isAuthenticated])

  if (authState.isLoading) {
    return <FullPageLoader tip="正在验证身份..." />
  }

  return children
}

function AuthGuard({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated) {
      return
    }

    const targetPath = `${location.pathname}${location.search}${location.hash}`
    authService.redirectToIdaas(targetPath)
  }, [isAuthenticated, location.hash, location.pathname, location.search])

  if (!isAuthenticated) {
    return <FullPageLoader tip="正在跳转登录..." />
  }

  return children
}

function AppRoutes() {
  return (
    <AuthProvider>
      <RouteTelemetry />
      <Routes>
        <Route path="/login" element={withSuspense(<LoginPage />, '正在准备登录...')} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Navigate to="/cloudnote/recent" replace />
            </AuthGuard>
          }
        />
        <Route
          path="/cloudnote/shares/:id"
          element={withSuspense(<SharedNoteViewerPage />, '正在打开分享内容...')}
        />
        <Route
          path="/cloudnote"
          element={
            <AuthGuard>
              {withSuspense(<MainLayoutFloating />, '正在加载工作区...')}
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="recent" replace />} />
          <Route path="recent" element={withSuspense(<EditorWorkspace />, '正在打开笔记...')} />
          <Route path="recent/:id" element={withSuspense(<EditorWorkspace />, '正在打开笔记...')} />
          <Route path="starred" element={withSuspense(<EditorWorkspace />, '正在打开星标笔记...')} />
          <Route path="starred/:id" element={withSuspense(<EditorWorkspace />, '正在打开星标笔记...')} />
          <Route path="star/:id" element={withSuspense(<EditorWorkspace />, '正在打开星标笔记...')} />
          <Route path="shares" element={<Navigate to="myshares" replace />} />
          <Route path="myshares" element={withSuspense(<EditorWorkspace />, '正在打开分享笔记...')} />
          <Route path="myshares/:id" element={withSuspense(<EditorWorkspace />, '正在打开分享笔记...')} />
          <Route path="search" element={withSuspense(<SearchResultPage />, '正在搜索笔记...')} />
          <Route path="notebooks" element={withSuspense(<EditorWorkspace />, '正在打开笔记本...')} />
          <Route path="notebooks/:notebookId/:noteId" element={withSuspense(<EditorWorkspace />, '正在打开笔记本...')} />
          <Route path="notebooks/:id" element={withSuspense(<EditorWorkspace />, '正在打开笔记本...')} />
          <Route path="recyclebin" element={withSuspense(<EditorWorkspace />, '正在打开回收站...')} />
          <Route path="recyclebin/:id" element={withSuspense(<EditorWorkspace />, '正在打开回收站...')} />
          <Route path="note/:id" element={withSuspense(<EditorWorkspace />, '正在打开笔记...')} />
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
