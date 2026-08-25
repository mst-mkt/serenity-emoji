import { toCodePoints, toUnit, VARIATION_SELECTOR } from '@serenity-emoji/emoji'
import type { DotGrid } from '@serenity-emoji/image/dot-grid'
import * as v from 'valibot'

import { EMOJI_GROUPS } from './groups.gen'
import type { CodePointRange } from './range'

export const FULL_SUBSET = 'full'

export const SubsetEntrySchema = v.object({
  subset: v.string(),
  range: v.nullable(v.string()),
})
export const ManifestSchema = v.array(SubsetEntrySchema)
export type SubsetEntry = v.InferOutput<typeof SubsetEntrySchema>

const groupByCodePoint = new Map<number, string>(
  Object.entries(EMOJI_GROUPS).flatMap(([group, codePoints]) =>
    codePoints.map((codePoint): [number, string] => [codePoint, group]),
  ),
)

const baseCodePoints = (stem: string) => {
  return toCodePoints(stem).filter((codePoint) => codePoint !== VARIATION_SELECTOR)
}

// only single-codepoint emoji are selectable; sequences stay in full to keep ligatures intact
const baseOf = (stem: string) => {
  const base = baseCodePoints(stem)
  return base.length === 1 ? base[0] : null
}

const selectBy = (grids: Map<string, DotGrid>, matches: (codePoint: number) => boolean) => {
  const members = [...grids].filter(([stem]) => {
    const base = baseOf(stem)
    return base !== null && matches(base)
  })

  return new Map(members)
}

export const selectByRange = (grids: Map<string, DotGrid>, { min, max }: CodePointRange) => {
  return selectBy(grids, (codePoint) => codePoint >= min && codePoint <= max)
}

export const selectByCodePoints = (grids: Map<string, DotGrid>, codePoints: Set<number>) => {
  return selectBy(grids, (codePoint) => codePoints.has(codePoint))
}

// sequences stay in full; splitting them across files would break the ligature
const groupSubsetOf = (stem: string) => {
  const base = baseCodePoints(stem)
  if (base.length !== 1) return null

  return groupByCodePoint.get(base[0]) ?? null
}

export const splitBySubset = (grids: Map<string, DotGrid>) => {
  const assigned = [...grids].flatMap(([stem, grid]) => {
    const subset = groupSubsetOf(stem)
    return subset === null ? [] : [{ subset, stem, grid }]
  })

  const subsets = [...new Set(assigned.map((entry) => entry.subset))]

  return new Map(
    subsets.map((subset): [string, Map<string, DotGrid>] => {
      const members = assigned.filter((entry) => entry.subset === subset)
      const bucket = new Map(members.map((entry): [string, DotGrid] => [entry.stem, entry.grid]))
      return [subset, bucket]
    }),
  )
}

const coverageOf = (grids: Map<string, DotGrid>) => {
  const codePoints = new Set([...grids.keys()].flatMap(baseCodePoints))

  return [...codePoints].toSorted((a, b) => a - b)
}

// for sorted input, the i-th run spans starts[i]..ends[i]
export const toUnicodeRange = (codePoints: number[]) => {
  const starts = codePoints.filter((codePoint, i) => i === 0 || codePoints[i - 1] !== codePoint - 1)
  const ends = codePoints.filter(
    (codePoint, i) => i === codePoints.length - 1 || codePoints[i + 1] !== codePoint + 1,
  )

  const unitOf = (start: number, i: number) => {
    const end = ends[i]
    return start === end ? toUnit(start) : `${toUnit(start)}-${end.toString(16).toUpperCase()}`
  }

  return starts.map(unitOf).join(', ')
}

export const manifestOf = (buckets: Map<string, Map<string, DotGrid>>) => {
  return [...buckets]
    .toSorted(([a], [b]) => (a < b ? -1 : 1))
    .map(([subset, grids]) => ({ subset, range: toUnicodeRange(coverageOf(grids)) }))
}
