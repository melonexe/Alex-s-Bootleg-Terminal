const { exec, spawn } = require('child_process')
const os = require('os')

module.exports = function setupPcap(ipcMain, mainWindow) {
  let captureProc = null

  ipcMain.handle('pcap:check', () =>
    new Promise(resolve => exec('tshark --version', { timeout: 4000 }, err => resolve(!err)))
  )

  ipcMain.handle('pcap:list-interfaces', () =>
    new Promise(resolve => {
      exec('tshark -D', { timeout: 5000 }, (err, stdout) => {
        if (err) {
          // Fall back to OS network interfaces
          const ifaces = os.networkInterfaces()
          return resolve(
            Object.entries(ifaces).map(([name, addrs], i) => ({
              index: name,
              label: name,
              addresses: (addrs || []).map(a => a.address).join(', ')
            }))
          )
        }
        // Parse: "1. \Device\NPF_{GUID} (Ethernet)" or "1. eth0"
        const interfaces = stdout.trim().split('\n').flatMap(line => {
          const withDesc = line.match(/^(\d+)\.\s+(.+?)\s+\((.+?)\)\s*$/)
          if (withDesc) return [{ index: withDesc[1], label: withDesc[3], addresses: withDesc[2] }]
          const bare = line.match(/^(\d+)\.\s+(.+?)\s*$/)
          if (bare) return [{ index: bare[1], label: bare[2], addresses: '' }]
          return []
        })
        resolve(interfaces)
      })
    })
  )

  ipcMain.handle('pcap:start', (_, { id, iface, filter }) => {
    if (captureProc) {
      try { captureProc.kill() } catch {}
      captureProc = null
    }

    const args = [
      '-i', iface,
      '-l',
      '-T', 'fields',
      '-e', 'frame.number',
      '-e', 'frame.time_relative',
      '-e', 'ip.src',
      '-e', 'ip.dst',
      '-e', 'ipv6.src',
      '-e', 'ipv6.dst',
      '-e', '_ws.col.Protocol',
      '-e', 'frame.len',
      '-e', '_ws.col.Info',
      '-E', 'header=n',
      '-E', 'separator=\x01',
    ]
    if (filter && filter.trim()) args.push('-f', filter.trim())

    captureProc = spawn('tshark', args)

    let buf = ''
    captureProc.stdout.on('data', chunk => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop()
      const packets = lines
        .filter(l => l.trim())
        .map(line => {
          const p = line.split('\x01')
          return {
            num:   p[0]?.trim() || '',
            time:  parseFloat(p[1]?.trim() || 0).toFixed(4),
            src:   p[2]?.trim() || p[4]?.trim() || '',
            dst:   p[3]?.trim() || p[5]?.trim() || '',
            proto: p[6]?.trim() || '',
            len:   p[7]?.trim() || '',
            info:  p[8]?.trim() || '',
          }
        })
      if (packets.length) mainWindow.webContents.send('pcap:packets', id, packets)
    })

    captureProc.stderr.on('data', chunk => {
      const msg = chunk.toString()
      if (/error|permission|denied|failed/i.test(msg)) {
        mainWindow.webContents.send('pcap:error', id, msg.trim())
      }
    })

    captureProc.on('close', code => {
      captureProc = null
      mainWindow.webContents.send('pcap:stopped', id, code)
    })

    captureProc.on('error', err => {
      captureProc = null
      mainWindow.webContents.send('pcap:error', id, err.message)
    })

    return { ok: true }
  })

  ipcMain.handle('pcap:stop', () => {
    if (captureProc) {
      try { captureProc.kill() } catch {}
      captureProc = null
    }
    return { ok: true }
  })
}
