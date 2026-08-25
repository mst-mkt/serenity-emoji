import { toCodePoints, VARIATION_SELECTOR } from '@serenity-emoji/emoji'
import type { DotGrid, Rgba } from '@serenity-emoji/image/dot-grid'

import { colorKey, type Glyph, type Rect, toGlyph, UNITS_PER_EM } from './glyphs'
import { prefixSums } from './write'

export type PlannedGlyph = { advance: number; rects: Rect[] }
export type Ligature = { components: number[]; glyph: number }
export type ColorBase = { glyph: number; layers: { glyph: number; palette: number }[] }

export const COLOR_TABLES = ['colr', 'cbdt'] as const
export type ColorTable = (typeof COLOR_TABLES)[number]

type Entry = { stem: string; codePoints: number[]; glyph: Glyph; grid: DotGrid }
type Sequence = { codePoints: number[]; glyph: number }

const MAX_GLYPHS = 0xffff
const NOTDEF_ADVANCE = UNITS_PER_EM / 2

// glyph 0 is .notdef, so the index-th base glyph lands at index + 1
const baseGid = (index: number) => index + 1

// ascii codepoints (keycap digits, '#', '*') must keep their text glyphs from other fonts
const hasAsciiCodePoint = (codePoints: number[]) => codePoints.some((cp) => cp < 0x80)

const sequenceKey = (codePoints: number[]) => codePoints.join(',')

const planEntries = (grids: Map<string, DotGrid>) => {
  return [...grids]
    .map(([stem, grid]) => ({ stem, grid, codePoints: toCodePoints(stem) }))
    .filter(({ codePoints }) => !hasAsciiCodePoint(codePoints))
    .map(({ stem, grid, codePoints }) => ({ stem, codePoints, glyph: toGlyph(grid), grid }))
    .toSorted((a, b) => (a.stem < b.stem ? -1 : 1))
}

// cmap maps codepoints to glyph ids; sequences hold the multi-codepoint ligatures;
// componentCps are codepoints that only appear inside sequences and need empty glyphs
const planMapping = (entries: Entry[]) => {
  const cmap = new Map<number, number>()

  for (const [index, { codePoints }] of entries.entries()) {
    if (codePoints.length === 1) cmap.set(codePoints[0], baseGid(index))
  }

  // exact sequences first, then VS16-stripped variants for text without the selector
  const sequences = new Map<string, Sequence>()

  const addSequence = (codePoints: number[], glyph: number) => {
    const key = sequenceKey(codePoints)
    if (codePoints.length >= 2 && !sequences.has(key)) {
      sequences.set(key, { codePoints, glyph })
    }

    if (codePoints.length === 1 && !cmap.has(codePoints[0])) {
      cmap.set(codePoints[0], glyph)
    }
  }

  const multis = entries
    .map(({ codePoints }, index) => ({ codePoints, glyph: baseGid(index) }))
    .filter(({ codePoints }) => codePoints.length >= 2)

  for (const { codePoints, glyph } of multis) {
    addSequence(codePoints, glyph)
    addSequence(
      codePoints.filter((cp) => cp !== VARIATION_SELECTOR),
      glyph,
    )
  }

  const componentCps = [...new Set(sequences.values().flatMap(({ codePoints }) => codePoints))]
    .filter((cp) => !cmap.has(cp))
    .toSorted((a, b) => a - b)
  const emptyBase = baseGid(entries.length)

  for (const [index, cp] of componentCps.entries()) {
    cmap.set(cp, emptyBase + index)
  }

  return { cmap, sequences, componentCps }
}

const planColors = (entries: Entry[], componentCount: number) => {
  const layerBase = baseGid(entries.length) + componentCount
  const layerStarts = prefixSums(
    entries.map(({ glyph }) => glyph.layers.length),
    layerBase,
  )

  const colors = entries.reduce<Map<string, Rgba>>((palette, { glyph }) => {
    for (const { color } of glyph.layers) {
      palette.set(colorKey(color), color)
    }

    return palette
  }, new Map())
  const sortedColors = [...colors].toSorted(([a], [b]) => (a < b ? -1 : 1))
  const paletteIndices = new Map(sortedColors.map(([key], index) => [key, index]))
  const palette = sortedColors.map(([, color]) => color)

  const paletteOf = (color: Rgba) => {
    const index = paletteIndices.get(colorKey(color))
    if (index === undefined) throw new Error('font: color missing from palette')
    return index
  }

  const colorBases = entries
    .map(({ glyph }, index) => ({
      glyph: baseGid(index),
      layers: glyph.layers.map(({ color }, layer) => ({
        glyph: layerStarts[index] + layer,
        palette: paletteOf(color),
      })),
    }))
    .filter(({ layers }) => layers.length > 0)

  return { palette, colorBases }
}

const planLigatures = (sequences: Map<string, Sequence>, cmap: Map<number, number>) => {
  const gidOf = (cp: number) => {
    const gid = cmap.get(cp)
    if (gid === undefined) throw new Error(`font: missing cmap entry for codepoint ${cp}`)
    return gid
  }

  return sequences
    .values()
    .map(({ codePoints, glyph }) => ({ components: codePoints.map(gidOf), glyph }))
    .toArray()
}

// [.notdef, base glyphs, zero-advance component glyphs, color layer glyphs (colr only)]
const planGlyphs = (entries: Entry[], componentCps: number[], colorTable: ColorTable) => [
  { advance: NOTDEF_ADVANCE, rects: [] },
  ...entries.map(({ glyph }) => ({ advance: glyph.advance, rects: glyph.silhouette })),
  ...componentCps.map(() => ({ advance: 0, rects: [] })),
  ...(colorTable === 'colr'
    ? entries.flatMap(({ glyph }) =>
        glyph.layers.map(({ rects }) => ({ advance: glyph.advance, rects })),
      )
    : []),
]

export const planFont = (grids: Map<string, DotGrid>, colorTable: ColorTable = 'colr') => {
  const entries = planEntries(grids)
  if (entries.length === 0) throw new Error('cannot plan a font with no glyphs')

  const { cmap, sequences, componentCps } = planMapping(entries)
  const { palette, colorBases } =
    colorTable === 'colr'
      ? planColors(entries, componentCps.length)
      : { palette: [], colorBases: [] }
  const ligatures = planLigatures(sequences, cmap)
  const glyphs = planGlyphs(entries, componentCps, colorTable)
  const bitmaps = entries.map(({ grid }, index) => ({ glyph: baseGid(index), grid }))

  if (glyphs.length > MAX_GLYPHS) {
    throw new Error(`font: ${glyphs.length} glyphs exceed the truetype limit`)
  }

  const maxContext = sequences
    .values()
    .reduce((max, { codePoints }) => Math.max(max, codePoints.length), 1)

  return { glyphs, cmap, ligatures, colorBases, palette, bitmaps, maxContext }
}
