import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

const THEME = {
  background:    '#0f1117',
  foreground:    '#e2e8f0',
  cursor:        '#4f8ef7',
  cursorAccent:  '#0f1117',
  black:         '#1e2638',
  red:           '#ef4444',
  green:         '#22c55e',
  yellow:        '#f59e0b',
  blue:          '#4f8ef7',
  magenta:       '#a78bfa',
  cyan:          '#22d3ee',
  white:         '#e2e8f0',
  brightBlack:   '#64748b',
  brightRed:     '#f87171',
  brightGreen:   '#4ade80',
  brightYellow:  '#fbbf24',
  brightBlue:    '#60a5fa',
  brightMagenta: '#c4b5fd',
  brightCyan:    '#67e8f9',
  brightWhite:   '#f8fafc'
}

export default function TerminalPane({ tab, active, onStatusChange, termTheme }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)

  // Update terminal colors when the app theme changes
  useEffect(() => {
    if (termRef.current && termTheme) {
      termRef.current.options.theme = termTheme
    }
  }, [termTheme])

  useEffect(() => {
    const term = new Terminal({
      theme: termTheme || THEME,
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    const { conn, id, type } = tab
    connect(id, type, conn, term, fit, onStatusChange)

    return () => {
      term.dispose()
      termRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus when this pane becomes active
  useEffect(() => {
    if (active && termRef.current) {
      termRef.current.focus()
    }
  }, [active])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (fitRef.current && termRef.current) {
        fitRef.current.fit()
        const { cols, rows } = termRef.current
        if (tab.type === 'ssh') window.api.sshResize(tab.id, cols, rows).catch(() => {})
        else if (tab.type === 'local') window.api.localResize(tab.id, cols, rows).catch(() => {})
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [tab.id, tab.type])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        display: active ? 'block' : 'none',
        background: '#0f1117'
      }}
    />
  )
}

async function connect(id, type, conn, term, fit, onStatusChange) {
  if (type === 'local') {
    const offData = window.api.on('local:data', (sessionId, data) => {
      if (sessionId === id) term.write(data)
    })
    const offClose = window.api.on('local:close', (sessionId, reason) => {
      if (sessionId !== id) return
      term.write(`\r\n\x1b[33m[Session ended${reason ? ': ' + reason : ''}]\x1b[0m\r\n`)
      onStatusChange(id, 'closed')
      offData?.(); offClose?.()
    })

    try {
      fit.fit()
      const { cols, rows } = term
      await window.api.localStart({ id, cols, rows })
      onStatusChange(id, 'connected')
      term.onData(data => window.api.localSend(id, data))
    } catch (err) {
      term.write(`\x1b[31mFailed to start terminal: ${err}\x1b[0m\r\n`)
      onStatusChange(id, 'error')
      offData?.(); offClose?.()
    }
    return
  }

  term.write('\x1b[90mConnecting…\x1b[0m\r\n')

  const offData = window.api.on(type === 'ssh' ? 'ssh:data' : 'serial:data', (sessionId, data) => {
    if (sessionId === id) term.write(data)
  })

  const offClose = window.api.on(type === 'ssh' ? 'ssh:close' : 'serial:close', (sessionId, reason) => {
    if (sessionId !== id) return
    term.write(`\r\n\x1b[33m[Connection closed${reason ? ': ' + reason : ''}]\x1b[0m\r\n`)
    onStatusChange(id, 'closed')
    offData?.(); offClose?.()
  })

  try {
    if (type === 'ssh') {
      await window.api.sshConnect({
        id,
        host: conn.host,
        port: conn.sshPort || 22,
        username: conn.username,
        password: conn.password,
        privateKey: conn.keyPath,
        passphrase: conn.passphrase
      })
    } else {
      await window.api.serialConnect({
        id,
        path: conn.port,
        baudRate: Number(conn.baudRate) || 9600,
        dataBits: Number(conn.dataBits) || 8,
        stopBits: Number(conn.stopBits) || 1,
        parity: conn.parity || 'none'
      })
    }

    term.write('\x1b[32mConnected\x1b[0m\r\n\r\n')
    onStatusChange(id, 'connected')
    fit.fit()

    const { cols, rows } = term
    if (type === 'ssh') window.api.sshResize(id, cols, rows).catch(() => {})

    term.onData(data => {
      if (type === 'ssh') window.api.sshSend(id, data)
      else window.api.serialSend(id, data)
    })

  } catch (err) {
    if (err !== 'HOST_KEY_PENDING') {
      term.write(`\x1b[31mFailed: ${err}\x1b[0m\r\n`)
      onStatusChange(id, 'error')
      offData?.(); offClose?.()
    }
  }
}
