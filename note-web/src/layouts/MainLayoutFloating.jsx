import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Layout } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import AIPanel from '@/components/layout/AIPanel'
import Header from '@/components/layout/Header'
import NotesSidebar from '@/components/layout/NotesSidebar'
import SidebarWorkspaceNav from '@/components/layout/SidebarWorkspaceNav'
import NoteSearchPanel from '@/components/search/NoteSearchPanelWorkspace'
import { getSearchContext } from '@/utils/searchContextV2'

const { Content } = Layout

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

function MainLayoutFloating() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notesSidebarVisible, setNotesSidebarVisible] = useState(true)
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const searchContext = getSearchContext(location.pathname)

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
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        background: 'var(--surface)',
        padding: '8px 8px 6px 8px',
        gap: '0',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: sidebarCollapsed ? 92 : 280,
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
          onToggle={() => setSidebarCollapsed((value) => !value)}
          onNavigate={navigate}
          currentPath={location.pathname}
        />
      </div>

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
            searchPanel={
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
                  navigate(`/cloudnote/search?q=${encodeURIComponent(keyword)}&status=${searchContext.status}&scope=${encodeURIComponent(location.pathname)}`)
                }}
              />
            }
          />
        </div>

        <div
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
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              alignItems: 'stretch',
              position: 'relative',
            }}
          >
            {notesSidebarVisible && <NotesSidebar visible />}

            <div
              style={{
                width: 1,
                height: '100%',
                minHeight: 0,
                alignSelf: 'stretch',
                background: 'rgba(226,232,240,0.72)',
                position: 'relative',
                flexShrink: 0,
                boxShadow: 'none',
                overflow: 'visible',
                zIndex: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Button
                type="text"
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
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <Outlet />
            </Content>
          </FloatingCard>

          {aiPanelVisible && (
            <FloatingCard style={{ width: 340, flexShrink: 0 }}>
              <AIPanel onClose={() => setAiPanelVisible(false)} />
            </FloatingCard>
          )}
        </div>

      </Layout>
    </Layout>
  )
}

export default MainLayoutFloating
