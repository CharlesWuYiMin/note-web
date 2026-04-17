import { create } from 'zustand'
import authService from '@/services/authService'

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  userId: null,
  appId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (loginData) => {
    set({ isLoading: true, error: null })
    try {
      await authService.login(loginData)
      set({
        user: authService.getStoredUserProfile(),
        isLoading: false,
        isAuthenticated: true,
        token: authService.getToken(),
        userId: authService.getUserId(),
        appId: authService.getAppId(),
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || error.message || 'Login failed',
        isAuthenticated: false,
      })
      throw error
    }
  },

  checkAuthStatus: () => {
    const isAuthenticated = authService.isAuthenticated()
    if (isAuthenticated) {
      set({
        user: authService.getStoredUserProfile(),
        isAuthenticated: true,
        token: authService.getToken(),
        userId: authService.getUserId(),
        appId: authService.getAppId(),
      })
    }
    return isAuthenticated
  },

  setUser: (user) => set({ user }),

  logout: () => {
    authService.logout()
    set({
      user: null,
      token: null,
      userId: null,
      appId: null,
      isAuthenticated: false,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
