import React, { useState, useEffect } from 'react'

const DEFAULT_SSH = {
  type: 'ssh', label: '', host: '', sshPort: '22', username: '',
  authType: 'password', password: '', keyPath: '', passphrase: ''
}

const DEFAULT_SERIAL = {
  type: 'serial', label: '', port: '', baudRate: '9600',
  dataBits: '8', stopBits: '1', parity: 'none'
}

export default function ConnectionModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || DEFAULT_SSH)
  const [serialPorts, setSerialPorts] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (form.type === 'serial') {
      window.api.serialList().then(setSerialPorts).catch(() => {})
    }
  }, [form.type])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function switchType(type) {
    if (type === 'ssh') setForm(f => ({ ...DEFAULT_SSH, label: f.label }))
    else setForm(f => ({ ...DEFAULT_SERIAL, label: f.label }))
  }

  function validate() {
    const e = {}
    if (!form.label.trim()) e.label = 'Required'
    if (form.type === 'ssh') {
      if (!form.host.trim()) e.host = 'Required'
      if (!form.username.trim()) e.username = 'Required'
      if (form.authType === 'password' && !form.password) e.password = 'Required'
      if (form.authType === 'key' && !form.keyPath.trim()) e.keyPath = 'Required'
    } else {
      if (!form.port) e.port = 'Select a port'
    }
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({ ...form, id: initial?.id })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900,
      animation: 'backdrop-in 0.15s ease-out'
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', width: 480, maxHeight: '90vh',
          overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          animation: 'modal-in 0.2s cubic-bezier(0.16,1,0.3,1) both'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>
            {initial ? 'Edit Connection' : 'New Connection'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-raised)', padding: 3, borderRadius: 'var(--radius)' }}>
            {['ssh', 'serial'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => switchType(t)}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
                  background: form.type === t ? 'var(--accent)' : 'transparent',
                  color: form.type === t ? '#fff' : 'var(--text-muted)',
                  fontWeight: form.type === t ? 600 : 400, textTransform: 'uppercase',
                  fontSize: 12, letterSpacing: '0.05em', transition: 'all 0.15s'
                }}
              >
                {t === 'ssh' ? 'SSH' : 'Serial'}
              </button>
            ))}
          </div>

          <Field label="Label" error={errors.label}>
            <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="My Server" />
          </Field>

          {form.type === 'ssh' && <SSHFields form={form} set={set} errors={errors} />}
          {form.type === 'serial' && <SerialFields form={form} set={set} errors={errors} ports={serialPorts} />}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '7px 18px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised)', color: 'var(--text-dim)', fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '7px 18px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: '#fff', fontWeight: 500
              }}
            >
              {initial ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SSHFields({ form, set, errors }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
        <Field label="Host" error={errors.host}>
          <input value={form.host} onChange={e => set('host', e.target.value)} placeholder="192.168.1.1" />
        </Field>
        <Field label="Port">
          <input value={form.sshPort} onChange={e => set('sshPort', e.target.value)} type="number" min="1" max="65535" />
        </Field>
      </div>

      <Field label="Username" error={errors.username}>
        <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="root" />
      </Field>

      <Field label="Authentication">
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-base)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {['password', 'key'].map(t => (
            <button
              key={t} type="button"
              onClick={() => set('authType', t)}
              style={{
                flex: 1, padding: '4px 0', borderRadius: 2,
                background: form.authType === t ? 'var(--bg-raised)' : 'transparent',
                color: form.authType === t ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: form.authType === t ? 600 : 400
              }}
            >
              {t === 'password' ? 'Password' : 'Private Key'}
            </button>
          ))}
        </div>
      </Field>

      {form.authType === 'password' ? (
        <Field label="Password" error={errors.password}>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} />
        </Field>
      ) : (
        <>
          <Field label="Private Key Path" error={errors.keyPath}>
            <input value={form.keyPath} onChange={e => set('keyPath', e.target.value)} placeholder="~/.ssh/id_rsa" />
          </Field>
          <Field label="Passphrase (optional)">
            <input type="password" value={form.passphrase} onChange={e => set('passphrase', e.target.value)} />
          </Field>
        </>
      )}
    </>
  )
}

function SerialFields({ form, set, errors, ports }) {
  return (
    <>
      <Field label="Port" error={errors.port}>
        <select value={form.port} onChange={e => set('port', e.target.value)}>
          <option value="">Select port…</option>
          {ports.map(p => (
            <option key={p.path} value={p.path}>
              {p.path}{p.friendlyName ? ` — ${p.friendlyName}` : ''}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Baud Rate">
          <select value={form.baudRate} onChange={e => set('baudRate', e.target.value)}>
            {['300','1200','2400','4800','9600','19200','38400','57600','115200','230400','460800','921600'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="Data Bits">
          <select value={form.dataBits} onChange={e => set('dataBits', e.target.value)}>
            {['5','6','7','8'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Stop Bits">
          <select value={form.stopBits} onChange={e => set('stopBits', e.target.value)}>
            {['1','2'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Parity">
          <select value={form.parity} onChange={e => set('parity', e.target.value)}>
            {['none','even','odd','mark','space'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </Field>
      </div>
    </>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}
