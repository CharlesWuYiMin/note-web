import React from 'react'
import { splitHighlightedText } from '@/utils/searchPresentation'

function SearchHighlightText({
  as: Component = 'span',
  text = '',
  keyword = '',
  style,
  highlightStyle,
}) {
  const segments = splitHighlightedText(text, keyword)

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
