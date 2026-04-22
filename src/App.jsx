import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import TerminalPane from './components/TerminalPane'
import ConnectionModal from './components/ConnectionModal'
import HostKeyModal from './components/HostKeyModal'
import { loadConnections, saveConnections } from './store/connections'
import { v4 as uuid } from 'uuid'

export default function App() {
  const [connections, setConnections] = useState([])
  const [tabs, setTabs] = useState([])        // { id, connId, label, type, status }
  const [activeTab, setActiveTab] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConn, setEditingConn] = useState(null)
  const [hostKeyPrompt, setHostKeyPrompt] = useState(null) // { id, host, fingerprint, ... }

  // Load saved connections on startup
  useEffect(() => {
    loadConnections().then(setConnections)
  }, [])

  // Listen for host-key prompts from main process
  useEffect(() => {
    const off = window.api.on('ssh:hostKeyPrompt', (data) => setHostKeyPrompt(data))
    return off
  }, [])

  const persistConnections = useCallback((updated) => {
    setConnections(updated)
    saveConnections(updated)
  }, [])

  function openConnection(conn) {
    const tabId = uuid()
    const tab = {
      id: tabId,
      connId: conn.id,
      label: conn.label || `${conn.host || conn.port}`,
      type: conn.type,
      status: 'connecting',
      conn
    }
    setTabs(prev => [...prev, tab])
    setActiveTab(tabId)
  }

  function closeTab(tabId) {
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      if (tab.type === 'ssh') window.api.sshDisconnect(tabId).catch(() => {})
      if (tab.type === 'serial') window.api.serialDisconnect(tabId).catch(() => {})
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Drag region sits above everything */}
      <div style={{ height: 32, WebkitAppRegion: 'drag', flexShrink: 0 }} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          connections={connections}
          onOpen={openConnection}
          onNew={() => { setEditingConn(null); setModalOpen(true) }}
          onEdit={handleEditConnection}
          onDelete={handleDeleteConnection}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            onClose={closeTab}
          />

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg-base)' }}>
            {tabs.length === 0 && <EmptyState onNew={() => { setEditingConn(null); setModalOpen(true) }} />}
            {tabs.map(tab => (
              <TerminalPane
                key={tab.id}
                tab={tab}
                active={tab.id === activeTab}
                onStatusChange={updateTabStatus}
              />
            ))}
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

function EmptyState({ onNew }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)'
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3-3 3M13 14h3"/>
      </svg>
      <p style={{ fontSize: 15, fontWeight: 500 }}>No active sessions</p>
      <button
        onClick={onNew}
        style={{
          padding: '8px 20px', background: 'var(--accent)', color: '#fff',
          borderRadius: 'var(--radius)', fontWeight: 500, fontSize: 13
        }}
      >
        New Connection
      </button>
    </div>
  )
}
