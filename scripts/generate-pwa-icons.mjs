/**
 * Build opaque PWA icons from logo.png (RGBA with transparent outer corners).
 * Chrome "Open in app" / installed shortcuts need full-bleed opaque icons —
 * transparent or white corners show as artifacts in the omnibox chip.
 */
import sharp from 'sharp'
import { join } from 'node:path'

const PUBLIC = new URL('../public/', import.meta.url).pathname
const SOURCE = join(PUBLIC, 'logo.png')
/** GanbaLog surface dark — matches icon inner fill */
const BG = { r: 12, g: 10, b: 9, alpha: 1 }

async function opaquePng(size) {
  const logo = await sharp(SOURCE).resize(size, size).png().toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, top: 0, left: 0 }])
    .png()
}

const outputs = [
  [64, 'pwa-64x64.png'],
  [192, 'pwa-192x192.png'],
  [512, 'pwa-512x512.png'],
  [180, 'apple-touch-icon-180x180.png'],
  [512, 'maskable-icon-512x512.png'],
]

for (const [size, name] of outputs) {
  await (await opaquePng(size)).toFile(join(PUBLIC, name))
  console.log('wrote', name)
}
