import React, { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VoiceNoteEditor from '@/components/editors/VoiceNoteEditor'

const pageEditorMountMock = vi.fn()
const pageEditorUnmountMock = vi.fn()

vi.mock('@/components/editors/PageEditor', () => ({
  default: function MockPageEditor(props) {
    useEffect(() => {
      pageEditorMountMock()
      return () => {
        pageEditorUnmountMock()
      }
    }, [])

    return <div data-testid="page-editor" data-note-id={props.note?.id || ''} />
  },
}))

describe('VoiceNoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps PageEditor mounted when toggling the voice panel', () => {
    const note = {
      id: 'note-1',
      title: '测试笔记',
      type: 'voice',
      voiceNote: [],
    }
    const onVoicePanelToggle = vi.fn()
    const props = {
      note,
      value: '',
      onChange: vi.fn(),
      onSave: vi.fn(),
      onVoicePanelToggle,
      voicePanelVisible: true,
    }

    const { rerender } = render(<VoiceNoteEditor {...props} />)

    expect(screen.getByTestId('page-editor')).toBeInTheDocument()
    expect(pageEditorMountMock).toHaveBeenCalledTimes(1)
    expect(pageEditorUnmountMock).not.toHaveBeenCalled()

    rerender(<VoiceNoteEditor {...props} voicePanelVisible={false} />)

    expect(screen.getByTestId('page-editor')).toBeInTheDocument()
    expect(pageEditorMountMock).toHaveBeenCalledTimes(1)
    expect(pageEditorUnmountMock).not.toHaveBeenCalled()
  })

  it('renders incremental segment cards for restored voice history', () => {
    const note = {
      id: 'note-restore-1',
      title: 'restore',
      type: 'text',
      voiceNote: [
        {
          fileId: 'file-restore-1',
          sessionId: null,
          audioUrl: '/files/file-restore-1',
          createdAt: '2026-04-14T16:53:05.000Z',
        },
      ],
      voiceRealtimeSessions: [
        {
          sessionId: 'session-restore-1',
          status: 'streaming',
          language: 'zh_CN',
          startedAt: '2026-04-14T16:51:35.000Z',
          updatedAt: '2026-04-14T16:53:25.000Z',
          cards: [
            {
              id: 5,
              segmentIndex: 1,
              startOffsetMs: 0,
              transcript: '嗯。',
              createdAt: '2026-04-14T16:52:59.000Z',
            },
            {
              id: 6,
              segmentIndex: 2,
              startOffsetMs: 84355,
              transcript: '你好，开始我的语音转录功能了。',
              createdAt: '2026-04-14T16:53:02.000Z',
            },
            {
              id: 7,
              segmentIndex: 3,
              startOffsetMs: 103355,
              transcript: '第二段语音。',
              createdAt: '2026-04-14T16:53:12.000Z',
            },
          ],
        },
      ],
    }

    render(
      <VoiceNoteEditor
        note={note}
        value=""
        onChange={vi.fn()}
        onSave={vi.fn()}
        voicePanelVisible
      />
    )

    expect(screen.queryByText('嗯。')).not.toBeInTheDocument()
    expect(screen.getAllByText('你好，开始我的语音转录功能了。')).toHaveLength(1)
    expect(screen.getByText('第二段语音。')).toBeInTheDocument()
    expect(screen.getByText('分段 01')).toBeInTheDocument()
    expect(screen.getByText('分段 02')).toBeInTheDocument()
  })

  it('does not show an append button', () => {
    const note = {
      id: 'note-append-1',
      title: '追加测试',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-append-1',
          audioUrl: '/files/file-append-1',
          createdAt: '2026-04-14T10:00:00.000Z',
        },
      ],
      voiceRealtimeSessions: [],
    }

    render(
      <VoiceNoteEditor
        note={note}
        value=""
        onChange={vi.fn()}
        onSave={vi.fn()}
        voicePanelVisible
      />
    )

    expect(screen.queryByRole('button', { name: /追加/ })).not.toBeInTheDocument()
  })
})
