import { describe, expect, it } from 'vite-plus/test'

import { tagAt, u16At, u32At } from '../../../test/fixtures'
import {
  buildHead,
  buildHhea,
  buildHmtx,
  buildMaxp,
  buildName,
  buildOs2,
  buildPost,
} from './metadata'

const rect = (xMin: number, yMin: number, xMax: number, yMax: number) => ({
  xMin,
  yMin,
  xMax,
  yMax,
})

const i16At = (data: Uint8Array, offset: number) => {
  const unsigned = u16At(data, offset)
  return unsigned >= 0x8000 ? unsigned - 0x10000 : unsigned
}

describe('buildHead', () => {
  it('merges the bounds of visible glyphs', () => {
    const bounds = [rect(100, -50, 600, 700), null, rect(0, 0, 1024, 900)]

    const head = buildHead(bounds)

    expect(head.length).toBe(54)
    expect(u32At(head, 12)).toBe(0x5f0f3cf5)
    expect(u16At(head, 18)).toBe(1024)
    expect(i16At(head, 36)).toBe(0)
    expect(i16At(head, 38)).toBe(-50)
    expect(i16At(head, 40)).toBe(1024)
    expect(i16At(head, 42)).toBe(900)
    expect(i16At(head, 50)).toBe(1)
  })

  it('throws when every glyph is empty', () => {
    const bounds = [null, null]

    expect(() => buildHead(bounds)).toThrow('font: no visible glyphs')
  })
})

describe('buildHhea', () => {
  it('derives extents from glyphs with bounds', () => {
    const glyphs = [
      { advance: 1024, rects: [] },
      { advance: 512, rects: [] },
    ]
    const bounds = [rect(-10, 0, 1100, 900), null]

    const hhea = buildHhea(glyphs, bounds)

    expect(hhea.length).toBe(36)
    expect(i16At(hhea, 4)).toBe(900)
    expect(i16At(hhea, 6)).toBe(-124)
    expect(u16At(hhea, 10)).toBe(1024)
    expect(i16At(hhea, 12)).toBe(-10)
    expect(i16At(hhea, 14)).toBe(-76)
    expect(i16At(hhea, 16)).toBe(1100)
    expect(u16At(hhea, 34)).toBe(2)
  })
})

describe('buildMaxp', () => {
  it('counts glyphs and the densest contour set', () => {
    const glyphs = [
      { advance: 1024, rects: [rect(0, 0, 1, 1), rect(2, 0, 3, 1)] },
      { advance: 1024, rects: [] },
    ]

    const maxp = buildMaxp(glyphs)

    expect(u32At(maxp, 0)).toBe(0x00010000)
    expect(u16At(maxp, 4)).toBe(2)
    expect(u16At(maxp, 6)).toBe(8)
    expect(u16At(maxp, 8)).toBe(2)
  })
})

describe('buildHmtx', () => {
  it('pairs each advance with the left side bearing', () => {
    const glyphs = [
      { advance: 1024, rects: [] },
      { advance: 0, rects: [] },
    ]
    const bounds = [rect(100, 0, 200, 300), null]

    const hmtx = buildHmtx(glyphs, bounds)

    expect([...hmtx]).toEqual([4, 0, 0, 100, 0, 0, 0, 0])
  })
})

describe('buildName', () => {
  it('stores windows unicode records pointing into the string data', () => {
    const name = buildName()

    expect(u16At(name, 0)).toBe(0)
    expect(u16At(name, 2)).toBe(6)
    expect(u16At(name, 4)).toBe(78)
    expect(u16At(name, 6)).toBe(3)
    expect(u16At(name, 8)).toBe(1)
    expect(u16At(name, 10)).toBe(0x0409)
    expect(u16At(name, 12)).toBe(1)
    expect(u16At(name, 14)).toBe('Serenity Emoji'.length * 2)
    expect(u16At(name, 16)).toBe(0)
    expect(u16At(name, 78)).toBe('S'.charCodeAt(0))
  })
})

describe('buildOs2', () => {
  it('summarizes widths, codepoint range and ligature context', () => {
    const glyphs = [
      { advance: 1000, rects: [] },
      { advance: 500, rects: [] },
    ]
    const cmap = new Map([
      [0x1f600, 1],
      [0x2764, 2],
    ])

    const os2 = buildOs2(glyphs, cmap, 4)

    expect(os2.length).toBe(96)
    expect(u16At(os2, 0)).toBe(4)
    expect(i16At(os2, 2)).toBe(750)
    expect(u16At(os2, 4)).toBe(400)
    expect(tagAt(os2, 58)).toBe('SREN')
    expect(u16At(os2, 64)).toBe(0x2764)
    expect(u16At(os2, 66)).toBe(0xffff)
    expect(u16At(os2, 74)).toBe(900)
    expect(u16At(os2, 76)).toBe(124)
    expect(u16At(os2, 94)).toBe(4)
  })
})

describe('buildPost', () => {
  it('declares format 3 with fixed underline metrics', () => {
    const post = buildPost()

    expect([...post]).toEqual([0, 3, 0, 0, 0, 0, 0, 0, 255, 156, 0, 50, ...Array(20).fill(0)])
  })
})
