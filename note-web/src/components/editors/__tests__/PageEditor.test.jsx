import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PageEditor from '@/components/editors/PageEditor'

const mocks = vi.hoisted(() => ({
  createMock: vi.fn(),
  destroyMock: vi.fn(),
  resizeMock: vi.fn(),
  refreshMock: vi.fn(),
  updateSizeMock: vi.fn(),
}))

vi.mock('@cloud/koopage-editor-sdk', () => ({
  KooEditor: {
    create: mocks.createMock,
  },
  getRuntimeConfig: vi.fn(() => ({
    editorUrl: 'http://editor.local',
    apiUrl: 'http://api.local',
  })),
}))

vi.mock('@/hooks/useAuth', () => ({
  default: () => ({
    user: {
      id: 'user-1',
      name: 'Tester',
      realName: 'Tester',
    },
    userId: 'user-1',
    appId: 'app-1',
  }),
}))

vi.mock('@/services/authService', () => ({
  default: {
    getAppId: vi.fn(() => 'app-1'),
    getUserId: vi.fn(() => 'user-1'),
    getToken: vi.fn(() => 'token-1'),
    createEditorAuth: vi.fn(),
  },
}))

vi.mock('@/utils/config', () => ({
  getAppConfig: vi.fn(() => ({
    api: {
      contentServer: 'http://content.local',
      baseUrl: 'http://base.local',
    },
    editor: {
      page: {
        auth: {
          enabled: false,
        },
      },
    },
  })),
}))

describe('PageEditor', () => {
  beforeEach(() => {
    mocks.createMock.mockReset()
    mocks.destroyMock.mockReset()
    mocks.resizeMock.mockReset()
    mocks.refreshMock.mockReset()
    mocks.updateSizeMock.mockReset()

    mocks.createMock.mockResolvedValue({
      destroy: mocks.destroyMock,
      resize: mocks.resizeMock,
      refresh: mocks.refreshMock,
      updateSize: mocks.updateSizeMock,
      getContent: vi.fn(() => ''),
    })

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 960,
      height: 720,
      top: 0,
      left: 0,
      right: 960,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps the editor instance when only callbacks change', async () => {
    const note = {
      id: 'note-1',
    }

    const { rerender } = render(
      <PageEditor
        note={note}
        value=""
        onChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(mocks.createMock).toHaveBeenCalled()
    })

    const createCallsAfterMount = mocks.createMock.mock.calls.length
    const destroyCallsAfterMount = mocks.destroyMock.mock.calls.length

    rerender(
      <PageEditor
        note={note}
        value=""
        onChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(mocks.createMock.mock.calls.length).toBe(createCallsAfterMount)
    expect(mocks.destroyMock.mock.calls.length).toBe(destroyCallsAfterMount)
  })
})
