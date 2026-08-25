import { type DotGrid, type Rgba, type Run, toRuns } from '@serenity-emoji/image/dot-grid'
import { dimensionsOf } from '@serenity-emoji/image/scale'
import { hex } from '@serenity-emoji/lib/bytes'

export type Rect = { xMin: number; yMin: number; xMax: number; yMax: number }
export type ColorLayer = { color: Rgba; rects: Rect[] }
export type Glyph = { advance: number; silhouette: Rect[]; layers: ColorLayer[] }

export const UNITS_PER_EM = 1024
export const ASCENT = 900
export const DESCENT = ASCENT - UNITS_PER_EM

export const colorKey = ({ r, g, b, a }: Rgba) => {
  return [r, g, b, a].map(hex).join('')
}

type Span = Pick<Run, 'x' | 'width'>

// merge adjacent runs regardless of color, for the monochrome fallback outline
const mergeRuns = (runs: Span[]) => {
  return runs.reduce<Span[]>((merged, run) => {
    const last = merged.at(-1)
    if (last !== undefined && last.x + last.width === run.x) {
      last.width += run.width
      return merged
    }

    merged.push({ x: run.x, width: run.width })
    return merged
  }, [])
}

export const toGlyph = (grid: DotGrid) => {
  const { width, height } = dimensionsOf(grid)
  if (width === 0 || height === 0) throw new Error('cannot build a glyph from an empty grid')

  // every emoji fills one square em, centered, so advances stay uniform
  const longer = Math.max(width, height)
  const em = (value: number) => Math.round((value * UNITS_PER_EM) / longer)
  const xOffset = Math.round((UNITS_PER_EM - em(width)) / 2)
  const top = ASCENT - Math.round((UNITS_PER_EM - em(height)) / 2)
  const toRect = (x: number, runWidth: number, y: number) => ({
    xMin: xOffset + em(x),
    xMax: xOffset + em(x + runWidth),
    yMin: top - em(y + 1),
    yMax: top - em(y),
  })

  const rows = grid.map((row, y) => ({ y, runs: toRuns(row) }))
  const silhouette = rows.flatMap(({ y, runs }) =>
    mergeRuns(runs).map(({ x, width: runWidth }) => toRect(x, runWidth, y)),
  )

  const byColor = rows.reduce<Map<string, ColorLayer>>((layers, { y, runs }) => {
    for (const { x, width: runWidth, color } of runs) {
      const key = colorKey(color)
      const layer = layers.get(key) ?? { color, rects: [] }
      layer.rects.push(toRect(x, runWidth, y))
      layers.set(key, layer)
    }

    return layers
  }, new Map())

  const sortedByColor = [...byColor].toSorted(([a], [b]) => (a < b ? -1 : 1))
  const layers = sortedByColor.map(([, layer]) => layer)

  return { advance: UNITS_PER_EM, silhouette, layers }
}
