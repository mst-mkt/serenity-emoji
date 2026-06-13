import { hex } from '../../lib/bytes'
import type { Rgba } from '../dot-grid'
import { toHsl, toHwb, toLab, toLch, toOklab, toOklch } from './convert'

export const COLOR_DATA_FORMATS = ['object', 'array'] as const
export const COLOR_STRING_FORMATS = [
  'hex',
  'rgb',
  'rgba',
  'hsl',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
] as const
export const COLOR_FORMATS = [...COLOR_DATA_FORMATS, ...COLOR_STRING_FORMATS] as const

export type ColorFormat = (typeof COLOR_FORMATS)[number]

const round = (value: number, digits: number) => Number(value.toFixed(digits))

// alpha is always emitted, as a 0-1 fraction, so every cell has the same shape
const alpha = (a: number) => round(a / 255, 4)

const formatters: Record<ColorFormat, (color: Rgba) => Rgba | number[] | string> = {
  object: (color) => color,
  array: ({ r, g, b, a }) => [r, g, b, a],
  hex: ({ r, g, b, a }) => `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`,
  rgb: ({ r, g, b, a }) => `rgb(${r} ${g} ${b} / ${alpha(a)})`,
  rgba: ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${alpha(a)})`,
  hsl: (color) => {
    const { h, s, l } = toHsl(color)
    return `hsl(${round(h, 2)} ${round(s, 2)}% ${round(l, 2)}% / ${alpha(color.a)})`
  },
  hwb: (color) => {
    const { h, w, b } = toHwb(color)
    return `hwb(${round(h, 2)} ${round(w, 2)}% ${round(b, 2)}% / ${alpha(color.a)})`
  },
  lab: (color) => {
    const { l, a, b } = toLab(color)
    return `lab(${round(l, 2)}% ${round(a, 2)} ${round(b, 2)} / ${alpha(color.a)})`
  },
  lch: (color) => {
    const { l, c, h } = toLch(color)
    return `lch(${round(l, 2)}% ${round(c, 2)} ${round(h, 2)} / ${alpha(color.a)})`
  },
  oklab: (color) => {
    const { l, a, b } = toOklab(color)
    return `oklab(${round(l, 4)} ${round(a, 4)} ${round(b, 4)} / ${alpha(color.a)})`
  },
  oklch: (color) => {
    const { l, c, h } = toOklch(color)
    return `oklch(${round(l, 4)} ${round(c, 4)} ${round(h, 2)} / ${alpha(color.a)})`
  },
}

export const formatColor = (color: Rgba, format: ColorFormat) => formatters[format](color)
