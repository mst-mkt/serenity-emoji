import type { DotGrid, Rgba } from '../dot-grid'
import { dimensionsOf } from '../scale'

// sixel carries no alpha, so binarize: pixels below this opacity are not drawn
const ALPHA_THRESHOLD = 64
// one sixel character packs a column of six vertical pixels
const BAND = 6

type Color = { r: number; g: number; b: number }

// sixel colour components are 0-100, not 0-255
const quantize = ({ r, g, b }: Rgba) => ({
  r: Math.round((r / 255) * 100),
  g: Math.round((g / 255) * 100),
  b: Math.round((b / 255) * 100),
})

const keyOf = ({ r, g, b }: Color) => `${r};${g};${b}`

const isVisible = (pixel: Rgba | undefined): pixel is Rgba => {
  return pixel !== undefined && pixel.a >= ALPHA_THRESHOLD
}

// distinct quantized colours, in order of first appearance
const buildPalette = (pixels: DotGrid) => {
  const seen = new Set<string>()
  const colors = pixels.flatMap((row) =>
    row.filter(isVisible).flatMap((pixel) => {
      const color = quantize(pixel)
      const key = keyOf(color)
      if (seen.has(key)) return []
      seen.add(key)
      return [color]
    }),
  )
  const indexByKey = new Map(colors.map((color, index) => [keyOf(color), index]))

  return { colors, indexByKey }
}

// run-length encode sixel chars with the `!count` repeat introducer
const runLength = (codes: number[]) => {
  return codes
    .reduce<{ code: number; count: number }[]>((groups, code) => {
      const last = groups.at(-1)
      if (last !== undefined && last.code === code) {
        last.count += 1
        return groups
      }
      groups.push({ code, count: 1 })
      return groups
    }, [])
    .map(({ code, count }) => {
      const char = String.fromCharCode(code)
      return count > 3 ? `!${count}${char}` : char.repeat(count)
    })
    .join('')
}

const colorIndexAt = (pixels: DotGrid, y: number, x: number, indexByKey: Map<string, number>) => {
  const pixel = pixels.at(y)?.at(x)
  return isVisible(pixel) ? (indexByKey.get(keyOf(quantize(pixel))) ?? null) : null
}

// one color's six-row strip across the band, as a sixel char per column
const stripFor = (
  pixels: DotGrid,
  band: number,
  width: number,
  index: number,
  indexByKey: Map<string, number>,
) => {
  const codes = [...Array(width)].map((_, x) => {
    const bits = [...Array(BAND)].reduce<number>((acc, _unused, k) => {
      const matches = colorIndexAt(pixels, band * BAND + k, x, indexByKey) === index
      return matches ? acc | (1 << k) : acc
    }, 0)
    return 0x3f + bits
  })

  return `#${index}${runLength(codes)}`
}

const encodeBand = (
  pixels: DotGrid,
  band: number,
  width: number,
  indexByKey: Map<string, number>,
) => {
  const present = [
    ...new Set(
      [...Array(BAND)].flatMap((_unused, k) =>
        [...Array(width)].flatMap((_col, x) => {
          const index = colorIndexAt(pixels, band * BAND + k, x, indexByKey)
          return index === null ? [] : [index]
        }),
      ),
    ),
  ]

  // `$` returns to the band's left margin so the next colour overlays the same rows
  return present.map((index) => stripFor(pixels, band, width, index, indexByKey)).join('$')
}

export const toSixel = (pixels: DotGrid) => {
  const { width, height } = dimensionsOf(pixels)
  if (width === 0 || height === 0) return ''

  const { colors, indexByKey } = buildPalette(pixels)
  const palette = colors
    .map((color, index) => `#${index};2;${color.r};${color.g};${color.b}`)
    .join('')

  const bandCount = Math.ceil(height / BAND)
  // `-` advances to the next band of six rows
  const body = [...Array(bandCount)]
    .map((_, band) => encodeBand(pixels, band, width, indexByKey))
    .join('-')

  // DCS `q`, P2=1 leaves unset pixels transparent; `"` sets a 1:1 raster of width x height
  return `\x1bP0;1;0q"1;1;${width};${height}${palette}${body}\x1b\\`
}
