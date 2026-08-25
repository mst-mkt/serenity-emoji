import type { DotGrid } from '@serenity-emoji/image/dot-grid'
import { rgba } from '@serenity-emoji/image/test/fixtures'
import { describe, expect, it } from 'vite-plus/test'

import { planFont } from './plan'

const RED = rgba(255, 0, 0)
const BLUE = rgba(0, 0, 255)

const dot = (color = RED): DotGrid => [[color]]
const bicolor: DotGrid = [[RED, BLUE]]

describe('planFont', () => {
  it('maps single codepoint stems through cmap to their base glyph', () => {
    const grids = new Map([['U+1F600', dot()]])

    const plan = planFont(grids)

    expect(plan.cmap.get(0x1f600)).toBe(1)
    expect(plan.ligatures).toEqual([])
    expect(plan.glyphs).toHaveLength(3)
  })

  it('reserves glyph 0 as an empty notdef', () => {
    const grids = new Map([['U+1F600', dot()]])

    const plan = planFont(grids)

    expect(plan.glyphs.at(0)).toEqual({ advance: 512, rects: [] })
  })

  it('builds ligatures with zero-advance glyphs for sequence-only codepoints', () => {
    const grids = new Map([
      ['U+1F468', dot()],
      ['U+1F468_U+200D_U+1F469', dot(BLUE)],
    ])

    const plan = planFont(grids)

    expect(plan.cmap.get(0x1f468)).toBe(1)
    expect(plan.cmap.get(0x200d)).toBe(3)
    expect(plan.cmap.get(0x1f469)).toBe(4)
    expect(plan.ligatures).toEqual([{ components: [1, 3, 4], glyph: 2 }])
    expect(plan.glyphs.at(3)?.advance).toBe(0)
    expect(plan.maxContext).toBe(3)
  })

  it('adds a variation selector stripped ligature variant', () => {
    const grids = new Map([['U+2764_U+FE0F_U+200D_U+1F525', dot()]])

    const plan = planFont(grids)

    const lengths = plan.ligatures.map(({ components }) => components.length)
    expect(lengths.toSorted((a, b) => a - b)).toEqual([3, 4])
    expect(new Set(plan.ligatures.map(({ glyph }) => glyph))).toEqual(new Set([1]))
  })

  it('maps a stripped single codepoint variant through cmap', () => {
    const grids = new Map([['U+263A_U+FE0F', dot()]])

    const plan = planFont(grids)

    expect(plan.cmap.get(0x263a)).toBe(1)
    expect(plan.ligatures).toHaveLength(1)
  })

  it('excludes stems containing ascii codepoints', () => {
    const grids = new Map([
      ['U+1F600', dot()],
      ['U+23_U+FE0F_U+20E3', dot(BLUE)],
    ])

    const plan = planFont(grids)

    expect(plan.cmap.has(0x23)).toBe(false)
    expect(plan.glyphs).toHaveLength(3)
  })

  it('shares palette entries across glyphs', () => {
    const grids = new Map([
      ['U+1F600', dot()],
      ['U+1F601', dot()],
    ])

    const plan = planFont(grids)

    expect(plan.palette).toEqual([RED])
    expect(plan.colorBases).toEqual([
      { glyph: 1, layers: [{ glyph: 3, palette: 0 }] },
      { glyph: 2, layers: [{ glyph: 4, palette: 0 }] },
    ])
  })

  it('offsets color layer glyphs per base glyph in palette order', () => {
    const grids = new Map([
      ['U+1F600', bicolor],
      ['U+1F601', dot()],
    ])

    const plan = planFont(grids)

    expect(plan.palette).toEqual([BLUE, RED])
    expect(plan.colorBases).toEqual([
      {
        glyph: 1,
        layers: [
          { glyph: 3, palette: 0 },
          { glyph: 4, palette: 1 },
        ],
      },
      { glyph: 2, layers: [{ glyph: 5, palette: 1 }] },
    ])
  })

  it('keeps the standalone glyph when a vs16 variant strips to its codepoint', () => {
    const grids = new Map([
      ['U+263A', dot()],
      ['U+263A_U+FE0F', dot(BLUE)],
    ])

    const plan = planFont(grids)

    expect(plan.cmap.get(0x263a)).toBe(1)
    expect(plan.ligatures).toEqual([{ components: [1, 3], glyph: 2 }])
  })

  it('keeps the first sequence when a stripped variant collides with it', () => {
    const grids = new Map([
      ['U+1F468_U+200D_U+1F469', dot()],
      ['U+1F468_U+FE0F_U+200D_U+1F469', dot(BLUE)],
    ])

    const plan = planFont(grids)

    const threeComponent = plan.ligatures.filter(({ components }) => components.length === 3)
    expect(threeComponent).toEqual([{ components: [5, 3, 6], glyph: 1 }])
  })

  it('throws when no glyphs remain', () => {
    const grids = new Map([['U+23_U+20E3', dot()]])

    expect(() => planFont(grids)).toThrow('cannot plan a font with no glyphs')
  })
})
