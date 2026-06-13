import { describe, expect, it } from 'vite-plus/test'

import { tagAt, u16At } from '../../../test/fixtures'
import { buildGsub } from './gsub'

describe('buildGsub', () => {
  it('registers one ccmp ligature lookup under the default script', () => {
    const ligatures = [{ components: [5, 6], glyph: 9 }]

    const gsub = buildGsub(ligatures)

    const scriptList = u16At(gsub, 4)
    const featureList = u16At(gsub, 6)
    const lookupList = u16At(gsub, 8)
    expect(tagAt(gsub, scriptList + 2)).toBe('DFLT')
    expect(tagAt(gsub, featureList + 2)).toBe('ccmp')

    const lookup = lookupList + u16At(gsub, lookupList + 2)
    expect(u16At(gsub, lookup)).toBe(4)
  })

  it('orders longer ligatures of the same first glyph ahead', () => {
    const ligatures = [
      { components: [5, 6], glyph: 9 },
      { components: [5, 6, 7], glyph: 10 },
    ]

    const gsub = buildGsub(ligatures)

    const lookupList = u16At(gsub, 8)
    const lookup = lookupList + u16At(gsub, lookupList + 2)
    const subst = lookup + u16At(gsub, lookup + 6)
    expect(u16At(gsub, subst)).toBe(1)
    expect(u16At(gsub, subst + 4)).toBe(1)

    const set = subst + u16At(gsub, subst + 6)
    expect(u16At(gsub, set)).toBe(2)

    const first = set + u16At(gsub, set + 2)
    const second = set + u16At(gsub, set + 4)
    expect([u16At(gsub, first), u16At(gsub, first + 2)]).toEqual([10, 3])
    expect([u16At(gsub, first + 4), u16At(gsub, first + 6)]).toEqual([6, 7])
    expect([u16At(gsub, second), u16At(gsub, second + 2)]).toEqual([9, 2])

    const coverage = subst + u16At(gsub, subst + 2)
    expect([u16At(gsub, coverage), u16At(gsub, coverage + 2)]).toEqual([1, 1])
    expect(u16At(gsub, coverage + 4)).toBe(5)
  })

  it('covers distinct first glyphs in ascending order', () => {
    const ligatures = [
      { components: [8, 2], glyph: 11 },
      { components: [3, 2], glyph: 12 },
    ]

    const gsub = buildGsub(ligatures)

    const lookupList = u16At(gsub, 8)
    const lookup = lookupList + u16At(gsub, lookupList + 2)
    const subst = lookup + u16At(gsub, lookup + 6)
    const coverage = subst + u16At(gsub, subst + 2)
    expect(u16At(gsub, coverage + 2)).toBe(2)
    expect([u16At(gsub, coverage + 4), u16At(gsub, coverage + 6)]).toEqual([3, 8])
  })
})
