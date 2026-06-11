import type { CronHandler } from 'kuron'

import type { AppEnv } from '../bindings'
import { decodePng } from '../core/decode/index'
import { deleteGrid, listGrids, putGrid } from '../storage'
import { fetchEmojiPng, fetchEmojiTree, fetchHead } from '../sync/github'
import { planSync } from '../sync/plan'

const MAX_DIMENSION = 512
const BATCH_LIMIT = 100

export const handleSync: CronHandler<AppEnv> = async (c) => {
  const commit = await fetchHead()
  const [tree, stored] = await Promise.all([fetchEmojiTree(commit), listGrids(c.env.KV)])
  const { puts, deletes, remaining } = planSync(tree, stored, BATCH_LIMIT)
  if (remaining > 0) console.log(`sync backlog: ${remaining} entries remaining`)

  await Promise.all(deletes.map((name) => deleteGrid(c.env.KV, name)))
  const results = await Promise.allSettled(
    puts.map(async ({ name, sha }) => {
      const bytes = await fetchEmojiPng(commit, name)
      const grid = await decodePng(bytes, { maxDimension: MAX_DIMENSION })
      await putGrid(c.env.KV, name, grid, sha)
    }),
  )

  const failures = results.filter((result) => result.status === 'rejected')

  for (const failure of failures) {
    console.error('sync failure:', failure.reason)
  }
}
