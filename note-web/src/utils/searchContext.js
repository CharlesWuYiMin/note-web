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
    hint: '仅搜索近期笔记中的标题',
    resultRoute: '/cloudnote/recent',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/starred'),
    status: SEARCH_STATUS.STAR,
    label: '星标笔记',
    hint: '仅搜索已星标的标题',
    resultRoute: '/cloudnote/starred',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/shares'),
    status: SEARCH_STATUS.SHARE,
    label: '我的分享',
    hint: '仅搜索已分享的标题',
    resultRoute: '/cloudnote/shares',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/recyclebin'),
    status: SEARCH_STATUS.DELETED,
    label: '回收站',
    hint: '仅搜索回收站里的标题',
    resultRoute: '/cloudnote/recyclebin',
  },
  {
    match: (pathname) => pathname?.startsWith('/cloudnote/notebooks'),
    status: SEARCH_STATUS.ACTIVE,
    label: '笔记本',
    hint: '仅搜索当前页面范围内的标题',
    resultRoute: '/cloudnote/notebooks',
  },
]

export function getSearchContext(pathname = '') {
  return SEARCH_CONTEXTS.find((context) => context.match(pathname)) || SEARCH_CONTEXTS[0]
}

export function getSearchResultPath(item, context) {
  if (!item?.id) {
    return null
  }

  const status = context?.status
  if (status === SEARCH_STATUS.STAR) {
    return `/cloudnote/starred/${item.id}`
  }

  if (status === SEARCH_STATUS.SHARE) {
    return `/cloudnote/shares/${item.id}`
  }

  if (status === SEARCH_STATUS.DELETED) {
    return `/cloudnote/recyclebin/${item.id}`
  }

  if (status === SEARCH_STATUS.ACTIVE) {
    return `/cloudnote/recent/${item.id}`
  }

  return `/cloudnote/recent/${item.id}`
}

export default getSearchContext
