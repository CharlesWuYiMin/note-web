import React from 'react'
import { DrawEditorComponent } from '@cloud/react-draw-editor-sdk'
import CloudDiagramEditor from './CloudDiagramEditor'
import PageEditor from './PageEditor'

function OutlineEditor(props) {
  return (
    <CloudDiagramEditor
      {...props}
      EditorComponent={DrawEditorComponent}
      FallbackComponent={PageEditor}
      fallbackMessage="Draw editor iframe is unavailable. Falling back to PageEditor so outline notes remain editable."
      editorKind="draw"
      placeholder="Draw editor failed to initialize. Check the draw SDK, proxy, and editor URL."
    />
  )
}

export default OutlineEditor
