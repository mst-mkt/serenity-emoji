import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { toHsl, toHwb, toLab, toLch, toOklab, toOklch } from './convert'

const RED = rgba(255, 0, 0)
const WHITE = rgba(255, 255, 255)
const BLACK = rgba(0, 0, 0)

describe('toHsl', () => {
  it('reads hue, saturation and lightness from primaries', () => {
    expect(toHsl(RED)).toEqual({ h: 0, s: 100, l: 50 })
    expect(toHsl(rgba(0, 255, 0))).toEqual({ h: 120, s: 100, l: 50 })
    expect(toHsl(rgba(0, 0, 255))).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('reports zero saturation for greys', () => {
    const { h, s } = toHsl(rgba(128, 128, 128))

    expect(h).toBe(0)
    expect(s).toBe(0)
  })
})

describe('toHwb', () => {
  it('splits a colour into whiteness and blackness', () => {
    expect(toHwb(RED)).toEqual({ h: 0, w: 0, b: 0 })
    expect(toHwb(WHITE)).toEqual({ h: 0, w: 100, b: 0 })
    expect(toHwb(BLACK)).toEqual({ h: 0, w: 0, b: 100 })
  })

  it('reports fractional whiteness and blackness for a mid-tone', () => {
    const { h, w, b } = toHwb(rgba(192, 128, 64))

    expect(h).toBeCloseTo(30, 4)
    expect(w).toBeCloseTo(25.1, 1)
    expect(b).toBeCloseTo(24.71, 1)
  })
})

describe('toLab', () => {
  it('matches the known lab values of sRGB red', () => {
    const { l, a, b } = toLab(RED)

    expect(l).toBeCloseTo(54.29, 1)
    expect(a).toBeCloseTo(80.81, 1)
    expect(b).toBeCloseTo(69.89, 1)
  })

  it('puts white near L 100 with no chroma', () => {
    const { l, a, b } = toLab(WHITE)

    expect(l).toBeCloseTo(100, 1)
    expect(a).toBeCloseTo(0, 1)
    expect(b).toBeCloseTo(0, 1)
  })
})

describe('toLch', () => {
  it('expresses red as lab chroma and hue', () => {
    const { l, c, h } = toLch(RED)

    expect(l).toBeCloseTo(54.29, 1)
    expect(c).toBeCloseTo(106.84, 1)
    expect(h).toBeCloseTo(40.86, 1)
  })
})

describe('toOklab', () => {
  it('matches the known oklab values of sRGB red', () => {
    const { l, a, b } = toOklab(RED)

    expect(l).toBeCloseTo(0.628, 2)
    expect(a).toBeCloseTo(0.2249, 2)
    expect(b).toBeCloseTo(0.1258, 2)
  })

  it('puts white near L 1 with no chroma', () => {
    const { l, a, b } = toOklab(WHITE)

    expect(l).toBeCloseTo(1, 2)
    expect(a).toBeCloseTo(0, 2)
    expect(b).toBeCloseTo(0, 2)
  })

  it('leaves greys without chroma', () => {
    const { a, b } = toOklab(rgba(128, 128, 128))

    expect(a).toBeCloseTo(0, 3)
    expect(b).toBeCloseTo(0, 3)
  })
})

describe('toOklch', () => {
  it('expresses red as oklab chroma and hue', () => {
    const { l, c, h } = toOklch(RED)

    expect(l).toBeCloseTo(0.628, 2)
    expect(c).toBeCloseTo(0.2577, 2)
    expect(h).toBeCloseTo(29.23, 1)
  })

  it('tracks hue around the wheel for green and blue', () => {
    expect(toOklch(rgba(0, 255, 0)).h).toBeCloseTo(142.5, 0)
    expect(toOklch(rgba(0, 0, 255)).h).toBeCloseTo(264.05, 0)
  })
})
