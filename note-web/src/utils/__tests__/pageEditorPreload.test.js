import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetPageEditorPreloadCacheForTests,
  getPageEditorPreloadPayload,
  preloadPageEditorResources,
} from '@/utils/pageEditorPreload'

const {
  preloadMock,
  getAppIdMock,
  getAppConfigMock,
} = vi.hoisted(() => ({
  preloadMock: vi.fn(),
  getAppIdMock: vi.fn(),
  getAppConfigMock: vi.fn(),
}))

vi.mock('@cloud/koopage-editor-sdk', () => ({
  KooEditor: {
    preload: preloadMock,
  },
}))

vi.mock('@/services/authService', () => ({
  default: {
    getAppId: getAppIdMock,
  },
}))

vi.mock('@/utils/config', () => ({
  getAppConfig: getAppConfigMock,
}))

describe('pageEditorPreload', () => {
  beforeEach(() => {
    preloadMock.mockReset()
    getAppIdMock.mockReset()
    getAppConfigMock.mockReset()
    __resetPageEditorPreloadCacheForTests()

    getAppIdMock.mockReturnValue('cookie-app-id')
    getAppConfigMock.mockReturnValue({
      editor: {
        page: {
          editorUrl: 'https://editor.example.com/editor/',
          auth: {
            appId: 'config-app-id',
          },
        },
      },
    })
  })

  it('builds preload payload from page editor config', () => {
    expect(getPageEditorPreloadPayload()).toEqual({
      editorUrl: 'https://editor.example.com/editor',
      options: {
        appId: 'config-app-id',
      },
    })
  })

  it('preloads only once for the same editor url and app id', () => {
    expect(preloadPageEditorResources()).toBe(true)
    expect(preloadPageEditorResources()).toBe(false)
    expect(preloadMock).toHaveBeenCalledTimes(1)
    expect(preloadMock).toHaveBeenCalledWith('https://editor.example.com/editor', {
      appId: 'config-app-id',
    })
  })

  it('allows overriding editor url and app id', () => {
    preloadPageEditorResources({
      editorUrl: 'https://override.example.com/open-editor/',
      appId: 'override-app-id',
    })

    expect(preloadMock).toHaveBeenCalledWith('https://override.example.com/open-editor', {
      appId: 'override-app-id',
    })
  })
})
