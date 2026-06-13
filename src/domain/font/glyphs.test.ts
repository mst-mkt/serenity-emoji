import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { toGlyph } from './glyphs'

const RED = rgba(255, 0, 0)
const BLUE = rgba(0, 0, 255)
const NONE = rgba(0, 0, 0, 0)

describe('toGlyph', () => {
  it('scales square art to fill the em square', () => {
    const grid = [
      [RED, RED],
      [BLUE, NONE],
    ]

    const glyph = toGlyph(grid)

    expect(glyph.advance).toBe(1024)
    expect(glyph.silhouette).toEqual([
      { xMin: 0, xMax: 1024, yMin: 388, yMax: 900 },
      { xMin: 0, xMax: 512, yMin: -124, yMax: 388 },
    ])
  })

  it('centers tall art horizontally with a uniform advance', () => {
    const grid = [[RED], [BLUE]]

    const glyph = toGlyph(grid)

    expect(glyph.advance).toBe(1024)
    expect(glyph.silhouette).toEqual([
      { xMin: 256, xMax: 768, yMin: 388, yMax: 900 },
      { xMin: 256, xMax: 768, yMin: -124, yMax: 388 },
    ])
  })

  it('centers wide art vertically', () => {
    const grid = [[RED, BLUE]]

    const glyph = toGlyph(grid)

    expect(glyph.silhouette).toEqual([{ xMin: 0, xMax: 1024, yMin: 132, yMax: 644 }])
  })

  it('merges colors in the silhouette but splits them into layers', () => {
    const grid = [[RED, BLUE]]

    const glyph = toGlyph(grid)

    expect(glyph.silhouette).toHaveLength(1)
    expect(glyph.layers).toHaveLength(2)
  })

  it('orders layers by color for deterministic output', () => {
    const grid = [[RED, BLUE]]

    const glyph = toGlyph(grid)

    expect(glyph.layers.map(({ color }) => color)).toEqual([BLUE, RED])
  })

  it('throws on an empty grid', () => {
    expect(() => toGlyph([])).toThrow('cannot build a glyph from an empty grid')
  })
})
