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
})
