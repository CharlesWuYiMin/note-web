import useAuthStore from '@/store/useAuthStore'
import authService from '@/services/authService'

export function useAuth() {
  const {
    user, token, userId, appId,
    isAuthenticated, isLoading, error,
    login: storeLogin, logout, checkAuthStatus
  } = useAuthStore()

  const handleLogin = async (loginData) => {
    return useAuthStore.getState().login(loginData)
  }

  const handleLogout = () => {
    logout()
  }

  const redirectToIdaas = () => {
    authService.redirectToIdaas()
  }

  const parseCallback = () => {
    return authService.parseAuthCallback()
  }

  return {
    user, token, userId, appId,
    isAuthenticated, isLoading, error,
    login: handleLogin,
    logout: handleLogout,
    checkAuth: checkAuthStatus,
    redirectToIdaas,
    parseCallback,
    getToken: authService.getToken.bind(authService),
    getUserId: authService.getUserId.bind(authService),
  }
}

export default useAuth