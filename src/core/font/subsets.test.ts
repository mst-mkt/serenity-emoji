import { describe, expect, it } from 'vite-plus/test'

import type { DotGrid } from '../dot-grid'
import { rgba } from '../fixtures'
import {
  manifestOf,
  selectByCodePoints,
  selectByRange,
  splitBySubset,
  toUnicodeRange,
} from './subsets'

const cell: DotGrid = [[rgba(255, 0, 0)]]

describe('splitBySubset', () => {
  it('buckets single-codepoint emoji by their Unicode group and keeps sequences in full', () => {
    const grids = new Map<string, DotGrid>([
      ['U+1F600', cell], // 😀 smileys-emotion
      ['U+1F436', cell], // 🐶 animals-nature
      ['U+2764_U+FE0F', cell], // ❤️ -> base 2764 smileys-emotion
      ['U+2764_U+FE0F_U+200D_U+1F525', cell], // ❤️‍🔥 sequence -> full only
    ])

    const buckets = splitBySubset(grids)

    expect([...buckets.keys()].toSorted()).toEqual(['animals-nature', 'smileys-emotion'])
    const smileys = buckets.get('smileys-emotion') ?? new Map<string, DotGrid>()
    expect([...smileys.keys()].toSorted()).toEqual(['U+1F600', 'U+2764_U+FE0F'])
  })

  it('skips codepoints that are not RGI emoji', () => {
    const grids = new Map<string, DotGrid>([['U+3042', cell]]) // あ

    const buckets = splitBySubset(grids)

    expect(buckets.size).toBe(0)
  })
})

describe('selectByRange', () => {
  it('keeps single-codepoint emoji within the span and drops sequences', () => {
    const grids = new Map<string, DotGrid>([
      ['U+1F600', cell], // 😀 in span
      ['U+1F436', cell], // 🐶 out of span
      ['U+2764_U+FE0F', cell], // ❤️ base 2764 out of span
      ['U+1F600_U+200D_U+1F525', cell], // sequence -> excluded
    ])

    const selected = selectByRange(grids, { min: 0x1f5ff, max: 0x1f64f })

    expect([...selected.keys()]).toEqual(['U+1F600'])
  })
})

describe('selectByCodePoints', () => {
  it('keeps single-codepoint emoji whose base is in the set', () => {
    const grids = new Map<string, DotGrid>([
      ['U+1F600', cell],
      ['U+2764_U+FE0F', cell], // base 2764 after dropping the selector
      ['U+1F436', cell],
    ])

    const selected = selectByCodePoints(grids, new Set([0x1f600, 0x2764]))

    expect([...selected.keys()].toSorted()).toEqual(['U+1F600', 'U+2764_U+FE0F'])
  })
})

describe('toUnicodeRange', () => {
  it('compresses consecutive codepoints into ranges', () => {
    const range = toUnicodeRange([0x1f600, 0x1f601, 0x1f602, 0x1f680])

    expect(range).toBe('U+1F600-1F602, U+1F680')
  })

  it('returns an empty string for no codepoints', () => {
    expect(toUnicodeRange([])).toBe('')
  })
})

describe('manifestOf', () => {
  it('lists subsets sorted by name with their unicode-range', () => {
    const grids = new Map<string, DotGrid>([
      ['U+1F436', cell], // 🐶 animals-nature
      ['U+1F600', cell], // 😀 smileys-emotion
    ])

    const manifest = manifestOf(splitBySubset(grids))

    expect(manifest).toEqual([
      { subset: 'animals-nature', range: 'U+1F436' },
      { subset: 'smileys-emotion', range: 'U+1F600' },
    ])
  })
})
