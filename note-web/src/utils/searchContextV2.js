export const SEARCH_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted',
  STAR: 'star',
  SHARE: 'share',
}

const SEARCH_CONTEXTS = [
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/recent'),
    status: SEARCH_STATUS.ACTIVE,
    label: '近期笔记',
    hint: '仅搜索近期笔记中的结果',
    resultRoute: '/cloudnote/recent',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/starred'),
    status: SEARCH_STATUS.STAR,
    label: '星标笔记',
    hint: '仅搜索已星标的笔记',
    resultRoute: '/cloudnote/starred',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/shares'),
    status: SEARCH_STATUS.SHARE,
    label: '我的分享',
    hint: '仅搜索我的分享笔记',
    resultRoute: '/cloudnote/shares',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/recyclebin'),
    status: SEARCH_STATUS.DELETED,
    label: '回收站',
    hint: '仅搜索回收站中的笔记',
    resultRoute: '/cloudnote/recyclebin',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/notebooks'),
    status: SEARCH_STATUS.ACTIVE,
    label: '笔记本',
    hint: '仅搜索当前笔记本范围内的结果',
    resultRoute: '/cloudnote/notebooks',
  },
]

export function getSearchContext(pathname = '') {
  return SEARCH_CONTEXTS.find((context) => context.match(pathname)) || SEARCH_CONTEXTS[0]
}

export function getSearchResultPath(item, context) {
  const noteId = item?.noteId || item?.id || item?.documentId
  if (!noteId) {
    return null
  }

  const status = context?.status
  if (status === SEARCH_STATUS.STAR) {
    return `/cloudnote/starred/${noteId}`
  }

  if (status === SEARCH_STATUS.SHARE) {
    return `/cloudnote/shares/${noteId}`
  }

  if (status === SEARCH_STATUS.DELETED) {
    return `/cloudnote/recyclebin/${noteId}`
  }

  if (context?.resultRoute?.startsWith('/cloudnote/notebooks')) {
    return `/cloudnote/notebooks/${noteId}`
  }

  return `/cloudnote/recent/${noteId}`
}
