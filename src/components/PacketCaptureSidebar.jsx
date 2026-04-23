import { useState, useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'

const PROTO_COLORS = {
  TCP: '#3b82f6', UDP: '#8b5cf6', HTTP: '#10b981', HTTPS: '#06b6d4',
  'TLSv1.3': '#06b6d4', 'TLSv1.2': '#06b6d4', TLS: '#06b6d4',
  DNS: '#f59e0b', MDNS: '#a78bfa', ARP: '#f97316',
  ICMP: '#6ee7b7', ICMPv6: '#34d399',
}

function protoColor(proto) {
  if (!proto) return 'var(--text-dim)'
  return PROTO_COLORS[proto] || PROTO_COLORS[proto.split('/')[0]] || 'var(--text-dim)'
}

export default function PacketCaptureSidebar({ isOpen, onToggle }) {
  const [interfaces, setInterfaces] = useState([])
  const [selIface, setSelIface] = useState('')
  const [filter, setFilter] = useState('')
  const [packets, setPackets] = useState([])
  const [capturing, setCapturing] = useState(false)
  const [status, setStatus] = useState('idle') // idle | capturing | stopped | error
  const [errorMsg, setErrorMsg] = useState('')
  const [tsharkAvail, setTsharkAvail] = useState(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [selected, setSelected] = useState(null)

  const captureId = useRef(null)
  const listRef = useRef(null)
  const batchRef = useRef([])
  const flushTimer = useRef(null)
  const cleanups = useRef([])

  useEffect(() => {
    window.api.pcapCheck().then(ok => {
      setTsharkAvail(ok)
      if (ok) {
        window.api.pcapListInterfaces().then(ifaces => {
          setInterfaces(ifaces)
          if (ifaces.length > 0) setSelIface(ifaces[0].index)
        })
      }
    })
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(flushTimer.current)
      cleanups.current.forEach(fn => fn?.())
      window.api.pcapStop()
    }
  }, [])

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [packets, autoScroll])

  function flushBatch() {
    flushTimer.current = null
    const batch = batchRef.current.splice(0)
    if (!batch.length) return
    setPackets(prev => {
      const next = [...prev, ...batch]
      return next.length > 3000 ? next.slice(-3000) : next
    })
  }

  function startCapture() {
    cleanups.current.forEach(fn => fn?.())
    cleanups.current = []
    clearTimeout(flushTimer.current)
    flushTimer.current = null
    batchRef.current = []

    const id = uuid()
    captureId.current = id
    setPackets([])
    setSelected(null)
    setErrorMsg('')
    setStatus('capturing')
    setCapturing(true)

    cleanups.current.push(
      window.api.on('pcap:packets', (cid, pkts) => {
        if (cid !== id) return
        batchRef.current.push(...pkts)
        if (!flushTimer.current) {
          flushTimer.current = setTimeout(flushBatch, 80)
        }
      }),
      window.api.on('pcap:error', (cid, msg) => {
        if (cid !== id) return
        setErrorMsg(msg)
        setStatus('error')
        setCapturing(false)
      }),
      window.api.on('pcap:stopped', (cid) => {
        if (cid !== id) return
        clearTimeout(flushTimer.current)
        flushTimer.current = null
        flushBatch()
        setCapturing(false)
        setStatus(prev => prev === 'error' ? prev : 'stopped')
      })
    )

    window.api.pcapStart({ id, iface: selIface, filter }).catch(err => {
      setErrorMsg(err.message)
      setStatus('error')
      setCapturing(false)
    })
  }

  function stopCapture() {
    window.api.pcapStop()
    setCapturing(false)
  }

  function clearPackets() {
    setPackets([])
    setSelected(null)
    if (status !== 'capturing') {
      setStatus('idle')
      setErrorMsg('')
    }
  }

  return (
    <div style={{
      width: isOpen ? 380 : 0, flexShrink: 0,
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
            <CaptureIcon />
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)', flex: 1 }}>
              Packet Capture
            </span>
            {packets.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {packets.length.toLocaleString()} pkts
              </span>
            )}
            <CloseBtn onClick={onToggle} />
          </div>

          {/* tshark not found */}
          {tsharkAvail === false && (
            <div style={{ padding: '14px', fontSize: 12, color: 'var(--yellow)', lineHeight: 1.7 }}>
              <strong>tshark not found.</strong>
              <br />
              Install <strong>Wireshark</strong> and ensure tshark is in your PATH to enable packet capture.
            </div>
          )}

          {/* Controls */}
          {tsharkAvail && (
            <div style={{
              padding: '10px 12px', borderBottom: '1px solid var(--border)',
              flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <Field label="Interface">
                <select
                  value={selIface}
                  onChange={e => setSelIface(e.target.value)}
                  disabled={capturing}
                  style={{ fontSize: 12, padding: '5px 8px', width: '100%' }}
                >
                  {interfaces.map(iface => (
                    <option key={iface.index} value={iface.index}>
                      {iface.label}
                    </option>
                  ))}
                  {interfaces.length === 0 && <option disabled>Loading…</option>}
                </select>
              </Field>

              <Field label="Capture Filter (BPF)">
                <input
                  placeholder="tcp port 80, host 10.0.0.1, udp…"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  disabled={capturing}
                  onKeyDown={e => { if (e.key === 'Enter' && !capturing && selIface) startCapture() }}
                  style={{ fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box' }}
                />
              </Field>

              <div style={{ display: 'flex', gap: 6 }}>
                {!capturing ? (
                  <Btn primary onClick={startCapture} disabled={!selIface} style={{ flex: 1 }}>
                    ▶ Start
                  </Btn>
                ) : (
                  <Btn danger onClick={stopCapture} style={{ flex: 1 }}>
                    ◼ Stop
                  </Btn>
                )}
                <Btn onClick={clearPackets}>Clear</Btn>
              </div>
            </div>
          )}

          {/* Status bar */}
          {status !== 'idle' && (
            <div style={{
              padding: '4px 12px', fontSize: 11, flexShrink: 0,
              background: status === 'capturing' ? 'var(--accent-dim)'
                        : status === 'error'     ? 'rgba(239,68,68,0.12)'
                        :                          'var(--bg-raised)',
              color: status === 'capturing' ? 'var(--accent)'
                   : status === 'error'     ? 'var(--red)'
                   :                          'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
            }}>
              {status === 'capturing' && '● Capturing…'}
              {status === 'stopped'   && `◼ Stopped — ${packets.length.toLocaleString()} packets`}
              {status === 'error'     && `✕ ${errorMsg || 'Capture error'}`}
            </div>
          )}

          {/* Packet list */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {packets.length > 0 && (
              <div style={{
                display: 'flex', padding: '3px 8px', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 4
              }}>
                <span style={{ width: 28, flexShrink: 0 }}>#</span>
                <span style={{ width: 56, flexShrink: 0 }}>Time</span>
                <span style={{ flex: 1, minWidth: 0 }}>Source</span>
                <span style={{ flex: 1, minWidth: 0 }}>Destination</span>
                <span style={{ width: 48, flexShrink: 0 }}>Proto</span>
                <span style={{ width: 32, flexShrink: 0, textAlign: 'right' }}>Len</span>
              </div>
            )}

            <div
              ref={listRef}
              style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}
              onScroll={e => {
                const el = e.currentTarget
                setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 60)
              }}
            >
              {packets.length === 0 && tsharkAvail && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40, fontSize: 12 }}>
                  {capturing ? 'Waiting for packets…' : 'Start a capture to see packets'}
                </div>
              )}
              {packets.map((pkt, i) => (
                <PacketRow
                  key={i}
                  pkt={pkt}
                  i={i}
                  selected={selected === i}
                  onClick={() => setSelected(selected === i ? null : i)}
                />
              ))}
            </div>

            {selected !== null && packets[selected] && (
              <PacketDetail pkt={packets[selected]} onClose={() => setSelected(null)} />
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '5px 12px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', flexShrink: 0
          }}>
            <label style={{
              fontSize: 11, color: 'var(--text-muted)', display: 'flex',
              alignItems: 'center', gap: 5, cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Auto-scroll
            </label>
          </div>
        </>
      )}
    </div>
  )
}

