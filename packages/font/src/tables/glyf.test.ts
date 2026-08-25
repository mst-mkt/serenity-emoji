import { describe, expect, it } from 'vite-plus/test'

import { buildGlyf } from './glyf'

describe('buildGlyf', () => {
  it('encodes empty glyphs as zero-length loca ranges', () => {
    const { glyf, loca, bounds } = buildGlyf([{ rects: [] }])

    expect(glyf).toHaveLength(0)
    expect([...loca]).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(bounds).toEqual([null])
  })

  it('encodes a rect as one clockwise contour', () => {
    const rect = { xMin: 0, yMin: 0, xMax: 10, yMax: 20 }

    const { glyf, loca, bounds } = buildGlyf([{ rects: [rect] }])

    expect([...glyf.subarray(0, 22)]).toEqual([
      0,
      1, // one contour
      0,
      0,
      0,
      0,
      0,
      10,
      0,
      20, // bbox
      0,
      3, // end point index
      0,
      0, // no instructions
      0x35,
      0x33,
      0x15,
      0x23, // point flags
      10,
      10, // x deltas
      20,
      20, // y deltas
    ])
    expect([...loca]).toEqual([0, 0, 0, 0, 0, 0, 0, 24])
    expect(bounds).toEqual([rect])
  })

  it('accumulates loca offsets across glyphs', () => {
    const rect = { xMin: 0, yMin: 0, xMax: 10, yMax: 20 }

    const { loca } = buildGlyf([{ rects: [rect] }, { rects: [] }, { rects: [rect] }])

    expect([...loca]).toEqual([0, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 48])
  })
})
