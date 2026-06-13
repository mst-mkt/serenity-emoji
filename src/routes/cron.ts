import type { CronHandler } from 'kuron'

import type { AppEnv } from '../bindings'
import { getFontBuilt, getFontTarget, putFontTarget } from '../storage/fonts'
import { listGrids } from '../storage/grids'
import { applyTree } from '../sync/apply'
import { buildFontSubsets } from '../sync/font'
import { fetchEmojiTree, fetchHead } from '../sync/github'
import { digestOfEntries, nextStored } from '../sync/plan'

export const handleSync: CronHandler<AppEnv> = async () => {
  const commit = await fetchHead()
  const [tree, stored] = await Promise.all([fetchEmojiTree(commit), listGrids()])

  const { applied, deleted } = await applyTree(commit, tree, stored)

  // a complete kv mirror of the tree is the only thing worth building a font from
  const treeDigest = await digestOfEntries(tree)
  const syncedDigest = await digestOfEntries(nextStored(stored, applied, deleted))
  if (syncedDigest !== treeDigest) return

  const target = await getFontTarget()
  if (target !== treeDigest) await putFontTarget(treeDigest)
}

export const handleFontBuild: CronHandler<AppEnv> = async () => {
  const [target, built] = await Promise.all([getFontTarget(), getFontBuilt()])

  const needsBuild = target !== null && target !== built
  if (!needsBuild) return

  await buildFontSubsets(target)
}
