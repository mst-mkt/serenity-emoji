import { digestOfEntries, nextStored, planSync, type TreeEntry } from '@serenity-emoji/emoji/sync'

import type { DotGrid } from '../domain/dot-grid'
import { decodePng } from '../domain/image/decode/decode'
import { fetchEmojiPng, fetchEmojiTree, fetchHead } from '../sources/github'
import { getSyncedCommit, putSyncedCommit } from '../storage/cursor'
import { getFontTarget, putFontTarget } from '../storage/fonts'
import { deleteGrid, listGrids, putGrid } from '../storage/grids'

const MAX_DIMENSION = 512
const BATCH_LIMIT = 100

type GridUpdate = { name: string; sha: string; grid: DotGrid }

const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => {
  return result.status === 'fulfilled'
}

const isRejected = (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult => {
  return result.status === 'rejected'
}

// fetch, decode and store one batch of changed grids; failures only log, the next run retries
const applyTree = async (commit: string, tree: TreeEntry[], stored: TreeEntry[]) => {
  const { puts, deletes, remaining } = planSync(tree, stored, BATCH_LIMIT)
  if (remaining > 0) console.log(`sync backlog: ${remaining} entries remaining`)

  const deleteResults = await Promise.allSettled(deletes.map((name) => deleteGrid(name)))
  const deleted = deletes.filter((_, index) => deleteResults[index]?.status === 'fulfilled')

  const results = await Promise.allSettled(
    puts.map(async ({ name, sha }) => {
      const bytes = await fetchEmojiPng(commit, name)
      const grid = await decodePng(bytes, { maxDimension: MAX_DIMENSION })
      await putGrid(name, grid, sha)
      return { name, sha, grid }
    }),
  )

  const failures = results.filter(isRejected)
  for (const failure of failures) {
    console.error('sync failure:', failure.reason)
  }

  const applied: GridUpdate[] = results.filter(isFulfilled).map(({ value }) => value)

  return { applied, deleted }
}

// sync the kv mirror to upstream head; advance the font target once the mirror is complete
export const sync = async () => {
  const commit = await fetchHead()
  const syncedCommit = await getSyncedCommit()
  if (commit === syncedCommit) return

  const [tree, stored] = await Promise.all([fetchEmojiTree(commit), listGrids()])

  const { applied, deleted } = await applyTree(commit, tree, stored)

  const treeDigest = await digestOfEntries(tree)
  const syncedDigest = await digestOfEntries(nextStored(stored, applied, deleted))
  if (syncedDigest !== treeDigest) return

  const target = await getFontTarget()
  if (target !== treeDigest) await putFontTarget(treeDigest)

  // record only once fully mirrored, and after the build target, so a crash just retries
  await putSyncedCommit(commit)
}
