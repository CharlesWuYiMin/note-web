import React from 'react'
import PageEditor from './PageEditor'
import OutlineEditor from './OutlineEditor'
import HandwrittenEditor from './HandwrittenEditor'
import VoiceNoteEditor from './VoiceNoteEditor'

const EditorFactory = ({ type = 'text', ...props }) => {
  const editorMap = {
    text: PageEditor,
    outline: OutlineEditor,
    handwritten: HandwrittenEditor,
    voice: VoiceNoteEditor,
  }

  const EditorComponent = editorMap[type] || PageEditor

  return <EditorComponent type={type} {...props} />
}

export default EditorFactory
