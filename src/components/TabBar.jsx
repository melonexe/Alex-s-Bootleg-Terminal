import React, { useState } from 'react'

const STATUS_COLOR = {
  connecting: 'var(--yellow)',
  connected:  'var(--green)',
  error:      'var(--red)',
  closed:     'var(--text-muted)'
}

export default function TabBar({ tabs, activeTab, onSelect, onClose, pcapOpen, onTogglePcap, netOpen, onToggleNet }) {
  if (tabs.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        height: 36, flexShrink: 0, WebkitAppRegion: 'no-drag', padding: '0 6px', gap: 4
      }}>
        <NetToggle active={netOpen} onClick={onToggleNet} />
        <PcapToggle active={pcapOpen} onClick={onTogglePcap} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      height: 36, flexShrink: 0, WebkitAppRegion: 'no-drag', overflow: 'hidden'
    }}>
      <div style={{ flex: 1, display: 'flex', overflowX: 'auto', height: '100%', alignItems: 'center' }}>
      {tabs.map(tab => {
        const active = tab.id === activeTab
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onAuxClick={e => { if (e.button === 1) { e.preventDefault(); onClose(tab.id) } }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
              height: '100%', cursor: 'pointer', flexShrink: 0, maxWidth: 200,
              borderRight: '1px solid var(--border)',
              background: active ? 'var(--bg-base)' : 'transparent',
              borderBottomWidth: 2, borderBottomStyle: 'solid',
              borderBottomColor: active ? 'var(--accent)' : 'transparent',
              transition: 'background 0.15s, border-color 0.15s',
              animation: 'tab-in 0.15s ease-out both'
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: STATUS_COLOR[tab.status] || 'var(--text-muted)',
              animation: tab.status === 'connecting' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
              transition: 'background 0.3s'
            }} />
            <span style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'color 0.15s'
            }}>
              {tab.label}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onClose(tab.id) }}
              style={{
                marginLeft: 4, width: 16, height: 16, borderRadius: 3,
                background: 'transparent', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 14, lineHeight: 1,
                transition: 'background 0.12s, color 0.12s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              ×
            </button>
          </div>
        )
      })}
      </div>
      <div style={{ flexShrink: 0, padding: '0 6px', borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
        <NetToggle active={netOpen} onClick={onToggleNet} />
        <PcapToggle active={pcapOpen} onClick={onTogglePcap} />
      </div>
    </div>
  )
}

function NetToggle({ active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={active ? 'Close adapter config' : 'Open adapter config'}
      style={{
        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--accent-dim)' : hov ? 'var(--bg-hover)' : 'transparent',
        color: active ? 'var(--accent)' : hov ? 'var(--text)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s',
        outline: active ? '1px solid var(--accent)' : 'none',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="6" height="6" rx="1"/>
        <rect x="16" y="2" width="6" height="6" rx="1"/>
        <rect x="9" y="16" width="6" height="6" rx="1"/>
        <path d="M5 8v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8"/>
        <path d="M12 12v4"/>
      </svg>
    </button>
  )
}

function PcapToggle({ active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={active ? 'Close packet capture' : 'Open packet capture'}
      style={{
        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--accent-dim)' : hov ? 'var(--bg-hover)' : 'transparent',
        color: active ? 'var(--accent)' : hov ? 'var(--text)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s',
        outline: active ? '1px solid var(--accent)' : 'none',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      </svg>
    </button>
  )
}
