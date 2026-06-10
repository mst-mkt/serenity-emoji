import { describe, expect, it } from 'vite-plus/test'

import { chunk, deflate, fromBase64, HEART, ihdr, png, rgba } from '../fixtures.ts'
import { decodePng } from './index.ts'

const heart = fromBase64(HEART)

describe('decodePng', () => {
  it('decodes a palette PNG with correct size', async () => {
    const grid = await decodePng(heart)

    expect(grid.length).toBe(10)
    expect(grid.every((row) => row.length === 9)).toBe(true)
  })

  it('decodes transparent pixels as alpha 0 and opaque colors as-is', async () => {
    const grid = await decodePng(heart)

    expect(grid.at(0)?.at(0)?.a).toBe(0)
    expect(grid.flat()).toContainEqual(rgba(244, 52, 52))
  })

  it('produces only 0-255 integer channels', async () => {
    const grid = await decodePng(heart)

    const channels = grid.flat().flatMap((p) => [p.r, p.g, p.b, p.a])
    expect(channels.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)).toBe(true)
  })

  it('decodes a Sub-filtered RGBA png end to end', async () => {
    // two scanlines: [filter 0 (None), rgba, rgba] then [filter 1 (Sub), rgba, rgba]
    const idat = await deflate([0, 255, 0, 0, 255, 0, 0, 255, 32, 1, 0, 255, 0, 255, 10, 0, 0, 0])
    const rgbaPng = png(ihdr({ width: 2, height: 2 }), chunk('IDAT', [...idat]), chunk('IEND', []))

    const grid = await decodePng(rgbaPng)

    expect(grid).toEqual([
      [rgba(255, 0, 0), rgba(0, 0, 255, 32)],
      [rgba(0, 255, 0), rgba(10, 255, 0)],
    ])
  })

  it('rejects PNGs larger than the given maxDimension', async () => {
    const result = decodePng(heart, { maxDimension: 8 })

    await expect(result).rejects.toThrow('exceeds 8x8')
  })

  it('rejects non-PNG bytes', async () => {
    const html = new TextEncoder().encode('<!DOCTYPE html>')

    const result = decodePng(html)

    await expect(result).rejects.toThrow('bad signature')
  })
})
