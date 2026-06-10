import type { Rgba } from '../dot-grid.ts'

type PixelMeta = {
  width: number
  depth: number
  channels: number
  palette: number[][] | undefined
  transparencyKey: number[] | undefined
}

type Reader = (line: Uint8Array, x: number) => Rgba

const CHANNEL_COUNTS = [1, 2, 3, 4] as const

type ChannelCount = (typeof CHANNEL_COUNTS)[number]

const isChannelCount = (n: number): n is ChannelCount => CHANNEL_COUNTS.some((count) => count === n)

// convert unfiltered byte rows into pixels
export const toPixels = (meta: PixelMeta, lines: Uint8Array[]) => {
  const { width, depth, channels, palette, transparencyKey } = meta

  // multi-channel readers index whole bytes, so they need depth 8
  const readsWholeBytes = channels === 1 || depth === 8

  if (!isChannelCount(channels)) throw new Error(`unsupported png: ${channels} channels`)
  if (!readsWholeBytes) {
    throw new Error(`unsupported png: bit depth ${depth} for ${channels} channels`)
  }

  const mask = (1 << depth) - 1

  // read the x-th sample for channels = 1; sub-byte samples pack MSB-first
  const sample = (line: Uint8Array, x: number) => {
    const bitOffset = x * depth
    const shift = 8 - depth - (bitOffset & 7)
    return ((line.at(bitOffset >> 3) ?? 0) >> shift) & mask
  }

  // without tRNS the key samples are undefined and never match
  const [keyR, keyG, keyB] = transparencyKey ?? []

  // convert palette entries up front so palette pixels share one Rgba per entry
  const paletteRgba = palette?.map(([r = 0, g = 0, b = 0, a = 255]) => ({ r, g, b, a }))

  const fromPalette = (line: Uint8Array, x: number) => {
    const index = sample(line, x)
    const entry = paletteRgba?.at(index)
    if (entry === undefined) throw new Error(`invalid png: palette index ${index} out of range`)
    return entry
  }

  const fromGray = (line: Uint8Array, x: number) => {
    const raw = sample(line, x)
    const value = Math.round((raw * 255) / mask)
    return { r: value, g: value, b: value, a: raw === keyR ? 0 : 255 }
  }

  const fromGrayAlpha = (line: Uint8Array, x: number) => {
    const value = line.at(x * 2) ?? 0
    return { r: value, g: value, b: value, a: line.at(x * 2 + 1) ?? 0 }
  }

  const fromRgb = (line: Uint8Array, x: number) => {
    const r = line.at(x * 3) ?? 0
    const g = line.at(x * 3 + 1) ?? 0
    const b = line.at(x * 3 + 2) ?? 0
    return { r, g, b, a: r === keyR && g === keyG && b === keyB ? 0 : 255 }
  }

  const fromRgba = (line: Uint8Array, x: number) => ({
    r: line.at(x * 4) ?? 0,
    g: line.at(x * 4 + 1) ?? 0,
    b: line.at(x * 4 + 2) ?? 0,
    a: line.at(x * 4 + 3) ?? 0,
  })

  const readers = {
    1: fromGray,
    2: fromGrayAlpha,
    3: fromRgb,
    4: fromRgba,
  } as const satisfies Record<ChannelCount, Reader>

  // pick the reader once, outside the pixel loop
  const rgbaAt = paletteRgba ? fromPalette : readers[channels]

  return lines.map((line) => [...Array(width)].map((_, x) => rgbaAt(line, x)))
}
