import { decodePng } from '@serenity-emoji/image/decode'
import type { DotGrid } from '@serenity-emoji/image/dot-grid'
import { scaleToFit } from '@serenity-emoji/image/scale'
import { rgba, u16At, u32At } from '@serenity-emoji/image/test/fixtures'
import { describe, expect, it } from 'vite-plus/test'

import { buildCbdt, STRIKE_PPEM } from './cbdt'

const RED = rgba(255, 0, 0)
const BLUE = rgba(0, 0, 255)

describe('buildCbdt', () => {
  it('lays out one strike covering the glyph range', async () => {
    const entries = [
      { glyph: 1, grid: [[RED]] },
      { glyph: 2, grid: [[RED], [BLUE]] },
    ]

    const { cblc } = await buildCbdt(entries)

    expect(u16At(cblc, 0)).toBe(3) // major version
    expect(u32At(cblc, 4)).toBe(1) // strike count
    expect(u32At(cblc, 8)).toBe(56) // index subtable array offset
    expect(u16At(cblc, 48)).toBe(1) // start glyph
    expect(u16At(cblc, 50)).toBe(2) // end glyph
    expect(cblc.at(52)).toBe(STRIKE_PPEM) // ppem x
    expect(cblc.at(53)).toBe(STRIKE_PPEM) // ppem y
    expect(cblc.at(54)).toBe(32) // bit depth
    expect(cblc.at(55)).toBe(1) // horizontal metrics flag
  })

  it('writes the strike line metrics from the glyph extents', async () => {
    const entries = [{ glyph: 1, grid: [[RED], [BLUE]] }]

    const { cblc } = await buildCbdt(entries)

    expect(cblc.at(24)).toBe(113) // ascender
    expect(cblc.at(25)).toBe(256 - 15) // descender
    expect(cblc.at(26)).toBe(64) // width max
    expect(cblc.at(30)).toBe(32) // min origin side bearing
    expect(cblc.at(31)).toBe(32) // min advance side bearing
    expect(cblc.at(32)).toBe(113) // max above baseline
    expect(cblc.at(33)).toBe(256 - 15) // min below baseline
  })

  it('indexes glyph records with format 1 offsets', async () => {
    const entries = [
      { glyph: 1, grid: [[RED]] },
      { glyph: 2, grid: [[BLUE]] },
    ]

    const { cblc, cbdt } = await buildCbdt(entries)

    expect(u16At(cblc, 56)).toBe(1) // first glyph
    expect(u16At(cblc, 58)).toBe(2) // last glyph
    expect(u32At(cblc, 60)).toBe(8) // subtable offset within the index tables
    expect(u16At(cblc, 64)).toBe(1) // index format
    expect(u16At(cblc, 66)).toBe(17) // image format
    expect(u32At(cblc, 68)).toBe(4) // image data offset, past the cbdt header
    expect(u32At(cblc, 12)).toBe(cblc.length - 56) // index tables size
    expect(u32At(cblc, 72)).toBe(0)
    expect(u32At(cblc, 76)).toBe(9 + u32At(cbdt, 9)) // first record: 5 metrics + 4 len + png
    expect(u32At(cblc, 80)).toBe(cbdt.length - 4)
  })

  it('encodes centered small metrics with png data that round-trips', async () => {
    const grid: DotGrid = [[RED], [BLUE]]

    const { cbdt } = await buildCbdt([{ glyph: 1, grid }])
    const png = cbdt.subarray(13, 13 + u32At(cbdt, 9))

    expect([...cbdt.subarray(0, 4)]).toEqual([0, 3, 0, 0])
    expect(cbdt.at(4)).toBe(128) // height
    expect(cbdt.at(5)).toBe(64) // width
    expect(cbdt.at(6)).toBe(32) // bearing x
    expect(cbdt.at(7)).toBe(113) // bearing y
    expect(cbdt.at(8)).toBe(STRIKE_PPEM) // advance
    expect(await decodePng(png)).toEqual(scaleToFit(grid, STRIKE_PPEM))
  })

  it('throws on gaps in the glyph ids', async () => {
    const entries = [
      { glyph: 1, grid: [[RED]] },
      { glyph: 3, grid: [[BLUE]] },
    ]

    await expect(buildCbdt(entries)).rejects.toThrow('font: bitmap glyphs must be contiguous')
  })

  it('throws on no glyphs', async () => {
    await expect(buildCbdt([])).rejects.toThrow('font: no bitmap glyphs')
  })
})
