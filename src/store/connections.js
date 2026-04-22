// Thin wrapper around electron-store via the preload bridge
export async function loadConnections() {
  const data = await window.api.storeGet('connections')
  return data || []
}

export async function saveConnections(connections) {
  await window.api.storeSet('connections', connections)
}
