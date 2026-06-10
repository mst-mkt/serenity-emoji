import { crc32 } from './decode/bytes.ts'
import { SIGNATURE } from './decode/chunks.ts'

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]

// shared test fixture: a 9x10 depth-2 palette png with tRNS transparency
export const HEART =
  'iVBORw0KGgoAAAANSUhEUgAAAAkAAAAKAgMAAAAba5wtAAAAAXNSR0IArs4c6QAAAAlQTFRFAAAA9DQ09EtLZsYWpQAAAAF0Uk5TAEDm2GYAAAArSURBVAjXY2AAAi0tBoapUx0YZoY6MMwC4qlArBrKwMAZwsDAFABU0MAAAJJXBu8N62ehAAAAAElFTkSuQmCC'

export const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.codePointAt(0) ?? 0)

export const rgba = (r: number, g: number, b: number, a = 255) => ({ r, g, b, a })

export const deflate = async (data: number[]) => {
  const stream = new Response(new Uint8Array(data)).body?.pipeThrough(
    new CompressionStream('deflate'),
  )
  return new Uint8Array(await new Response(stream).arrayBuffer())
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
