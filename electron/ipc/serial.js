const { SerialPort } = require('serialport')

const sessions = new Map()

module.exports = function setupSerial(ipcMain, mainWindow, store) {
  function send(channel, ...args) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args)
    }
  }

  ipcMain.handle('serial:list', async () => {
    const ports = await SerialPort.list()
    return ports
  })

  ipcMain.handle('serial:connect', async (_, opts) => {
    const { id, path, baudRate = 9600, dataBits = 8, stopBits = 1, parity = 'none' } = opts

    return new Promise((resolve, reject) => {
      const port = new SerialPort({ path, baudRate, dataBits, stopBits, parity, autoOpen: false })

      port.open((err) => {
        if (err) return reject(err.message)

        sessions.set(id, port)

        port.on('data', (data) => {
          send('serial:data', id, data.toString('binary'))
        })

        port.on('close', () => {
          sessions.delete(id)
          send('serial:close', id)
        })

        port.on('error', (err) => {
          sessions.delete(id)
          send('serial:close', id, err.message)
        })

        resolve({ ok: true })
      })
    })
  })

  ipcMain.handle('serial:send', (_, id, data) => {
    const port = sessions.get(id)
    if (port) port.write(data)
  })

  ipcMain.handle('serial:disconnect', (_, id) => {
    const port = sessions.get(id)
    if (port) {
      port.close()
      sessions.delete(id)
    }
  })
}
