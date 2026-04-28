import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Layout } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import AIPanel from '@/components/layout/AIPanel'
import Header from '@/components/layout/Header'
import NotesSidebar from '@/components/layout/NotesSidebar'
import SidebarWorkspaceNav from '@/components/layout/SidebarWorkspaceNav'
import NoteSearchPanel from '@/components/search/NoteSearchPanelWorkspace'
import { getSearchContext } from '@/utils/searchContext'

const { Content } = Layout
const NAV_COLLAPSED_WIDTH = 92
const NAV_DEFAULT_WIDTH = 280
const NAV_MIN_WIDTH = 220
const NAV_MAX_WIDTH = 380
const NOTES_DEFAULT_WIDTH = 320
const NOTES_MIN_WIDTH = 260
const NOTES_MAX_WIDTH = 420
const AI_DEFAULT_WIDTH = 340
const AI_MIN_WIDTH = 280
const AI_MAX_WIDTH = 460
const RESIZE_SAFETY_GAP = 40

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function resolveEditorMinWidth(containerWidth) {
  if (!containerWidth) {
    return 420
  }

  return clamp(Math.round(containerWidth * 0.34), 360, 520)
}

function FloatingCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.72)',
        borderRadius: 28,
        boxShadow: '0 18px 42px rgba(15,23,42,0.09), 0 4px 14px rgba(15,23,42,0.04)',
        border: '1px solid rgba(255,255,255,0.58)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function ResizeGrip({ ariaLabel, onPointerDown }) {
  return (
    <button
      type="button"
      className="cloudnote-resize-boundary__drag"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
    >
      <span className="cloudnote-resize-boundary__grip">
        <span />
        <span />
        <span />
      </span>
    </button>
  )
}

