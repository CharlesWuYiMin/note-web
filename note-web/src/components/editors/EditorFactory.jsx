import React, { Suspense, lazy } from 'react'
import { Spin } from 'antd'
import PageEditor from './PageEditor'

const OutlineEditor = lazy(() => import('./OutlineEditor'))
const HandwrittenEditor = lazy(() => import('./HandwrittenEditor'))
const VoiceNoteEditor = lazy(() => import('./VoiceNoteEditor'))

function EditorFallback() {
  return (
    <div
      style={{
        minHeight: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin size="small" tip="正在加载编辑器..." />
    </div>
  )
}

const EditorFactory = ({ type = 'text', ...props }) => {
  const editorMap = {
    text: PageEditor,
    outline: OutlineEditor,
    mind: OutlineEditor,
    handwritten: HandwrittenEditor,
    voice: VoiceNoteEditor,
  }

  const EditorComponent = editorMap[type] || PageEditor

  if (EditorComponent === PageEditor) {
    return <EditorComponent type={type} {...props} />
  }

  return (
    <Suspense fallback={<EditorFallback />}>
      <EditorComponent type={type} {...props} />
    </Suspense>
  )
}

export default EditorFactory
