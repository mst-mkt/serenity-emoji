import type { CronHandler } from 'kuron'

import type { AppEnv } from '../bindings'
import { getFontBuilt, getFontTarget, putFontTarget } from '../storage/fonts'
import { listGrids } from '../storage/grids'
import { applyTree, syncSnapshot } from '../sync/apply'
import { buildFontSubsets } from '../sync/font'
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

  await buildFontSubsets(target)
}
