import React, { useState } from 'react'

export default function HostKeyModal({ prompt, onResolve }) {
  const [persist, setPersist] = useState(!prompt.mismatch)
  const { host, fingerprint, existingFingerprint, mismatch } = prompt

  return (
    <Overlay>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 24, width: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
      }}>
        {mismatch ? (
          <>
            <h2 style={{ color: 'var(--red)', fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningIcon /> Host Key Mismatch
            </h2>
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16 }}>
              The host key for <strong style={{ color: 'var(--text)' }}>{host}</strong> has changed.
              This could indicate a man-in-the-middle attack or the server was rebuilt.
            </p>
            <KeyBlock label="Expected" value={existingFingerprint} color="var(--green)" />
            <KeyBlock label="Received" value={fingerprint} color="var(--red)" />
          </>
        ) : (
          <>
            <h2 style={{ color: 'var(--yellow)', fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <InfoIcon /> Unknown Host Key
            </h2>
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16 }}>
              The host key for <strong style={{ color: 'var(--text)' }}>{host}</strong> is not cached.
              Verify the fingerprint out-of-band before accepting.
            </p>
            <KeyBlock label="Fingerprint (SHA-256)" value={fingerprint} />
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: 'var(--text-dim)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={persist}
            onChange={e => setPersist(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent)' }}
          />
          Save this key to known hosts
        </label>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <Btn onClick={() => onResolve(false, false)} variant="ghost">Reject</Btn>
          <Btn onClick={() => onResolve(true, persist)} variant={mismatch ? 'danger' : 'primary'}>
            {mismatch ? 'Accept Anyway' : 'Accept'}
          </Btn>
        </div>
      </div>
    </Overlay>
  )
}

function KeyBlock({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{
        fontFamily: 'monospace', fontSize: 11, padding: '6px 10px',
        background: 'var(--bg-raised)', borderRadius: 'var(--radius-sm)',
        color: color || 'var(--text)', wordBreak: 'break-all'
      }}>
        {value}
      </div>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
      animation: 'backdrop-in 0.15s ease-out'
    }}>
      <div style={{ animation: 'modal-in 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
        {children}
      </div>
    </div>
  )
}

function Btn({ children, onClick, variant }) {
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff' },
    danger:  { background: 'var(--red)',    color: '#fff' },
    ghost:   { background: 'var(--bg-raised)', color: 'var(--text-dim)' }
  }
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 500,
        ...styles[variant]
      }}
    >
      {children}
    </button>
  )
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01"/>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4M12 8h.01"/>
    </svg>
  )
}
