import React from 'react'

const STATUS_COLOR = {
  connecting: 'var(--yellow)',
  connected:  'var(--green)',
  error:      'var(--red)',
  closed:     'var(--text-muted)'
}

export default function TabBar({ tabs, activeTab, onSelect, onClose }) {
  if (tabs.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', overflowX: 'auto',
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      height: 36, flexShrink: 0, WebkitAppRegion: 'no-drag'
    }}>
      {tabs.map(tab => {
        const active = tab.id === activeTab
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
              height: '100%', cursor: 'pointer', flexShrink: 0, maxWidth: 200,
              borderRight: '1px solid var(--border)',
              background: active ? 'var(--bg-base)' : 'transparent',
              borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'background 0.1s'
            }}
          >
            {/* Status dot */}
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: STATUS_COLOR[tab.status] || 'var(--text-muted)'
            }} />
            <span style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {tab.label}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onClose(tab.id) }}
              style={{
                marginLeft: 4, width: 16, height: 16, borderRadius: 3,
                background: 'transparent', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 14, lineHeight: 1
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
  )
}
