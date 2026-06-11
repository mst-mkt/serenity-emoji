import { concat, crc32 } from '../decode/bytes'
import { SIGNATURE } from '../decode/chunks'
import type { DotGrid, Rgba } from '../dot-grid'
import { dimensionsOf, scaleToFit, type SizeOptions } from './utils/scale'

const u32 = (n: number) => {
  return Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
}

const chunk = (type: string, data: Uint8Array) => {
  const body = concat([new TextEncoder().encode(type), data])
  return concat([u32(data.length), body, u32(crc32(body))])
}

// 8-bit RGBA (color type 6), no interlace
const ihdr = (width: number, height: number) =>
  chunk('IHDR', Uint8Array.from([...u32(width), ...u32(height), 8, 6, 0, 0, 0]))

// zlib deflate via web standard API (works on both Workers and Node)
const deflate = async (data: Uint8Array<ArrayBuffer>) => {
  const stream = new Response(data).body?.pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// filter type None; missing pixels in ragged rows stay transparent
const toScanline = (row: Rgba[], width: number) => {
  const line = new Uint8Array(1 + width * 4)
  row.forEach(({ r, g, b, a }, x) => line.set([r, g, b, a], 1 + x * 4))
  return line
}

export const toPng = async (pixels: DotGrid, options: SizeOptions = {}) => {
  const grid = scaleToFit(pixels, options.size)
  const { width, height } = dimensionsOf(grid)
  if (width === 0 || height === 0) throw new Error('cannot render an empty grid')

  const idat = await deflate(concat(grid.map((row) => toScanline(row, width))))

  return concat([
    Uint8Array.from(SIGNATURE),
    ihdr(width, height),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ])
}
