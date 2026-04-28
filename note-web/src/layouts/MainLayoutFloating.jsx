import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Layout, message } from 'antd'
import Header from '@/components/layout/Header'
import NotesSidebar from '@/components/layout/NotesSidebar'
import SidebarWorkspaceNav from '@/components/layout/SidebarWorkspaceNav'
import UxIcon from '@/components/common/UxIcon'
import searchService from '@/services/searchService'
import { getSearchContext } from '@/utils/searchContext'

const AIPanel = lazy(() => import('@/components/layout/AIPanel'))
const NoteSearchPanel = lazy(() => import('@/components/search/NoteSearchPanelWorkspace'))

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
const COMPACT_LAYOUT_BREAKPOINT = 1120
const EXPANDED_LAYOUT_BREAKPOINT = 1480

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function resolveEditorMinWidth(containerWidth) {
  if (!containerWidth) {
    return 420
  }

  return clamp(Math.round(containerWidth * 0.34), 360, 520)
}

function resolveLayoutMode(viewportWidth) {
  if (viewportWidth < COMPACT_LAYOUT_BREAKPOINT) {
    return 'compact'
  }

  if (viewportWidth < EXPANDED_LAYOUT_BREAKPOINT) {
    return 'medium'
  }

  return 'expanded'
}

function FloatingCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.96)',
        borderRadius: 24,
        boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
        border: '1px solid rgba(15,23,42,0.06)',
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
    />
  )
}

