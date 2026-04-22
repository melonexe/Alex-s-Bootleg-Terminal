const { Client, utils } = require('ssh2')
const crypto = require('crypto')
const fs = require('fs')

// sessionId -> { conn, stream }
const sessions = new Map()
// sessionId -> async done callback for pending host-key decision
const pendingKeys = new Map()

module.exports = function setupSSH(ipcMain, mainWindow, store) {
  function send(channel, ...args) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args)
    }
  }

  ipcMain.handle('ssh:connect', async (_, opts) => {
    const { id, host, port = 22, username, password, privateKey: keyPath, passphrase } = opts

    return new Promise((resolve, reject) => {
      const conn = new Client()

      conn.on('ready', () => {
        conn.shell({ term: 'xterm-256color' }, (err, stream) => {
          if (err) { conn.end(); return reject(err.message) }
          sessions.set(id, { conn, stream })

          stream.on('data', (data) => send('ssh:data', id, data.toString()))
          stream.stderr.on('data', (data) => send('ssh:data', id, data.toString()))
          stream.on('close', () => {
            sessions.delete(id)
            send('ssh:close', id)
          })

          resolve({ ok: true })
        })
      })

      conn.on('error', (err) => {
        sessions.delete(id)
        reject(err.message)
      })

      const connectOpts = {
        host,
        port,
        username,
        readyTimeout: 15000,
        hostVerifier: (keyBuf, done) => {
          const fingerprint = crypto.createHash('sha256').update(keyBuf).digest('base64')
          const knownKey = store.get(`knownHosts.${host}`)

          if (knownKey === fingerprint) {
            done(true)
            return
          }

          pendingKeys.set(id, done)
          send('ssh:hostKeyPrompt', {
            id,
            host,
            fingerprint,
            existingFingerprint: knownKey || null,
            mismatch: !!knownKey
          })
        }
      }

      if (keyPath) {
        try {
          connectOpts.privateKey = fs.readFileSync(keyPath)
          if (passphrase) connectOpts.passphrase = passphrase
        } catch (e) {
          return reject(`Cannot read private key: ${e.message}`)
        }
      } else if (password) {
        connectOpts.password = password
      }

      conn.connect(connectOpts)
    })
  })

  ipcMain.handle('ssh:acceptKey', (_, id, { accept, persist, host, fingerprint }) => {
    const done = pendingKeys.get(id)
    if (!done) return
    pendingKeys.delete(id)

    if (accept && persist) {
      store.set(`knownHosts.${host}`, fingerprint)
    }
    done(accept)
  })

  ipcMain.handle('ssh:send', (_, id, data) => {
    const s = sessions.get(id)
    if (s) s.stream.write(data)
  })

  ipcMain.handle('ssh:resize', (_, id, cols, rows) => {
    const s = sessions.get(id)
    if (s) s.stream.setWindow(rows, cols)
  })

  ipcMain.handle('ssh:disconnect', (_, id) => {
    const s = sessions.get(id)
    if (s) { s.conn.end(); sessions.delete(id) }
  })
}
