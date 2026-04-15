﻿import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Button } from 'antd'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import NotesSidebar from '@/components/layout/NotesSidebar'
import AIPanel from '@/components/layout/AIPanel'
import UxIcon from '@/components/common/UxIcon'

const { Content } = Layout

function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [notesSidebarVisible, setNotesSidebarVisible] = useState(false)
  const [aiPanelVisible, setAiPanelVisible] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout className="min-h-screen cloudnote-shell" style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      background: 'var(--surface)',
      padding: '16px',
      gap: '16px',
      minHeight: '100vh',
    }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={navigate}
        currentPath={location.pathname}
      />

      <Layout className="workspace-unified cloudnote-main-shell overflow-hidden" style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        borderRadius: 24,
        boxShadow: '0 4px 40px -12px rgba(0, 0, 0, 0.08)',
        background: '#fff',
        minWidth: 0,
        minHeight: 'calc(100vh - 32px)',
      }}>
        <Header onToggleAIPanel={() => setAiPanelVisible(!aiPanelVisible)} />

        <div className="cloudnote-workspace-row" style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
        }}>
          <NotesSidebar
            visible={notesSidebarVisible}
            onToggle={() => setNotesSidebarVisible(!notesSidebarVisible)}
          />

          <div className="cloudnote-divider" style={{
            width: 4,
            background: 'rgba(226, 232, 240, 0.65)',
            cursor: 'col-resize',
            position: 'relative',
            flexShrink: 0,
          }}>
            <Button
              type="text"
              className="cloudnote-divider__button"
              icon={<UxIcon name={notesSidebarVisible ? 'arrowLeft' : 'arrowRight'} size={14} color="rgba(148,163,184,1)" />}
              onClick={() => setNotesSidebarVisible(!notesSidebarVisible)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 24,
                height: 32,
                borderRadius: 999,
                background: '#fff',
                border: '1px solid rgba(226, 232, 240, 1)',
                boxShadow: '0 1px 4px rgba(16,34,58,0.08)',
                color: 'rgba(148, 163, 184, 1)',
                zIndex: 10,
              }}
            />
          </div>

          <Content style={{
            flex: 1,
            background: '#fff',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}>
            <Outlet />
          </Content>

          {aiPanelVisible && (
            <>
              <div
                id="ai-resizer"
                className="ai-resizer"
                style={{
                  width: 8,
                  cursor: 'col-resize',
                  background: '#F8F9FA',
                  borderLeft: '1px solid rgba(226,232,240,0.7)',
                  flexShrink: 0,
                }}
              />
              <AIPanel onClose={() => setAiPanelVisible(false)} />
            </>
          )}
        </div>
      </Layout>
    </Layout>
  )
}

export default MainLayout
