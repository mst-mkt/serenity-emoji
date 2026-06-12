import { env } from 'cloudflare:workers'

import type { DotGrid } from '../core/dot-grid'
import { withoutVariationSelectors } from '../core/emoji'

type Metadata = { sha: string }
export type StoredEntry = { name: string; sha: string }

const KEY_PREFIX = 'emoji:'
const keyOf = (stem: string) => `${KEY_PREFIX}${stem}`

export const getGrid = (stem: string) => {
  return env.KV.get<DotGrid>(keyOf(stem), 'json')
}

export const findGrid = async (stem: string) => {
  const exact = await getGrid(stem)
  if (exact !== null) return exact

  const bare = withoutVariationSelectors(stem)
  if (bare === stem) return null

  return getGrid(bare)
}

export const putGrid = (name: string, grid: DotGrid, sha: string) => {
  const value = JSON.stringify(grid)
  const metadata: Metadata = { sha }
  const key = keyOf(name)

  return env.KV.put(key, value, { metadata })
}

export const deleteGrid = (name: string) => {
  const key = keyOf(name)

  return env.KV.delete(key)
}

export const listGrids = async () => {
  const listPages = async (cursor?: string): Promise<StoredEntry[]> => {
    const page = await env.KV.list<Metadata>({ prefix: KEY_PREFIX, cursor })
    const pageEntries = page.keys.map((key) => ({
      name: key.name.slice(KEY_PREFIX.length),
      sha: key.metadata?.sha ?? '',
    }))

    if (page.list_complete) return pageEntries

    const restEntries = await listPages(page.cursor)
    return [...pageEntries, ...restEntries]
  }

  const entries = await listPages()

  return entries
}