function MainLayoutFloating() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notesSidebarVisible, setNotesSidebarVisible] = useState(true)
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [navWidth, setNavWidth] = useState(NAV_DEFAULT_WIDTH)
  const [notesSidebarWidth, setNotesSidebarWidth] = useState(NOTES_DEFAULT_WIDTH)
  const [aiPanelWidth, setAiPanelWidth] = useState(AI_DEFAULT_WIDTH)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const workspaceShellRef = useRef(null)
  const workspaceRowRef = useRef(null)
  const dragSessionRef = useRef(null)
  const layoutStateRef = useRef({
    sidebarCollapsed: false,
    notesSidebarVisible: true,
    aiPanelVisible: false,
    navWidth: NAV_DEFAULT_WIDTH,
    notesSidebarWidth: NOTES_DEFAULT_WIDTH,
    aiPanelWidth: AI_DEFAULT_WIDTH,
  })
  const navigate = useNavigate()
  const location = useLocation()
  const searchContext = getSearchContext(location.pathname)
  const resolvedNavWidth = sidebarCollapsed ? NAV_COLLAPSED_WIDTH : navWidth
  const editorMinWidth = resolveEditorMinWidth(
    workspaceRowRef.current?.clientWidth || workspaceShellRef.current?.clientWidth || 0
  )
  const mainCardMinWidth = editorMinWidth + (notesSidebarVisible ? notesSidebarWidth : 0)

  useEffect(() => {
    layoutStateRef.current = {
      sidebarCollapsed,
      notesSidebarVisible,
      aiPanelVisible,
      navWidth,
      notesSidebarWidth,
      aiPanelWidth,
    }
  }, [aiPanelVisible, aiPanelWidth, navWidth, notesSidebarVisible, notesSidebarWidth, sidebarCollapsed])

  const stopResize = useCallback(() => {
    dragSessionRef.current = null
    document.body.classList.remove('cloudnote-resizing')
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
  }, [])

  const handlePointerMove = useCallback((event) => {
    const dragSession = dragSessionRef.current
    if (!dragSession) {
      return
    }

    const {
      sidebarCollapsed: isSidebarCollapsed,
      notesSidebarVisible: isNotesSidebarVisible,
      aiPanelVisible: isAiPanelVisible,
      notesSidebarWidth: currentNotesWidth,
      aiPanelWidth: currentAiWidth,
    } = layoutStateRef.current
    const shellWidth = workspaceShellRef.current?.clientWidth || window.innerWidth
    const rowWidth = workspaceRowRef.current?.clientWidth || shellWidth
    const editorWidthFloor = resolveEditorMinWidth(rowWidth)
    const deltaX = event.clientX - dragSession.startX

    if (dragSession.type === 'nav') {
      if (isSidebarCollapsed) {
        return
      }

      const minimumMainWidth = editorWidthFloor
        + (isNotesSidebarVisible ? currentNotesWidth : 0)
        + (isAiPanelVisible ? currentAiWidth : 0)
        + RESIZE_SAFETY_GAP
      const maxNavWidth = Math.max(
        NAV_MIN_WIDTH,
        Math.min(NAV_MAX_WIDTH, shellWidth - minimumMainWidth)
      )

      setNavWidth(clamp(dragSession.startWidth + deltaX, NAV_MIN_WIDTH, maxNavWidth))
      return
    }

    if (dragSession.type === 'notes') {
      if (!isNotesSidebarVisible) {
        return
      }

      const availableWidth = rowWidth
        - (isAiPanelVisible ? currentAiWidth : 0)
        - editorWidthFloor
        - RESIZE_SAFETY_GAP
      const maxNotesWidth = Math.max(
        NOTES_MIN_WIDTH,
        Math.min(NOTES_MAX_WIDTH, availableWidth)
      )

      setNotesSidebarWidth(clamp(dragSession.startWidth + deltaX, NOTES_MIN_WIDTH, maxNotesWidth))
      return
    }

    if (!isAiPanelVisible) {
      return
    }

    const availableWidth = rowWidth
      - (isNotesSidebarVisible ? currentNotesWidth : 0)
      - editorWidthFloor
      - RESIZE_SAFETY_GAP
    const maxAiWidth = Math.max(
      AI_MIN_WIDTH,
      Math.min(AI_MAX_WIDTH, availableWidth)
    )

    setAiPanelWidth(clamp(dragSession.startWidth - deltaX, AI_MIN_WIDTH, maxAiWidth))
  }, [])

  useEffect(() => () => {
    document.body.classList.remove('cloudnote-resizing')
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
  }, [handlePointerMove, stopResize])

  const startResize = useCallback((type) => (event) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()

    const {
      sidebarCollapsed: isSidebarCollapsed,
      notesSidebarVisible: isNotesSidebarVisible,
      aiPanelVisible: isAiPanelVisible,
      navWidth: currentNavWidth,
      notesSidebarWidth: currentNotesWidth,
      aiPanelWidth: currentAiWidth,
    } = layoutStateRef.current

    if (type === 'nav' && isSidebarCollapsed) {
      return
    }

    if (type === 'notes' && !isNotesSidebarVisible) {
      return
    }

    if (type === 'ai' && !isAiPanelVisible) {
      return
    }

    dragSessionRef.current = {
      type,
      startX: event.clientX,
      startWidth: type === 'nav'
        ? currentNavWidth
        : type === 'notes'
          ? currentNotesWidth
          : currentAiWidth,
    }

    document.body.classList.add('cloudnote-resizing')
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
  }, [handlePointerMove, stopResize])

  const openSearchModal = (keyword = '') => {
    setSearchKeyword(keyword)
    setSearchPanelOpen(true)
  }

  const closeSearchPanel = () => {
    setSearchPanelOpen(false)
    window.setTimeout(() => {
      document.getElementById('header-search-input')?.blur?.()
    }, 0)
  }

  return (
    <Layout
      ref={workspaceShellRef}
      className="cloudnote-layout-shell"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        background: 'var(--surface)',
        padding: '8px 8px 6px 8px',
        gap: '0',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: resolvedNavWidth,
          borderRadius: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          position: 'relative',
          zIndex: 20,
          padding: '0 10px 0 0',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          minHeight: 0,
          overflow: 'visible',
        }}
      >
        <SidebarWorkspaceNav
          collapsed={sidebarCollapsed}
          expandedWidth={navWidth}
          onToggle={() => setSidebarCollapsed((value) => !value)}
          onNavigate={navigate}
          currentPath={location.pathname}
        />
      </div>

      {!sidebarCollapsed ? (
        <div
          className="cloudnote-resize-boundary cloudnote-resize-boundary--nav"
          style={{ left: resolvedNavWidth }}
        >
          <div className="cloudnote-resize-boundary__line" />
          <ResizeGrip ariaLabel="Resize left navigation" onPointerDown={startResize('nav')} />
        </div>
      ) : null}

      <Layout
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          background: 'transparent',
          minWidth: 0,
          minHeight: 'calc(100vh - 14px)',
          height: 'calc(100vh - 14px)',
          marginLeft: sidebarCollapsed ? 4 : 8,
          position: 'relative',
          zIndex: 4,
          overflow: 'visible',
        }}
      >
        <div style={{ marginBottom: 6, flexShrink: 0 }}>
          <Header
            onToggleAIPanel={() => setAiPanelVisible((value) => !value)}
            onOpenSearch={openSearchModal}
            searchValue={searchKeyword}
            onSearchChange={setSearchKeyword}
            searchOpen={searchPanelOpen}
            searchInputId="header-search-input"
            searchPanel={(
              <NoteSearchPanel
                open={searchPanelOpen}
                keyword={searchKeyword}
                currentPath={location.pathname}
                onClose={closeSearchPanel}
                onKeywordChange={(nextKeyword) => {
                  setSearchKeyword(nextKeyword)
                  setSearchPanelOpen(true)
                }}
                onOpenFullPage={(keyword) => {
                  closeSearchPanel()
                  navigate(`/cloudnote/search?q=${encodeURIComponent(keyword)}&status=${searchContext.status}`)
                }}
              />
            )}
          />
        </div>

        <div
          ref={workspaceRowRef}
          style={{
            display: 'flex',
            flex: 1,
            gap: 4,
            minHeight: 0,
            height: 'calc(100vh - 80px)',
            padding: '4px 6px 6px 6px',
            overflow: 'visible',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <FloatingCard
            style={{
              flex: 1,
              height: '100%',
              minWidth: mainCardMinWidth,
              minHeight: 0,
              display: 'flex',
              alignItems: 'stretch',
              position: 'relative',
            }}
          >
            {notesSidebarVisible ? <NotesSidebar visible width={notesSidebarWidth} /> : null}

            <div
              className="cloudnote-resize-boundary cloudnote-resize-boundary--notes"
              style={{ left: notesSidebarVisible ? notesSidebarWidth : 0 }}
            >
              <div className="cloudnote-resize-boundary__line" />
              {notesSidebarVisible ? (
                <ResizeGrip ariaLabel="Resize note list" onPointerDown={startResize('notes')} />
              ) : null}
              <Button
                type="text"
                className="cloudnote-resize-boundary__toggle"
                icon={notesSidebarVisible ? <LeftOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
                onClick={() => setNotesSidebarVisible((value) => !value)}
                style={{
                  width: 20,
                  minWidth: 20,
                  height: 32,
                  minHeight: 32,
                  maxHeight: 32,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(226,232,240,0.62)',
                  boxShadow: '0 2px 10px rgba(16,34,58,0.06)',
                  color: 'rgba(148,163,184,1)',
                  opacity: 1,
                  zIndex: 10,
                }}
              />
            </div>

            <Content
              style={{
                flex: 1,
                background: 'transparent',
                position: 'relative',
                overflow: 'hidden',
                minWidth: editorMinWidth,
                minHeight: 0,
              }}
            >
              <Outlet />
            </Content>
          </FloatingCard>

          {aiPanelVisible ? (
            <>
              <div
                className="cloudnote-resize-boundary cloudnote-resize-boundary--ai"
                style={{ right: aiPanelWidth + 2 }}
              >
                <div className="cloudnote-resize-boundary__line" />
                <ResizeGrip ariaLabel="Resize AI panel" onPointerDown={startResize('ai')} />
              </div>
              <FloatingCard style={{ width: aiPanelWidth, minWidth: aiPanelWidth, flexShrink: 0 }}>
                <AIPanel width={aiPanelWidth} onClose={() => setAiPanelVisible(false)} />
              </FloatingCard>
            </>
          ) : null}
        </div>
      </Layout>
    </Layout>
  )
}

export default MainLayoutFloating
