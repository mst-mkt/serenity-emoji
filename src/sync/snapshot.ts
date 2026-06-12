import { sha256Hex } from '../core/digest'
import type { DotGrid } from '../core/dot-grid'
import type { TreeEntry } from './plan'

export type SnapshotEntry = { sha: string; grid: DotGrid }
export type Snapshot = Map<string, SnapshotEntry>
export type GridUpdate = { name: string; sha: string; grid: DotGrid }

// order-independent fingerprint of a (name, sha) set
export const digestOfEntries = (entries: TreeEntry[]) => {
  const lines = entries
    .map(({ name, sha }) => `${name}:${sha}`)
    .toSorted((a, b) => (a < b ? -1 : 1))
  const encoded = new TextEncoder().encode(lines.join('\n'))
  const digest = sha256Hex(encoded)

  return digest
}

// entries to refresh from KV: the snapshot is stale but KV already holds the tree's sha
export const planBackfill = (
  tree: TreeEntry[],
  stored: TreeEntry[],
  snapshot: Snapshot,
  applied: GridUpdate[],
  limit: number,
) => {
  const appliedNames = new Set(applied.map(({ name }) => name))
  const storedShas = new Map(stored.map(({ name, sha }) => [name, sha]))
  const isTarget = ({ name, sha }: TreeEntry) => {
    return [
      snapshot.get(name)?.sha !== sha,
      !appliedNames.has(name),
      storedShas.get(name) === sha,
    ].every(Boolean)
  }

  return tree.filter(isTarget).slice(0, limit)
}

// drop entries gone from the tree, then apply this run's grids
export const applySnapshot = (snapshot: Snapshot, tree: TreeEntry[], updates: GridUpdate[]) => {
  const treeNames = new Set(tree.map(({ name }) => name))
  const kept = [...snapshot].filter(([name]) => treeNames.has(name))
  const updated: [string, SnapshotEntry][] = updates.map(({ name, sha, grid }) => [
    name,
    { sha, grid },
  ])
  const next = new Map([...kept, ...updated])

  const isChanged = updates.length > 0 || kept.length < snapshot.size
  const isComplete = tree.every(({ name, sha }) => next.get(name)?.sha === sha)

  return { next, changed: isChanged, complete: isComplete }
}
