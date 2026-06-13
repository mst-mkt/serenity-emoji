import type { DotGrid } from '../dot-grid'
import { toCodePoints, VARIATION_SELECTOR } from '../emoji'
import { EMOJI_GROUPS } from './emoji-groups.gen'

export const FULL_SUBSET = 'full'

const groupByCodePoint = new Map<number, string>(
  Object.entries(EMOJI_GROUPS).flatMap(([group, codePoints]) =>
    codePoints.map((codePoint): [number, string] => [codePoint, group]),
  ),
)

const baseCodePoints = (stem: string) => {
  return toCodePoints(stem).filter((codePoint) => codePoint !== VARIATION_SELECTOR)
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
