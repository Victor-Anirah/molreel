import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

export type ExportFormat = 'gif' | 'mp4'

/** A format-agnostic sink: feed it scaled frames, get a Blob out. */
export interface FrameSink {
  addFrame(canvas: HTMLCanvasElement, index: number): void
  finish(): Promise<Blob>
}

/** Decode a data URL (from viewer.pngURI()) into an Image element. */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode a frame image.'))
    img.src = dataUrl
  })
}

/**
 * Output size: scale so the longest edge equals `maxEdge` (never upscaling).
 * When `even` (required by H.264), round each dimension down to a multiple of 2.
 */
export function scaledSize(
  img: HTMLImageElement,
  maxEdge: number,
  even: boolean,
): { width: number; height: number } {
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  let width = Math.max(1, Math.round(srcW * scale))
  let height = Math.max(1, Math.round(srcH * scale))
  if (even) {
    width = Math.max(2, width - (width % 2))
    height = Math.max(2, height - (height % 2))
  }
  return { width, height }
}

/**
 * Draw an image into a fresh 2D canvas of exactly width×height, over a solid
 * background. (GIF and H.264 have no partial alpha, so transparent → white.)
 */
export function drawToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  background: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not get a 2D canvas context.')
  ctx.fillStyle = background === 'transparent' ? '#ffffff' : background
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

/** GIF sink: each frame gets its own 256-color palette so colors stay crisp. */
export function createGifSink(delayMs: number): FrameSink {
  const gif = GIFEncoder()
  return {
    addFrame(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Could not read frame pixels.')
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, width, height, { palette, delay: delayMs })
    },
    async finish() {
      gif.finish()
      return new Blob([gif.bytes().slice()], { type: 'image/gif' })
    },
  }
}

/** MP4 sink: H.264 via the WebCodecs VideoEncoder, muxed by mp4-muxer. */
export async function createMp4Sink(
  width: number,
  height: number,
  fps: number,
): Promise<FrameSink> {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error(
      'MP4 export needs a Chromium-based browser (Chrome or Edge). Use GIF instead.',
    )
  }

  // Pick the first H.264 profile/level the browser will encode at this size.
  const candidates = ['avc1.4d0028', 'avc1.640028', 'avc1.42e01e']
  let codec = ''
  for (const c of candidates) {
    const support = await VideoEncoder.isConfigSupported({
      codec: c,
      width,
      height,
      bitrate: 5_000_000,
      framerate: fps,
    })
    if (support.supported) {
      codec = c
      break
    }
  }
  if (!codec) {
    throw new Error('No supported H.264 configuration for this size. Try a smaller size or GIF.')
  }

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  })
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  })
  // Generous bitrate: full-frame rotation means every pixel changes each frame,
  // so a high bits-per-pixel keeps the structure crisp (floor 4 Mbps so even
  // small sizes look sharp). Still far smaller than the equivalent GIF.
  const bitrate = Math.min(24_000_000, Math.max(4_000_000, Math.round(width * height * fps * 0.4)))
  encoder.configure({ codec, width, height, bitrate, framerate: fps })
  const frameDurationUs = Math.round(1_000_000 / fps)

  return {
    addFrame(canvas, index) {
      const frame = new VideoFrame(canvas, {
        timestamp: index * frameDurationUs,
        duration: frameDurationUs,
      })
      encoder.encode(frame, { keyFrame: index % fps === 0 })
      frame.close()
    },
    async finish() {
      await encoder.flush()
      muxer.finalize()
      encoder.close()
      return new Blob([target.buffer], { type: 'video/mp4' })
    },
  }
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
