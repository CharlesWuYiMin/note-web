import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CloudDiagramEditor from '@/components/editors/CloudDiagramEditor'

const mocks = vi.hoisted(() => ({
  createEditorAuthMock: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  default: () => ({
    user: {
      id: 'user-1',
      name: 'Tester',
      realName: 'Tester',
      avatar: 'https://cdn.example.com/avatar.png',
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
    createEditorAuth: mocks.createEditorAuthMock,
  },
}))

describe('CloudDiagramEditor', () => {
  beforeEach(() => {
    mocks.createEditorAuthMock.mockReset()
    mocks.createEditorAuthMock.mockReturnValue({
      appId: 'app-1',
      userId: 'user-1',
      user: {
        id: 'user-1',
        name: 'Tester',
        realName: 'Tester',
        avatar: 'https://cdn.example.com/avatar.png',
      },
      token: Promise.resolve('jwt-token-1'),
      extraData: {
        documentId: 'note-1',
      },
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

  it('passes editor props through without reshaping config', async () => {
    const editorProps = {
      url: 'https://board.example.com/editor/boardeditor',
      collabOptions: {
        disable: true,
        server: 'wss://board.example.com/koopage/websocket/',
      },
      scene: {
        mode: 'editor',
        menuSetting: {
          disableMenus: ['comment'],
        },
      },
      editorConfig: {
      theme: 'light',
      securitySettings: {
        displayWatermark: true,
      },
      },
      service: {
        baseURL: '/',
        imgPrefix: '',
      },
    }
    const EditorComponent = vi.fn(() => <div data-testid="board-editor" />)

    render(
      <CloudDiagramEditor
        EditorComponent={EditorComponent}
        editorKind="board"
        editorProps={editorProps}
        note={{ id: 'note-1' }}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(EditorComponent).toHaveBeenCalled()
    })

    const props = EditorComponent.mock.calls.at(-1)[0]

    expect(props.document).toMatchObject({
      docId: 'note-1',
      docType: 'board',
      lang: 'zh-CN',
      createuserId: 'user-1',
    })
    expect(props.document).not.toHaveProperty('data')
    expect(props.url).toBe(editorProps.url)
    expect(props.collabOptions).toBe(editorProps.collabOptions)
    expect(props.scene).toBe(editorProps.scene)
    expect(props.editorConfig).toBe(editorProps.editorConfig)
    expect(props.service).toBe(editorProps.service)
  })

  it('passes draw props through without reshaping config', async () => {
    const editorProps = {
      url: 'https://draw.example.com/editor',
      collabOptions: {
        disable: false,
        server: 'wss://draw.example.com/koopage/ws',
      },
      scene: {
        mode: 'editor',
      },
      editorConfig: {
        theme: 'light',
      },
      service: {
        baseURL: '/',
        imgPrefix: '',
      },
    }
    const EditorComponent = vi.fn(() => <div data-testid="draw-editor" />)

    render(
      <CloudDiagramEditor
        EditorComponent={EditorComponent}
        editorKind="draw"
        editorProps={editorProps}
        note={{ id: 'note-2' }}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(EditorComponent).toHaveBeenCalled()
    })

    const props = EditorComponent.mock.calls.at(-1)[0]

    expect(props.document).toMatchObject({
      docId: 'note-2',
      docType: 'draw',
      lang: 'zh-CN',
      createuserId: 'user-1',
    })
    expect(props.document).not.toHaveProperty('data')
    expect(props.url).toBe(editorProps.url)
    expect(props.collabOptions).toBe(editorProps.collabOptions)
    expect(props.scene).toBe(editorProps.scene)
    expect(props.editorConfig).toBe(editorProps.editorConfig)
    expect(props.service).toBe(editorProps.service)
  })

  it('uses legacy auth when server auth is disabled', async () => {
    const editorProps = {
      url: 'https://board.example.com/editor/boardeditor',
      collabOptions: {
        disable: true,
        server: 'wss://board.example.com/koopage/websocket/',
      },
      scene: {
        mode: 'preview',
      },
      editorConfig: {
        theme: 'light',
      },
      service: {
        baseURL: '/',
        imgPrefix: '',
      },
    }
    const EditorComponent = vi.fn(() => <div data-testid="board-editor" />)

    render(
      <CloudDiagramEditor
        EditorComponent={EditorComponent}
        editorKind="board"
        editorProps={editorProps}
        note={{ id: 'note-3' }}
        useServerAuth={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(EditorComponent).toHaveBeenCalled()
    })

    expect(mocks.createEditorAuthMock).not.toHaveBeenCalled()

    const props = EditorComponent.mock.calls.at(-1)[0]
    expect(props.document).not.toHaveProperty('data')
    expect(props.authentication).toMatchObject({
      appId: 'app-1',
      userId: 'user-1',
      token: 'token-1',
      analyzeToken: 'token-1',
      extraData: {
        documentId: 'note-3',
      },
    })
  })
})
