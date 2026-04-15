import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAuthStore from '@/store/useAuthStore'

const {
  loginMock,
  isAuthenticatedMock,
  getTokenMock,
  getUserIdMock,
  getAppIdMock,
  logoutMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  isAuthenticatedMock: vi.fn(),
  getTokenMock: vi.fn(),
  getUserIdMock: vi.fn(),
  getAppIdMock: vi.fn(),
  logoutMock: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  default: {
    login: loginMock,
    isAuthenticated: isAuthenticatedMock,
    getToken: getTokenMock,
    getUserId: getUserIdMock,
    getAppId: getAppIdMock,
    logout: logoutMock,
  },
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      token: null,
      userId: null,
      appId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('hydrates auth state from cookies through checkAuthStatus', () => {
    isAuthenticatedMock.mockReturnValue(true)
    getTokenMock.mockReturnValue('token-1')
    getUserIdMock.mockReturnValue('user-1')
    getAppIdMock.mockReturnValue('app-1')

    const result = useAuthStore.getState().checkAuthStatus()

    expect(result).toBe(true)
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      token: 'token-1',
      userId: 'user-1',
      appId: 'app-1',
    })
  })
})
