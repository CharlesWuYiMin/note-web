import React, { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VoiceNoteEditor from '@/components/editors/VoiceNoteEditor'
import noteService from '@/services/noteService'

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

  it('prefers backend fileName for uploaded voice files', () => {
    const note = {
      id: 'note-file-name-1',
      title: '文件名测试',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-name-1',
          fileName: '语音文件01',
          audioUrl: '/files/file-name-1',
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

    expect(screen.getByText('语音文件01')).toBeInTheDocument()
  })

  it('renders fallback transcript content from each voice file', async () => {
    const user = userEvent.setup()
    const note = {
      id: 'note-transcript-fallback-1',
      title: '转写回退测试',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-a',
          sessionId: 'session-a',
          audioUrl: '/files/file-a',
          createdAt: '2026-04-24T09:41:24.000Z',
        },
        {
          fileId: 'file-b',
          sessionId: 'session-b',
          audioUrl: '/files/file-b',
          createdAt: '2026-04-24T10:41:24.000Z',
        },
      ],
      voiceRealtimeSessions: [
        {
          sessionId: 'session-a',
          status: 'finished',
          language: 'zh_CN',
          createdAt: '2026-04-24T09:41:24.000Z',
          updatedAt: '2026-04-24T09:42:24.000Z',
          finalTranscript: '第一条转写内容',
          cards: [],
        },
        {
          sessionId: 'session-b',
          status: 'finished',
          language: 'zh_CN',
          createdAt: '2026-04-24T10:41:24.000Z',
          updatedAt: '2026-04-24T10:42:24.000Z',
          finalTranscript: '第二条转写内容',
          cards: [],
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

    expect(screen.getByText('第二条转写内容')).toBeInTheDocument()
    expect(screen.queryByText('第一条转写内容')).not.toBeInTheDocument()
    await user.click(screen.getByText('语音文件 01'))
    expect(await screen.findByText('第一条转写内容')).toBeInTheDocument()
    expect(screen.queryByText('第二条转写内容')).not.toBeInTheDocument()
  })

  it('does not render finished standalone sessions after voice files are removed', () => {
    const note = {
      id: 'note-finished-session-1',
      title: '会话清理测试',
      type: 'voice',
      voiceNote: [],
      voiceRealtimeSessions: [
        {
          sessionId: 'session-finished-1',
          status: 'finished',
          language: 'zh_CN',
          startedAt: '2026-04-24T17:40:00.000Z',
          finishedAt: '2026-04-24T17:42:00.000Z',
          finalTranscript: '历史转写内容',
          cards: [
            {
              id: 1,
              segmentIndex: 1,
              startOffsetMs: 0,
              transcript: '历史转写内容',
              createdAt: '2026-04-24T17:41:00.000Z',
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

    expect(screen.queryByText(/SESSION/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('暂无语音卡片，开始录音后会在这里生成').length).toBeGreaterThan(0)
  })

  it('deletes a voice file from the recording card and refreshes the note', async () => {
    const user = userEvent.setup()
    const deleteVoiceNoteCardMock = vi.spyOn(noteService, 'deleteVoiceNoteCard').mockResolvedValue({ success: true })
    const onNoteRefresh = vi.fn().mockResolvedValue({
      id: 'note-delete-1',
      title: '删除测试',
      type: 'voice',
      voiceNote: [],
      voiceRealtimeSessions: [],
    })
    const note = {
      id: 'note-delete-1',
      title: '删除测试',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-delete-1',
          audioUrl: '/files/file-delete-1',
          createdAt: '2026-04-24T09:41:24.000Z',
          transcript: 'hello',
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
        onNoteRefresh={onNoteRefresh}
        voicePanelVisible
      />
    )

    expect(screen.getByText(/语音(文件|卡片) 01/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '删除语音卡片' }))

    await waitFor(() => {
      expect(deleteVoiceNoteCardMock).toHaveBeenCalledWith('note-delete-1', 'file-delete-1')
    })
    await waitFor(() => {
      expect(onNoteRefresh).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.queryByText(/语音(文件|卡片) 01/)).not.toBeInTheDocument()
    })

    deleteVoiceNoteCardMock.mockRestore()
  })

  it('keeps the remaining recording transcript and display index after deleting an earlier file', async () => {
    const user = userEvent.setup()
    const deleteVoiceNoteCardMock = vi.spyOn(noteService, 'deleteVoiceNoteCard').mockResolvedValue({ success: true })
    const onNoteRefresh = vi.fn().mockResolvedValue({
      id: 'note-delete-stable-1',
      title: '删除稳定性测试',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-2',
          fileName: '语音文件 02',
          sessionId: 'session-2',
          audioUrl: '/files/file-2',
          createdAt: '2026-04-24T09:45:24.000Z',
        },
      ],
      voiceRealtimeSessions: [
        {
          sessionId: 'session-1',
          status: 'finished',
          language: 'zh_CN',
          createdAt: '2026-04-24T09:41:24.000Z',
          updatedAt: '2026-04-24T09:42:24.000Z',
          finalTranscript: '第一个文件的转写',
          cards: [],
        },
        {
          sessionId: 'session-2',
          status: 'finished',
          language: 'zh_CN',
          createdAt: '2026-04-24T09:45:24.000Z',
          updatedAt: '2026-04-24T09:46:24.000Z',
          finalTranscript: '第二个文件的转写',
          cards: [],
        },
      ],
    })
    const note = {
      id: 'note-delete-stable-1',
      title: '删除稳定性测试',
      type: 'voice',
      voiceNote: [
        {
          fileId: 'file-1',
          fileName: '语音文件 01',
          sessionId: 'session-1',
          audioUrl: '/files/file-1',
          createdAt: '2026-04-24T09:41:24.000Z',
        },
        {
          fileId: 'file-2',
          fileName: '语音文件 02',
          sessionId: 'session-2',
          audioUrl: '/files/file-2',
          createdAt: '2026-04-24T09:45:24.000Z',
        },
      ],
      voiceRealtimeSessions: [
        {
          sessionId: 'session-1',
          status: 'finished',
          language: 'zh_CN',
          createdAt: '2026-04-24T09:41:24.000Z',
          updatedAt: '2026-04-24T09:42:24.000Z',
          finalTranscript: '第一个文件的转写',
          cards: [],
        },
        {
          sessionId: 'session-2',
          status: 'finished',
          language: 'zh_CN',
          createdAt: '2026-04-24T09:45:24.000Z',
          updatedAt: '2026-04-24T09:46:24.000Z',
          finalTranscript: '第二个文件的转写',
          cards: [],
        },
      ],
    }

    render(
      <VoiceNoteEditor
        note={note}
        value=""
        onChange={vi.fn()}
        onSave={vi.fn()}
        onNoteRefresh={onNoteRefresh}
        voicePanelVisible
      />
    )

    expect(screen.getByText('语音文件 01')).toBeInTheDocument()
    expect(screen.getByText('语音文件 02')).toBeInTheDocument()
    await user.click(screen.getByText('语音文件 01'))
    const selectedCard = screen.getByText('语音文件 01').closest('[role="button"]')
    await user.click(within(selectedCard).getByRole('button', { name: '删除语音卡片' }))

    await waitFor(() => {
      expect(deleteVoiceNoteCardMock).toHaveBeenCalledWith('note-delete-stable-1', 'file-1')
    })
    await waitFor(() => {
      expect(onNoteRefresh).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.queryByText('语音文件 01')).not.toBeInTheDocument()
    })

    expect(screen.getByText('语音文件 02')).toBeInTheDocument()
    expect(screen.getByText('第二个文件的转写')).toBeInTheDocument()
    expect(screen.queryByText('第一个文件的转写')).not.toBeInTheDocument()

    deleteVoiceNoteCardMock.mockRestore()
  })
})