function PacketRow({ pkt, i, selected, onClick }) {
  const [hov, setHov] = useState(false)
  const color = protoColor(pkt.proto)
  const bg = selected ? 'var(--accent-dim)' : hov ? 'var(--bg-hover)'
           : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)'
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', padding: '2px 8px', gap: 4, background: bg,
        transition: 'background 0.08s', cursor: 'pointer', alignItems: 'center',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span style={{ width: 28, flexShrink: 0, color: 'var(--text-muted)' }}>{pkt.num}</span>
      <span style={{ width: 56, flexShrink: 0, color: 'var(--text-dim)' }}>{pkt.time}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{pkt.src}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{pkt.dst}</span>
      <span style={{ width: 48, flexShrink: 0, color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkt.proto}</span>
      <span style={{ width: 32, flexShrink: 0, color: 'var(--text-muted)', textAlign: 'right' }}>{pkt.len}</span>
    </div>
  )
}

function PacketDetail({ pkt, onClose }) {
  const rows = [
    ['Time',     pkt.time + 's'],
    ['Source',   pkt.src],
    ['Dest',     pkt.dst],
    ['Protocol', pkt.proto],
    ['Length',   pkt.len ? pkt.len + ' bytes' : ''],
    ['Info',     pkt.info],
  ]
  return (
    <div style={{
      borderTop: '1px solid var(--border)', background: 'var(--bg-raised)',
      padding: '8px 12px', flexShrink: 0, fontFamily: 'monospace', fontSize: 11,
      maxHeight: 140, overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Packet #{pkt.num}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}
        >×</button>
      </div>
      {rows.map(([k, v]) => v ? (
        <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 2, lineHeight: 1.5 }}>
          <span style={{ color: 'var(--text-muted)', minWidth: 60, flexShrink: 0 }}>{k}</span>
          <span style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{v}</span>
        </div>
      ) : null)}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
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

function Btn({ children, onClick, primary, danger, disabled, style }) {
  const [hov, setHov] = useState(false)
  const bg = primary ? 'var(--accent)' : danger ? 'var(--red)' : 'var(--bg-raised)'
  const tc = primary || danger ? '#fff' : 'var(--text-dim)'
  const hBg = primary ? 'var(--accent)' : danger ? 'var(--red)' : 'var(--bg-hover)'
  const hTc = primary || danger ? '#fff' : 'var(--text)'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px', background: hov ? hBg : bg, color: hov ? hTc : tc,
        borderRadius: 'var(--radius)', fontWeight: 500, fontSize: 12,
        border: primary || danger ? 'none' : '1px solid var(--border)',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.12s, color 0.12s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      onMouseEnter={() => !disabled && setHov(true)}
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
      title="Close panel"
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

function CaptureIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  )
}
