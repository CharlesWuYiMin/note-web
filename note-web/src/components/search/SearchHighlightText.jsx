import React from 'react'
import { splitHighlightText } from '@/utils/searchPresentation'

function SearchHighlightText({
  as: Component = 'span',
  text = '',
  keyword = '',
  style,
  highlightStyle,
}) {
  const segments = splitHighlightText(text, keyword)

  return (
    <Component style={style}>
      {segments.map((segment, index) => (
        <span
          key={`${segment.text}-${index}`}
          style={segment.matched ? {
            color: '#1d4ed8',
            fontWeight: 700,
            ...highlightStyle,
          } : undefined}
        >
          {segment.text}
        </span>
      ))}
    </Component>
  )
}

export default SearchHighlightText
