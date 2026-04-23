import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import TerminalPane from './components/TerminalPane'
import ConnectionModal from './components/ConnectionModal'
import HostKeyModal from './components/HostKeyModal'
import PacketCaptureSidebar from './components/PacketCaptureSidebar'
import NetworkConfigSidebar from './components/NetworkConfigSidebar'
import { loadConnections, saveConnections } from './store/connections'
import { THEMES, applyTheme } from './themes'
import { v4 as uuid } from 'uuid'

export default function App() {
  const [connections, setConnections] = useState([])
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConn, setEditingConn] = useState(null)
  const [hostKeyPrompt, setHostKeyPrompt] = useState(null)
  const [theme, setTheme] = useState('default')
  const [pcapOpen, setPcapOpen] = useState(false)
  const [netOpen, setNetOpen] = useState(false)

  useEffect(() => {
    loadConnections().then(setConnections)
    window.api.storeGet('theme').then(saved => {
      if (saved && THEMES[saved]) {
        setTheme(saved)
        applyTheme(saved)
      }
    })
  }, [])

  useEffect(() => {
    const off = window.api.on('ssh:hostKeyPrompt', (data) => setHostKeyPrompt(data))
    return off
  }, [])

  const handleThemeChange = useCallback((key) => {
    setTheme(key)
    applyTheme(key)
    window.api.storeSet('theme', key)
  }, [])

  const persistConnections = useCallback((updated) => {
    setConnections(updated)
    saveConnections(updated)
  }, [])

  const openLocalTerminal = useCallback(() => {
    const tabId = uuid()
    setTabs(prev => [...prev, {
      id: tabId, connId: null, label: 'Terminal',
      type: 'local', status: 'connecting', conn: null
    }])
    setActiveTab(tabId)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        openLocalTerminal()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openLocalTerminal])

  function openConnection(conn) {
    const tabId = uuid()
    setTabs(prev => [...prev, {
      id: tabId,
      connId: conn.id,
      label: conn.label || `${conn.host || conn.port}`,
      type: conn.type,
      status: 'connecting',
      conn
    }])
    setActiveTab(tabId)
  }

  function closeTab(tabId) {
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      if (tab.type === 'ssh') window.api.sshDisconnect(tabId).catch(() => {})
      if (tab.type === 'serial') window.api.serialDisconnect(tabId).catch(() => {})
      if (tab.type === 'local') window.api.localDisconnect(tabId).catch(() => {})
    }
    setTabs(prev => prev.filter(t => t.id !== tabId))
    setActiveTab(prev => {
      if (prev !== tabId) return prev
      const remaining = tabs.filter(t => t.id !== tabId)
      return remaining.length ? remaining[remaining.length - 1].id : null
    })
  }

  function updateTabStatus(tabId, status) {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, status } : t))
  }

  function handleNewConnection(conn) {
    if (editingConn) {
      persistConnections(connections.map(c => c.id === conn.id ? conn : c))
    } else {
      persistConnections([...connections, { ...conn, id: uuid() }])
    }
    setModalOpen(false)
    setEditingConn(null)
  }

  function handleDeleteConnection(id) {
    persistConnections(connections.filter(c => c.id !== id))
  }

  function handleEditConnection(conn) {
    setEditingConn(conn)
    setModalOpen(true)
  }

  const termTheme = THEMES[theme]?.terminal ?? THEMES.default.terminal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <div style={{ height: 32, WebkitAppRegion: 'drag', flexShrink: 0 }} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          connections={connections}
          onOpen={openConnection}
          onNew={() => { setEditingConn(null); setModalOpen(true) }}
          onEdit={handleEditConnection}
          onDelete={handleDeleteConnection}
          onLocalTerminal={openLocalTerminal}
          theme={theme}
          onThemeChange={handleThemeChange}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            onClose={closeTab}
            pcapOpen={pcapOpen}
            onTogglePcap={() => setPcapOpen(o => !o)}
            netOpen={netOpen}
            onToggleNet={() => setNetOpen(o => !o)}
          />

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg-base)' }}>
              {tabs.length === 0 && (
                <EmptyState
                  onNew={() => { setEditingConn(null); setModalOpen(true) }}
                  onLocalTerminal={openLocalTerminal}
                />
              )}
              {tabs.map(tab => (
                <TerminalPane
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeTab}
                  onStatusChange={updateTabStatus}
                  termTheme={termTheme}
                />
              ))}
            </div>
            <NetworkConfigSidebar
              isOpen={netOpen}
              onToggle={() => setNetOpen(false)}
            />
            <PacketCaptureSidebar
              isOpen={pcapOpen}
              onToggle={() => setPcapOpen(false)}
            />
          </div>
        </div>
      </div>

      {modalOpen && (
        <ConnectionModal
          initial={editingConn}
          onSave={handleNewConnection}
          onClose={() => { setModalOpen(false); setEditingConn(null) }}
        />
      )}

      {hostKeyPrompt && (
        <HostKeyModal
          prompt={hostKeyPrompt}
          onResolve={(accept, persist) => {
            window.api.sshAcceptKey(hostKeyPrompt.id, {
              accept, persist,
              host: hostKeyPrompt.host,
              fingerprint: hostKeyPrompt.fingerprint
            })
            setHostKeyPrompt(null)
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew, onLocalTerminal }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)',
      animation: 'fade-up 0.25s ease-out both'
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3-3 3M13 14h3"/>
      </svg>
      <p style={{ fontSize: 15, fontWeight: 500 }}>No active sessions</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onLocalTerminal}
          style={{
            padding: '8px 20px', background: 'var(--bg-raised)', color: 'var(--text-dim)',
            borderRadius: 'var(--radius)', fontWeight: 500, fontSize: 13,
            border: '1px solid var(--border)', transition: 'background 0.15s, color 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-dim)' }}
        >
          Local Terminal
        </button>
        <button
          onClick={onNew}
          style={{
            padding: '8px 20px', background: 'var(--accent)', color: '#fff',
            borderRadius: 'var(--radius)', fontWeight: 500, fontSize: 13,
            transition: 'opacity 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          New Connection
        </button>
      </div>
    </div>
  )
}
