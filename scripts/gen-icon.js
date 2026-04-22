'use strict'
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')
const { default: pngToIco } = require('png-to-ico')

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(rgba, w, h) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA

  const stride = w * 4
  const raw = Buffer.alloc(h * (stride + 1))
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4, 0)
  const S = size / 256

  function px(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a
  }

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h)
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        px(x + dx, y + dy, r, g, b, a)
  }

  function roundRect(rx, ry, w, h, rad, r, g, b, a = 255) {
    rx = Math.round(rx); ry = Math.round(ry); w = Math.round(w); h = Math.round(h)
    rad = Math.min(Math.round(rad), Math.floor(Math.min(w, h) / 2))
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        let alpha = a
        const inTL = dx < rad && dy < rad
        const inTR = dx >= w - rad && dy < rad
        const inBL = dx < rad && dy >= h - rad
        const inBR = dx >= w - rad && dy >= h - rad
        if (inTL) {
          const d = Math.hypot(dx - rad, dy - rad)
          if (d > rad) continue
          if (d > rad - 1.5) alpha = Math.round(a * (rad - d) / 1.5)
        } else if (inTR) {
          const d = Math.hypot(dx - (w - 1 - rad), dy - rad)
          if (d > rad) continue
          if (d > rad - 1.5) alpha = Math.round(a * (rad - d) / 1.5)
        } else if (inBL) {
          const d = Math.hypot(dx - rad, dy - (h - 1 - rad))
          if (d > rad) continue
          if (d > rad - 1.5) alpha = Math.round(a * (rad - d) / 1.5)
        } else if (inBR) {
          const d = Math.hypot(dx - (w - 1 - rad), dy - (h - 1 - rad))
          if (d > rad) continue
          if (d > rad - 1.5) alpha = Math.round(a * (rad - d) / 1.5)
        }
        px(rx + dx, ry + dy, r, g, b, alpha)
      }
    }
  }

  function circle(cx, cy, rad, r, g, b) {
    const ir = Math.ceil(rad) + 2
    for (let dy = -ir; dy <= ir; dy++)
      for (let dx = -ir; dx <= ir; dx++) {
        const d = Math.hypot(dx, dy)
        if (d <= rad) px(cx + dx, cy + dy, r, g, b)
        else if (d <= rad + 1.2) px(cx + dx, cy + dy, r, g, b, Math.round(255 * (rad + 1.2 - d) / 1.2))
      }
  }

  // Background
  roundRect(0, 0, size, size, 48 * S, 15, 17, 28)

  // Window body (lighter)
  const pad = Math.max(1, Math.round(8 * S))
  roundRect(pad, pad, size - 2 * pad, size - 2 * pad, 36 * S, 22, 26, 44)

  // Title bar
  const tbH = Math.max(2, Math.round(42 * S))
  fillRect(pad, pad, size - 2 * pad, tbH, 17, 20, 34)

  // Separator line
  fillRect(pad, pad + tbH, size - 2 * pad, Math.max(1, Math.round(S)), 33, 40, 60)

  // Traffic lights (only at larger sizes)
  if (size >= 64) {
    const dotR = Math.round(8 * S)
    circle(Math.round(36 * S), Math.round(30 * S), dotR, 235, 77, 60)
    circle(Math.round(60 * S), Math.round(30 * S), dotR, 250, 191, 23)
    circle(Math.round(84 * S), Math.round(30 * S), dotR, 52, 199, 89)
  }

  // ">_" prompt glyph
  const CHEVRON = [
    [1,1,0,0,0,0],
    [0,1,1,0,0,0],
    [0,0,1,1,0,0],
    [0,0,0,1,0,0],
    [0,0,1,1,0,0],
    [0,1,1,0,0,0],
    [1,1,0,0,0,0],
  ]
  const CURSOR = [
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [0,0,0,0,0,0],
    [1,1,1,1,1,1],
  ]

  if (size >= 48) {
    const sc = Math.max(2, Math.round(10 * S))
    const gW = 6 * sc
    const gap = sc
    const totalW = gW * 2 + gap
    const totalH = 7 * sc
    const contentY = pad + tbH + Math.round(S)
    const contentH = size - pad - contentY
    const gx = Math.round((size - totalW) / 2)
    const gy = Math.round(contentY + (contentH - totalH) / 2)

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 6; col++) {
        if (CHEVRON[row][col]) fillRect(gx + col * sc, gy + row * sc, sc, sc, 79, 142, 247)
        if (CURSOR[row][col]) fillRect(gx + gW + gap + col * sc, gy + row * sc, sc, sc, 79, 142, 247)
      }
    }
  }

  return makePNG(rgba, size, size)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets')
  fs.mkdirSync(assetsDir, { recursive: true })

  const pngs = [16, 32, 48, 256].map(renderIcon)
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngs[3])

  const ico = await pngToIco(pngs)
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), ico)

  console.log('Icon generated: assets/icon.ico')
}

main().catch(err => { console.error('Icon generation failed:', err.message); process.exit(1) })
