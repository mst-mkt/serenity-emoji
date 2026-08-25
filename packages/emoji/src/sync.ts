import { sha256Hex } from '@serenity-emoji/lib/digest'

export type TreeEntry = { name: string; sha: string }

export const planSync = (tree: TreeEntry[], stored: TreeEntry[], limit: number) => {
  const storedShas = new Map(stored.map(({ name, sha }) => [name, sha]))
  const treeNames = new Set(tree.map(({ name }) => name))

  const changed = tree.filter(({ name, sha }) => storedShas.get(name) !== sha)
  const deletes = stored.filter(({ name }) => !treeNames.has(name)).map(({ name }) => name)

  const puts = changed.slice(0, limit)
  const remaining = Math.max(0, changed.length - limit)

  return { puts, deletes, remaining }
}

// the (name, sha) set kv holds after this run's deletes and puts land
export const nextStored = (stored: TreeEntry[], applied: TreeEntry[], deleted: string[]) => {
  const dropped = new Set(deleted)
  const replaced = new Set(applied.map(({ name }) => name))
  const survivors = stored.filter(({ name }) => !dropped.has(name) && !replaced.has(name))
  const updated = applied.map(({ name, sha }) => ({ name, sha }))

  return [...survivors, ...updated]
}

// order-independent fingerprint of a (name, sha) set
export const digestOfEntries = (entries: TreeEntry[]) => {
  const lines = entries
    .map(({ name, sha }) => `${name}:${sha}`)
    .toSorted((a, b) => (a < b ? -1 : 1))
  const encoded = new TextEncoder().encode(lines.join('\n'))

  return sha256Hex(encoded)
}
