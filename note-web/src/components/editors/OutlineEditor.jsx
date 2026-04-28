import React, { useMemo } from 'react'
import { MindEditorComponent } from '@cloud/react-mind-editor-sdk'
import CloudDiagramEditor from './CloudDiagramEditor'
import { getAppConfig } from '@/utils/config'

const PREVIEW_MIND_CONTENT = [{"agg_version":"1.16"},{"id":"conf#11d31882-7da7-4bd6-880e-3133b5b3a0c8","children":["mind#2c16c00f-40a2-4c28-b115-f60f9c27bf0f"],"config":{},"layout":"logicalStructure","theme":{"template":"default","config":"{}"},"associativeLines":{},"_start":true},{"pid":"conf#11d31882-7da7-4bd6-880e-3133b5b3a0c8","id":"mind#2c16c00f-40a2-4c28-b115-f60f9c27bf0f","children":["mind#dfde8f34-842f-4491-9e1e-e3f42475428d","mind#502834d4-372a-4ca7-8037-5d98cb3a78a3","mind#f67e4584-1951-483c-920e-0b39f674ff13","mind#cc260113-f85c-431f-8dc0-bfc375a38b46"],"summaries":[],"text":"中心主题","lastRightNodeId":"","isActive":false,"expand":true},{"pid":"mind#2c16c00f-40a2-4c28-b115-f60f9c27bf0f","id":"mind#dfde8f34-842f-4491-9e1e-e3f42475428d","children":[],"summaries":[],"text":"分支主题1","isActive":false,"expand":true},{"pid":"mind#2c16c00f-40a2-4c28-b115-f60f9c27bf0f","id":"mind#502834d4-372a-4ca7-8037-5d98cb3a78a3","children":[],"summaries":[],"text":"分支主题2","isActive":false,"expand":true},{"pid":"mind#2c16c00f-40a2-4c28-b115-f60f9c27bf0f","id":"mind#f67e4584-1951-483c-920e-0b39f674ff13","children":[],"summaries":[],"text":"分支主题3","isActive":false,"expand":true},{"pid":"mind#2c16c00f-40a2-4c28-b115-f60f9c27bf0f","id":"mind#cc260113-f85c-431f-8dc0-bfc375a38b46","children":[],"summaries":[],"text":"分支主题4","isActive":false,"expand":true}]

function createMindEditorProps() {
  const mindConfig = getAppConfig()?.editor?.mind || {}
  const mindScene = mindConfig.scene || {}
  const mindMenuSetting = mindScene.menuSetting || {}
  const mindCollabOptions = mindConfig.collabOptions || {}

  return {
    ...mindConfig,
    url: mindConfig.editorUrl,
    scene: {
      ...mindScene,
      mode: mindScene.mode || 'preview',
      menuSetting: {
        ...mindMenuSetting,
        disableMenus: Array.from(new Set([...(mindMenuSetting.disableMenus || []), 'comment'])),
      },
    },
    collabOptions: {
      ...mindCollabOptions,
      disable: true,
      server: mindConfig.collaborationUrl,
    },
  }
}

function OutlineEditor(props) {
  const mindEditorProps = useMemo(() => createMindEditorProps(), [])

  return (
    <CloudDiagramEditor
      {...props}
      EditorComponent={MindEditorComponent}
      editorKind="mind"
      editorProps={mindEditorProps}
      documentData={PREVIEW_MIND_CONTENT}
      placeholder="Mind editor failed to initialize. Check the mind SDK, proxy, and editor URL."
    />
  )
}

export default OutlineEditor
