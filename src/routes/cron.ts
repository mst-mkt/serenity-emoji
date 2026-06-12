import type { CronHandler } from 'kuron'

import type { AppEnv } from '../bindings'
import { sha256Hex } from '../core/digest'
import type { DotGrid } from '../core/dot-grid'
import { toTtf } from '../core/font/index'
import { getFontBuilt, getFontTarget, putFont, putFontBuilt, putFontTarget } from '../storage/fonts'
import { listGrids } from '../storage/grids'
import { getSnapshot } from '../storage/snapshot'
import { applyTree, syncSnapshot } from '../sync/apply'
import { fetchEmojiTree, fetchHead } from '../sync/github'

export const handleSync: CronHandler<AppEnv> = async () => {
  const commit = await fetchHead()
  const [tree, stored] = await Promise.all([fetchEmojiTree(commit), listGrids()])

  const applied = await applyTree(commit, tree, stored)
  const { changed, complete, digest } = await syncSnapshot(tree, stored, applied)

  if (changed && complete) await putFontTarget(digest)
}

export const handleFontBuild: CronHandler<AppEnv> = async () => {
  const [target, built] = await Promise.all([getFontTarget(), getFontBuilt()])

  const needsBuild = target !== null && target !== built
  if (!needsBuild) return

  const snapshot = await getSnapshot()
  if (snapshot.size === 0) return

  const gridEntries: [string, DotGrid][] = [...snapshot].map(([name, { grid }]) => [name, grid])
  const ttf = toTtf(new Map(gridEntries))
  const hex = await sha256Hex(ttf)
  const digest = hex.slice(0, 16)

  await putFont(ttf, digest)
  await putFontBuilt(target)
}
