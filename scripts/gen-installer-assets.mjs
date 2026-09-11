import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BUILD = join(ROOT, 'build')
mkdirSync(BUILD, { recursive: true })

function createBMP(width, height, pixels) {
  const rowBytes = width * 3
  const padding = (4 - (rowBytes % 4)) % 4
  const rowSize = rowBytes + padding
  const imgSize = rowSize * height
  const fileSize = 54 + imgSize

  const buf = Buffer.alloc(fileSize)

  buf.writeUInt16LE(0x4D42, 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(54, 10)

  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(height, 22)
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28)
  buf.writeUInt32LE(0, 30)
  buf.writeUInt32LE(imgSize, 34)
  buf.writeUInt32LE(0, 38)
  buf.writeUInt32LE(0, 42)
  buf.writeUInt32LE(0, 46)
  buf.writeUInt32LE(0, 50)

  for (let y = 0; y < height; y++) {
    const row = height - 1 - y
    for (let x = 0; x < width; x++) {
      const idx = (row * width + x) * 3
      const offset = 54 + rowSize * y + x * 3
      buf[offset] = pixels[idx + 2]
      buf[offset + 1] = pixels[idx + 1]
      buf[offset + 2] = pixels[idx]
    }
  }

  return buf
}

function createHeaderBMP() {
  const w = 150, h = 57
  const pixels = Buffer.alloc(w * h * 3)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = x / w
      const v = y / h
      const diag = (t + v) / 2

      const r = Math.round(lerp(8, 100, diag) + Math.sin(diag * Math.PI) * 30)
      const g = Math.round(lerp(3, 30, diag))
      const b = Math.round(lerp(20, 180, diag) + Math.sin(diag * Math.PI * 1.5) * 40)

      const i = (y * w + x) * 3
      pixels[i] = clamp(r)
      pixels[i + 1] = clamp(g)
      pixels[i + 2] = clamp(b)
    }
  }

  return createBMP(w, h, pixels)
}

function createSidebarBMP() {
  const w = 164, h = 314
  const pixels = Buffer.alloc(w * h * 3)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = x / w
      const v = y / h

      const r = Math.round(lerp(12, 90, v) + Math.sin(t * Math.PI) * 20)
      const g = Math.round(lerp(4, 25, v))
      const b = Math.round(lerp(25, 160, v) + Math.cos(v * Math.PI * 0.8) * 30)

      const i = (y * w + x) * 3
      pixels[i] = clamp(r)
      pixels[i + 1] = clamp(g)
      pixels[i + 2] = clamp(b)
    }
  }

  const circleCx = w * 0.5
  const circleCy = h * 0.35
  const radius = 40

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - circleCx
      const dy = y - circleCy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < radius && dist > radius - 6) {
        const glow = 1 - (radius - dist) / 6
        const i = (y * w + x) * 3
        pixels[i] = clamp(pixels[i] + Math.round(glow * 80))
        pixels[i + 1] = clamp(pixels[i + 1] + Math.round(glow * 60))
        pixels[i + 2] = clamp(pixels[i + 2] + Math.round(glow * 120))
      }
    }
  }

  return createBMP(w, h, pixels)
}

function convertPNGtoICO(pngPath, icoPath, sizes) {
  const pngBuf = readFileSync(pngPath)

  const count = sizes.length
  const headerSize = 6 + count * 16
  let dataOffset = headerSize

  const entries = []
  for (const size of sizes) {
    entries.push({
      width: size >= 256 ? 0 : size,
      height: size >= 256 ? 0 : size,
      size: pngBuf.length,
      offset: dataOffset
    })
    dataOffset += pngBuf.length
  }

  const totalSize = dataOffset
  const buf = Buffer.alloc(totalSize)

  buf.writeUInt16LE(0, 0)
  buf.writeUInt16LE(1, 2)
  buf.writeUInt16LE(count, 4)

  let off = 6
  for (const e of entries) {
    buf.writeUInt8(e.width, off)
    buf.writeUInt8(e.height, off + 1)
    buf.writeUInt8(0, off + 2)
    buf.writeUInt8(0, off + 3)
    buf.writeUInt16LE(1, off + 4)
    buf.writeUInt16LE(32, off + 6)
    buf.writeUInt32LE(e.size, off + 8)
    buf.writeUInt32LE(e.offset, off + 12)
    off += 16
  }

  for (const e of entries) {
    pngBuf.copy(buf, e.offset)
  }

  writeFileSync(icoPath, buf)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clamp(v) {
  return Math.max(0, Math.min(255, v))
}

const headerBMP = createHeaderBMP()
writeFileSync(join(BUILD, 'installer-header.bmp'), headerBMP)
console.log(`header.bmp: ${headerBMP.length} bytes`)

const sidebarBMP = createSidebarBMP()
writeFileSync(join(BUILD, 'installer-sidebar.bmp'), sidebarBMP)
console.log(`sidebar.bmp: ${sidebarBMP.length} bytes`)

const iconPng = join(ROOT, 'icon.png')
try {
  convertPNGtoICO(iconPng, join(BUILD, 'icon.ico'), [16, 32, 48, 256])
  console.log('icon.ico created')
} catch (e) {
  console.log(`icon conversion failed (will use default): ${e.message}`)
}

convertPNGtoICO(iconPng, join(BUILD, 'installer-icon.ico'), [16, 32, 48, 256])
convertPNGtoICO(iconPng, join(BUILD, 'uninstaller-icon.ico'), [16, 32, 48, 256])
console.log('installer/uninstaller icons created')
