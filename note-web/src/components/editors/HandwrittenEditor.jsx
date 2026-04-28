import React from 'react'
import { BoardEditorComponent } from '@cloud/react-board-editor-sdk'
import CloudDiagramEditor from './CloudDiagramEditor'
import PageEditor from './PageEditor'

function HandwrittenEditor(props) {
  return (
    <CloudDiagramEditor
      {...props}
      EditorComponent={BoardEditorComponent}
      FallbackComponent={PageEditor}
      fallbackMessage="Board editor iframe is unavailable. Falling back to PageEditor so handwritten notes remain editable."
      editorKind="board"
      placeholder="Board editor failed to initialize. Check the board SDK, proxy, and editor URL."
    />
  )
}

export default HandwrittenEditor
