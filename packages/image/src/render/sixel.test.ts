import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../test/fixtures'
import { toSixel } from './sixel'

const RED = rgba(255, 0, 0)
const CLEAR = rgba(0, 0, 0, 0)

describe('toSixel', () => {
  it('wraps a single pixel in the sixel envelope', () => {
    const sixel = toSixel([[RED]])

    expect(sixel).toBe('\x1bP0;1;0q"1;1;1;1#0;2;100;0;0#0@\x1b\\')
  })

  it('leaves transparent pixels unset', () => {
    const sixel = toSixel([[CLEAR, RED]])

    expect(sixel).toContain('#0?@')
  })

  it('run-length encodes a long stretch of one colour', () => {
    const sixel = toSixel([[RED, RED, RED, RED, RED]])

    expect(sixel).toContain('#0!5@')
  })

  it('separates every six rows into its own band', () => {
    const sixel = toSixel([[RED], [RED], [RED], [RED], [RED], [RED], [RED]])

    expect(sixel).toContain('#0~-#0@')
  })

  it('overlays band colours with a carriage return between them', () => {
    const blue = rgba(0, 0, 255)
    const sixel = toSixel([[RED, blue]])

    expect(sixel).toContain('#0@?$#1?@')
  })

  it('packs stacked colours into their own sixel bits', () => {
    const blue = rgba(0, 0, 255)
    const sixel = toSixel([[RED], [blue]])

    expect(sixel).toContain('#0@$#1A')
  })

  it('declares one palette entry per distinct colour', () => {
    const blue = rgba(0, 0, 255)
    const sixel = toSixel([[RED, blue]])

    expect(sixel).toContain('#0;2;100;0;0')
    expect(sixel).toContain('#1;2;0;0;100')
  })

  it('returns an empty string for an empty grid', () => {
    expect(toSixel([])).toBe('')
    expect(toSixel([[], []])).toBe('')
  })
})