function MainLayoutFloating() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notesSidebarVisible, setNotesSidebarVisible] = useState(true)
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [layoutMode, setLayoutMode] = useState(() => resolveLayoutMode(typeof window !== 'undefined' ? window.innerWidth : EXPANDED_LAYOUT_BREAKPOINT))
  const [activeResizeType, setActiveResizeType] = useState(null)
  const [navWidth, setNavWidth] = useState(NAV_DEFAULT_WIDTH)
  const [notesSidebarWidth, setNotesSidebarWidth] = useState(NOTES_DEFAULT_WIDTH)
  const [aiPanelWidth, setAiPanelWidth] = useState(AI_DEFAULT_WIDTH)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const workspaceShellRef = useRef(null)
  const workspaceRowRef = useRef(null)
  const dragSessionRef = useRef(null)
  const resizeFrameRef = useRef(null)
  const pendingResizeRef = useRef(null)
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
  const effectiveSidebarCollapsed = layoutMode === 'compact' ? true : sidebarCollapsed
  const effectiveNotesSidebarVisible = notesSidebarVisible
  const effectiveAiPanelVisible = aiPanelVisible
  const resolvedNavWidth = effectiveSidebarCollapsed ? NAV_COLLAPSED_WIDTH : navWidth
  const editorMinWidth = resolveEditorMinWidth(
    workspaceRowRef.current?.clientWidth || workspaceShellRef.current?.clientWidth || 0
  )
  const mainCardMinWidth = editorMinWidth + (effectiveNotesSidebarVisible ? notesSidebarWidth : 0)

  useEffect(() => {
    const handleResize = () => {
      setLayoutMode(resolveLayoutMode(window.innerWidth))
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    layoutStateRef.current = {
      sidebarCollapsed: effectiveSidebarCollapsed,
      notesSidebarVisible: effectiveNotesSidebarVisible,
      aiPanelVisible: effectiveAiPanelVisible,
      navWidth,
      notesSidebarWidth,
      aiPanelWidth,
    }
  }, [effectiveSidebarCollapsed, effectiveNotesSidebarVisible, effectiveAiPanelVisible, navWidth, notesSidebarWidth, aiPanelWidth])

  useEffect(() => {
    if (dragSessionRef.current) {
      return undefined
    }

    const shell = workspaceShellRef.current
    if (!shell) {
      return undefined
    }

    shell.style.removeProperty('--cloudnote-nav-width')
    shell.style.removeProperty('--cloudnote-notes-width')
    shell.style.removeProperty('--cloudnote-main-card-min-width')
    shell.style.removeProperty('--cloudnote-ai-width')
    return undefined
  }, [effectiveAiPanelVisible, aiPanelWidth, navWidth, effectiveNotesSidebarVisible, notesSidebarWidth, effectiveSidebarCollapsed])

  const applyResizeToShell = useCallback((pendingResize) => {
    const shell = workspaceShellRef.current
    if (!shell || !pendingResize) {
      return
    }

    if (pendingResize.type === 'nav') {
      shell.style.setProperty('--cloudnote-nav-width', `${pendingResize.width}px`)
      return
    }

    if (pendingResize.type === 'notes') {
      shell.style.setProperty('--cloudnote-notes-width', `${pendingResize.width}px`)
      shell.style.setProperty('--cloudnote-main-card-min-width', `${pendingResize.mainCardMinWidth}px`)
      return
    }

    shell.style.setProperty('--cloudnote-ai-width', `${pendingResize.width}px`)
  }, [])

  const commitResizeState = useCallback((pendingResize) => {
    if (!pendingResize) {
      return
    }

    layoutStateRef.current = {
      ...layoutStateRef.current,
      navWidth: pendingResize.type === 'nav' ? pendingResize.width : layoutStateRef.current.navWidth,
      notesSidebarWidth: pendingResize.type === 'notes' ? pendingResize.width : layoutStateRef.current.notesSidebarWidth,
      aiPanelWidth: pendingResize.type === 'ai' ? pendingResize.width : layoutStateRef.current.aiPanelWidth,
    }

    if (pendingResize.type === 'nav') {
      setNavWidth(pendingResize.width)
      return
    }

    if (pendingResize.type === 'notes') {
      setNotesSidebarWidth(pendingResize.width)
      return
    }

    setAiPanelWidth(pendingResize.width)
  }, [])

  const flushResize = useCallback(() => {
    resizeFrameRef.current = null

    const pendingResize = pendingResizeRef.current
    if (!pendingResize) {
      return
    }

    applyResizeToShell(pendingResize)
  }, [applyResizeToShell])

  const stopResize = useCallback(() => {
    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current)
      resizeFrameRef.current = null
    }

    const pendingResize = pendingResizeRef.current
    if (pendingResize) {
      applyResizeToShell(pendingResize)
      commitResizeState(pendingResize)
    }

    pendingResizeRef.current = null
    dragSessionRef.current = null
    setActiveResizeType(null)
    document.body.classList.remove('cloudnote-resizing')
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
  }, [applyResizeToShell, commitResizeState])

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

      pendingResizeRef.current = {
        type: 'nav',
        width: clamp(dragSession.startWidth + deltaX, NAV_MIN_WIDTH, maxNavWidth),
      }
      if (resizeFrameRef.current == null) {
        resizeFrameRef.current = window.requestAnimationFrame(flushResize)
      }
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
      const nextNotesWidth = clamp(dragSession.startWidth + deltaX, NOTES_MIN_WIDTH, maxNotesWidth)

      pendingResizeRef.current = {
        type: 'notes',
        width: nextNotesWidth,
        mainCardMinWidth: editorWidthFloor + nextNotesWidth,
      }
      if (resizeFrameRef.current == null) {
        resizeFrameRef.current = window.requestAnimationFrame(flushResize)
      }
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

    pendingResizeRef.current = {
      type: 'ai',
      width: clamp(dragSession.startWidth - deltaX, AI_MIN_WIDTH, maxAiWidth),
    }
    if (resizeFrameRef.current == null) {
      resizeFrameRef.current = window.requestAnimationFrame(flushResize)
    }
  }, [flushResize])

  useEffect(() => () => {
    if (resizeFrameRef.current != null) {
      window.cancelAnimationFrame(resizeFrameRef.current)
      resizeFrameRef.current = null
    }
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

    event.currentTarget.setPointerCapture?.(event.pointerId)
    setActiveResizeType(type)
    document.body.classList.add('cloudnote-resizing')
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
  }, [handlePointerMove, stopResize])

  const openSearchModal = (keyword = '') => {
    setSearchKeyword(keyword)
    setSearchPanelOpen(true)
  }

  const handleSearchSubmit = (keyword = '') => {
    const normalizedKeyword = String(keyword || '').trim()

    if (normalizedKeyword) {
      searchService.rememberRecentSearch?.(normalizedKeyword)
    }

    openSearchModal(normalizedKeyword)
  }

  const handleToggleSidebar = () => {
    if (layoutMode === 'compact') {
      message.info('当前窗口较窄，导航已自动折叠')
      return
    }

    setSidebarCollapsed((value) => !value)
  }

  const handleToggleAIPanel = () => {
    if (false && layoutMode !== 'expanded') {
      message.info('AI 助手会在更宽的窗口中显示')
      return
    }

    setAiPanelVisible((value) => !value)
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
        padding: '8px',
        gap: '0',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <div
        className="sidebar-workspace-nav"
        style={{
          width: `var(--cloudnote-nav-width, ${resolvedNavWidth}px)`,
          minWidth: `var(--cloudnote-nav-width, ${resolvedNavWidth}px)`,
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
          collapsed={effectiveSidebarCollapsed}
          expandedWidth={navWidth}
          onToggle={handleToggleSidebar}
          onNavigate={navigate}
          currentPath={location.pathname}
        />
      </div>

      {!effectiveSidebarCollapsed ? (
        <div
          className="cloudnote-resize-boundary cloudnote-resize-boundary--nav"
          style={{ left: resolvedNavWidth }}
        >
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
          marginLeft: effectiveSidebarCollapsed ? 4 : 10,
          position: 'relative',
          zIndex: 4,
          overflow: 'visible',
        }}
      >
        <div style={{ marginBottom: 6, flexShrink: 0 }}>
          <Header
            onToggleAIPanel={handleToggleAIPanel}
            onOpenSearch={openSearchModal}
            onSearchSubmit={handleSearchSubmit}
            searchValue={searchKeyword}
            onSearchChange={setSearchKeyword}
            searchOpen={searchPanelOpen}
            searchInputId="header-search-input"
            searchPanel={(
              <Suspense fallback={null}>
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
              </Suspense>
            )}
          />
        </div>

        <div
          ref={workspaceRowRef}
          style={{
            display: 'flex',
            flex: 1,
            gap: 8,
            minHeight: 0,
            height: 'calc(100vh - 80px)',
            padding: '6px',
            overflow: 'visible',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <FloatingCard
            style={{
              flex: 1,
              height: '100%',
              minWidth: `var(--cloudnote-main-card-min-width, ${mainCardMinWidth}px)`,
              minHeight: 0,
              display: 'flex',
              alignItems: 'stretch',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'stretch',
                overflow: 'hidden',
                borderRadius: 'inherit',
                background: 'transparent',
              }}
            >
              {effectiveNotesSidebarVisible ? <NotesSidebar visible width={notesSidebarWidth} /> : null}

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

            </div>

            <div
              className="cloudnote-resize-boundary cloudnote-resize-boundary--notes"
              style={{ left: `var(--cloudnote-notes-width, ${effectiveNotesSidebarVisible ? notesSidebarWidth : 0}px)` }}
            >
              <div className="cloudnote-resize-boundary__line" />
              {effectiveNotesSidebarVisible ? (
                <ResizeGrip ariaLabel="Resize note list" onPointerDown={startResize('notes')} />
              ) : null}
              <Button
                type="text"
                className="cloudnote-resize-boundary__toggle"
                aria-label={effectiveNotesSidebarVisible ? '收起笔记列表' : '展开笔记列表'}
                icon={(
                  <UxIcon
                    name={effectiveNotesSidebarVisible ? 'arrowLeft' : 'arrowRight'}
                    size={13}
                    color="currentColor"
                  />
                )}
                onClick={() => setNotesSidebarVisible((value) => !value)}
                style={{
                  width: 22,
                  minWidth: 22,
                  height: 34,
                  minHeight: 34,
                  maxHeight: 34,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  borderRadius: 999,
                  opacity: 1,
                  zIndex: 10,
                }}
              />
            </div>
          </FloatingCard>

          {effectiveAiPanelVisible ? (
            <>
              <div
                className="cloudnote-resize-boundary cloudnote-resize-boundary--ai"
                style={{ right: `var(--cloudnote-ai-width, ${aiPanelWidth + 2}px)` }}
              >
                <ResizeGrip ariaLabel="Resize AI panel" onPointerDown={startResize('ai')} />
              </div>
              <FloatingCard style={{ width: `var(--cloudnote-ai-width, ${aiPanelWidth}px)`, minWidth: `var(--cloudnote-ai-width, ${aiPanelWidth}px)`, flexShrink: 0 }}>
                <Suspense fallback={null}>
                  <AIPanel width={aiPanelWidth} onClose={() => setAiPanelVisible(false)} />
                </Suspense>
              </FloatingCard>
            </>
          ) : null}
        </div>
      </Layout>

      {activeResizeType ? (
        <div
          className="cloudnote-resize-overlay"
          onPointerMove={handlePointerMove}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
        />
      ) : null}
    </Layout>
  )
}

export default MainLayoutFloating
