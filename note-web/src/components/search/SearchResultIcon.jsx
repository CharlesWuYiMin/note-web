import React from 'react'
import {
  ApartmentOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOutlined,
  HighlightOutlined,
  ShareAltOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { resolveSearchResultKind } from '@/utils/searchPresentation'

const SEARCH_RESULT_ICON_STYLES = {
  deleted: {
    background: 'rgba(255,77,79,0.08)',
    color: '#ff4d4f',
  },
  shared: {
    background: 'rgba(14,165,233,0.10)',
    color: '#0284c7',
  },
  voice: {
    background: 'rgba(124,58,237,0.10)',
    color: '#7c3aed',
  },
  handwritten: {
    background: 'rgba(249,115,22,0.10)',
    color: '#ea580c',
  },
  outline: {
    background: 'rgba(8,145,178,0.10)',
    color: '#0891b2',
  },
  folder: {
    background: 'rgba(245,158,11,0.12)',
    color: '#ca8a04',
  },
  text: {
    background: 'rgba(2,86,210,0.08)',
    color: '#0256d2',
  },
}

function resolveIcon(kind) {
  switch (kind) {
    case 'deleted':
      return <DeleteOutlined />
    case 'shared':
      return <ShareAltOutlined />
    case 'voice':
      return <SoundOutlined />
    case 'handwritten':
      return <HighlightOutlined />
    case 'outline':
      return <ApartmentOutlined />
    case 'folder':
      return <FolderOutlined />
    default:
      return <FileTextOutlined />
  }
}

function SearchResultIcon({ note, size = 34, fontSize = 15 }) {
  const kind = resolveSearchResultKind(note)
  const style = SEARCH_RESULT_ICON_STYLES[kind] || SEARCH_RESULT_ICON_STYLES.text

  return (
    <div
      data-testid="search-result-icon"
      data-kind={kind}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: style.background,
        color: style.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        flexShrink: 0,
      }}
    >
      {resolveIcon(kind)}
    </div>
  )
}

export default SearchResultIcon
