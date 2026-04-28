import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OutlineEditor from '@/components/editors/OutlineEditor'

const mocks = vi.hoisted(() => ({
  cloudDiagramEditorMock: vi.fn((props) => (
    <div
      data-testid="cloud-diagram-editor"
      data-editor-kind={props.editorKind}
      data-editor-url={props.editorProps?.url}
      data-collab-disable={String(props.editorProps?.collabOptions?.disable)}
    />
  )),
}))

vi.mock('@/components/editors/CloudDiagramEditor', () => ({
  default: (props) => mocks.cloudDiagramEditorMock(props),
}))

vi.mock('@cloud/react-mind-editor-sdk', () => ({
  MindEditorComponent: () => null,
}))

vi.mock('@/utils/config', () => ({
  getAppConfig: () => ({
    editor: {
      board: {
        editorUrl: 'https://board.example.com/editor/boardeditor',
        collaborationUrl: 'wss://board.example.com/koopage/websocket/',
      },
      mind: {
        editorUrl: 'https://mind.example.com/editor/mindeditor',
        collaborationUrl: 'wss://mind.example.com/koopage/ws',
        collabOptions: {
          disable: true,
        },
      },
    },
  }),
}))

describe('OutlineEditor', () => {
  it('uses the mind editor config and keeps board config isolated', () => {
    render(<OutlineEditor note={{ id: 'note-1' }} onChange={vi.fn()} onSave={vi.fn()} />)

    const editor = screen.getByTestId('cloud-diagram-editor')
    expect(editor).toHaveAttribute('data-editor-kind', 'mind')
    expect(editor).toHaveAttribute('data-editor-url', 'https://mind.example.com/editor/mindeditor')
    expect(editor).toHaveAttribute('data-collab-disable', 'false')

    const props = mocks.cloudDiagramEditorMock.mock.calls.at(-1)[0]
    expect(props.editorProps.collabOptions).toMatchObject({
      disable: false,
      server: 'wss://mind.example.com/koopage/ws',
    })
  })
})
