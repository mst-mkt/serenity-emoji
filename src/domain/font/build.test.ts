import { describe, expect, it } from 'vite-plus/test'

import { rgba, tagAt, u16At, u32At } from '../../test/fixtures'
import type { DotGrid } from '../dot-grid'
import { buildFonts } from './build'
import { checksum } from './write'

const RED = rgba(255, 0, 0)
const BLUE = rgba(0, 0, 255)
const NONE = rgba(0, 0, 0, 0)

const grids = () => {
  return new Map<string, DotGrid>([
    ['U+1F600', [[RED]]],
    [
      'U+2764_U+FE0F_U+200D_U+1F525',
      [
        [BLUE, BLUE],
        [NONE, BLUE],
      ],
    ],
  ])
}

const directoryOf = (font: Uint8Array) => {
  return new Map(
    [...Array(u16At(font, 4))].map((_, index) => [
      tagAt(font, 12 + index * 16),
      u32At(font, 12 + index * 16 + 8),
    ]),
  )
}

describe('buildFonts', () => {
  it('assembles every required table', async () => {
    const { ttf } = await buildFonts(grids())

    const tags = directoryOf(ttf).keys().toArray()
    expect(tags).toEqual([
      'COLR',
      'CPAL',
      'GSUB',
      'OS/2',
      'cmap',
      'glyf',
      'head',
      'hhea',
      'hmtx',
      'loca',
      'maxp',
      'name',
      'post',
    ])
  })

  it('produces a ttf that checksums to the magic constant', async () => {
    const { ttf } = await buildFonts(grids())

    expect(u32At(ttf, 0)).toBe(0x00010000)
    expect(checksum(ttf)).toBe(0xb1b0afba)
  })

  it('writes the head magic number', async () => {
    const { ttf } = await buildFonts(grids())

    const head = directoryOf(ttf).get('head') ?? 0
    expect(u32At(ttf, head + 12)).toBe(0x5f0f3cf5)
  })

  it('packages the same tables as a woff', async () => {
    const { ttf, woff } = await buildFonts(grids())

    expect(tagAt(woff, 0)).toBe('wOFF')
    expect(u16At(woff, 12)).toBe(u16At(ttf, 4))
    expect(u32At(woff, 16)).toBe(ttf.length)
  })

  it('builds identical bytes regardless of input order', async () => {
    const reversed = new Map([...grids()].toReversed())

    const fonts = await buildFonts(grids())
    const other = await buildFonts(reversed)

    expect(other.ttf).toEqual(fonts.ttf)
    expect(other.woff).toEqual(fonts.woff)
  })
})
