import { decodePng } from '../core/decode/index'
import { deleteGrid, getGrid, putGrid } from '../storage/grids'
import { getSnapshot, getSnapshotDigest, putSnapshot, putSnapshotDigest } from '../storage/snapshot'
import { fetchEmojiPng } from './github'
import { planSync, type TreeEntry } from './plan'
import { applySnapshot, digestOfEntries, type GridUpdate, planBackfill } from './snapshot'

const MAX_DIMENSION = 512
const BATCH_LIMIT = 100

const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => {
  return result.status === 'fulfilled'
}

const isRejected = (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult => {
  return result.status === 'rejected'
}

const isUpdate = (update: GridUpdate | null): update is GridUpdate => {
  return update !== null
}

// fetch, decode and store one batch of changed grids; failures only log, the next run retries
export const applyTree = async (commit: string, tree: TreeEntry[], stored: TreeEntry[]) => {
  const { puts, deletes, remaining } = planSync(tree, stored, BATCH_LIMIT)
  if (remaining > 0) console.log(`sync backlog: ${remaining} entries remaining`)

  await Promise.all(deletes.map((name) => deleteGrid(name)))
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

  return results.filter(isFulfilled).map(({ value }) => value)
}

// keep the R2 snapshot mirroring the tree; the KV digest skips the work on quiet runs
export const syncSnapshot = async (
  tree: TreeEntry[],
  stored: TreeEntry[],
  applied: GridUpdate[],
) => {
  const treeDigest = await digestOfEntries(tree)
  const storedDigest = await getSnapshotDigest()

  const isUnchanged = applied.length === 0 && storedDigest === treeDigest
  if (isUnchanged) {
    return { changed: false, complete: true, digest: treeDigest }
  }

  const snapshot = await getSnapshot()
  const targets = planBackfill(tree, stored, snapshot, applied, BATCH_LIMIT)
  const backfillResults = await Promise.all(
    targets.map(async ({ name, sha }) => {
      const grid = await getGrid(name)
      return grid === null ? null : { name, sha, grid }
    }),
  )
  const backfilled = backfillResults.filter(isUpdate)
  const { next, changed, complete } = applySnapshot(snapshot, tree, [...applied, ...backfilled])

  if (!changed) {
    // repair a lost digest so quiet runs can skip again
    if (complete && storedDigest !== treeDigest) await putSnapshotDigest(treeDigest)
    return { changed, complete, digest: treeDigest }
  }

  const nextEntries = [...next].map(([name, { sha }]) => ({ name, sha }))
  const digest = await digestOfEntries(nextEntries)
  await putSnapshot(next)
  await putSnapshotDigest(digest)

  return { changed, complete, digest }
}
