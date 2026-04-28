import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HandwrittenEditor from '@/components/editors/HandwrittenEditor'

const mocks = vi.hoisted(() => ({
  cloudDiagramEditorMock: vi.fn((props) => (
    <div
      data-testid="cloud-diagram-editor"
      data-editor-kind={props.editorKind}
      data-scene-mode={props.editorProps?.scene?.mode}
    />
  )),
}))

vi.mock('@/components/editors/CloudDiagramEditor', () => ({
  default: (props) => mocks.cloudDiagramEditorMock(props),
}))

vi.mock('@cloud/react-board-editor-sdk', () => ({
  BoardEditorComponent: () => null,
}))

vi.mock('@/utils/config', () => ({
  getAppConfig: () => ({
    editor: {
      board: {
        editorUrl: 'https://board.example.com/editor/boardeditor',
        collaborationUrl: 'wss://board.example.com/koopage/websocket/',
        collabOptions: {
          disable: false,
          server: 'wss://board.example.com/old-websocket/',
        },
        service: {
          baseURL: 'https://api.example.com',
          imgPrefix: '',
        },
      },
    },
  }),
}))

describe('HandwrittenEditor', () => {
  it('starts the board editor in preview mode with preset document data', () => {
    render(<HandwrittenEditor note={{ id: 'note-1' }} onChange={vi.fn()} onSave={vi.fn()} />)

    const editor = screen.getByTestId('cloud-diagram-editor')
    expect(editor).toHaveAttribute('data-editor-kind', 'board')
    expect(editor).toHaveAttribute('data-scene-mode', 'preview')

    const props = mocks.cloudDiagramEditorMock.mock.calls.at(-1)[0]
    expect(props.editorProps.scene).toMatchObject({
      mode: 'preview',
      menuSetting: {
        disableMenus: ['comment'],
      },
    })
    expect(props.editorProps.collabOptions).toMatchObject({
      disable: true,
      server: 'wss://board.example.com/koopage/websocket/',
    })
    expect(props.useServerAuth).toBe(false)
    expect(props.documentData[0]).toEqual({ agg_version: '1.16' })
    expect(props.documentData[1]).toMatchObject({
      appState: { viewBackgroundColor: '#ffffff' },
      id: 'confboard#5bfe1c3f-59fa-4dbe-b5b2-b2c29af279a2',
      _start: true,
    })
    expect(props.documentData[1].elements).toEqual(
      expect.arrayContaining(['confboard#5bfe1c3f-59fa-4dbe-b5b2-b2c29af279a2'])
    )
  })
})
