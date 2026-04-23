import { useState, useEffect, useCallback } from 'react'

function prefixToMask(prefix) {
  const n = Math.min(32, Math.max(0, parseInt(prefix) || 24))
  const mask = (0xFFFFFFFF << (32 - n)) >>> 0
  return [mask >>> 24, (mask >> 16) & 0xFF, (mask >> 8) & 0xFF, mask & 0xFF].join('.')
}

function maskToPrefix(mask) {
  return mask.split('.').reduce((acc, oct) => {
    let n = parseInt(oct) || 0
    let bits = 0
    while (n) { bits += n & 1; n >>= 1 }
    return acc + bits
  }, 0)
}

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/
function validIP(v) { return IP_RE.test(v) && v.split('.').every(o => parseInt(o) <= 255) }

export default function NetworkConfigSidebar({ isOpen, onToggle }) {
  const [adapters, setAdapters] = useState([])
  const [selName, setSelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('dhcp')        // 'dhcp' | 'static'
  const [ip, setIp] = useState('')
  const [mask, setMask] = useState('255.255.255.0')
  const [gateway, setGateway] = useState('')
  const [dns, setDns] = useState('')
  const [applying, setApplying] = useState(false)
  const [status, setStatus] = useState(null)       // null | { ok, msg }

  const refresh = useCallback(() => {
    setLoading(true)
    setStatus(null)
    window.api.netconfigList()
      .then(list => {
        setAdapters(list)
        // Select first adapter or keep current if still present
        const keep = list.find(a => a.name === selName)
        const target = keep || list[0]
        if (target) populate(target)
      })
      .catch(err => setStatus({ ok: false, msg: String(err) }))
      .finally(() => setLoading(false))
  }, [selName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) refresh()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function populate(adapter) {
    setSelName(adapter.name)
    setMode(adapter.dhcp ? 'dhcp' : 'static')
    setIp(adapter.ip || '')
    setMask(adapter.prefix ? prefixToMask(adapter.prefix) : '255.255.255.0')
    setGateway(adapter.gateway || '')
    setDns(adapter.dns || '')
    setStatus(null)
  }

  function handleSelectAdapter(name) {
    const a = adapters.find(x => x.name === name)
    if (a) populate(a)
  }

  async function apply() {
    setApplying(true)
    setStatus(null)
    try {
      const res = await window.api.netconfigApply({
        name: selName, mode, ip, mask, gateway, dns
      })
      if (res.ok) {
        setStatus({ ok: true, msg: 'Applied successfully.' })
        setTimeout(refresh, 1500)
      } else {
        const isAdmin = /access.denied|requires elevation|administrator/i.test(res.error)
        setStatus({
          ok: false,
          msg: isAdmin
            ? 'Access denied — restart the app as Administrator to change IP settings.'
            : res.error
        })
      }
    } catch (err) {
      setStatus({ ok: false, msg: String(err) })
    } finally {
      setApplying(false)
    }
  }

  const sel = adapters.find(a => a.name === selName)
  const canApply = selName && !applying && (
    mode === 'dhcp' || (validIP(ip) && validIP(mask))
  )

  return (
    <div style={{
      width: isOpen ? 320 : 0, flexShrink: 0,
      background: 'var(--bg-surface)', borderLeft: isOpen ? '1px solid var(--border)' : 'none',
      display: 'flex', flexDirection: 'column', userSelect: 'none',
      overflow: 'hidden', transition: 'width 0.2s ease',
    }}>
      {isOpen && (
        <>
          {/* Header */}
          <div style={{
            padding: '0 12px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, height: 36, flexShrink: 0
          }}>
            <NetIcon />
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)', flex: 1 }}>
              Adapter Config
            </span>
            <TinyBtn onClick={refresh} title="Refresh" disabled={loading}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.5 9a9 9 0 0 0-15.3-4.5L1 10M3.5 15a9 9 0 0 0 15.3 4.5L23 14"/>
              </svg>
            </TinyBtn>
            <CloseBtn onClick={onToggle} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Adapter selector */}
            <Section label="Adapter">
              {loading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>Loading…</div>
              ) : (
                <select
                  value={selName}
                  onChange={e => handleSelectAdapter(e.target.value)}
                  disabled={applying}
                  style={{ fontSize: 12, padding: '5px 8px', width: '100%' }}
                >
                  {adapters.length === 0 && <option disabled>No active adapters found</option>}
                  {adapters.map(a => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
              )}
            </Section>

            {/* Current info badge */}
            {sel && (
              <div style={{
                margin: '0 12px 10px', padding: '8px 10px', borderRadius: 'var(--radius)',
                background: 'var(--bg-raised)', border: '1px solid var(--border)', fontSize: 11,
                fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 3
              }}>
                <InfoRow label="Current IP" value={sel.ip || '—'} />
                <InfoRow label="Mask" value={sel.prefix ? prefixToMask(sel.prefix) : '—'} />
                <InfoRow label="Gateway" value={sel.gateway || '—'} />
                <InfoRow label="DNS" value={sel.dns || '—'} />
                <InfoRow
                  label="Mode"
                  value={sel.dhcp ? 'DHCP' : 'Static'}
                  valueColor={sel.dhcp ? 'var(--green)' : 'var(--accent)'}
                />
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 10px' }} />

            {/* Mode selector */}
            <Section label="Set Mode">
              <div style={{ display: 'flex', gap: 6 }}>
                <ModeBtn active={mode === 'dhcp'} onClick={() => setMode('dhcp')}>DHCP</ModeBtn>
                <ModeBtn active={mode === 'static'} onClick={() => setMode('static')}>Static</ModeBtn>
              </div>
            </Section>

            {/* Static fields */}
            {mode === 'static' && (
              <>
                <Section label="IP Address">
                  <ValidatedInput
                    value={ip}
                    onChange={setIp}
                    placeholder="192.168.1.100"
                    validate={validIP}
                    disabled={applying}
                  />
                </Section>
                <Section label="Subnet Mask">
                  <ValidatedInput
                    value={mask}
                    onChange={setMask}
                    placeholder="255.255.255.0"
                    validate={validIP}
                    disabled={applying}
                  />
                </Section>
                <Section label="Default Gateway">
                  <ValidatedInput
                    value={gateway}
                    onChange={setGateway}
                    placeholder="192.168.1.1 (optional)"
                    validate={v => !v || validIP(v)}
                    disabled={applying}
                  />
                </Section>
                <Section label="DNS Servers">
                  <input
                    value={dns}
                    onChange={e => setDns(e.target.value)}
                    placeholder="8.8.8.8, 8.8.4.4 (optional)"
                    disabled={applying}
                    style={{ fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box' }}
                  />
                </Section>
              </>
            )}

            {/* Apply button */}
            <div style={{ padding: '4px 12px 12px' }}>
              <Btn primary onClick={apply} disabled={!canApply} style={{ width: '100%' }}>
                {applying ? 'Applying…' : 'Apply'}
              </Btn>
            </div>

            {/* Status */}
            {status && (
              <div style={{
                margin: '0 12px 12px', padding: '8px 10px', borderRadius: 'var(--radius)',
                background: status.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${status.ok ? 'var(--green)' : 'var(--red)'}`,
                fontSize: 11, color: status.ok ? 'var(--green)' : 'var(--red)', lineHeight: 1.5
              }}>
                {status.msg}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 60, flexShrink: 0 }}>{label}</span>
      <span style={{ color: valueColor || 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ padding: '0 12px 10px' }}>
      <label style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 4
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ValidatedInput({ value, onChange, placeholder, validate, disabled }) {
  const invalid = value && !validate(value)
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box',
        borderColor: invalid ? 'var(--red)' : undefined
      }}
    />
  )
}

function ModeBtn({ active, onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 600,
        borderRadius: 'var(--radius)',
        background: active ? 'var(--accent)' : hov ? 'var(--bg-hover)' : 'var(--bg-raised)',
        color: active ? '#fff' : hov ? 'var(--text)' : 'var(--text-dim)',
        border: active ? 'none' : '1px solid var(--border)',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function Btn({ children, onClick, primary, disabled, style }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 12px', background: hov && !disabled ? 'var(--accent)' : primary ? 'var(--accent)' : 'var(--bg-raised)',
        color: primary ? '#fff' : 'var(--text-dim)',
        borderRadius: 'var(--radius)', fontWeight: 500, fontSize: 12,
        border: primary ? 'none' : '1px solid var(--border)',
        opacity: disabled ? 0.45 : hov ? 0.88 : 1,
        transition: 'opacity 0.12s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function TinyBtn({ children, onClick, title, disabled }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 22, height: 22, borderRadius: 'var(--radius-sm)',
        background: hov ? 'var(--bg-hover)' : 'transparent',
        color: hov ? 'var(--text)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1, transition: 'background 0.12s, color 0.12s'
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function CloseBtn({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        width: 20, height: 20, borderRadius: 'var(--radius-sm)',
        background: hov ? 'var(--bg-hover)' : 'transparent',
        color: hov ? 'var(--text)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, transition: 'background 0.12s, color 0.12s'
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      ×
    </button>
  )
}

function NetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
      <rect x="2" y="2" width="6" height="6" rx="1"/>
      <rect x="16" y="2" width="6" height="6" rx="1"/>
      <rect x="9" y="16" width="6" height="6" rx="1"/>
      <path d="M5 8v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8"/>
      <path d="M12 12v4"/>
    </svg>
  )
}
