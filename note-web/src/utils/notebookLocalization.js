const DEFAULT_NOTEBOOK_NAME_KEYS = {
  '我的笔记': 'myNotes',
  'My Notes': 'myNotes',
  '会议笔记': 'meetingNotes',
  'Meeting Notes': 'meetingNotes',
}

const DEFAULT_NOTEBOOK_FALLBACKS = {
  myNotes: '我的笔记',
  meetingNotes: '会议笔记',
}

function resolveNotebookNameSource(input) {
  if (!input) {
    return ''
  }

  if (typeof input === 'string') {
    return input.trim()
  }

  return String(
    input.name
    || input.notebookName
    || input.title
    || ''
  ).trim()
}

export function getLocalizedNotebookName(input, t) {
  const rawName = resolveNotebookNameSource(input)
  if (!rawName) {
    return ''
  }

  const translationKey = DEFAULT_NOTEBOOK_NAME_KEYS[rawName]
  if (!translationKey) {
    return rawName
  }

  return t?.(`notebook.defaults.${translationKey}`, {
    defaultValue: DEFAULT_NOTEBOOK_FALLBACKS[translationKey] || rawName,
  }) || rawName
}
