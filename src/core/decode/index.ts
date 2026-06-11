import { type DecodeOptions, parseChunks } from './chunks'
import { toPixels } from './pixels'
import { toScanlines } from './scanlines'

// PNG bytes -> chunks -> scanlines -> pixels -> DotGrid
export const decodePng = async (bytes: Uint8Array, options: DecodeOptions = {}) => {
  const { width, height, depth, channels, palette, transparencyKey, idat } = parseChunks(
    bytes,
    options,
  )
  const lines = await toScanlines(idat, { width, height, depth, channels })
  return toPixels({ width, depth, channels, palette, transparencyKey }, lines)
}
