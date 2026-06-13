import type { DotGrid } from '../core/dot-grid'
import { buildFonts } from '../core/font/index'
import { FULL_SUBSET, splitBySubset } from '../core/font/subsets'
import { putFont, putFontBuilt } from '../storage/fonts'
import { getSnapshot } from '../storage/snapshot'

const buildSubset = async (subset: string, grids: Map<string, DotGrid>) => {
  const { ttf, woff } = await buildFonts(grids)

  await Promise.all([putFont(ttf, subset, 'ttf'), putFont(woff, subset, 'woff')])
}

export const buildFontSubsets = async (target: string) => {
  const snapshot = await getSnapshot()
  if (snapshot.size === 0) return

  const gridEntries = [...snapshot].map(([name, { grid }]) => [name, grid] as const)
  const grids = new Map(gridEntries)
  const buckets = splitBySubset(grids)

  await buildSubset(FULL_SUBSET, grids)
  for (const [subset, subGrids] of buckets) {
    await buildSubset(subset, subGrids)
  }

  await putFontBuilt(target)
}
