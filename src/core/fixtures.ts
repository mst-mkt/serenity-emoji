import { crc32 } from './decode/bytes'
import { SIGNATURE } from './decode/chunks'
import { deflate as deflateBytes } from './zlib'

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]

// shared test fixture: a 9x10 depth-2 palette png with tRNS transparency
export const HEART =
  'iVBORw0KGgoAAAANSUhEUgAAAAkAAAAKAgMAAAAba5wtAAAAAXNSR0IArs4c6QAAAAlQTFRFAAAA9DQ09EtLZsYWpQAAAAF0Uk5TAEDm2GYAAAArSURBVAjXY2AAAi0tBoapUx0YZoY6MMwC4qlArBrKwMAZwsDAFABU0MAAAJJXBu8N62ehAAAAAElFTkSuQmCC'

export const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.codePointAt(0) ?? 0)

export const rgba = (r: number, g: number, b: number, a = 255) => ({ r, g, b, a })

export const deflate = (data: number[]) => deflateBytes(Uint8Array.from(data))

export const inflate = async (data: Uint8Array) => {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))
  const original = await new Response(stream).arrayBuffer()

  return new Uint8Array(original)
}

export const chunk = (type: string, data: number[]) => {
  const body = [...new TextEncoder().encode(type), ...data]
  return [...u32(data.length), ...body, ...u32(crc32(Uint8Array.from(body)))]
}

export const ihdr = ({
  width = 1,
  height = 1,
  depth = 8,
  colorType = 6,
  compression = 0,
  filter = 0,
  interlace = 0,
}) =>
  chunk('IHDR', [...u32(width), ...u32(height), depth, colorType, compression, filter, interlace])

export const png = (...parts: number[][]) => Uint8Array.from([...SIGNATURE, ...parts.flat()])

export const u16At = (data: Uint8Array, offset: number) =>
  ((data.at(offset) ?? 0) << 8) | (data.at(offset + 1) ?? 0)

export const u32At = (data: Uint8Array, offset: number) =>
  u16At(data, offset) * 0x10000 + u16At(data, offset + 2)

export const tagAt = (data: Uint8Array, offset: number) =>
  String.fromCharCode(...data.subarray(offset, offset + 4))
