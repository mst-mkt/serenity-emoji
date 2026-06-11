import { concat, crc32 } from './bytes'

type Chunk = { type: string; data: Uint8Array }

export type DecodeOptions = { maxDimension?: number }

export const SIGNATURE = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
] as const satisfies readonly number[]

// samples per pixel for each color type
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as const satisfies Record<number, number>

// allowed depths per color type; pixels.ts reads whole-byte samples, so no 16
const DEPTHS = {
  0: [1, 2, 4, 8],
  2: [8],
  3: [1, 2, 4, 8],
  4: [8],
  6: [8],
} as const satisfies Record<keyof typeof CHANNELS, readonly number[]>

// tRNS key offsets for color types 0 and 2 (low byte of each 2-byte sample)
const TRNS_OFFSETS = { 0: [1], 2: [1, 3, 5] } as const satisfies Record<number, readonly number[]>

// caps both malicious inputs and recursion depth
const MAX_CHUNKS = 1024

// default dimension cap: bounds inflate output and pixel allocations against decompression bombs
const MAX_DIMENSION = 4096

const isColorType = (n: number): n is keyof typeof CHANNELS => n in CHANNELS

const hasTransparencyKey = (n: number): n is keyof typeof TRNS_OFFSETS => n in TRNS_OFFSETS

// PLTE must hold 1-256 whole [r, g, b] entries
const isPaletteLength = (length: number) => length > 0 && length <= 768 && length % 3 === 0

// tRNS on a palette may be shorter than the palette; missing entries are opaque
const readPalette = (plte: Uint8Array, trns: Uint8Array | undefined) => {
  if (!isPaletteLength(plte.length)) throw new Error(`invalid png: PLTE length ${plte.length}`)

  return [...Array(plte.length / 3)].map((_, i) => [
    plte.at(i * 3) ?? 0,
    plte.at(i * 3 + 1) ?? 0,
    plte.at(i * 3 + 2) ?? 0,
    trns?.at(i) ?? 255,
  ])
}

// tRNS for the keyed color types carries exactly one 2-byte sample per channel
const readTransparencyKey = (trns: Uint8Array, colorType: keyof typeof TRNS_OFFSETS) => {
  const offsets = TRNS_OFFSETS[colorType]
  if (trns.length !== offsets.length * 2) {
    throw new Error(`invalid png: tRNS length ${trns.length} for color type ${colorType}`)
  }
  return offsets.map((at) => trns.at(at) ?? 0)
}

// read [length(4), type(4), data, crc(4)] chunks until IEND, starting after the 8-byte signature
const readChunks = (bytes: Uint8Array, view: DataView, offset = 8, acc: Chunk[] = []): Chunk[] => {
  if (acc.length >= MAX_CHUNKS) throw new Error('invalid png: too many chunks')
  if (offset + 8 > bytes.length) throw new Error('invalid png: missing IEND')

  const length = view.getUint32(offset)
  const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
  if (offset + 12 + length > bytes.length) throw new Error(`invalid png: truncated ${type} chunk`)

  // the crc covers the type and data fields
  if (
    view.getUint32(offset + 8 + length) !== crc32(bytes.subarray(offset + 4, offset + 8 + length))
  ) {
    throw new Error(`invalid png: crc mismatch in ${type}`)
  }

  acc.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) })
  return type === 'IEND' ? acc : readChunks(bytes, view, offset + 12 + length, acc)
}

// validate the signature and IHDR, accept only supported formats (no interlace, depth <= 8)
export const parseChunks = (bytes: Uint8Array, options: DecodeOptions = {}) => {
  const { maxDimension = MAX_DIMENSION } = options

  if (!SIGNATURE.every((byte, i) => bytes.at(i) === byte)) {
    throw new Error('invalid png: bad signature')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks = readChunks(bytes, view)

  // IHDR data is 13 bytes: width(4), height(4), depth, color type, compression, filter, interlace
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data
  if (ihdr === undefined || ihdr.length < 13) throw new Error('invalid png: missing IHDR')

  const header = new DataView(ihdr.buffer, ihdr.byteOffset, ihdr.byteLength)
  const width = header.getUint32(0)
  const height = header.getUint32(4)
  const depth = ihdr.at(8) ?? 0
  const colorType = ihdr.at(9) ?? 0

  if (width === 0 || height === 0) throw new Error('invalid png: zero dimension')
  if (width > maxDimension || height > maxDimension) {
    throw new Error(`unsupported png: ${width}x${height} exceeds ${maxDimension}x${maxDimension}`)
  }
  if (!isColorType(colorType)) throw new Error(`unsupported png: color type ${colorType}`)
  if (!DEPTHS[colorType].some((allowed) => allowed === depth)) {
    throw new Error(`unsupported png: bit depth ${depth} for color type ${colorType}`)
  }

  // the spec only defines method 0 for both; nonzero values are reserved for future formats
  const compression = ihdr.at(10) ?? 0
  const filterMethod = ihdr.at(11) ?? 0

  if (compression !== 0) throw new Error(`unsupported png: compression method ${compression}`)
  if (filterMethod !== 0) throw new Error(`unsupported png: filter method ${filterMethod}`)
  if ((ihdr.at(12) ?? 0) !== 0) throw new Error('unsupported png: interlaced')

  const channels = CHANNELS[colorType]

  const plte = chunks.find((chunk) => chunk.type === 'PLTE')?.data
  const trns = chunks.find((chunk) => chunk.type === 'tRNS')?.data
  if (colorType === 3 && plte === undefined) throw new Error('invalid png: missing PLTE')

  // PLTE may appear on truecolor as a suggested palette, so use (and validate) it only for type 3
  const palette = colorType === 3 && plte ? readPalette(plte, trns) : undefined

  const transparencyKey =
    trns && hasTransparencyKey(colorType) ? readTransparencyKey(trns, colorType) : undefined

  const idats = chunks.filter((chunk) => chunk.type === 'IDAT')
  if (idats.length === 0) throw new Error('invalid png: missing IDAT')

  const idat = concat(idats.map((chunk) => chunk.data))

  return { width, height, depth, channels, palette, transparencyKey, idat }
}
