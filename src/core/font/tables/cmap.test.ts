import { describe, expect, it } from 'vite-plus/test'

import { u16At, u32At } from '../../fixtures'
import { buildCmap } from './cmap'

describe('buildCmap', () => {
  it('writes windows bmp and full repertoire subtable records', () => {
    const cmap = new Map([[0x41, 1]])

    const table = buildCmap(cmap)

    expect(u16At(table, 0)).toBe(0)
    expect(u16At(table, 2)).toBe(2)
    expect([u16At(table, 4), u16At(table, 6)]).toEqual([3, 1])
    expect([u16At(table, 12), u16At(table, 14)]).toEqual([3, 10])
    expect(u32At(table, 8)).toBe(20)
  })

  it('groups consecutive codepoints with consecutive glyphs in format 12', () => {
    const cmap = new Map([
      [0x41, 1],
      [0x42, 2],
      [0x1f600, 3],
    ])

    const table = buildCmap(cmap)

    const sub12 = u32At(table, 16)
    expect(u16At(table, sub12)).toBe(12)
    expect(u32At(table, sub12 + 12)).toBe(2)
    expect(u32At(table, sub12 + 16)).toBe(0x41)
    expect(u32At(table, sub12 + 20)).toBe(0x42)
    expect(u32At(table, sub12 + 24)).toBe(1)
    expect(u32At(table, sub12 + 28)).toBe(0x1f600)
    expect(u32At(table, sub12 + 32)).toBe(0x1f600)
    expect(u32At(table, sub12 + 36)).toBe(3)
  })

  it('writes format 4 segments resolvable through the glyph id array', () => {
    const cmap = new Map([
      [0x41, 1],
      [0x42, 2],
      [0x1f600, 3],
    ])

    const table = buildCmap(cmap)

    const sub4 = u32At(table, 8)
    const segCount = u16At(table, sub4 + 6) / 2
    expect(u16At(table, sub4)).toBe(4)
    expect(segCount).toBe(2)

    const endCodes = sub4 + 14
    const startCodes = endCodes + segCount * 2 + 2
    const idRangeOffsets = startCodes + segCount * 4
    expect([u16At(table, endCodes), u16At(table, endCodes + 2)]).toEqual([0x42, 0xffff])
    expect(u16At(table, startCodes)).toBe(0x41)

    const segment = 0
    const codePoint = 0x42
    const target =
      idRangeOffsets +
      segment * 2 +
      u16At(table, idRangeOffsets + segment * 2) +
      (codePoint - u16At(table, startCodes + segment * 2)) * 2
    expect(u16At(table, target)).toBe(2)
  })
})
