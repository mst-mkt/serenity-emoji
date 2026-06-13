import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { formatColor } from './format'

const RED_HALF = rgba(255, 0, 0, 128)
const RED = rgba(255, 0, 0)
const PERCEPTUAL = ['lab', 'lch', 'oklab', 'oklch'] as const

describe('formatColor', () => {
  it('returns the colour itself for object', () => {
    expect(formatColor(RED_HALF, 'object')).toEqual({ r: 255, g: 0, b: 0, a: 128 })
  })

  it('packs channels into a tuple for array', () => {
    expect(formatColor(RED_HALF, 'array')).toEqual([255, 0, 0, 128])
  })

  it('writes eight hex digits including alpha', () => {
    expect(formatColor(RED_HALF, 'hex')).toBe('#ff000080')
    expect(formatColor(rgba(0, 10, 15), 'hex')).toBe('#000a0fff')
  })

  it('writes rgb in the modern slash syntax', () => {
    expect(formatColor(RED_HALF, 'rgb')).toBe('rgb(255 0 0 / 0.502)')
  })

  it('writes rgba in the legacy comma syntax', () => {
    expect(formatColor(RED_HALF, 'rgba')).toBe('rgba(255, 0, 0, 0.502)')
  })

  it('writes hsl and hwb for red', () => {
    expect(formatColor(RED, 'hsl')).toBe('hsl(0 100% 50% / 1)')
    expect(formatColor(RED, 'hwb')).toBe('hwb(0 0% 0% / 1)')
  })

  it('carries a fractional alpha into hsl and hwb', () => {
    expect(formatColor(RED_HALF, 'hsl')).toBe('hsl(0 100% 50% / 0.502)')
    expect(formatColor(RED_HALF, 'hwb')).toBe('hwb(0 0% 0% / 0.502)')
  })

  it('wraps the perceptual spaces with their function name and alpha', () => {
    const formatted = PERCEPTUAL.map((space) => {
      const value = formatColor(RED, space)
      return { space, text: typeof value === 'string' ? value : '' }
    })

    expect(formatted.map(({ space, text }) => text.startsWith(`${space}(`))).toEqual([
      true,
      true,
      true,
      true,
    ])
    expect(formatted.map(({ text }) => text.endsWith(' / 1)'))).toEqual([true, true, true, true])
  })

  it('carries a fractional alpha into every perceptual space', () => {
    const formatted = PERCEPTUAL.map((space) => {
      const value = formatColor(RED_HALF, space)
      return typeof value === 'string' ? value : ''
    })

    expect(formatted.map((text) => text.endsWith(' / 0.502)'))).toEqual([true, true, true, true])
  })

  it('marks lightness with percent only for lab and lch', () => {
    const hasPercent = PERCEPTUAL.map((space) => {
      const value = formatColor(RED, space)
      return typeof value === 'string' && value.includes('%')
    })

    expect(hasPercent).toEqual([true, true, false, false])
  })
})
