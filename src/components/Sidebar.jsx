import { useState } from 'react'

const TYPE_ICON = {
  ssh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  serial: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="4" height="10" rx="1"/>
      <rect x="10" y="7" width="4" height="10" rx="1"/>
      <rect x="18" y="7" width="4" height="10" rx="1"/>
      <path d="M6 12h4M14 12h4"/>
    </svg>
  )
}

export default function Sidebar({ connections, onOpen, onNew, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [contextMenu, setContextMenu] = useState(null) // { x, y, conn }

  const filtered = connections.filter(c =>
    c.label?.toLowerCase().includes(search.toLowerCase()) ||
    c.host?.toLowerCase().includes(search.toLowerCase()) ||
    c.port?.toLowerCase?.()?.includes(search.toLowerCase())
  )

  const ssh = filtered.filter(c => c.type === 'ssh')
  const serial = filtered.filter(c => c.type === 'serial')

  function handleContextMenu(e, conn) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, conn })
  }

  function dismissMenu() { setContextMenu(null) }

  return (
    <div
      style={{
        width: 240, flexShrink: 0, background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', userSelect: 'none'
      }}
      onClick={dismissMenu}
    >
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', WebkitAppRegion: 'no-drag' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>Alex's Bootleg Terminal</span>
          <button
            onClick={onNew}
            title="New connection"
            style={{
              marginLeft: 'auto', width: 24, height: 24, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-hover)', color: 'var(--text-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        <input
          placeholder="Search connections..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 12, padding: '5px 8px' }}
        />
      </div>

      {/* Connection list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {ssh.length > 0 && (
          <Group label="SSH" items={ssh} onOpen={onOpen} onContextMenu={handleContextMenu} />
        )}
        {serial.length > 0 && (
          <Group label="Serial" items={serial} onOpen={onOpen} onContextMenu={handleContextMenu} />
        )}
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 32, fontSize: 12 }}>
            No connections yet
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '4px 0', zIndex: 1000,
            minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem onClick={() => { onOpen(contextMenu.conn); dismissMenu() }}>Connect</MenuItem>
          <MenuItem onClick={() => { onEdit(contextMenu.conn); dismissMenu() }}>Edit</MenuItem>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <MenuItem onClick={() => { onDelete(contextMenu.conn.id); dismissMenu() }} danger>Delete</MenuItem>
        </div>
      )}
    </div>
  )
}

function Group({ label, items, onOpen, onContextMenu }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '4px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M3 2l4 3-4 3z"/>
        </svg>
        {label}
      </div>
      {open && items.map(conn => (
        <ConnItem key={conn.id} conn={conn} onOpen={onOpen} onContextMenu={onContextMenu} />
      ))}
    </div>
  )
}

function ConnItem({ conn, onOpen, onContextMenu }) {
  return (
    <div
      onDoubleClick={() => onOpen(conn)}
      onContextMenu={e => onContextMenu(e, conn)}
      style={{
        padding: '6px 12px 6px 20px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', gap: 8, borderRadius: 'var(--radius-sm)',
        margin: '1px 6px', transition: 'background 0.1s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{TYPE_ICON[conn.type]}</span>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {conn.label || conn.host || conn.port}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {conn.type === 'ssh' ? `${conn.username}@${conn.host}:${conn.sshPort || 22}` : conn.port}
        </div>
      </div>
    </div>
  )
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '6px 14px', textAlign: 'left', background: 'transparent',
        color: danger ? 'var(--red)' : 'var(--text)', display: 'block'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  )
}
