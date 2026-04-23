const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Store
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store:set', key, val),
  storeDelete: (key) => ipcRenderer.invoke('store:delete', key),

  // SSH
  sshConnect: (opts) => ipcRenderer.invoke('ssh:connect', opts),
  sshSend: (id, data) => ipcRenderer.invoke('ssh:send', id, data),
  sshResize: (id, cols, rows) => ipcRenderer.invoke('ssh:resize', id, cols, rows),
  sshDisconnect: (id) => ipcRenderer.invoke('ssh:disconnect', id),
  sshAcceptKey: (id, accept) => ipcRenderer.invoke('ssh:acceptKey', id, accept),

  // Serial
  serialList: () => ipcRenderer.invoke('serial:list'),
  serialConnect: (opts) => ipcRenderer.invoke('serial:connect', opts),
  serialSend: (id, data) => ipcRenderer.invoke('serial:send', id, data),
  serialDisconnect: (id) => ipcRenderer.invoke('serial:disconnect', id),

  // Local terminal
  localStart: (opts) => ipcRenderer.invoke('local:start', opts),
  localSend: (id, data) => ipcRenderer.invoke('local:send', id, data),
  localResize: (id, cols, rows) => ipcRenderer.invoke('local:resize', id, cols, rows),
  localDisconnect: (id) => ipcRenderer.invoke('local:disconnect', id),

  // Network adapter config
  netconfigList: () => ipcRenderer.invoke('netconfig:list'),
  netconfigApply: (opts) => ipcRenderer.invoke('netconfig:apply', opts),

  // Packet capture
  pcapCheck: () => ipcRenderer.invoke('pcap:check'),
  pcapListInterfaces: () => ipcRenderer.invoke('pcap:list-interfaces'),
  pcapStart: (opts) => ipcRenderer.invoke('pcap:start', opts),
  pcapStop: () => ipcRenderer.invoke('pcap:stop'),

  // Events (renderer listens to main push events)
  on: (channel, cb) => {
    const allowed = [
      'ssh:data', 'ssh:close', 'ssh:hostKeyPrompt',
      'serial:data', 'serial:close',
      'local:data', 'local:close',
      'pcap:packets', 'pcap:error', 'pcap:stopped',
    ]
    if (allowed.includes(channel)) {
      const handler = (_, ...args) => cb(...args)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
  }
})
