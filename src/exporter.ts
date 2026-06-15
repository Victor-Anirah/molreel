import { GIFEncoder, quantize, applyPalette } from 'gifenc'

/**
 * Collects RGBA frames and encodes them into an animated GIF.
 * Each frame gets its own 256-color palette so color changes stay crisp.
 */
export function createGifSink() {
  const gif = GIFEncoder()
  return {
    addFrame(
      rgba: Uint8ClampedArray,
      width: number,
      height: number,
      delayMs: number,
    ) {
      const palette = quantize(rgba, 256)
      const index = applyPalette(rgba, palette)
      gif.writeFrame(index, width, height, { palette, delay: delayMs })
    },
    finish(): Blob {
      gif.finish()
      // Copy into a fresh ArrayBuffer so the Blob owns clean bytes.
      return new Blob([gif.bytes().slice()], { type: 'image/gif' })
    },
  }
}

/** Decode a data URL into an Image element. */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode a frame image.'))
    img.src = dataUrl
  })
}

/**
 * Draw an image scaled so its longest edge equals `maxEdge` (never upscaling),
 * onto a fresh 2D canvas filled with `background`. Returns the RGBA pixels.
 * GIF has no partial transparency, so a transparent scene is flattened to white.
 */
export function rasterize(
  img: HTMLImageElement,
  maxEdge: number,
  background: string,
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get a 2D canvas context.')

  ctx.fillStyle = background === 'transparent' ? '#ffffff' : background
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return { rgba: ctx.getImageData(0, 0, width, height).data, width, height }
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
