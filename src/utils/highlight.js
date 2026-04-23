const RESET = '\x1b[0m'
const C = {
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  white:   '\x1b[97m',
}

// Rules applied in order — first match at a position wins
const RULES = [
  // IPv4 with optional CIDR
  { re: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g,           color: 'cyan'    },
  // MAC address (colon, hyphen or dot notation)
  { re: /\b[0-9a-fA-F]{2}(?:[:\-][0-9a-fA-F]{2}){5}\b|[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\b/g, color: 'blue' },
  // Cisco interface names (GigabitEthernet0/0/1, Gi0/1, Fa0/0, etc.)
  { re: /\b(?:GigabitEthernet|TenGigabitEthernet|HundredGigE|FortyGigabitEthernet|TwentyFiveGigE|FastEthernet|Serial|Loopback|Tunnel|Vlan|Port-channel|Dialer|Management|BVI|Gi|Fa|Te|Hu|Se|Lo|Tu|Po)[\d\/:.]+/gi, color: 'magenta' },
  // Linux interface names
  { re: /\b(?:eth|ens|enp|wlan|wlp|bond|br|veth|tun|tap|lo)\d\w*/g, color: 'magenta' },
  // UP / active / healthy states
  { re: /\b(?:up|active|enabled|connected|online|running|established|reachable|pass(?:ed)?|success(?:ful(?:ly)?)?|ok(?!\.))\b/gi, color: 'green' },
  // DOWN / error / fault states
  { re: /\b(?:down|error|err(?!or\w)\b|fail(?:ed|ure)?|critical|fatal|denied|refused|timeout(?:ed)?|unreachable|administratively\s+down|shutdown|blocked|dropped)\b/gi, color: 'red' },
  // Warnings / notices
  { re: /\b(?:warn(?:ing)?|caution|notice|alert|degraded|flapping)\b/gi, color: 'yellow' },
]

function highlightLine(line) {
  // Pass through lines that already carry ANSI colour codes
  if (/\x1b\[/.test(line)) return line

  const matches = []
  for (const { re, color } of RULES) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(line)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, color })
    }
  }
  if (!matches.length) return line

  // Sort by position; first match at a given offset wins (earlier rule = higher priority)
  matches.sort((a, b) => a.start - b.start || b.end - a.end)
  const kept = []
  let cursor = 0
  for (const m of matches) {
    if (m.start >= cursor) { kept.push(m); cursor = m.end }
  }

  let out = ''
  let i = 0
  for (const m of kept) {
    out += line.slice(i, m.start) + C[m.color] + line.slice(m.start, m.end) + RESET
    i = m.end
  }
  return out + line.slice(i)
}

// Process a raw data chunk from SSH / serial.
// Only highlights complete lines (those followed by a newline in this chunk)
// so partial trailing content is never modified.
export function highlightChunk(data) {
  // Split while capturing the newline tokens so we can reconstruct exactly
  const parts = data.split(/(\r?\n)/g)
  let out = ''
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (!p) continue
    // Odd-indexed parts are the captured newline separators
    if (i % 2 === 1) { out += p; continue }
    // It's a text segment — only highlight if a newline follows (complete line)
    const complete = i + 1 < parts.length && /^\r?\n$/.test(parts[i + 1])
    out += complete ? highlightLine(p) : p
  }
  return out
}
