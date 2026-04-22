'use strict'
const { spawn } = require('child_process')

const sessions = new Map()

module.exports = function setupLocal(ipcMain, mainWindow) {
  function send(channel, ...args) {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send(channel, ...args)
  }

  ipcMain.handle('local:start', async (_, { id }) => {
    const isWin = process.platform === 'win32'
    const shell = isWin ? 'powershell.exe' : (process.env.SHELL || '/bin/bash')
    const args = isWin ? ['-NoLogo', '-NoProfile'] : []

    const proc = spawn(shell, args, {
      env: { ...process.env, TERM: 'xterm-256color' },
      cwd: process.env.USERPROFILE || process.env.HOME || '/',
      windowsHide: true
    })

    sessions.set(id, { proc, buf: '' })

    proc.stdout.on('data', d => send('local:data', id, d.toString()))
    proc.stderr.on('data', d => send('local:data', id, d.toString()))
    proc.on('close', code => {
      sessions.delete(id)
      send('local:close', id, code && code !== 0 ? `exited ${code}` : null)
    })
    proc.on('error', err => {
      sessions.delete(id)
      send('local:close', id, err.message)
    })

    return { ok: true }
  })

  ipcMain.handle('local:send', (_, id, data) => {
    const s = sessions.get(id)
    if (!s) return

    // Line-buffered I/O with local echo so the user can see what they type
    for (const ch of data) {
      if (ch === '\r' || ch === '\n') {
        s.proc.stdin.write(s.buf + '\n')
        send('local:data', id, '\r\n')
        s.buf = ''
      } else if (ch === '\x7f' || ch === '\b') {
        if (s.buf.length) {
          s.buf = s.buf.slice(0, -1)
          send('local:data', id, '\b \b')
        }
      } else if (ch === '\x03') {
        s.proc.stdin.write('\x03')
        send('local:data', id, '^C\r\n')
        s.buf = ''
      } else if (ch.charCodeAt(0) >= 32) {
        s.buf += ch
        send('local:data', id, ch)
      }
    }
  })

  ipcMain.handle('local:resize', () => {})

  ipcMain.handle('local:disconnect', (_, id) => {
    const s = sessions.get(id)
    if (s) { s.proc.kill(); sessions.delete(id) }
  })
}
