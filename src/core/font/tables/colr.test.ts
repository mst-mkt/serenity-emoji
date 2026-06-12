import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../fixtures'
import { buildColr, buildCpal } from './colr'

describe('buildColr', () => {
  it('indexes layer records per base glyph', () => {
    const bases = [
      {
        glyph: 1,
        layers: [
          { glyph: 3, palette: 0 },
          { glyph: 4, palette: 1 },
        ],
      },
      { glyph: 2, layers: [{ glyph: 5, palette: 0 }] },
    ]

    const colr = buildColr(bases)

    expect([...colr]).toEqual([
      0,
      0, // version
      0,
      2, // base glyph record count
      0,
      0,
      0,
      14, // base records offset
      0,
      0,
      0,
      26, // layer records offset
      0,
      3, // layer record count
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      2,
      0,
      2,
      0,
      1,
      0,
      3,
      0,
      0,
      0,
      4,
      0,
      1,
      0,
      5,
      0,
      0,
    ])
  })
})

describe('buildCpal', () => {
  it('stores one palette of bgra records', () => {
    const palette = [rgba(255, 0, 0), rgba(0, 0, 255, 128)]

    const cpal = buildCpal(palette)

    expect([...cpal]).toEqual([
      0,
      0, // version
      0,
      2, // palette entry count
      0,
      1, // palette count
      0,
      2, // color record count
      0,
      0,
      0,
      14, // records offset
      0,
      0, // first palette index
      0,
      0,
      255,
      255,
      255,
      0,
      0,
      128,
    ])
  })
})
