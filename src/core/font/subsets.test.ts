import { describe, expect, it } from 'vite-plus/test'

import type { DotGrid } from '../dot-grid'
import { rgba } from '../fixtures'
import { splitBySubset } from './subsets'

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
