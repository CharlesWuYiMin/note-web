import React from 'react'
import uxMainPageHtml from '@/prototypes/ux-main-page.html?raw'

function UxMainPage() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#f7f9fb' }}>
      <iframe
        title="Cloud Note UX Prototype"
        srcDoc={uxMainPageHtml}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: '#f7f9fb',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}

export default UxMainPage
