const { exec } = require('child_process')

const PS = `powershell -NoProfile -NonInteractive -Command`

function ps(script) {
  return new Promise((resolve, reject) => {
    exec(`${PS} "${script}"`, { timeout: 12000 }, (err, stdout, stderr) => {
      if (err) return reject((stderr || err.message).trim())
      resolve(stdout.trim())
    })
  })
}

function netsh(args) {
  return new Promise(resolve => {
    exec(`netsh ${args}`, { timeout: 15000 }, (err, stdout, stderr) => {
      const out = (stdout + stderr).trim()
      if (err || /error|failed|access.denied/i.test(out)) {
        resolve({ ok: false, error: out || err?.message || 'Command failed' })
      } else {
        resolve({ ok: true })
      }
    })
  })
}

module.exports = function setupNetConfig(ipcMain) {
  ipcMain.handle('netconfig:list', async () => {
    // One-liner PowerShell: list Up adapters with IPv4 info
    const script = [
      "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object {",
      "  $idx=$_.ifIndex; $n=$_.Name;",
      "  $ip=Get-NetIPAddress -InterfaceIndex $idx -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1;",
      "  $iface=Get-NetIPInterface -InterfaceIndex $idx -AddressFamily IPv4 -ErrorAction SilentlyContinue;",
      "  $gw=(Get-NetRoute -InterfaceIndex $idx -DestinationPrefix 0.0.0.0/0 -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop;",
      "  $dns=(Get-DnsClientServerAddress -InterfaceIndex $idx -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses;",
      "  if($ip){[PSCustomObject]@{name=$n;ip=$ip.IPAddress;prefix=[int]$ip.PrefixLength;gateway=if($gw){$gw}else{''}; dhcp=($iface.Dhcp -eq 'Enabled');dns=if($dns){$dns -join ','}else{''}}}",
      "} | ConvertTo-Json -Compress",
    ].join(' ')

    const out = await ps(script.replace(/"/g, '\\"'))
    if (!out) return []
    let data = JSON.parse(out)
    if (!Array.isArray(data)) data = [data]
    return data
  })

  ipcMain.handle('netconfig:apply', async (_, { name, mode, ip, mask, gateway, dns }) => {
    if (mode === 'dhcp') {
      const r = await netsh(`interface ipv4 set address name="${name}" dhcp`)
      if (!r.ok) return r
      await netsh(`interface ipv4 set dnsservers name="${name}" dhcp`)
      return { ok: true }
    }

    // Static IP
    const gwArg = gateway?.trim() || 'none'
    const r = await netsh(`interface ipv4 set address name="${name}" static ${ip} ${mask} ${gwArg}`)
    if (!r.ok) return r

    if (dns?.trim()) {
      const servers = dns.trim().split(/[\s,]+/)
      await netsh(`interface ipv4 set dnsservers name="${name}" static ${servers[0]} primary`)
      if (servers[1]) await netsh(`interface ipv4 add dnsservers name="${name}" ${servers[1]} index=2`)
    }

    return { ok: true }
  })
}
