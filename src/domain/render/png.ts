import { concat, crc32, u32 } from '@serenity-emoji/lib/bytes'
import { deflate } from '@serenity-emoji/lib/zlib'

import { pngTextRecords } from '../attribution'
import type { DotGrid, Rgba } from '../dot-grid'
import { SIGNATURE } from '../image/decode/chunks'
import { dimensionsOf, scaleToFit, type SizeOptions } from '../image/scale'

const chunk = (type: string, data: Uint8Array) => {
  const body = concat([new TextEncoder().encode(type), data])
  return concat([u32(data.length), body, u32(crc32(body))])
}

// tEXt stores Latin-1; the records here are ascii, so utf-8 bytes match
const textChunk = (keyword: string, value: string) => {
  const encoder = new TextEncoder()
  const data = concat([encoder.encode(keyword), Uint8Array.from([0]), encoder.encode(value)])
  return chunk('tEXt', data)
}

// 8-bit RGBA (color type 6), no interlace
const ihdr = (width: number, height: number) =>
  chunk('IHDR', Uint8Array.from([...u32(width), ...u32(height), 8, 6, 0, 0, 0]))

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
  const metadata = pngTextRecords().map(([keyword, value]) => textChunk(keyword, value))

  return concat([
    Uint8Array.from(SIGNATURE),
    ihdr(width, height),
    chunk('IDAT', idat),
    ...metadata,
    chunk('IEND', new Uint8Array(0)),
  ])
}
