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

  it('prefers the session card when restored segments exist on an unlinked voice session', () => {
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
          partialTranscript: '.',
          finalTranscript: '第一段最终文本\\n第二段最终文本',
          startedAt: '2026-04-14T16:51:35.000Z',
          updatedAt: '2026-04-14T16:53:25.000Z',
          cards: [
            {
              id: 5,
              segmentIndex: 1,
              startOffsetMs: 0,
              transcript: '第一张卡片',
              createdAt: '2026-04-14T16:52:59.000Z',
            },
            {
              id: 6,
              segmentIndex: 2,
              startOffsetMs: 84355,
              transcript: '第二张卡片',
              createdAt: '2026-04-14T16:53:02.000Z',
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

    expect(screen.getByText('第一张卡片')).toBeInTheDocument()
    expect(screen.getByText('第二张卡片')).toBeInTheDocument()
    expect(screen.getByText('分段 01')).toBeInTheDocument()
    expect(screen.getByText('分段 02')).toBeInTheDocument()
  })

  it.skip('renders aggregated voice detail sections from note voice data', () => {
    const note = {
      id: 'note-1',
      title: '测试笔记',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-1',
          sessionId: 'session-1',
          audioUrl: '/files/file-1',
          transcript: '文件正文',
          transcriptStatus: 'completed',
          language: 'zh_CN',
          createdAt: '2026-04-14T10:00:00.000Z',
        },
      ],
      voiceRealtimeSessions: [
        {
          sessionId: 'session-1',
          status: 'finished',
          language: 'zh_CN',
          audioMimeType: 'audio/webm',
          finalTranscript: '整段最终正文',
          startedAt: '2026-04-14T10:00:00.000Z',
          finishedAt: '2026-04-14T10:05:00.000Z',
          cards: [
            { segmentIndex: 2, transcript: '第二张卡片', startTimeLabel: '00:05' },
            { segmentIndex: 1, transcript: '第一张卡片', startTimeLabel: '00:00' },
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

    expect(screen.getByText('详情聚合')).toBeInTheDocument()
    expect(screen.getByText('文件')).toBeInTheDocument()
    expect(screen.getByText('会话')).toBeInTheDocument()
    expect(screen.getByText('cards')).toBeInTheDocument()
    expect(screen.getByText('file-1')).toBeInTheDocument()
    expect(screen.getByText('session-1')).toBeInTheDocument()
    expect(screen.getByTitle('第一张卡片')).toBeInTheDocument()
    expect(screen.getByTitle('第二张卡片')).toBeInTheDocument()
  })
})
