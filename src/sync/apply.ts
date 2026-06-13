import { decodePng } from '../core/decode/index'
import type { DotGrid } from '../core/dot-grid'
import { deleteGrid, putGrid } from '../storage/grids'
import { fetchEmojiPng } from './github'
import { planSync, type TreeEntry } from './plan'

const MAX_DIMENSION = 512
const BATCH_LIMIT = 100

export type GridUpdate = { name: string; sha: string; grid: DotGrid }

const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => {
  return result.status === 'fulfilled'
}

const isRejected = (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult => {
  return result.status === 'rejected'
}

// fetch, decode and store one batch of changed grids; failures only log, the next run retries
export const applyTree = async (commit: string, tree: TreeEntry[], stored: TreeEntry[]) => {
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

  const applied = results.filter(isFulfilled).map(({ value }) => value)

  return { applied, deleted }
}
