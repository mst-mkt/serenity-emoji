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
