import { getAppConfig } from '@/utils/config'

export function getEditorSection(editorKind) {
  const config = getAppConfig()
  const editorSection = config?.editor?.[editorKind] || {}

  return { ...editorSection }
}

export function getEditorDocumentType(editorKind) {
  return typeof editorKind === 'string' && editorKind.trim()
    ? editorKind.trim()
    : 'document'
}
