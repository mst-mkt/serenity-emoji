import { describe, expect, it } from 'vite-plus/test'

import { chunk, fromBase64, HEART, ihdr, png } from '../test/fixtures'
import { parseChunks, SIGNATURE } from './chunks'

const heart = fromBase64(HEART)

describe('parseChunks', () => {
  it('reads size and format from IHDR', () => {
    const parsed = parseChunks(heart)

    expect(parsed.width).toBe(9)
    expect(parsed.height).toBe(10)
    expect(parsed.depth).toBe(2)
    expect(parsed.channels).toBe(1)
  })

  it('merges PLTE and tRNS into a palette', () => {
    const { palette } = parseChunks(heart)

    expect(palette).toEqual([
      [0, 0, 0, 0],
      [244, 52, 52, 255],
      [244, 75, 75, 255],
    ])
  })

  it('concats IDAT chunks', () => {
    const { idat } = parseChunks(heart)

    expect(idat.length).toBeGreaterThan(0)
  })

  it('ignores suggested palettes on truecolor', () => {
    const truecolor = png(ihdr({}), chunk('PLTE', [1, 2, 3]), chunk('IDAT', [0]), chunk('IEND', []))

    const parsed = parseChunks(truecolor)

    expect(parsed.palette).toBeUndefined()
  })

  it('reads type 2 tRNS as a transparency key', () => {
    const keyed = png(
      ihdr({ colorType: 2 }),
      chunk('tRNS', [0, 255, 0, 128, 0, 64]),
      chunk('IDAT', [0]),
      chunk('IEND', []),
    )

    const parsed = parseChunks(keyed)

    expect(parsed.transparencyKey).toEqual([255, 128, 64])
  })

  it('throws on a bad signature', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html>')

    expect(() => parseChunks(html)).toThrow('bad signature')
  })

  it('throws on interlaced PNGs', () => {
    const interlaced = png(ihdr({ interlace: 1 }), chunk('IEND', []))

    expect(() => parseChunks(interlaced)).toThrow('interlaced')
  })

  it('throws on bit depth 16', () => {
    const deep = png(ihdr({ depth: 16 }), chunk('IEND', []))

    expect(() => parseChunks(deep)).toThrow('bit depth 16')
  })

  it('throws on a crc mismatch', () => {
    const corrupted = png(ihdr({}), chunk('IEND', []))
    // flip a width byte inside the checksummed IHDR data
    corrupted[16] ^= 0xff

    expect(() => parseChunks(corrupted)).toThrow('crc mismatch in IHDR')
  })

  it('throws on dimensions above the default cap', () => {
    const huge = png(ihdr({ width: 5000 }), chunk('IEND', []))

    expect(() => parseChunks(huge)).toThrow('5000x1 exceeds 4096x4096')
  })

  it('throws on dimensions above the given maxDimension', () => {
    const big = png(ihdr({ height: 600 }), chunk('IEND', []))

    expect(() => parseChunks(big, { maxDimension: 512 })).toThrow('1x600 exceeds 512x512')
  })

  it('throws on sub-byte depths for multi-channel color types', () => {
    const packed = png(ihdr({ depth: 4, colorType: 6 }), chunk('IEND', []))

    expect(() => parseChunks(packed)).toThrow('bit depth 4 for color type 6')
  })

  it('throws on unknown compression methods', () => {
    const lzw = png(ihdr({ compression: 1 }), chunk('IEND', []))

    expect(() => parseChunks(lzw)).toThrow('compression method 1')
  })

  it('throws on unknown filter methods', () => {
    const exotic = png(ihdr({ filter: 1 }), chunk('IEND', []))

    expect(() => parseChunks(exotic)).toThrow('filter method 1')
  })

  it('throws on unknown color types', () => {
    const unknown = png(ihdr({ colorType: 7 }), chunk('IEND', []))

    expect(() => parseChunks(unknown)).toThrow('color type 7')
  })

  it('throws on truncated chunks', () => {
    const lying = Uint8Array.from([
      ...SIGNATURE,
      0,
      0,
      0,
      100,
      ...new TextEncoder().encode('IDAT'),
      1,
    ])

    expect(() => parseChunks(lying)).toThrow('truncated')
  })

  it('throws on too many chunks', () => {
    const fillers = Array.from({ length: 1100 }, () => chunk('tEXt', []))
    const crowded = png(ihdr({}), ...fillers, chunk('IEND', []))

    expect(() => parseChunks(crowded)).toThrow('too many chunks')
  })

  it('throws on a PLTE shorter than one entry', () => {
    const stub = png(
      ihdr({ colorType: 3, depth: 8 }),
      chunk('PLTE', [1, 2]),
      chunk('IDAT', [0]),
      chunk('IEND', []),
    )

    expect(() => parseChunks(stub)).toThrow('PLTE length 2')
  })

  it('throws on a PLTE length that is not a multiple of 3', () => {
    const ragged = png(
      ihdr({ colorType: 3, depth: 8 }),
      chunk('PLTE', [1, 2, 3, 4, 5]),
      chunk('IDAT', [0]),
      chunk('IEND', []),
    )

    expect(() => parseChunks(ragged)).toThrow('PLTE length 5')
  })

  it('throws on an empty tRNS for keyed color types', () => {
    const keyed = png(
      ihdr({ colorType: 2 }),
      chunk('tRNS', []),
      chunk('IDAT', [0]),
      chunk('IEND', []),
    )

    expect(() => parseChunks(keyed)).toThrow('tRNS length 0 for color type 2')
  })

  it('throws on a truncated tRNS key', () => {
    const keyed = png(
      ihdr({ colorType: 0 }),
      chunk('tRNS', [0]),
      chunk('IDAT', [0]),
      chunk('IEND', []),
    )

    expect(() => parseChunks(keyed)).toThrow('tRNS length 1 for color type 0')
  })

  it('throws when IHDR is missing', () => {
    const headless = png(chunk('IDAT', [0]), chunk('IEND', []))

    expect(() => parseChunks(headless)).toThrow('missing IHDR')
  })

  it('throws when IEND is missing', () => {
    const unterminated = png(ihdr({}))

    expect(() => parseChunks(unterminated)).toThrow('missing IEND')
  })

  it('throws when IDAT is missing', () => {
    const empty = png(ihdr({}), chunk('IEND', []))

    expect(() => parseChunks(empty)).toThrow('missing IDAT')
  })
})
