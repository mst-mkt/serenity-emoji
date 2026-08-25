import { describe, expect, it } from 'vite-plus/test'

import { deflate } from '../test/fixtures'
import { toScanlines } from './scanlines'

const meta = { width: 2, height: 2, depth: 8, channels: 1 }

const plain = (lines: Uint8Array[]) => lines.map((line) => [...line])

describe('toScanlines', () => {
  it('keeps raw values for filter 0 (None)', async () => {
    const idat = await deflate([0, 10, 20, 0, 30, 40])

    const lines = await toScanlines(idat, meta)

    expect(plain(lines)).toEqual([
      [10, 20],
      [30, 40],
    ])
  })

  it('adds the left byte for filter 1 (Sub)', async () => {
    const idat = await deflate([1, 10, 5])

    const lines = await toScanlines(idat, { ...meta, height: 1 })

    expect(plain(lines)).toEqual([[10, 15]])
  })

  it('offsets Sub by whole pixels for multi-byte pixels', async () => {
    const idat = await deflate([1, 10, 20, 30, 40, 5, 6, 7, 8])

    const lines = await toScanlines(idat, { width: 2, height: 1, depth: 8, channels: 4 })

    expect(plain(lines)).toEqual([[10, 20, 30, 40, 15, 26, 37, 48]])
  })

  it('adds the up byte for filter 2 (Up)', async () => {
    const idat = await deflate([0, 10, 20, 2, 1, 2])

    const lines = await toScanlines(idat, meta)

    expect(plain(lines)).toEqual([
      [10, 20],
      [11, 22],
    ])
  })

  it('adds the average of left and up for filter 3 (Average)', async () => {
    const idat = await deflate([0, 10, 20, 3, 0, 0])

    const lines = await toScanlines(idat, meta)

    expect(plain(lines)).toEqual([
      [10, 20],
      [5, 12],
    ])
  })

  it('adds the prediction for filter 4 (Paeth)', async () => {
    const idat = await deflate([0, 10, 20, 4, 0, 0])

    const lines = await toScanlines(idat, meta)

    expect(plain(lines)).toEqual([
      [10, 20],
      [10, 20],
    ])
  })

  it('picks left when it is the best Paeth prediction', async () => {
    const idat = await deflate([0, 10, 10, 4, 40, 0])

    const lines = await toScanlines(idat, meta)

    expect(plain(lines)).toEqual([
      [10, 10],
      [50, 50],
    ])
  })

  it('picks up-left when it is the best Paeth prediction', async () => {
    const idat = await deflate([0, 15, 30, 4, 241, 5])

    const lines = await toScanlines(idat, meta)

    expect(plain(lines)).toEqual([
      [15, 30],
      [0, 20],
    ])
  })

  it('wraps additions at 256', async () => {
    const idat = await deflate([1, 200, 100])

    const lines = await toScanlines(idat, { ...meta, height: 1 })

    expect(plain(lines)).toEqual([[200, 44]])
  })

  it('throws on unknown filter types', async () => {
    const idat = await deflate([7, 10, 20])

    const result = toScanlines(idat, { ...meta, height: 1 })

    await expect(result).rejects.toThrow('unknown filter type 7')
  })

  it('throws on corrupt zlib data', async () => {
    const garbage = Uint8Array.from([1, 2, 3, 4]) as Uint8Array<ArrayBuffer>

    const result = toScanlines(garbage, meta)

    await expect(result).rejects.toThrow('corrupt zlib stream')
  })

  it('throws on truncated image data', async () => {
    const idat = await deflate([0, 1])

    const result = toScanlines(idat, { ...meta, height: 5 })

    await expect(result).rejects.toThrow('truncated')
  })

  it('throws on surplus data beyond the declared dimensions', async () => {
    const idat = await deflate([0, 10, 20, 0, 30, 40, 0, 50, 60])

    const result = toScanlines(idat, meta)

    await expect(result).rejects.toThrow('exceeds expected size')
  })

  it('throws on a deflate bomb declared as a tiny image', async () => {
    const bomb = await deflate(Array.from({ length: 1024 * 1024 }, () => 0))

    const result = toScanlines(bomb, { width: 1, height: 1, depth: 8, channels: 1 })

    await expect(result).rejects.toThrow('exceeds expected size')
  })
})
