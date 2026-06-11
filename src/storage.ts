import type { DotGrid } from './core/dot-grid'
import { withoutVariationSelectors } from './core/emoji'

type Metadata = { sha: string }
export type StoredEntry = { name: string; sha: string }

const KEY_PREFIX = 'emoji:'
const keyOf = (stem: string) => `${KEY_PREFIX}${stem}`

export const getGrid = (kv: KVNamespace, stem: string) => {
  return kv.get<DotGrid>(keyOf(stem), 'json')
}

export const findGrid = async (kv: KVNamespace, stem: string) => {
  const exact = await getGrid(kv, stem)
  if (exact !== null) return exact

  const bare = withoutVariationSelectors(stem)
  if (bare === stem) return null

  return getGrid(kv, bare)
}

export const putGrid = (kv: KVNamespace, name: string, grid: DotGrid, sha: string) => {
  const value = JSON.stringify(grid)
  const metadata: Metadata = { sha }
  const key = keyOf(name)

  return kv.put(key, value, { metadata })
}

export const deleteGrid = (kv: KVNamespace, name: string) => {
  const key = keyOf(name)

  return kv.delete(key)
}

export const listGrids = async (kv: KVNamespace) => {
  const listPages = async (cursor?: string): Promise<StoredEntry[]> => {
    const page = await kv.list<Metadata>({ prefix: KEY_PREFIX, cursor })
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
